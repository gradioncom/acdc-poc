export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: number;
}

export interface Attachment {
  /** Original filename supplied by the client — stored only as metadata. */
  filename: string;
  /** MIME content type validated at upload time. */
  contentType: string;
  /** Byte length of the file data. */
  size: number;
  /** Raw file bytes held in memory. */
  data: Buffer;
}

export interface AttachmentMeta {
  filename: string;
  contentType: string;
  size: number;
}

export interface ListResult {
  items: Note[];
  total: number;
}

export class NoteStore {
  private readonly notes = new Map<string, Note>();
  /**
   * Attachments are keyed by `${noteId}/${sanitisedFilename}`.
   * The key is constructed internally — never derived directly from client input.
   */
  private readonly attachments = new Map<string, Attachment>();
  private seq = 0;

  create(input: { title: string; body: string; tags?: string[] }): Note {
    this.seq += 1;
    const note: Note = {
      id: String(this.seq),
      title: input.title,
      body: input.body,
      tags: input.tags ?? [],
      // monotonic insertion counter — used purely for stable list ordering,
      // not a wall-clock timestamp (keeps pagination deterministic in tests)
      createdAt: this.seq,
    };
    this.notes.set(note.id, note);
    return note;
  }

  get(id: string): Note | undefined {
    return this.notes.get(id);
  }

  update(id: string, input: { title?: string; body?: string; tags?: string[] }): Note | undefined {
    const existing = this.notes.get(id);
    if (!existing) return undefined;
    const updated: Note = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
    };
    this.notes.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    if (!this.notes.delete(id)) return false;
    // Remove all attachments belonging to this note
    for (const key of this.attachments.keys()) {
      if (key.startsWith(`${id}/`)) {
        this.attachments.delete(key);
      }
    }
    return true;
  }

  /**
   * Sanitise the client-supplied filename to a safe basename (strip path
   * separators and leading dots) so it can be used as a storage key.
   */
  private sanitiseFilename(raw: string): string {
    // Keep only the basename, strip traversal attempts
    const base = raw.replace(/[/\\]/g, '_').replace(/^\.+/, '').trim();
    return base || 'attachment';
  }

  addAttachment(
    noteId: string,
    input: { filename: string; contentType: string; data: Buffer },
  ): AttachmentMeta | undefined {
    if (!this.notes.has(noteId)) return undefined;
    const safeName = this.sanitiseFilename(input.filename);
    const key = `${noteId}/${safeName}`;
    const attachment: Attachment = {
      filename: safeName,
      contentType: input.contentType,
      size: input.data.byteLength,
      data: input.data,
    };
    this.attachments.set(key, attachment);
    return { filename: safeName, contentType: attachment.contentType, size: attachment.size };
  }

  getAttachment(noteId: string, filename: string): Attachment | undefined {
    if (!this.notes.has(noteId)) return undefined;
    const safeName = this.sanitiseFilename(filename);
    return this.attachments.get(`${noteId}/${safeName}`);
  }

  listAttachments(noteId: string): AttachmentMeta[] | undefined {
    if (!this.notes.has(noteId)) return undefined;
    const prefix = `${noteId}/`;
    const result: AttachmentMeta[] = [];
    for (const [key, att] of this.attachments) {
      if (key.startsWith(prefix)) {
        result.push({ filename: att.filename, contentType: att.contentType, size: att.size });
      }
    }
    return result;
  }

  list(page: number, pageSize: number, query?: string, tag?: string): ListResult {
    const term = query ? query.trim().toLowerCase() : '';
    const tagFilter = tag ? tag.trim().toLowerCase() : '';
    const all = [...this.notes.values()]
      .sort((a, b) => a.createdAt - b.createdAt)
      .filter(
        (n) =>
          (term === '' ||
            n.title.toLowerCase().includes(term) ||
            n.body.toLowerCase().includes(term)) &&
          (tagFilter === '' || n.tags.some((t) => t.toLowerCase() === tagFilter)),
      );
    const start = (page - 1) * pageSize;
    return { items: all.slice(start, start + pageSize), total: all.length };
  }
}
