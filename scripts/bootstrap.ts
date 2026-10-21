import { readFile } from 'node:fs/promises';
import { mkdirSync, existsSync } from 'node:fs';
import { Kysely } from 'kysely';
import { runMigrations } from 'emdash/db';
import { applySeed, validateSeed, type SeedFile, type Database } from 'emdash';
import { createDialect } from '../src/db/runtime-libsql';

if (existsSync('.env')) process.loadEnvFile('.env');
const url = process.env.LIBSQL_DATABASE_URL ?? 'file:./data/kitchen.db';
if (['deploy-preview', 'branch-deploy'].includes(process.env.CONTEXT ?? '')) throw new Error('Preview writes are disabled.');
if (!url.startsWith('file:') && !process.argv.includes('--remote')) throw new Error('Remote initialization requires the explicit --remote flag.');
if (url.startsWith('file:')) mkdirSync('data', { recursive: true });
const schema = JSON.parse(await readFile(new URL('../seed/schema.json', import.meta.url), 'utf8')) as SeedFile;
const demo = process.argv.includes('--demo');
const seed = demo ? JSON.parse(await readFile(new URL('../seed/examples.json', import.meta.url), 'utf8')) as SeedFile : schema;
for (const document of [schema, seed]) {
  const result = validateSeed(document);
  if (!result.valid) throw new Error(JSON.stringify(result.errors));
}
const db = new Kysely<Database>({ dialect: createDialect({ url }) });
try {
  await runMigrations(db);
  console.log('Core migrations applied.');
  const structure = await applySeed(db, schema, { includeContent: false, onConflict: 'skip' });
  console.log(JSON.stringify(structure));
  if (demo) console.log(JSON.stringify(await applySeed(db, seed, { includeContent: true, onConflict: 'skip' })));
} finally { await db.destroy(); }
