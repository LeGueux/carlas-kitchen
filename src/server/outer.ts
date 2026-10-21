import { defineMiddleware } from 'astro:middleware';

function unavailable(api: boolean, message = 'The recipe notebook is temporarily unavailable. Please try again shortly.') {
  return api
    ? Response.json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message } }, { status: 503 })
    : new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Carla’s Kitchen</title><body style="font:1.1rem system-ui;max-width:40rem;margin:15vh auto;padding:2rem;background:#faf7ef;color:#303c2c"><h1>Carla’s Kitchen</h1><p>${message}</p><p>Le carnet est temporairement indisponible. Réessayez dans un instant.</p><p>O caderno está temporariamente indisponível. Tente novamente dentro de momentos.</p><a href="/">Try again / Réessayer / Tentar novamente</a></body></html>`, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const api = context.url.pathname.startsWith('/_emdash/api/');
  let response: Response;
  if (__KITCHEN_PREVIEW__) {
    response = unavailable(api, 'Deploy previews are disabled to protect the dedicated production database and media.');
  } else if (context.url.pathname === '/_image') {
    // EmDash admin requests thumbnails even with image optimization disabled.
    // Redirect only local media back through its visibility gate; never fetch arbitrary URLs.
    const href = context.url.searchParams.get('href');
    let source: URL | undefined;
    try { if (href) source = new URL(href, context.url); } catch { /* Invalid thumbnail URL. */ }
    response = source?.origin === context.url.origin && source.pathname.startsWith('/_emdash/api/media/file/')
      ? context.redirect(source.pathname, 307)
      : new Response('Not found', { status: 404 });
  } else if (process.env.KITCHEN_WRITES === 'disabled' && !['GET', 'HEAD', 'OPTIONS'].includes(context.request.method)) {
    response = Response.json({ success: false, error: { code: 'READ_ONLY', message: 'The notebook is in maintenance mode. Please try saving later.' } }, { status: 503 });
  } else if (Number(context.request.headers.get('content-length')) > 3_200_000) {
    response = Response.json({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Photo upload exceeds the safe 3 MB limit. Choose the photo again to resize it automatically.' } }, { status: 413 });
  } else {
    try {
      response = await next();
      if (response.status >= 500) response = unavailable(api);
    } catch {
      // Never include provider exceptions, database URLs or tokens in responses/logs.
      response = unavailable(api);
    }
  }
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Netlify-CDN-Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
});
