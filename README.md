# Carla’s Kitchen

A functional Astro / EmDash proof of concept for a personal, multilingual recipe notebook. The public site is server rendered; Carla edits in the native EmDash administration. No custom CMS, visitor accounts, paid translation API, R2, VPS or unrelated service is used.

Languages: English (`en`), French (`fr`) and Brazilian Portuguese (`pt-BR`). The former Portuguese variant has an explicit [data migration](docs/content-model.md#existing-portuguese-data) and redirects preserving existing recipe slugs.

**Delivery status:** the POC is published at [carlas-kitchen.netlify.app](https://carlas-kitchen.netlify.app/), with a dedicated Turso database initialized by the developer. Public SSR routes and the native setup screen were checked remotely; the developer completed real Admin setup. Remote media uploads, cold starts and redeployment persistence still need acceptance testing. See [verification](docs/verification.md) for evidence and remaining work.

## Start locally

Use Node **24.22.1 or later within Node 24** and npm 12. The installed Astro 7.4.2 declares Node `>=22.23.4`; the EmDash 1.3.1 package declares `>=22.16`. Node 24.22.1 satisfies both. Stable packages are pinned exactly, and `package-lock.json` is tracked.

```sh
npm ci
npm run db:init
npm run db:demo
npm run dev
```

Open [the notebook](http://127.0.0.1:4321/) or [EmDash administration](http://127.0.0.1:4321/_emdash/admin). Development uses the official libSQL adapter against `data/kitchen.db` and the **real Netlify Blobs SDK with Netlify's local emulator**, persisted under ignored `.netlify/blobs-serve/`. This is not a remote Turso/Blobs connection.

For normal setup, create the first administrator with a passkey in EmDash. For disposable local testing, EmDash provides `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin`. It creates a **development test administrator**, not the developer's real production account. This native endpoint is unavailable in production. Never migrate a development database with bypass users/tokens to production; initialize a fresh dedicated database instead.

`.env` is optional for local files. To configure it, copy `.env.example`; leave the Turso token unset for a local database. Generate a private encryption key with `npx emdash secrets generate --write .env` if needed. Never commit `.env`. Production keys belong in Netlify's site environment UI, restricted to the Production deploy context; on Free they use all scopes. Use a separate ignored `.env.remote` for deliberate remote initialization, as explained in the first-deployment guide. Astro telemetry is disabled by the wrapper. On Windows the local Netlify emulator's configuration is also isolated inside this checkout, rather than reading another project's account configuration.

The schema is applied explicitly by `db:init`. `db:demo` adds two clearly fictional recipes (five translated entries) without replacing existing content. Both use conflict mode `skip`. EmDash may also apply the embedded **schema-only** seed once to a fresh database. There is no destructive startup seed and no automatic example import on deployment.

## Validate

```sh
npm run check
npm test
npm run build
npm run db:check
```

Stop the development server **before building**: both the Netlify development adapter and its builder manage `.netlify/build`. Running them concurrently can remove the builder's entry point. An EmDash admin chunk-size warning is expected; public pages have no application JavaScript bundle.

With the development server running in a dedicated disposable environment:

```sh
node scripts/smoke-local.mjs
node scripts/check-public.mjs
# Stop and restart the entire development server, then:
node scripts/check-restart.mjs
```

The smoke test creates fictional acceptance entries/photos through authenticated native EmDash endpoints and saves a local session cookie in ignored `test-results/restart.json`. Do not publish or commit that directory. Restart verification is a local persistence test, not a Netlify redeployment test.

To test browser photo reduction, run `node scripts/create-large-photo.mjs`, then open `/dev-tests/photo` on the local development server and click the test button. The generated noise image and diagnostic page are development-only; production requests return 404. The helper is also installed into EmDash's shared upload entry by a small version-checked compatibility patch on install, before development and before build.

## Documentation

- [First deployment walkthrough (start here)](docs/first-deployment.md)
- [Architecture feasibility and official sources](docs/feasibility.md)
- [Netlify / Turso deployment and environment matrix](docs/deployment.md)
- [Carla's browser workflow](docs/carla-guide.md)
- [Database and media backup / restore](docs/backup-restore.md)
- [Content, translations and intentional limitations](docs/content-model.md)
- [Verification ledger and remote acceptance checklist](docs/verification.md)

All repository documentation is in English. Public editorial/interface content and EmDash's built-in administration follow the selected language.
