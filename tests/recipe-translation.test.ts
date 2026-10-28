import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateRecipe, RecipeTranslationError } from '../src/server/translate-recipe';
import { handleRecipeTranslation } from '../src/server/recipe-translation-route';
import { savedRecipeStamp } from '../src/plugins/translations/snapshot';
import { createPlugin } from '../src/plugins/translations';

// Transport fixtures test structure and failure behavior; they do not claim linguistic QA.
const source = { title: 'Salada', description: '', ingredients: '2 tomates\n1 pitada de sal', steps: 'Corte os tomates.\nMisture.', notes: '', servings: 2, cover_image: { id: 'private-photo' } };

test('translation sends only text, selects the correct API endpoint and preserves line structure', async () => {
  let calls = 0;
  const request: typeof fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api-free.deepl.com/v2/translate');
    assert.equal(new Headers(options?.headers).get('Authorization'), 'DeepL-Auth-Key fixture:fx');
    const body = JSON.parse(String(options?.body));
    assert.equal(body.target_lang, 'FR');
    assert.equal(body.preserve_formatting, true);
    assert.deepEqual(body.text, [source.title, source.ingredients, source.steps]);
    assert.ok(!String(options?.body).includes('private-photo'));
    return Response.json({ translations: body.text.map((text: string) => ({ text })) });
  };
  const translated = await translateRecipe(source, 'fr', 'fixture:fx', request);
  assert.equal(calls, 1);
  assert.deepEqual(Object.keys(translated), ['title', 'description', 'ingredients', 'steps', 'notes']);
  assert.equal(translated.description, '');
  assert.equal(translated.ingredients, source.ingredients);
});

test('quota, service errors and malformed translations never leak provider output or credentials', async () => {
  for (const status of [403, 429, 456, 500]) {
    await assert.rejects(translateRecipe(source, 'en', 'secret-key', async () => new Response('secret-key diagnostic', { status })), (error: unknown) => error instanceof RecipeTranslationError && !error.message.includes('secret-key'));
  }
  await assert.rejects(translateRecipe(source, 'en', '', async () => { throw new Error('Must not call provider'); }), /NOT_CONFIGURED/);
  await assert.rejects(translateRecipe(source, 'en', 'secret-key', async () => Response.json({ translations: [{ text: 'missing fields' }] })), /INVALID_TRANSLATION/);
  await assert.rejects(translateRecipe(source, 'en', 'secret-key', async () => Response.json({ translations: [{ text: 'title' }, { text: 'collapsed lines' }, { text: 'steps' }] })), /INVALID_TRANSLATION/);
  await assert.rejects(translateRecipe({ ...source, title: 'x'.repeat(161) }, 'fr', 'secret-key'), /INVALID_SOURCE/);
});

const item = { id: 'recipe', locale: 'pt-BR', data: source, updatedAt: 'today', version: 1, draftRevisionId: null, liveRevisionId: 'live' };
function context(role: number, body: unknown = {}, locale = 'pt-BR') {
  return {
    user: { id: 'editor', role }, input: body,
    content: { get: async () => ({ ...item, locale }) },
  } as unknown as Parameters<typeof handleRecipeTranslation>[0];
}

test('native translation routes restrict editor permission, method, request size and source revision', async () => {
  const plugin = createPlugin({ adminEntry: 'test-entry' });
  assert.equal(plugin.routes.translate!.permission, 'content:edit_any');
  assert.deepEqual(plugin.routes.translate!.methods, ['POST']);
  assert.equal(plugin.routes.translate!.request?.maxBytes, 2000);
  assert.equal(plugin.routes.translate!.public, undefined);
  assert.deepEqual(plugin.capabilities, ['content:read', 'content:revisions:read']);
  const original = process.env.DEEPL_API_KEY;
  process.env.DEEPL_API_KEY = 'server-only-test-key';
  try {
    for (const role of [0, 10, 20, 30]) assert.equal((await handleRecipeTranslation(context(role))).status, 403);
    const good = { id: 'recipe', target: 'fr', revision: savedRecipeStamp(item) };
    assert.equal((await handleRecipeTranslation(context(40, { ...good, target: ['fr'] }))).status, 400);
    assert.equal((await handleRecipeTranslation(context(40, good, 'en'))).status, 400);
    assert.equal((await handleRecipeTranslation(context(40, { ...good, revision: 'stale' }))).status, 409);
    assert.equal((await handleRecipeTranslation(context(40, { ...good, id: '../users' }))).status, 400);
  } finally {
    if (original === undefined) delete process.env.DEEPL_API_KEY; else process.env.DEEPL_API_KEY = original;
  }
});

test('latest draft text is translated and a concurrent source save discards stale results', async () => {
  const key = process.env.DEEPL_API_KEY;
  const request = globalThis.fetch;
  process.env.DEEPL_API_KEY = 'fixture';
  const draftItem = { ...item, draftRevisionId: 'draft' };
  let changed = false;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    assert.equal(body.text[0], 'Updated saved draft');
    return Response.json({ translations: body.text.map((text: string) => ({ text })) });
  };
  const ctx = {
    user: { id: 'editor', role: 40 },
    input: { id: 'recipe', target: 'fr', revision: savedRecipeStamp(draftItem) },
    content: {
      get: async () => changed ? { ...draftItem, version: 2 } : draftItem,
      getRevision: async () => ({ collection: 'recipes', entryId: 'recipe', data: { title: 'Updated saved draft' } }),
    },
  } as unknown as Parameters<typeof handleRecipeTranslation>[0];
  try {
    const result = await handleRecipeTranslation(ctx);
    assert.equal(result.status, 200);
    assert.equal((await result.json()).data.title, 'Updated saved draft');
    globalThis.fetch = async (_url, options) => {
      changed = true;
      return Response.json({ translations: JSON.parse(String(options?.body)).text.map((text: string) => ({ text })) });
    };
    assert.equal((await handleRecipeTranslation(ctx)).status, 409);
  } finally {
    globalThis.fetch = request;
    if (key === undefined) delete process.env.DEEPL_API_KEY; else process.env.DEEPL_API_KEY = key;
  }
});
