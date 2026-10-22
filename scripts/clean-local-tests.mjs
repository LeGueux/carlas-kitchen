// Soft-delete only the disposable fixtures created by this repository's acceptance checks.
import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:4321';
let cookie;
async function api(path, method = 'GET') {
  const response = await fetch(origin + '/_emdash/api' + path, { method, signal: AbortSignal.timeout(20000), headers: { Origin: origin, 'X-EmDash-Request': '1', ...(cookie ? { Cookie: cookie } : {}) } });
  const session = response.headers.getSetCookie().find((value) => value.startsWith('astro-session='));
  if (session) cookie = session.split(';')[0];
  const result = await response.json();
  assert.ok(response.ok, `${method} ${path}: ${response.status}`);
  return result.data;
}
await api('/auth/dev-bypass', 'POST');
let count = 0;
for (const locale of ['en', 'fr', 'pt-PT']) {
  const result = await api(`/content/recipes?locale=${locale}&limit=100`);
  for (const item of result.items) {
    if (/^example-(?:technical|linked)-\d+(?:-fr)?$/.test(item.slug ?? '') || item.slug === 'mobile-technical-example') {
      await api(`/content/recipes/${item.id}`, 'DELETE');
      count++;
    }
  }
}
console.log(`Moved ${count} disposable local test recipes to native EmDash trash. The two seeded example recipes are retained. Photo bytes are retained privately.`);
