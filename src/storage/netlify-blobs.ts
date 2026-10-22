import { getStore } from '@netlify/blobs';
import { EmDashStorageError, type Storage, type DownloadOptions, type ListOptions } from 'emdash';

export const MAX_PHOTO_BYTES = 3_000_000;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type BlobStore = Pick<ReturnType<typeof getStore>, 'set' | 'getWithMetadata' | 'getMetadata' | 'delete' | 'list'>;

export function validateKey(key: string): void {
  if (!key || key.startsWith('/') || key.includes('\\') || key.includes('%') || key.split('/').some((part) => part === '..' || part === '.') || new TextEncoder().encode(key).length > 600) {
    throw new EmDashStorageError('Invalid media key.', 'INVALID_KEY');
  }
  // This store holds raster photos only. Backups and site-transfer files use separate tooling.
  if (key.includes('/')) throw new EmDashStorageError('Internal files require a separate backup store.', 'PRIVATE_KEY');
}

export function validatePhoto(bytes: Uint8Array, contentType: string): void {
  if (bytes.byteLength > MAX_PHOTO_BYTES) throw new EmDashStorageError('Photo exceeds 3 MB. Choose the photo again to resize it automatically.', 'PAYLOAD_TOO_LARGE');
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const webp = new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  if (!(contentType === 'image/jpeg' && jpeg || contentType === 'image/png' && png || contentType === 'image/webp' && webp)) {
    throw new EmDashStorageError('Choose a valid JPEG, PNG or WebP photo.', 'INVALID_TYPE');
  }
}

async function readBody(body: Uint8Array | ReadableStream<Uint8Array>): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > MAX_PHOTO_BYTES) {
        await reader.cancel();
        throw new EmDashStorageError('Photo exceeds 3 MB.', 'PAYLOAD_TOO_LARGE');
      }
      chunks.push(result.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export class NetlifyBlobsStorage implements Storage {
  // Resolve context inside each operation, never at build time or module import.
  constructor(private readonly store: () => BlobStore) {}

  async upload(options: Parameters<Storage['upload']>[0]) {
    validateKey(options.key);
    const bytes = await readBody(options.body);
    validatePhoto(bytes, options.contentType);
    await this.store().set(options.key, new Blob([bytes as BlobPart], { type: options.contentType }), {
      metadata: { contentType: options.contentType, size: bytes.length, lastModified: new Date().toISOString() },
    });
    return { key: options.key, url: this.getPublicUrl(options.key), size: bytes.length };
  }

  async download(key: string, options?: DownloadOptions) {
    validateKey(key);
    const object = await this.store().getWithMetadata(key, { type: 'blob', consistency: 'strong' });
    if (!object) throw new EmDashStorageError('Media not found.', 'NOT_FOUND');
    const size = object.data.size;
    let part = object.data;
    let range: { offset: number; length: number } | undefined;
    if (options?.range) {
      const requested = options.range;
      const offset = 'suffix' in requested ? Math.max(0, size - requested.suffix) : requested.offset;
      const length = 'suffix' in requested ? size - offset : Math.min(requested.length ?? size - offset, size - offset);
      if (offset >= 0 && offset < size && length > 0) {
        part = object.data.slice(offset, offset + length);
        range = { offset, length };
      }
    }
    return {
      body: part.stream(), size, range,
      contentType: String(object.metadata.contentType ?? 'application/octet-stream'),
      lastModified: new Date(String(object.metadata.lastModified)),
    };
  }

  async delete(key: string) { validateKey(key); await this.store().delete(key); }
  async exists(key: string) { validateKey(key); return !!await this.store().getMetadata(key, { consistency: 'strong' }); }

  async list(options: ListOptions = {}) {
    // Blobs exposes an iterator, not portable cursor/limit parameters. A sorted key
    // cursor keeps pagination stateless; this O(n) listing is deliberate for a small POC.
    const prefix = options.prefix ?? '';
    const all = await this.store().list({ prefix });
    const cursor = options.cursor ? Buffer.from(options.cursor, 'base64url').toString('utf8') : '';
    const keys = all.blobs.map((item) => item.key).filter((key) => !key.includes('/') && key > cursor).sort();
    const limit = Math.min(100, Math.max(1, options.limit ?? 50));
    const selected = keys.slice(0, limit);
    const files = (await Promise.all(selected.map(async (key) => {
      const object = await this.store().getMetadata(key, { consistency: 'strong' });
      return object ? { key, size: Number(object.metadata.size), lastModified: new Date(String(object.metadata.lastModified)), etag: object.etag } : null;
    }))).filter((item) => item !== null);
    return { files, nextCursor: keys.length > limit ? Buffer.from(selected.at(-1)!).toString('base64url') : undefined };
  }

  async getSignedUploadUrl(): ReturnType<Storage['getSignedUploadUrl']> {
    throw new EmDashStorageError('Netlify Blobs does not support signed uploads. Use the authenticated EmDash upload route.', 'NOT_SUPPORTED');
  }

  getPublicUrl(key: string) { validateKey(key); return `/_emdash/api/media/file/${encodeURIComponent(key)}`; }
}

export function createStorage(config: Record<string, unknown>): Storage {
  const name = String(config.name ?? 'kitchen-media');
  return new NetlifyBlobsStorage(() => getStore({ name, consistency: 'strong' }));
}
