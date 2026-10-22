import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:4321';
const get = async (path) => fetch(origin + path, { signal: AbortSignal.timeout(20000), redirect: 'manual' });
for (const [path, expected] of [
  ['/', 'Good food.'], ['/fr/', 'Les bons plats.'], ['/pt-PT/', 'Boa comida.'],
  ['/recipes/example-roasted-tomato-toast', 'Roasted tomato toast'],
  ['/fr/recipes/exemple-tartines-tomates-roties', 'Tartines aux tomates'],
  ['/pt-PT/recipes/exemplo-tostas-tomate-assado', 'Tostas de tomate'],
]) {
  const response = await get(path);
  assert.equal(response.status, 200, path);
  assert.ok((await response.text()).includes(expected), path);
  assert.match(response.headers.get('cache-control'), /no-store/);
}
const lemon = await (await get('/recipes/example-lemon-yogurt')).text();
assert.ok(lemon.includes('/pt-PT/?missing=1'));
assert.ok(!(await (await get('/pt-PT/')).text()).includes('Lemon &amp; honey yogurt'));
assert.equal((await get('/pt-PT/recipes/example-lemon-yogurt')).status, 404);
assert.equal((await get('/recipes/does-not-exist')).status, 404);
const search = await (await get('/?q=tomato')).text();
assert.ok(search.includes('Roasted tomato toast'));
assert.ok(!search.includes('Lemon &amp; honey yogurt'));
assert.ok((await (await get('/?q=does-not-exist')).text()).includes('A fresh page'));
const category = await (await get('/?category=sweet')).text();
assert.ok(category.includes('Lemon &amp; honey yogurt'));
assert.ok(!category.includes('Roasted tomato toast'));
assert.equal((await get('/_emdash/api/media/file/backups/private.png')).status, 404);
assert.equal((await get('/_image?href=https://example.com/private.jpg')).status, 404);
console.log('PASS: three locales, independent slugs, missing translation, category, title search, empty state, 404, cache policy and internal media refusal.');
