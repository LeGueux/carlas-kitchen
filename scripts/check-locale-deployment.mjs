import assert from 'node:assert/strict';

const origin = process.argv[2] ?? 'http://127.0.0.1:4321';
const get = (path) => fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(30000) });
for (const [path, language] of [['/', 'en'], ['/fr/', 'fr'], ['/pt-BR/', 'pt-BR']]) {
  const response = await get(path);
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const html = await response.text();
  assert.ok(html.includes(`lang="${language}"`), path);
  assert.ok(html.includes('hreflang="pt-BR"') && html.includes('Português (Brasil)'));
  assert.ok(!html.includes('href="/pt-PT/'));
  if (language === 'pt-BR') {
    assert.ok(html.includes('Gerenciar receitas'));
    assert.ok(html.includes('Buscar pelo título'));
  }
}
for (const [path, target] of [
  ['/pt-PT', '/pt-BR/'],
  ['/pt-PT/', '/pt-BR/'],
  ['/pt-PT/?q=tomate&category=doces', '/pt-BR/?q=tomate&category=doces'],
  ['/pt-PT/recipes/does-not-exist', '/pt-BR/recipes/does-not-exist'],
]) {
  const response = await get(path);
  assert.equal(response.status, 308, path);
  assert.equal(response.headers.get('location'), target);
}
assert.equal((await get('/pt-BR/recipes/does-not-exist')).status, 404);
console.log('PASS: Brazilian Portuguese, language links, legacy redirects, query preservation, missing recipes and private cache policy.');
