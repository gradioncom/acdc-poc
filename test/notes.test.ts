// test/notes.test.ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('notes API', () => {
  it('creates and fetches a note', async () => {
    const app = createApp();
    const created = await request(app)
      .post('/notes')
      .send({ title: 't', body: 'b' })
      .expect(201);
    expect(created.body.id).toBeDefined();
    await request(app).get(`/notes/${created.body.id}`).expect(200);
  });

  it('rejects invalid create payloads', async () => {
    const app = createApp();
    await request(app).post('/notes').send({ title: 1 }).expect(400);
  });

  it('paginates 1-based and exposes total count', async () => {
    const app = createApp();
    for (let i = 0; i < 3; i += 1) {
      await request(app).post('/notes').send({ title: `t${i}`, body: 'b' }).expect(201);
    }
    const res = await request(app).get('/notes?page=1&pageSize=2').expect(200);
    expect(res.headers['x-total-count']).toBe('3');
    expect(res.body.length).toBeLessThanOrEqual(2);
  });

  it('page 1 returns the first notes, not a skipped page', async () => {
    const app = createApp();
    const created = [];
    for (let i = 0; i < 3; i += 1) {
      const r = await request(app).post('/notes').send({ title: `t${i}`, body: 'b' }).expect(201);
      created.push(r.body);
    }

    const page1 = await request(app).get('/notes?page=1&pageSize=2').expect(200);
    expect(page1.body.map((n: { id: string }) => n.id)).toEqual([created[0].id, created[1].id]);

    const page2 = await request(app).get('/notes?page=2&pageSize=2').expect(200);
    expect(page2.body.map((n: { id: string }) => n.id)).toEqual([created[2].id]);
  });

  it('returns 404 for unknown ids', async () => {
    const app = createApp();
    await request(app).get('/notes/nope').expect(404);
    await request(app).delete('/notes/nope').expect(404);
  });
});
