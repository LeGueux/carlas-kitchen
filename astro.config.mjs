import { defineConfig, sessionDrivers } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';
import emdash from 'emdash/astro';
import { libsql } from 'emdash/db';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { serverlessCompatibility } from './integrations/serverless.mjs';
import { locales, defaultLocale } from './src/config/locales.ts';

const path = (value) => fileURLToPath(new URL(value, import.meta.url)).replaceAll('\\', '/');
const preview = ['deploy-preview', 'branch-deploy'].includes(process.env.CONTEXT);
const databaseUrl = preview ? 'libsql://preview-disabled.invalid' : process.env.LIBSQL_DATABASE_URL ?? 'file:./data/kitchen.db';
if (process.env.NETLIFY && !preview && !databaseUrl.startsWith('libsql://')) {
  throw new Error('Netlify requires a dedicated remote LIBSQL_DATABASE_URL. Local files are development-only.');
}
if (!process.env.NETLIFY) mkdirSync('data', { recursive: true });
const database = libsql({ url: databaseUrl, migrationAuthTokenEnv: 'LIBSQL_AUTH_TOKEN' });
// Preserve the official migration executor; resolve the runtime token outside the build bundle.
database.entrypoint = path('./src/db/runtime-libsql.ts');

export default defineConfig({
  output: 'server',
  site: process.env.EMDASH_SITE_URL ?? 'http://localhost:4321',
  adapter: netlify({ imageCDN: false, cacheOnDemandPages: false, devFeatures: { edgeFunctions: false, environmentVariables: false, images: false } }),
  i18n: { defaultLocale, locales: [...locales] },
  session: {
    driver: sessionDrivers.netlifyBlobs({ name: 'kitchen-sessions', consistency: 'strong' }),
    cookie: { httpOnly: true, sameSite: 'lax', secure: !!process.env.NETLIFY },
    ttl: 60 * 60 * 24 * 7,
  },
  integrations: [
    react(),
    serverlessCompatibility(),
    emdash({
      database,
      storage: { entrypoint: path('./src/storage/netlify-blobs.ts'), config: { name: 'kitchen-media' } },
      migrations: { runtime: 'check', dev: 'auto' },
      middleware: { outer: new URL('./src/server/outer.ts', import.meta.url) },
      maxUploadSize: 3_000_000,
      images: false,
      fonts: false,
      mcp: false,
      toolbar: false,
      updateCheck: false,
      plugins: [],
      sandboxed: [],
      admin: { siteName: "Carla’s Kitchen", locales: [...locales] },
    }),
  ],
  vite: {
    plugins: [tailwind()],
    define: { __KITCHEN_PREVIEW__: JSON.stringify(preview) },
  },
});
