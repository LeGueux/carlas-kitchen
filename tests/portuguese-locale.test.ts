import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { migratePortugueseLocale, type LocaleSnapshot } from '../src/db/portuguese-locale';

test('locale migration is backed up, atomic, preserves entry identity and is idempotent', async () => {
  const client = createClient({ url: 'file::memory:' });
  try {
    await client.executeMultiple(`
      CREATE TABLE ec_recipes (id TEXT PRIMARY KEY, locale TEXT, slug TEXT, status TEXT, translation_group TEXT);
      CREATE TABLE _emdash_taxonomy_defs (id TEXT PRIMARY KEY, locale TEXT, name TEXT);
      INSERT INTO ec_recipes VALUES ('recipe', 'pt-PT', 'existing-slug', 'draft', 'group');
      INSERT INTO _emdash_taxonomy_defs VALUES ('category', 'pt-PT', 'category');
    `);
    assert.equal((await migratePortugueseLocale(client)).sourceRows, 2);
    await assert.rejects(migratePortugueseLocale(client, { apply: true, backup: async () => { throw new Error('Backup unavailable'); } }), /Backup unavailable/);
    assert.equal((await client.execute("SELECT locale FROM ec_recipes")).rows[0].locale, 'pt-PT');
    await client.executeMultiple(`CREATE TRIGGER reject_locale BEFORE UPDATE OF locale ON ec_recipes
      BEGIN SELECT RAISE(ABORT, 'Update unavailable'); END;`);
    await assert.rejects(migratePortugueseLocale(client, { apply: true, backup: async () => {} }), /Update unavailable/);
    assert.equal((await client.execute('SELECT locale FROM _emdash_taxonomy_defs')).rows[0].locale, 'pt-PT');
    await client.execute('DROP TRIGGER reject_locale');
    let backup: LocaleSnapshot | undefined;
    const result = await migratePortugueseLocale(client, { apply: true, backup: async (snapshot) => { backup = snapshot; } });
    assert.equal(result.sourceRows, 2);
    assert.equal(backup?.tables.find((table) => table.name === 'ec_recipes')?.rows[0].locale, 'pt-PT');
    const recipe = (await client.execute('SELECT * FROM ec_recipes')).rows[0];
    assert.deepEqual({ ...recipe }, { id: 'recipe', locale: 'pt-BR', slug: 'existing-slug', status: 'draft', translation_group: 'group' });
    assert.equal((await migratePortugueseLocale(client, { apply: true })).sourceRows, 0);
  } finally { client.close(); }
});

test('mixed Portuguese variants are refused before any write or backup', async () => {
  const client = createClient({ url: 'file::memory:' });
  try {
    await client.executeMultiple(`CREATE TABLE ec_recipes (id TEXT PRIMARY KEY, locale TEXT);
      INSERT INTO ec_recipes VALUES ('pt', 'pt-PT'), ('br', 'pt-BR');`);
    let backedUp = false;
    await assert.rejects(migratePortugueseLocale(client, { apply: true, backup: async () => { backedUp = true; } }), /Both pt-PT and pt-BR/);
    assert.equal(backedUp, false);
    assert.equal((await client.execute("SELECT COUNT(*) AS count FROM ec_recipes WHERE locale='pt-PT'")).rows[0].count, 1);
  } finally { client.close(); }
});
