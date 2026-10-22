import { createClient } from '@libsql/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { migratePortugueseLocale } from '../src/db/portuguese-locale';

const url = process.env.LIBSQL_DATABASE_URL ?? 'file:./data/kitchen.db';
if (['deploy-preview', 'branch-deploy'].includes(process.env.CONTEXT ?? '')) throw new Error('Preview migrations are disabled.');
if (!url.startsWith('file:') && !process.argv.includes('--remote')) throw new Error('Remote migration requires --remote.');
const client = createClient({ url, authToken: process.env.LIBSQL_AUTH_TOKEN });
try {
  const result = await migratePortugueseLocale(client, {
    apply: process.argv.includes('--apply'),
    backup: async (snapshot) => {
      await mkdir('backups', { recursive: true });
      const name = `backups/portuguese-locale-${new Date().toISOString().replaceAll(':', '-')}.json`;
      await writeFile(name, JSON.stringify(snapshot, (_key, value) =>
        typeof value === 'bigint' ? { bigint: value.toString() } :
        value instanceof Uint8Array ? { base64: Buffer.from(value).toString('base64') } : value, 2) + '\n', { flag: 'wx', mode: 0o600 });
      console.log(`Private locale-row backup saved to ${name}.`);
    },
  });
  console.log(JSON.stringify(result));
} finally { client.close(); }
