// test/attachments.test.ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

/** Create a note and return its id. */
async function seedNote(app: ReturnType<typeof createApp>): Promise<string> {
  const res = await request(app)
    .post('/api/notes')
    .send({ title: 'attachment test note', body: 'body' })
    .expect(201);
  return (res.body as { id: string }).id;
}

describe('attachment upload', () => {
  it('uploads a file and returns 201 with metadata', async () => {
    const app = createApp();
    const id = await seedNote(app);
    const res = await request(app)
      .post(`/api/notes/${id}/attachments`)
      .attach('file', Buffer.from('hello'), { filename: 'hello.txt', contentType: 'text/plain' })
      .expect(201);
    expect(res.body).toMatchObject({
      filename: 'hello.txt',
      contentType: 'text/plain',
      size: 5,
    });
  });

  it('returns 404 when note does not exist', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/notes/no-such-note/attachments')
      .attach('file', Buffer.from('x'), { filename: 'x.txt', contentType: 'text/plain' })
      .expect(404);
    expect(res.body).toEqual({ error: 'not found' });
  });

  it('returns 400 when no file is sent', async () => {
    const app = createApp();
    const id = await seedNote(app);
    const res = await request(app)
      .post(`/api/notes/${id}/attachments`)
      .set('content-type', 'multipart/form-data')
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when file size exceeds limit', async () => {
    const app = createApp();
    const id = await seedNote(app);
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 'x');
    const res = await request(app)
      .post(`/api/notes/${id}/attachments`)
      .attach('file', bigBuffer, { filename: 'big.txt', contentType: 'text/plain' })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for a disallowed content type', async () => {
    const app = createApp();
    const id = await seedNote(app);
    const res = await request(app)
      .post(`/api/notes/${id}/attachments`)
      .attach('file', Buffer.from('<exe>'), {
        filename: 'bad.exe',
        contentType: 'application/octet-stream',
      })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  it('sanitises path traversal attempts in filename', async () => {
    const app = createApp();
    const id = await seedNote(app);
    const res = await request(app)
      .post(`/api/notes/${id}/attachments`)
      .attach('file', Buffer.from('data'), {
        filename: '../../etc/passwd',
        contentType: 'text/plain',
      })
      .expect(201);
    // The stored filename must not contain path separators
    const meta = res.body as { filename: string };
    expect(meta.filename).not.toContain('/');
    expect(meta.filename).not.toContain('..');
  });
});

describe('attachment download', () => {
  it('downloads the uploaded file with security headers', async () => {
    const app = createApp();
    const id = await seedNote(app);
    await request(app)
      .post(`/api/notes/${id}/attachments`)
      .attach('file', Buffer.from('world'), { filename: 'world.txt', contentType: 'text/plain' })
      .expect(201);

    const dl = await request(app).get(`/api/notes/${id}/attachments/world.txt`).expect(200);

    expect(dl.headers['content-disposition']).toMatch(/attachment/);
    expect(dl.headers['x-content-type-options']).toBe('nosniff');
    expect(dl.text).toBe('world');
  });

  it('returns 404 for a missing attachment', async () => {
    const app = createApp();
    const id = await seedNote(app);
    await request(app).get(`/api/notes/${id}/attachments/nope.txt`).expect(404);
  });

  it('returns 404 for attachment on unknown note', async () => {
    const app = createApp();
    await request(app).get('/api/notes/no-such-note/attachments/file.txt').expect(404);
  });
});

describe('attachment list', () => {
  it('returns empty array before any uploads', async () => {
    const app = createApp();
    const id = await seedNote(app);
    const res = await request(app).get(`/api/notes/${id}/attachments`).expect(200);
    expect(res.body).toEqual([]);
  });

  it('lists metadata after upload', async () => {
    const app = createApp();
    const id = await seedNote(app);
    await request(app)
      .post(`/api/notes/${id}/attachments`)
      .attach('file', Buffer.from('abc'), { filename: 'abc.txt', contentType: 'text/plain' })
      .expect(201);

    const res = await request(app).get(`/api/notes/${id}/attachments`).expect(200);
    expect(res.body).toHaveLength(1);
    expect((res.body as Array<{ filename: string }>)[0].filename).toBe('abc.txt');
  });

  it('returns 404 when listing attachments for unknown note', async () => {
    const app = createApp();
    const res = await request(app).get('/api/notes/no-such/attachments').expect(404);
    expect(res.body).toEqual({ error: 'not found' });
  });
});
