# Deploy the dedicated POC

These are **remaining external steps**, not a record of a completed deployment. Use new resources belonging only to this experiment. Never copy credentials/data from another service. Stay on the Free plans, do not add a payment method or enable a paid add-on. Carla does not need either infrastructure account.

## 1. Dedicated Turso database

Create/sign into a Free Turso account. Install the official Turso CLI if desired, then authenticate as the developer. On Windows use the supported CLI installation method or WSL; the application itself runs on Windows Node.

```sh
turso db create carlas-kitchen-poc
turso db show carlas-kitchen-poc --url
turso db tokens create carlas-kitchen-poc --expiration 30d
```

The last command prints a secret: run it privately, store it in your password manager/secret environment, and do not paste it into Git, chat, screenshots or logs. Record the expiry and rotate it before expiry. This is a token for the dedicated database, not a Turso account administration token.

Set `LIBSQL_DATABASE_URL=libsql://<dedicated-host>` and `LIBSQL_AUTH_TOKEN=<dedicated-token>` in an ignored local `.env`. Then initialize explicitly:

```sh
npm run db:init -- --remote
# Optional, once, to load clearly fictional examples into the test site:
npm run db:demo -- --remote
```

The initialization script uses the official libSQL dialect and official EmDash migrations/seed API. It refuses remote writes without `--remote` and uses conflict mode `skip`. Never upload the development SQLite file: it contains test authentication bypass users/tokens.

## 2. Dedicated Netlify Free site

Create a new Free site with the Git repository, select the intended production branch, build command `npm run check && npm run build` and publish directory `dist`. `netlify.toml` records these defaults. The adapter emits its Node function under `.netlify/v1/functions/ssr/` and Netlify deployment configuration under `.netlify/v1/`.

Use a stable `https://<chosen-name>.netlify.app` hostname for the POC. Set the environment values below before building; save secrets only in the site's environment UI with **Functions** scope. Generate a 32-byte hex encryption key privately (EmDash's `secrets generate` command can write it directly to ignored `.env`). Keep the key in a password manager and backup; don't regenerate it at each deploy.

The app does not put credentials into `astro.config.mjs` descriptors. The official adapter receives its token from `process.env` at invocation time through `src/db/runtime-libsql.ts`. Blobs use Netlify's built-in request context; no `NETLIFY_AUTH_TOKEN` is needed in application runtime.

| Variable / resource | Build | Functions runtime | Local development | Production/test production context | Deploy previews / branch deploys |
| --- | --- | --- | --- | --- | --- |
| `LIBSQL_DATABASE_URL` | Required non-secret URL for the migration manifest | Same dedicated remote URL | Defaults to local `file:./data/kitchen.db` | Dedicated Turso database | Unset; preview config embeds a disabled placeholder target |
| `LIBSQL_AUTH_TOKEN` | **Not needed** | Required, secret, read/write to dedicated DB | Unset for local file | Dedicated DB token only | **Do not provide** |
| `EMDASH_SITE_URL` | Required canonical HTTPS origin | Same origin | `http://127.0.0.1:4321` or localhost, consistently | Stable Netlify hostname | Can use preview origin; CMS is disabled anyway |
| `EMDASH_ENCRYPTION_KEY` | Not needed | Persistent 64-hex-character secret | Optional when no plugin secrets are used | Generate once; retain securely | **Do not provide** |
| `AWS_LAMBDA_JS_RUNTIME` | Not used by the app build | `nodejs24.x`, configure in UI then redeploy | Not used | Node 24 runtime | Node 24 runtime |
| `NODE_VERSION` | `24.22.1` from TOML | Runtime follows the configured Lambda version | Installed Node 24 | Pin supported Node 24 | Same |
| `KITCHEN_WRITES` | No credentials | `enabled` normally; `disabled` blocks HTTP mutations during maintenance | `enabled` | Developer maintenance switch | `disabled` from TOML; all dynamic preview access is additionally blocked |
| `CONTEXT`, `NETLIFY` | Set by Netlify | Platform-managed | Unset | Platform-managed | `deploy-preview` / `branch-deploy` compile the fail-closed gate |
| Media store | No write at build | `getStore('kitchen-media')`, strong consistency | Netlify local emulator | Site-wide, survives deployments | No CMS access; no production operations |
| Session store | No write at build | `getStore('kitchen-sessions')`, strong consistency | Separate local store | Site-wide, seven-day session configuration | No sign-in/write path |

