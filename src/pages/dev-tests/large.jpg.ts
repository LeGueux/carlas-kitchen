import type { APIRoute } from 'astro';
export const GET: APIRoute = async () => {
  if (!import.meta.env.DEV) return new Response('Not found', { status: 404 });
  const { readFile } = await import('node:fs/promises');
  const data = await readFile('data/large-example.jpg');
  return new Response(data, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } });
};
