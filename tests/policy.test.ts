import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publishedRecipeUsesMedia } from '../src/server/media-policy';
import { localePath, brazilianPortugueseRedirect, isLocale, languageNames } from '../src/config/locales';
import { patchAdminUploads } from '../integrations/serverless.mjs';
import { publishedLanguageLinks, titleMatches } from '../src/lib/recipes';

test('drafts and unlinked media never pass the public media gate', () => {
  const recipe = { status: 'draft', cover_image: { id: 'photo' } };
  assert.equal(publishedRecipeUsesMedia(recipe, 'photo', 'photo.png'), false);
  assert.equal(publishedRecipeUsesMedia({ ...recipe, status: 'published' }, 'photo', 'photo.png'), true);
  assert.equal(publishedRecipeUsesMedia({ ...recipe, status: 'published' }, 'other', 'other.png'), false);
  assert.equal(publishedRecipeUsesMedia({ status: 'published', cover_image: { id: 'photo', provider: 'external' } }, 'photo', 'photo.png'), false);
});

test('locale routing preserves the unprefixed admin-compatible default', () => {
  assert.equal(localePath('en', 'recipes/toast'), '/recipes/toast');
  assert.equal(localePath('fr', 'recipes/tartine'), '/fr/recipes/tartine');
  assert.equal(localePath('pt-BR'), '/pt-BR/');
  assert.equal(isLocale('pt-PT'), false);
  assert.equal(languageNames['pt-BR'], 'Português (Brasil)');
});

test('legacy Portuguese URLs retain their recipe slug and query without redirecting unrelated paths', () => {
  assert.equal(brazilianPortugueseRedirect(new URL('https://example.test/pt-PT')), '/pt-BR/');
  assert.equal(brazilianPortugueseRedirect(new URL('https://example.test/pt-PT/recipes/toast?q=tomate&missing=1')), '/pt-BR/recipes/toast?q=tomate&missing=1');
  assert.equal(brazilianPortugueseRedirect(new URL('https://example.test/pt-BR/')), undefined);
  assert.equal(brazilianPortugueseRedirect(new URL('https://example.test/pt-PT-extra/')), undefined);
  assert.equal(brazilianPortugueseRedirect(new URL('https://example.test/_emdash/admin')), undefined);
});

test('language switcher excludes draft translations and keeps independent published slugs', () => {
  const links = publishedLanguageLinks([
    { id: 'en', locale: 'en', slug: 'toast', status: 'published' },
    { id: 'fr', locale: 'fr', slug: 'tartine', status: 'published' },
    { id: 'pt', locale: 'pt-BR', slug: 'private-title', status: 'draft' },
  ]);
  assert.equal(links.en, '/recipes/toast');
  assert.equal(links.fr, '/fr/recipes/tartine');
  assert.equal(links['pt-BR'], undefined);
  assert.equal(titleMatches('Crème au citron', 'creme'), true);
});

test('recipe model has exactly three native shared image fields and shared numeric values', async () => {
  const schema = JSON.parse(await readFile(new URL('../seed/schema.json', import.meta.url), 'utf8'));
  const fields = schema.collections[0].fields;
  assert.equal(fields.filter((field: { type: string }) => field.type === 'image').length, 3);
  assert.ok(fields.filter((field: { type: string }) => ['image', 'integer'].includes(field.type)).every((field: { translatable: boolean }) => field.translatable === false));
  assert.ok(!schema.collections[0].supports.includes('scheduling'));
});

test('pinned admin compatibility patch covers the real upload entry and rejects upstream drift', async () => {
  const admin = await readFile(new URL('../node_modules/@emdash-cms/admin/dist/index.js', import.meta.url), 'utf8');
  assert.ok(patchAdminUploads(admin, '/photo.ts').includes('file = await kitchenPreparePhoto(file, opts?.signal)'));
  assert.throws(() => patchAdminUploads('changed upstream API', '/photo.ts'), /Review the pinned compatibility patch/);
});