Use Netlify's environment **context scoping**: do not put production secrets in “all contexts”. If deploying manually with a CLI, use an actual Netlify build (`netlify build` followed by a matching deploy) rather than uploading `dist` alone. This server-rendered site requires the generated functions as well as static files. Do not deploy local SQLite builds as production: production code refuses file databases even when the platform does not set `NETLIFY` at runtime.

## 3. Migration ordering

On the first deployment, `db:init -- --remote` has already created core tables and the recipe model. The build itself never migrates or seeds the remote database.

For later EmDash upgrades, back up first; install/review the new stable compatible packages and both compatibility seams; build with the new package version and the dedicated database URL to emit `.emdash/migrations.json`; apply `emdash migrate` using a private developer environment with the dedicated token; run `emdash migrate --check`; only then deploy the matching build. The manifest contains a variable **name**, not the token. `node --env-file=.env node_modules/emdash/dist/cli/index.mjs migrate --check` loads an ignored environment explicitly when running outside Astro. `npm run db:check` uses shell environment variables.

Runtime migration mode is `check`: pending core migrations return 503, not an opportunistic migration in a Lambda invocation. Avoid changing schemas from multiple active builds concurrently. The POC has no automated application-schema evolution system: future model changes require an explicit reviewed EmDash schema update, not rerunning the schema seed with overwrite.

## 4. First real accounts

1. Visit the stable HTTPS hostname's `/_emdash/admin` immediately after deployment and complete native setup as the developer. The first real account is **Admin**.
2. Register the developer's primary passkey and an independent second passkey in account settings. A localhost passkey cannot sign into the Netlify hostname.
3. In **Users**, create an invitation for Carla with role **Editor (40)**. No email provider is configured: copy the generated single-use invitation link and give it to Carla directly. Do not assume “send email” delivers anything.
4. Carla opens that link on the stable hostname, registers her own passkey, and adds a second passkey/device. Invite links expire after seven days.
5. Test her actual account: create/edit/translate/publish a recipe, upload media, add a category; confirm CMS settings and user management remain denied. Unit tests verify the native role grants; this exact real-account/device check is still required.

No real developer or Carla account was created by this implementation session: no final hostname or real identity/passkey ceremony was available. The local bypass account is only a disposable testing aid.

## 5. Complete the remote vertical slice before inviting Carla

- Sign in, make several requests, then test a cold invocation after idle or another deployment; confirm the session survives.
- Create one recipe in the administration, upload three JPEG/PNG/WebP photos, publish, and view it anonymously. Test an image available only in a draft: anonymous file and thumbnail requests must return 404.
- Choose a large supported phone photo and confirm reduction and upload finish within Netlify's limits; try an oversized raw request and verify the app's 413 below ingress limits. A platform 413 above its ~4.5 MB binary ceiling cannot be replaced by app code.
- Deploy the same commit again **without initialization/seed**. Keep the same dedicated Turso database and site-wide Blobs stores; verify recipe, images and session are retained.
- Complete the remaining checklist in [verification](verification.md), including real iOS/Android passkeys. Record the URL and results there. Until then, the architecture is locally validated, not production certified.

## Preview isolation

Deploy previews and non-production branch deploys return 503 for dynamic routes before CMS initialization. This is intentional; they are not usable editor environments. Their builds do not receive the production token/key. Do not temporarily remove the gate while pointing at production. A future writable staging environment must have a separate Netlify site, Turso database, media/session stores and credentials.
