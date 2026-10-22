import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { EmDashManifest } from 'emdash/astro';
import { localizeRecipeManifest } from '../src/i18n/admin-labels';
import { patchAdminLabels, adminLabelsMarker } from '../integrations/admin-labels.mjs';

test('recipe labels follow the admin language without changing identifiers, content or cached data', async () => {
  const schema = JSON.parse(await readFile(new URL('../seed/schema.json', import.meta.url), 'utf8')).collections[0];
  const recipe = { ...schema, fields: Object.fromEntries(schema.fields.map((field: { slug: string }) => [field.slug, field])) };
  const manifest = { collections: { recipes: recipe, other: { label: 'Other collection' } }, hash: 'unchanged' } as unknown as EmDashManifest;
  const original = JSON.stringify(manifest);
  const fr = localizeRecipeManifest(manifest, 'fr');
  const br = localizeRecipeManifest(manifest, 'pt-BR');
  assert.equal(fr.collections.recipes.label, 'Recettes');
  assert.equal(fr.collections.recipes.labelSingular, 'Recette');
  assert.equal(fr.collections.recipes.fields.title.label, 'Titre');
  assert.equal(br.collections.recipes.label, 'Receitas');
  assert.equal(br.collections.recipes.fields.title.label, 'Título');
  for (const translated of [fr, br]) {
    assert.equal(translated.hash, manifest.hash);
    assert.equal(translated.collections.other, manifest.collections.other);
    for (const [slug, field] of Object.entries(recipe.fields)) {
      const localized = translated.collections.recipes.fields[slug];
      assert.notEqual(localized.label, (field as { label: string }).label, slug);
      assert.deepEqual({ ...localized, label: undefined }, { ...(field as object), label: undefined });
    }
  }
  assert.equal(JSON.stringify(manifest), original);
  assert.equal(localizeRecipeManifest(manifest, 'en'), manifest);
  assert.equal(localizeRecipeManifest(manifest, 'unknown'), manifest);
  assert.equal(localizeRecipeManifest(fr, 'fr').collections.recipes.label, 'Recettes');
});

test('customized labels and unknown fields survive the presentation adaptation', () => {
  const manifest = { collections: { recipes: { label: 'My notebook', labelSingular: 'Dish', fields: {
    title: { label: 'My title', kind: 'string' }, custom: { label: 'Custom field', kind: 'string' },
  } } } } as unknown as EmDashManifest;
  assert.deepEqual(localizeRecipeManifest(manifest, 'fr'), manifest);
  const empty = { collections: {} } as EmDashManifest;
  assert.equal(localizeRecipeManifest(empty, 'fr'), empty);
});

test('the pinned manifest selector patch is repeatable and refuses upstream drift', async () => {
  const source = (await readFile(new URL('../node_modules/@emdash-cms/admin/dist/index.js', import.meta.url), 'utf8'))
    .replace(/\/\/ kitchen-admin-labels-v1[\s\S]*?(?=\/\/ kitchen-photo-preparation-v1)/, '')
    .replaceAll(', select: useKitchenRecipeLabels()', '');
  const helper = 'function kitchenLocalizeRecipeManifest(value) { return value; }';
  const patched = patchAdminLabels(source, helper);
  assert.ok(patched.includes(adminLabelsMarker));
  assert.equal(patched.split('select: useKitchenRecipeLabels()').length - 1, 27);
  assert.equal(patchAdminLabels(patched, helper), patched);
  assert.ok(patchAdminLabels(patched, 'updated helper').includes('updated helper'));
  assert.throws(() => patchAdminLabels('changed upstream API', ''), /Review the pinned admin label/);
});
