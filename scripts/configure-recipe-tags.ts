import { createClient } from '@libsql/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { configureRecipeTags } from '../src/db/recipe-tags';

const url = process.env.LIBSQL_DATABASE_URL ?? 'file:./data/kitchen.db';
if (['deploy-preview', 'branch-deploy'].includes(process.env.CONTEXT ?? '')) throw new Error('Preview writes are disabled.');
if (!url.startsWith('file:') && !process.argv.includes('--remote')) throw new Error('Remote configuration requires --remote.');
const client = createClient({ url, authToken: process.env.LIBSQL_AUTH_TOKEN });
try {
  console.log(JSON.stringify(await configureRecipeTags(client, {
    apply: process.argv.includes('--apply'),
    backup: async (rows) => {
      await mkdir('backups', { recursive: true });
      const path = `backups/tag-definitions-${new Date().toISOString().replaceAll(':', '-')}.json`;
      await writeFile(path, JSON.stringify(rows, null, 2), { flag: 'wx', mode: 0o600 });
      console.log(`Taxonomy definition backup: ${path}`);
    },
  })));
} finally { client.close(); }
