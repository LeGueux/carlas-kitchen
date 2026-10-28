import assert from 'node:assert/strict';

// Deliberately hard-coded localhost. Never run this account/fixture flow on production.
const origin = 'http://127.0.0.1:4321';
let cookie = '';
async function request(path, { method = 'GET', body, anonymous = false, csrf = true } = {}) {
  const response = await fetch(origin + path, {
    method, redirect: 'manual', signal: AbortSignal.timeout(30000),
    headers: { Origin: origin, ...(csrf ? { 'X-EmDash-Request': '1' } : {}), ...(!anonymous && cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const session = response.headers.getSetCookie().find((value) => value.startsWith('astro-session='));
  if (session && !anonymous) cookie = session.split(';')[0];
  return response;
}
async function json(path, options) {
  const response = await request(path, options);
  const body = await response.json();
  assert.ok(response.ok && body.success, `${path}: ${response.status}`);
  return body.data;
}
const base = '/_emdash/api/plugins/kitchen-translations';
await json('/_emdash/api/auth/dev-bypass', { method: 'POST' });
assert.equal((await json(`${base}/status`)).configured, true);
assert.equal((await request(`${base}/status`, { anonymous: true })).status, 401);
assert.equal((await request(`${base}/translate`, { method: 'POST', body: {}, csrf: false })).status, 403);
const recipe = { title: 'Salada de tomate', ingredients: '2 tomates\n1 pitada de sal', steps: 'Corte os tomates.\nMisture com o sal.', prep_minutes: 5, servings: 2, is_example: true };
const created = await json('/_emdash/api/content/recipes', { method: 'POST', body: { locale: 'pt-BR', data: recipe, status: 'draft' } });
const sourceId = created.item.id;
const source = await json(`/_emdash/api/content/recipes/${sourceId}`);
const stamp = (item) => JSON.stringify([item.updatedAt, item.draftRevisionId ?? null, item.liveRevisionId ?? null, item.version ?? null]);
for (const target of ['fr', 'en']) {
  const translated = await json(`${base}/translate`, { method: 'POST', body: { id: sourceId, target, revision: stamp(source.item) } });
  assert.equal(translated.ingredients.split('\n').length, 2);
  assert.ok(translated.ingredients.includes('2'));
  assert.ok(!('servings' in translated));
  const result = await json('/_emdash/api/content/recipes', { method: 'POST', body: { locale: target, translationOf: sourceId, status: 'draft', data: translated } });
  assert.equal(result.item.status, 'draft');
  assert.equal(result.item.data.servings, 2);
  assert.equal(result.item.data.prep_minutes, 5);
  assert.equal(result.item.translationGroup, source.item.translationGroup);
  const route = `${target === 'en' ? '' : '/fr'}/recipes/${result.item.slug}`;
  assert.equal((await request(route, { anonymous: true })).status, 404);
  assert.equal((await request('/_emdash/api/content/recipes', { method: 'POST', body: { locale: target, translationOf: sourceId, data: translated } })).status, 409);
  const current = await json(`/_emdash/api/content/recipes/${result.item.id}`);
  const updated = await json(`/_emdash/api/content/recipes/${result.item.id}`, { method: 'PUT', body: { _rev: current._rev, data: { notes: 'Manual correction fixture' } } });
  assert.ok(updated);
  assert.equal((await request(`/_emdash/api/content/recipes/${result.item.id}`, { method: 'PUT', body: { _rev: current._rev, data: translated } })).status, 409);
}
assert.equal((await request(`${base}/translate`, { method: 'POST', body: { id: sourceId, target: 'fr', revision: 'stale' } })).status, 409);
console.log('PASS: real DeepL FR/EN, native linked drafts, shared numeric fields, unpublished pages, duplicate prevention, stale-write refusal, authentication and CSRF.');
