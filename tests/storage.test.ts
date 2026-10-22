import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NetlifyBlobsStorage, MAX_PHOTO_BYTES, type BlobStore } from '../src/storage/netlify-blobs';

function memoryStore() {
  const values = new Map<string, { data: Blob; metadata: Record<string, unknown>; etag: string }>();
  const reads: unknown[] = [];
  const store = {
    async set(key: string, data: Blob, options: { metadata: Record<string, unknown> }) {
      values.set(key, { data, metadata: options.metadata, etag: `etag-${key}` });
      return { modified: true };
    },
    async getWithMetadata(key: string, options: unknown) { reads.push(options); return values.get(key) ?? null; },
    async getMetadata(key: string, options: unknown) { reads.push(options); const value = values.get(key); return value ? { metadata: value.metadata, etag: value.etag } : null; },
    async delete(key: string) { values.delete(key); },
    async list({ prefix = '' } = {}) { return { blobs: [...values.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key, etag: `etag-${key}` })), directories: [] }; },
  } as unknown as BlobStore;
  return { storage: new NetlifyBlobsStorage(() => store), values, reads };
}
const png = new Uint8Array(await readFile(new URL('../public/placeholders/tomato.png', import.meta.url)));

test('upload, download, metadata, strong reads and idempotent deletion', async () => {
  const { storage, values, reads } = memoryStore();
  const result = await storage.upload({ key: 'photo.png', body: png, contentType: 'image/png' });
  assert.equal(result.size, png.length);
  assert.equal(result.url, '/_emdash/api/media/file/photo.png');
  assert.equal(await storage.exists('photo.png'), true);
  const downloaded = await storage.download('photo.png');
  assert.equal(downloaded.contentType, 'image/png');
  assert.deepEqual(new Uint8Array(await new Response(downloaded.body).arrayBuffer()), png);
  assert.equal(downloaded.size, png.length);
  assert.ok(downloaded.lastModified instanceof Date);
  assert.ok(reads.every((read) => (read as { consistency: string }).consistency === 'strong'));
  assert.equal(values.get('photo.png')?.metadata.contentType, 'image/png');
  await storage.delete('photo.png');
  await storage.delete('photo.png');
  assert.equal(await storage.exists('photo.png'), false);
  await assert.rejects(storage.download('photo.png'), { code: 'NOT_FOUND' });
});

test('stateless sorted cursor pagination includes correct metadata', async () => {
  const { storage } = memoryStore();
  for (const key of ['c.png', 'a.png', 'b.png']) await storage.upload({ key, body: png, contentType: 'image/png' });
  const first = await storage.list({ limit: 2 });
  assert.deepEqual(first.files.map((file) => file.key), ['a.png', 'b.png']);
  assert.equal(first.files[0].size, png.length);
  const second = await storage.list({ limit: 2, cursor: first.nextCursor });
  assert.deepEqual(second.files.map((file) => file.key), ['c.png']);
  assert.equal(second.nextCursor, undefined);
  assert.deepEqual((await storage.list({ prefix: 'b' })).files.map((file) => file.key), ['b.png']);
});

test('byte ranges and suffix ranges keep the whole-object size', async () => {
  const { storage } = memoryStore();
  await storage.upload({ key: 'photo.png', body: png, contentType: 'image/png' });
  const part = await storage.download('photo.png', { range: { offset: 5, length: 10 } });
  assert.deepEqual(part.range, { offset: 5, length: 10 });
  assert.equal(part.size, png.length);
  assert.deepEqual(new Uint8Array(await new Response(part.body).arrayBuffer()), png.slice(5, 15));
  const tail = await storage.download('photo.png', { range: { suffix: 4 } });
  assert.deepEqual(new Uint8Array(await new Response(tail.body).arrayBuffer()), png.slice(-4));
  assert.equal((await storage.download('photo.png', { range: { offset: png.length + 1 } })).range, undefined);
});

test('reject oversized bytes, oversized streams, spoofed MIME, internal keys and signed uploads', async () => {
  const { storage, values } = memoryStore();
  await assert.rejects(storage.upload({ key: 'big.png', body: new Uint8Array(MAX_PHOTO_BYTES + 1), contentType: 'image/png' }), { code: 'PAYLOAD_TOO_LARGE' });
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(MAX_PHOTO_BYTES + 1)); controller.close(); } });
  await assert.rejects(storage.upload({ key: 'big.png', body: stream, contentType: 'image/png' }), { code: 'PAYLOAD_TOO_LARGE' });
  await assert.rejects(storage.upload({ key: 'fake.jpg', body: png, contentType: 'image/jpeg' }), { code: 'INVALID_TYPE' });
  for (const key of ['../secret', 'backups/file.png', '%2e%2e', '/file.png', 'a\\b']) await assert.rejects(storage.exists(key));
  await assert.rejects(storage.getSignedUploadUrl(), { code: 'NOT_SUPPORTED' });
  assert.equal(values.size, 0);
});

test('storage failures propagate, never become a missing object or successful write', async () => {
  const storage = new NetlifyBlobsStorage(() => { throw new Error('Storage unavailable'); });
  await assert.rejects(storage.exists('photo.png'), /Storage unavailable/);
  await assert.rejects(storage.upload({ key: 'photo.png', body: png, contentType: 'image/png' }), /Storage unavailable/);
});
