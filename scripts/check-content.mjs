import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:4321';
let cookie;
async function api(path, method = 'GET', body) {
  const response = await fetch(origin + '/_emdash/api' + path, { method, signal: AbortSignal.timeout(20000), headers: { Origin: origin, 'X-EmDash-Request': '1', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const session = response.headers.getSetCookie().find((value) => value.startsWith('astro-session='));
  if (session) cookie = session.split(';')[0];
  const result = await response.json();
  assert.ok(response.ok, `${method} ${path}: ${JSON.stringify(result)}`);
  return result.data;
}
await api('/auth/dev-bypass', 'POST');
const slug = `example-linked-${Date.now()}`;
const en = (await api('/content/recipes', 'POST', { slug, locale: 'en', data: { title: 'Linked translation acceptance example', ingredients: '1 tomato', steps: 'Slice the tomato.', prep_minutes: 12, servings: 2, is_example: true } })).item;
const fr = (await api('/content/recipes', 'POST', { slug: `${slug}-fr`, locale: 'fr', translationOf: en.id, data: { title: 'Exemple de traduction liée', ingredients: '1 tomate', steps: 'Couper la tomate.' } })).item;
assert.equal(fr.data.prep_minutes, 12);
await api(`/content/recipes/${en.id}`, 'PUT', { data: { prep_minutes: 17, rating: 5 } });
await api(`/content/recipes/${en.id}/publish`, 'POST', {});
const updated = (await api(`/content/recipes/${fr.id}`)).item;
assert.equal(updated.data.prep_minutes, 17);
assert.equal(updated.data.rating, 5);
const translations = await api(`/content/recipes/${en.id}/translations`);
assert.equal(translations.translations.length, 2);
assert.equal((await fetch(origin + `/recipes/${slug}`)).status, 200);
assert.equal((await fetch(origin + `/fr/recipes/${slug}-fr`)).status, 404);
const publicHtml = await (await fetch(origin + `/recipes/${slug}`)).text();
assert.ok(!publicHtml.includes(`/fr/recipes/${slug}-fr`));
console.log('PASS: native linked translation creation, shared numerical field synchronization, separate publication and draft-free language links. Test drafts remain clearly fictional.');
