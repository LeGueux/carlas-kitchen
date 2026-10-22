import { getStore } from '@netlify/blobs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

if (existsSync('.env.backup')) process.loadEnvFile('.env.backup');
const siteID = process.env.NETLIFY_SITE_ID;
const token = process.env.NETLIFY_AUTH_TOKEN;
if (!siteID || !token) throw new Error('Set dedicated NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN in the developer environment or ignored .env.backup.');
const storeName = 'kitchen-media';
const store = getStore({ name: storeName, siteID, token, consistency: 'strong' });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const safeKey = (key) => typeof key === 'string' && /^(?:[A-Za-z0-9_-]+\.)+(?:jpg|jpeg|png|webp)$/i.test(key);
const [action, folder, confirmation] = process.argv.slice(2);

if (action === 'export') {
  const destination = resolve(folder ?? `backups/media-${new Date().toISOString().replaceAll(':', '-')}`);
  // Never merge a new export into an existing directory or a public asset directory.
  if (existsSync(destination)) throw new Error('Choose a new export directory.');
  if (!destination.startsWith(resolve('backups') + '\\') && !destination.startsWith(resolve('backups') + '/')) throw new Error('Media exports must live inside backups/.');
  await mkdir(destination, { recursive: true });
  const manifest = { version: 1, store: storeName, createdAt: new Date().toISOString(), files: [] };
  for (const { key } of (await store.list()).blobs) {
    if (!safeKey(key)) throw new Error('Unexpected internal key in the media store. Investigate before continuing.');
    const object = await store.getWithMetadata(key, { type: 'blob', consistency: 'strong' });
    if (!object) throw new Error('Media changed during export. Retry with writes disabled.');
    const bytes = Buffer.from(await object.data.arrayBuffer());
    await writeFile(join(destination, key), bytes, { flag: 'wx' });
    manifest.files.push({ key, size: bytes.length, sha256: hash(bytes), metadata: object.metadata });
  }
  await writeFile(join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  console.log(`Exported ${manifest.files.length} media objects to ${destination}. No credentials included.`);
} else if (action === 'restore') {
  if (!folder || confirmation !== `--confirm-site=${siteID}`) throw new Error('Restore requires a directory and --confirm-site=<destination-site-id>. Use a new dedicated recovery site.');
  if ((await store.list()).blobs.length) throw new Error('Restore requires an empty destination media store; existing data will not be overwritten.');
  const manifest = JSON.parse(await readFile(join(folder, 'manifest.json'), 'utf8'));
  if (manifest.version !== 1 || manifest.store !== storeName || !Array.isArray(manifest.files)) throw new Error('Invalid backup manifest.');
  // Verify every local file before the first remote write.
  const verified = [];
  for (const file of manifest.files) {
    if (!safeKey(file.key)) throw new Error('Invalid backup key.');
    const bytes = await readFile(join(folder, file.key));
    if (bytes.length !== file.size || hash(bytes) !== file.sha256) throw new Error('Backup checksum mismatch.');
    verified.push({ file, bytes });
  }
  for (const { file, bytes } of verified) {
    const written = await store.set(file.key, new Blob([bytes]), { metadata: file.metadata, onlyIfNew: true });
    if (!written.modified) throw new Error('Destination changed; restore stopped without overwriting.');
    const restored = await store.getWithMetadata(file.key, { type: 'blob', consistency: 'strong' });
    if (!restored || hash(Buffer.from(await restored.data.arrayBuffer())) !== file.sha256) throw new Error('Remote verification failed.');
  }
  console.log(`Restored and verified ${verified.length} media objects. Keep writes disabled until database verification is complete.`);
} else {
  throw new Error('Usage: node scripts/media-backup.mjs export [backups/new-folder] | restore backups/folder --confirm-site=<destination-site-id>');
}
