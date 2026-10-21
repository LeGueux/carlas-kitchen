import assert from 'node:assert/strict';
// Calls the emitted Node handler locally; does not emulate Netlify's deployed network/context.
const { default: handler } = await import('../.netlify/v1/functions/ssr/ssr.mjs');
const response = await handler(new Request('http://localhost/'), { ip: '127.0.0.1' });
assert.equal(response.status, 503);
assert.match(response.headers.get('cache-control'), /no-store/);
const body = await response.text();
assert.ok(body.includes('temporarily unavailable') || body.includes('Deploy previews are disabled'));
assert.ok(!body.includes('file:./data') && !body.includes('LIBSQL_AUTH_TOKEN'));
console.log('PASS: emitted Netlify Node handler returns a private, sanitized 503 without configured remote services. No deployment was performed.');
if (process.argv.includes('--preview')) {
  assert.match(body, /Deploy previews are disabled/);
  for (const [path, method] of [['/_emdash/admin', 'GET'], ['/_emdash/api/auth/dev-bypass', 'POST'], ['/_emdash/api/media/upload-url', 'POST']]) {
    const blocked = await handler(new Request('http://localhost' + path, { method }), { ip: '127.0.0.1' });
    assert.equal(blocked.status, 503);
    assert.match(await blocked.text(), /Deploy previews are disabled/);
  }
  console.log('PASS: compiled deploy-preview gate rejects admin, sign-in and upload writes before CMS initialization.');
}
