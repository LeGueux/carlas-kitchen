import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const origin = 'http://127.0.0.1:4321';
let cookie = '';
async function request(path, { method = 'GET', body, anonymous = false, headers = {} } = {}) {
  const response = await fetch(origin + path, {
    method, redirect: 'manual', signal: AbortSignal.timeout(20000),
    headers: { Origin: origin, 'X-EmDash-Request': '1', ...(!anonymous && cookie ? { Cookie: cookie } : {}), ...(body && typeof body === 'object' && !(body instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body === undefined ? undefined : body instanceof Uint8Array ? body : JSON.stringify(body),
  });
  const setCookie = response.headers.getSetCookie().find((value) => value.startsWith('astro-session='));
  if (!anonymous && setCookie) cookie = setCookie.split(';')[0];
  return response;
}
async function json(path, options = {}) {
  const response = await request(path, options);
  const value = await response.json();
  assert.ok(response.ok, `${options.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(value)}`);
  return value.data;
}
await json('/_emdash/api/auth/dev-bypass', { method: 'POST' });
const user = await json('/_emdash/api/auth/me');
for (let attempt = 0; attempt < 3; attempt++) assert.equal((await json('/_emdash/api/auth/me')).id, user.id);
console.log('PASS: native development session across four independent HTTP requests (not a passkey test).');
const png = new Uint8Array(await readFile('public/placeholders/tomato.png'));
const photos = [];
for (let index = 0; index < 3; index++) {
  const upload = await json('/_emdash/api/media/upload-url', { method: 'POST', body: { filename: `smoke-${Date.now()}-${index}.png`, contentType: 'image/png', size: png.length, deduplicate: false } });
  assert.match(upload.uploadUrl, /^\/_emdash\/api\/media\/[^/]+\/upload$/);
  const uploaded = await request(upload.uploadUrl, { method: 'PUT', body: png, headers: upload.headers });
  assert.ok(uploaded.ok, `Upload: ${uploaded.status} ${await uploaded.text()}`);
  const item = (await json(`/_emdash/api/media/${upload.mediaId}/confirm`, { method: 'POST', body: { size: png.length, width: 1200, height: 900 } })).item;
  photos.push({ provider: 'local', id: item.id, src: item.url, alt: 'Fictional example photo', width: 1200, height: 900 });
  assert.equal((await request(item.url, { anonymous: true })).status, 404);
  assert.equal((await request(item.url)).status, 200);
}
console.log('PASS: three native upload/confirm flows into the Netlify Blobs local emulator; unlinked media private.');
const oversized = await request('/_emdash/api/media/upload-url', { method: 'POST', body: { filename: 'too-big.png', contentType: 'image/png', size: 3_000_001 } });
assert.equal(oversized.status, 413);
assert.equal((await request('/_emdash/api/media/upload-url', { method: 'POST', body: { filename: 'bad.svg', contentType: 'image/svg+xml', size: 100 } })).status, 400);
console.log('PASS: oversized upload and unsupported MIME rejected.');
const slug = `example-technical-${Date.now()}`;
const item = (await json('/_emdash/api/content/recipes', { method: 'POST', body: { slug, locale: 'en', data: { title: 'Technical acceptance example', description: 'Clearly fictional technical test.', ingredients: '1 tomato', steps: 'Slice the tomato.', rating: 4, servings: 2, is_example: true, cover_image: photos[0], photo_2: photos[1], photo_3: photos[2] } } })).item;
assert.equal((await request(`/recipes/${slug}`, { anonymous: true })).status, 404);
assert.equal((await request(photos[0].src, { anonymous: true })).status, 404);
await json(`/_emdash/api/content/recipes/${item.id}/publish`, { method: 'POST', body: {} });
const publicPage = await request(`/recipes/${slug}`, { anonymous: true });
assert.equal(publicPage.status, 200);
assert.ok((await publicPage.text()).includes('Technical acceptance example'));
const photoResponse = await request(photos[0].src, { anonymous: true });
assert.equal(photoResponse.status, 200);
assert.equal(photoResponse.headers.get('content-type'), 'image/png');
assert.deepEqual(new Uint8Array(await photoResponse.arrayBuffer()), png);
console.log('PASS: native publication immediately updates public page and media visibility.');
await mkdir('test-results', { recursive: true });
await writeFile('test-results/restart.json', JSON.stringify({ slug, photo: photos[0].src, cookie, userId: user.id }));
await json('/_emdash/api/auth/logout', { method: 'POST' });
assert.equal((await request('/_emdash/api/auth/me')).status, 401);
await json('/_emdash/api/auth/dev-bypass', { method: 'POST' });
assert.equal((await json('/_emdash/api/auth/me')).id, user.id);
// Store only locally ignored evidence for an explicit server-restart check.
await writeFile('test-results/restart.json', JSON.stringify({ slug, photo: photos[0].src, cookie, userId: user.id }));
console.log('PASS: logout invalidates session, development re-login creates a working session.');
