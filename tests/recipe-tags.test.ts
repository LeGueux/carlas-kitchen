import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { configureRecipeTags } from '../src/db/recipe-tags';
import { recipeFilterUrl } from '../src/lib/recipes';

test('tags preserve existing collections, labels, groups and assignments; configuration is atomic and idempotent', async () => {
  const client = createClient({ url: 'file::memory:' });
  try {
    await client.executeMultiple(`CREATE TABLE _emdash_taxonomy_defs (id TEXT PRIMARY KEY, name TEXT, label TEXT, label_singular TEXT, hierarchical INTEGER, collections TEXT, locale TEXT, translation_group TEXT);
      INSERT INTO _emdash_taxonomy_defs VALUES ('original','tag','Custom tags','Custom tag',0,'["posts"]','en','original');
      CREATE TABLE content_taxonomies (entry_id TEXT, taxonomy_id TEXT);
      INSERT INTO content_taxonomies VALUES ('recipe','existing-term');`);
    assert.equal((await configureRecipeTags(client)).changed, 3);
    await assert.rejects(configureRecipeTags(client, { apply: true, backup: async () => { throw new Error('Backup failed'); } }), /Backup failed/);
    assert.equal((await client.execute('SELECT COUNT(*) AS n FROM _emdash_taxonomy_defs')).rows[0].n, 1);
    await configureRecipeTags(client, { apply: true, backup: async (rows) => { assert.equal(rows.length, 1); } });
    const rows = (await client.execute('SELECT * FROM _emdash_taxonomy_defs')).rows;
    assert.equal(rows.length, 3);
    assert.ok(rows.every((row) => row.translation_group === 'original' && row.collections === '["posts","recipes"]'));
    assert.equal(rows.find((row) => row.locale === 'en')?.label, 'Custom tags');
    assert.equal((await client.execute('SELECT taxonomy_id FROM content_taxonomies')).rows[0].taxonomy_id, 'existing-term');
    assert.equal((await configureRecipeTags(client, { apply: true })).changed, 0);
  } finally { client.close(); }
});

test('combined tag, category and search links preserve filters and encode slugs', () => {
  assert.equal(recipeFilterUrl('fr', { query: 'crème', category: 'desserts', tag: '5 min & frais' }), '/fr/?q=cr%C3%A8me&category=desserts&tag=5+min+%26+frais');
  assert.equal(recipeFilterUrl('pt-BR', { category: 'doces' }), '/pt-BR/?category=doces');
  assert.equal(recipeFilterUrl('en', {}), '/');
});
