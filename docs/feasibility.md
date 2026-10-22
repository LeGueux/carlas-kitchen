# Architecture feasibility

Investigation date: **2026-10-21**. Official documentation, the public documentation MCP and installed package sources were inspected before the public design was implemented. Documentation establishes contracts; it does not establish that an untested deployment works.

## Tools actually available

No authenticated EmDash site-content, Netlify or Turso connector/CLI session was exposed. The public **documentation MCP** at `https://docs.emdashcms.com/mcp` was called directly with the MCP initialize and tools/list methods. It reports `emdash-docs` 1.0.0 and a single read-only tool, `search_docs`. Its search was executed; it cannot inspect/create recipes, users or infrastructure. `scripts/research-emdash.mjs` reproduces this public documentation lookup without credentials. [Official distinction](https://docs.emdashcms.com/docs-mcp/).

A deployed site's separate MCP endpoint would manage that site's content using authenticated permissions. It is **disabled** in this POC (`mcp: false`); Carla never needs a token. No site MCP token is shipped.

## Findings

| Point | Evidence and decision | Verification boundary |
| --- | --- | --- |
| Astro / Node / Netlify | npm stable tags at investigation: EmDash 1.3.1, Astro 7.4.2, `@astrojs/netlify` 8.2.10. Netlify adapter peers on Astro 7; EmDash peers on Astro >=6. Node 24.22.1 satisfies installed engines. Official EmDash documentation describes Node deployments, not a tested Netlify recipe. | Local development and emitted Node function build tested; live Netlify compatibility still needs acceptance. |
| Turso | `libsql()` is EmDash's official remote SQLite adapter. Its runtime delegates to `@libsql/kysely-libsql`. The local wrapper only resolves runtime credentials, then calls `emdash/db/libsql.createDialect`. No custom SQL driver or embedded replica. | Local `file:` libSQL works. Remote Turso not tested. Production refuses file databases. |
| Sessions | EmDash writes the user ID into Astro sessions. The installed Netlify adapter defaults to Netlify Blobs with strong consistency. This project sets a separate named site-wide `kitchen-sessions` store explicitly. Accounts/passkeys remain in Turso. | Multiple independent local requests, logout/re-login and restart checks are recorded separately. A real cold Lambda invocation remains untested. |
| Migrations | Official core migration runner and generated secret-free `.emdash/migrations.json`. Runtime uses `check`; development may use `auto`. `db:init` applies core migrations and schema deliberately. Upgrades use `emdash migrate`, then `--check`. | Local core migration application and check tested. No remote migrations applied. |
| Storage contract | `StorageDescriptor` contains `entrypoint` and serializable `config`; entrypoint exports `createStorage`. `Storage` requires upload/download/delete/exists/list/getSignedUploadUrl/getPublicUrl. Metadata is returned through downloads and listings; ranges are optional. | Adapter implements this installed 1.3.1 interface with TypeScript checks and focused tests. |
| Maintained Blobs adapter | None identified in the official storage reference, installed exports or documentation search. Built-in options are local, S3 and Cloudflare bindings. This is a search result, not proof that no third-party adapter exists anywhere. | An isolated project adapter was necessary. |
| Blobs context | Current Astro Netlify output uses the v2 `Request, Context` function handler; Netlify supplies Blobs runtime context automatically. `getStore` is called lazily within an operation. No legacy `connectLambda` call and no personal token in runtime code. | SDK operations work in Netlify's local emulator. Real deployment context needs testing. |
| Upload transport | Netlify documents 6 MB buffered request/response limits; base64 expansion reduces effective binary payload to ~4.5 MB. The app allows **3,000,000 bytes per photo**, with a 3.2 MB whole-request guard for multipart overhead. Standard EmDash sends files individually. | Oversize and MIME rejection tested locally. Platform-level rejection above ingress limits remains outside app control. |
| Serverless tasks | EmDash's non-Cloudflare default creates a Node timer scheduler. Native publishing works synchronously; scheduled publishing, automatic backups, background imports, plugin tasks and recurring cleanup cannot be relied on in sleeping functions. | Scheduler factory replaced with `null`; scheduling removed from the recipe collection. No child-process sandbox runner installed. |

## Netlify-specific adaptations

1. **Scheduler:** a narrow Vite integration overrides `virtual:emdash/scheduler`. There is no documented off switch in 1.3.1. Re-evaluate this private virtual-module seam on upgrades.
2. **Phone photos:** 1.3.1 has no supported shared upload-preprocessor hook. A version-checked, idempotent install script adds one call at the start of native `uploadMedia()`, before hashing, dimensions and upload metadata. It compiles the project's TypeScript helper into the installed admin artifact so it also survives Vite dependency optimization. The administration, upload queue, routes, CSRF and permissions remain EmDash's. The earlier Vite-only transform did not reach the optimized development admin and was replaced after a failed large-photo test. Unexpected versions/signatures fail explicitly.
3. **Media privacy:** native media/file routes refuse internal backup/staging keys but otherwise serve known keys publicly, including draft uploads. The project restricts anonymous reads to the three photo fields of a **published live revision** in at least one configured language. Authenticated native sessions can read private media after a fresh disabled-user/role check. Unpublishing removes future public access, including shared-cache access because media responses are no-store. Bytes already downloaded by a visitor cannot be recalled.
4. **Thumbnails:** image optimization is disabled. EmDash admin thumbnail requests are redirected only to same-origin native media routes, through the same visibility policy. Arbitrary remote optimization URLs are refused. No image CDN caches drafts.
5. **Errors/previews:** an outer middleware gates deploy/branch previews before CMS initialization, adds private no-store headers and sanitizes service failures. Previews have no database/media credentials and cannot write to production.

## Free-tier boundary

- Netlify Free: **300 credits/month, hard limit**, no paid recharge. Production deployments consume 15 credits each; compute 10 credits/GB-hour, delivery 20 credits/GB and web requests 2 credits/10,000. Functions and Blobs are included. Exhaustion pauses projects; the POC does not upgrade or buy credits. Current documentation labels Blobs beta. Netlify's official Free announcement says no card is required; its older resource quotas are deliberately not reused.
- Turso Free: current pricing lists **100 databases, 5 GB storage, 500 million rows read/month, 10 million rows written/month, 3 GB monthly syncs**, and one day of point-in-time restore. Pricing explicitly says no credit card required. This app does not use sync/replicas. Keep independent backups rather than relying on short provider retention.
- Netlify's current API reference limits objects to 5 GB, keys to 600 bytes and metadata to 2 KB. The app's 3 MB limit is much smaller. Do not infer unlimited capacity or an independent fixed Blobs allowance from the credit budget: confirm the actual new account dashboard before launch. No account plan was inspected or changed here.
- A separate Free team/site is preferable for this experiment because exhausting a team's allowance can pause its other projects. Carla is an EmDash Editor, never a Netlify team member.

## Official sources

- [EmDash Node deployment](https://docs.emdashcms.com/deployment/nodejs/), [database options](https://docs.emdashcms.com/deployment/database/), [storage contract](https://docs.emdashcms.com/deployment/storage/), [migrations](https://docs.emdashcms.com/deployment/core-migrations/)
- [EmDash authentication / sessions / recovery](https://docs.emdashcms.com/guides/authentication/), [native internationalization and routing caveat](https://docs.emdashcms.com/guides/internationalization/), [field sharing](https://docs.emdashcms.com/reference/field-types/)
- [Astro Netlify adapter](https://docs.astro.build/en/guides/integrations-guide/netlify/), [Netlify function limits](https://docs.netlify.com/build/functions/configuration/), [Blobs API, context and consistency](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)
- [Current Netlify credits](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/), [billing FAQ](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/), [Free no-card announcement](https://www.netlify.com/blog/introducing-netlify-free-plan/)
- [Turso pricing](https://turso.tech/pricing), [database CLI](https://docs.turso.tech/cli/db/create), [Turso backup / shell](https://docs.turso.tech/cli/db/shell)

Installed source references are in `node_modules/emdash/src/storage/types.ts`, `src/db/adapters.ts`, `src/astro/integration/virtual-modules.ts`, `src/astro/middleware/auth.ts`, `src/astro/routes/api/media/` and `node_modules/@astrojs/netlify/dist/index.js`. The lockfile preserves the inspected releases.
