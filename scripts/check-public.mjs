import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:4321';
const get = async (path) => fetch(origin + path, { signal: AbortSignal.timeout(20000), redirect: 'manual' });
for (const [path, expected] of [
  ['/', 'Good food.'], ['/fr/', 'Les bons plats.'], ['/pt-BR/', 'Boa comida.'],
  ['/recipes/example-roasted-tomato-toast', 'Roasted tomato toast'],
  ['/fr/recipes/exemple-tartines-tomates-roties', 'Tartines aux tomates'],
  ['/pt-BR/recipes/exemplo-tostas-tomate-assado', 'Torradas com tomate'],
]) {
  const response = await get(path);
  assert.equal(response.status, 200, path);
  assert.ok((await response.text()).includes(expected), path);
  assert.match(response.headers.get('cache-control'), /no-store/);
}
const lemon = await (await get('/recipes/example-lemon-yogurt')).text();
const brazilianPage = await (await get('/pt-BR/')).text();
assert.ok(brazilianPage.includes('lang="pt-BR"') && brazilianPage.includes('Português (Brasil)'));
assert.ok(brazilianPage.includes('Gerenciar receitas') && !brazilianPage.includes('Gerir receitas'));
for (const path of ['/pt-PT', '/pt-PT/?q=tomate', '/pt-PT/recipes/exemplo-tostas-tomate-assado']) {
  const response = await get(path);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), path.replace('/pt-PT', '/pt-BR') + (path === '/pt-PT' ? '/' : ''));
}
assert.ok(lemon.includes('/pt-BR/?missing=1'));
assert.ok(!(await (await get('/pt-BR/')).text()).includes('Lemon &amp; honey yogurt'));
assert.equal((await get('/pt-BR/recipes/example-lemon-yogurt')).status, 404);
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
