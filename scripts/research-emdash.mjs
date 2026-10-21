// Read-only discovery of the public documentation MCP; never uses site credentials.
const endpoint = 'https://docs.emdashcms.com/mcp';
let session;
async function rpc(id, method, params) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(session ? { 'mcp-session-id': session } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  session = response.headers.get('mcp-session-id') ?? session;
  const body = await response.text();
  if (!response.ok) throw new Error(`Documentation MCP returned ${response.status}: ${body}`);
  const data = body.startsWith('data:') || body.includes('\ndata:')
    ? JSON.parse(body.split('\n').find((line) => line.startsWith('data:')).slice(5))
    : JSON.parse(body);
  return data;
}
console.log(JSON.stringify(await rpc(1, 'initialize', {
  protocolVersion: '2025-03-26', capabilities: {},
  clientInfo: { name: 'carlas-kitchen-feasibility', version: '0.1.0' },
}), null, 2));
const listing = await rpc(2, 'tools/list', {});
console.log(JSON.stringify(listing, null, 2));
const search = listing.result?.tools?.find((tool) => tool.name === 'search_docs');
if (search) {
  console.log(JSON.stringify(await rpc(3, 'tools/call', {
    name: search.name,
    arguments: { query: 'Netlify Node.js serverless libsql sessions storage adapter scheduler' },
  }), null, 2));
}
