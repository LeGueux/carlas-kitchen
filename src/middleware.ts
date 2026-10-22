import { defineMiddleware } from 'astro:middleware';
import { getEmDashCollection } from 'emdash';
import { locales } from './config/locales';
import { publishedRecipeUsesMedia } from './server/media-policy';
import { validatePhoto } from './storage/netlify-blobs';

const error = (code: string, message: string, status: number) => Response.json({ success: false, error: { code, message } }, { status });

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  if (/^\/_emdash\/api\/content\/[^/]+\/[^/]+\/(?:schedule|unschedule)$/.test(path)) {
    return error('DISABLED', 'Scheduled publishing is unavailable in this serverless POC. Use Publish now.', 403);
  }
  // Backups, transfers, remote plugin installation and scheduler endpoints are outside this POC.
  if (/^\/_emdash\/api\/(?:admin\/(?:backups|transfer)|plugins|maintenance|cron)(?:\/|$)/.test(path)) {
    return error('DISABLED', 'This serverless POC uses manual backups and immediate publication.', 403);
  }
  if (path.startsWith('/_emdash/api/media/file/')) {
    let key: string;
    try { key = decodeURIComponent(path.slice('/_emdash/api/media/file/'.length)); }
    catch { return new Response('Not found', { status: 404 }); }
    if (!/^(?:[A-Za-z0-9_-]+\.)+(?:jpg|jpeg|png|webp)$/i.test(key)) return new Response('Not found', { status: 404 });
    let canReadPrivateMedia = (context.locals.user?.role ?? 0) >= 20;
    // Native auth skips public media routes. Resolve the same Astro session and
    // recheck the live user record here, including revocation/disabled status.
    if (!canReadPrivateMedia && context.cookies.has('astro-session') && context.locals.emdash?.db) {
      const identity = await context.session?.get('user');
      if (identity?.id) {
        const user = await context.locals.emdash.db.selectFrom('users').select(['role', 'disabled']).where('id', '=', identity.id).executeTakeFirst();
        canReadPrivateMedia = !!user && !user.disabled && user.role >= 20;
      }
    }
    if (!canReadPrivateMedia) {
      if (!context.locals.emdash?.db) return new Response('Not found', { status: 404 });
      const media = await context.locals.emdash.db.selectFrom('media').select(['id', 'status']).where('storage_key', '=', key).executeTakeFirst();
      if (!media || media.status !== 'ready') return new Response('Not found', { status: 404 });
      let visible = false;
      for (const locale of locales) {
        let cursor: string | undefined;
        do {
          const result = await getEmDashCollection('recipes', { locale, status: 'published', limit: 100, cursor });
          if (result.error) throw result.error;
          visible = result.entries.some((entry) => publishedRecipeUsesMedia(entry.data, media.id, key));
          cursor = result.nextCursor;
        } while (!visible && cursor);
        if (visible) break;
      }
      if (!visible) return new Response('Not found', { status: 404 });
    }
  }
  if (context.locals.user && !['GET', 'HEAD', 'OPTIONS'].includes(context.request.method)) {
    if (path === '/_emdash/api/media/upload-url') {
      const body = await context.request.clone().json();
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(body.contentType)) return error('INVALID_TYPE', 'Choose a JPEG, PNG or WebP photo.', 400);
      if (body.size > 3_000_000) return error('PAYLOAD_TOO_LARGE', 'Photo exceeds 3 MB. Choose it again to resize automatically.', 413);
    }
    if (/^\/_emdash\/api\/media(?:\/[A-Za-z0-9]+\/(?:upload|replace))?$/.test(path)) {
      const request = context.request.clone();
      const mime = request.headers.get('content-type') ?? '';
      let bytes: Uint8Array;
      let contentType: string;
      if (mime.startsWith('multipart/form-data')) {
        const file = (await request.formData()).get('file');
        if (!(file instanceof File)) return error('NO_FILE', 'Choose a photo.', 400);
        bytes = new Uint8Array(await file.arrayBuffer());
        contentType = file.type;
      } else {
        // Bound chunked bodies too; Netlify's ingress limit remains the outer transport guard.
        const reader = request.body?.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        if (!reader) return error('NO_FILE', 'Choose a photo.', 400);
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.length;
          if (size > 3_000_000) { await reader.cancel(); return error('PAYLOAD_TOO_LARGE', 'Photo exceeds 3 MB.', 413); }
          chunks.push(chunk.value);
        }
        bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        contentType = mime.split(';')[0];
      }
      try { validatePhoto(bytes, contentType); }
      catch (cause) {
        const failure = cause as Error & { code?: string };
        return error(failure.code ?? 'INVALID_PHOTO', failure.message, failure.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400);
      }
    }
  }
  return next();
});
