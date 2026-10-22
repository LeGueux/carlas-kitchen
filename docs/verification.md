# Verification ledger

Initial verification: **2026-10-21**. Environment: Windows, Node 24.22.1, npm 12.2.1. The initial delivery used a dedicated local libSQL file and Netlify's local Blobs emulator. At that point no Netlify URL, remote database or real account had been created. The table below records that initial local work; later remote progress is recorded separately.

## Executed locally

| Acceptance point | Evidence / result |
| --- | --- |
| Native administration | Actual EmDash React administration loaded in the browser, using the native development-only test account. No replacement editor. |
| Mobile create/edit | At 390 × 844, created a fictional recipe with ingredients/steps, saved, changed values and set personal rating 5. Native settings allowed category creation and linked FR translation. Filled the French text and published it through the native confirmation dialog; EmDash displayed its live public link. |
| Photo input / media field | A normal PNG was selected through the native file chooser in the recipe image field, uploaded, appeared in the library and was attached to a gallery slot. Existing library media was attached as cover. Images display privately after the media-session correction. |
| Three uploads / persistence | `smoke-local.mjs` exercised three separate native upload-url → authenticated PUT → confirm flows. Stored bytes were read back from the local Blobs emulator and compared. This uses the real SDK/emulator, not the unit-test fake store. |
| Large photo | A 6,058,177-byte generated JPEG was reduced to 2,018,662 bytes in a browser. The development harness called the **actual exported native admin `uploadMedia()` function** and confirmed the reduced object was stored in Blobs. The first native chooser attempt failed before the optimizer/patch correction; the final shared upload-function test passed after correction. A second full OS picker run with that large file was not repeated. |
| Oversize / type rejection | Native upload metadata requests above 3,000,000 bytes return 413 with an explanation. Unsupported MIME returns 400. Adapter tests reject oversized buffers/streams and spoofed magic bytes. Platform ingress limits were not tested remotely. |
| Session between requests | Four independent native HTTP requests with the same opaque Astro session succeed. Logout makes `/auth/me` return 401. Native development re-login creates a working session. This is not a real WebAuthn login test. |
| Complete local restart | Stopped/restarted the process; `check-restart.mjs` confirmed the same session, published recipe and uploaded image still work. This proves local file/emulator persistence, not a Lambda cold start or remote redeploy. |
| Categories / rating | Rating saved in the mobile editor. Created “Mobile examples” through the native taxonomy chooser, which immediately selected and saved the category. Native Editor role permission assertions include taxonomy management. |
| Linked translations | Created a linked FR entry through the mobile admin. `check-content.mjs` also created a native translation, verified inherited values, then verified numerical field synchronization on **publication** and independent publication states. |
| Language navigation / missing language | EN/FR/pt-PT pages and independent seeded slugs return 200. The second recipe's PT link points to a clearly labelled missing-language collection. No invented translation. A missing localized URL returns 404. Draft translation slugs are absent from public language links. |
| Draft isolation | Anonymous draft recipe and draft-only/unlinked media return 404. Authenticated test editor can read private media. Public visibility begins only after publication. Internal backup paths and arbitrary remote image optimization are refused. |
| Live publication | Native publish immediately made a recipe and its photo accessible with no Git change/build. The mobile French example also showed a live link after publication. |
| Public UI | Mobile list and recipe inspected visually. Image loaded with alt text. Read-only DOM measurement showed document width 375 within a 390 viewport: no horizontal overflow on the inspected mobile page. Keyboard focus styles, labelled search, semantic lists and missing-image/empty/404 states are implemented. No full assistive-technology audit claimed. |
| Database startup / migrations | Official core migrations applied locally; `emdash migrate --check` reported no pending or unknown migrations. Demo seed uses skip mode. |
| Adapter tests | Upload/read/MIME/size/metadata/range/list/pagination/existence/idempotent deletion/private keys/unsupported signed URLs/storage failure propagation. Unit tests use a clearly separate fake SDK store; they are not evidence of remote Blobs behavior. |
| Native Editor permissions | `@emdash-cms/auth.hasPermission` verifies create/edit-any/publish-any/read-drafts/media-upload/media-read/taxonomy management for role 40; user/settings management denied. A real Editor login on the final domain remains to be checked. |
| TypeScript and build | `npm run check` and `npm test`; `npm run build` emitted the Netlify Node SSR function. Expected large admin chunk warning. Final results/commands below. |
| Clean installation | `npm ci` completed from the lockfile; the version-checked native upload patch was installed automatically. Final check: 42 files, zero errors/warnings/hints; 11 tests passed. |
| Compiled failure response | Called the emitted Netlify Node handler locally without remote credentials: HTTP 503, private no-store, understandable message, no database URL/token in the response. This is not an actual Turso outage. |
| Compiled preview isolation | Built with `CONTEXT=deploy-preview`, then `node scripts/check-built.mjs --preview` verified 503 before CMS initialization for the public page, administration, sign-in POST and upload metadata POST. No production credentials were supplied. |
| Public-file inspection | Inspected `dist`: only assets/placeholders, no database, environment files, session fixtures or backup files. Credential environment names/session-cookie values were absent from public assets. No real production secret was supplied in this session. |

## Commands

```sh
npm ci
npm run db:demo
npm run check
npm test
npm run build
npm run db:check
node scripts/smoke-local.mjs
node scripts/check-public.mjs
node scripts/check-content.mjs
node scripts/check-restart.mjs
node scripts/create-large-photo.mjs
node scripts/check-built.mjs
# Separate build with CONTEXT=deploy-preview, then:
node scripts/check-built.mjs --preview
```

Do not run dev/build concurrently. `check-built.mjs` exercises the emitted Node handler **locally without configured remote services**; it does not represent a successful deployed request. Browser photo checks use the development-only `/dev-tests/photo` harness and actual administration. Test scripts create clearly fictional local records.

After restart verification, `node scripts/clean-local-tests.mjs` moved 11 disposable acceptance recipe entries to native recoverable trash. The two editorial examples remain; test image bytes stay private in the local media library. Re-run the smoke script before checking its restart fixture again. Visual evidence: [notebook](screenshots/notebook-desktop.jpg), [mobile recipe](screenshots/recipe-mobile.jpg).

## Assumptions and operational limits

- Stable HTTPS hostname and genuine WebAuthn support on Carla's phone have not been supplied/tested. Production requires human passkey enrollment. Use an independent second passkey; email recovery has no provider.
- Native sharing follows the installed revision implementation: publish synchronizes shared fields; conflicting pending draft values may be retained. Do not maintain simultaneous conflicting shared edits across locales.
- Current Astro Netlify output and SDK context are compatible in local compilation/emulation. A live platform integration can still reveal runtime or account limits. See [feasibility](feasibility.md) for source evidence rather than a blanket compatibility claim.
- Free credits can pause the site. Blobs is currently documented as beta. No payment method was added or paid service activated.
- `npm audit` reports **8 high-severity transitive tooling findings**, rooted in `braces` / `micromatch` / `fast-glob` through Netlify's development/bundling tools (GHSA-vfj7-8cjw-p6xm). The installed stable Netlify adapter has no compatible automated fix reported; npm's suggested adapter downgrade is incompatible with Astro 7 and was not applied. No arbitrary user-controlled glob patterns are accepted by this app. Recheck the upstream tooling before broader/public production use. This is an observed dependency limitation, not a clean-audit claim.

## Remote progress and Brazilian Portuguese update — 2026-10-22

- The developer created the dedicated Free Turso database, initialized it explicitly, published [the Netlify site](https://carlas-kitchen.netlify.app/) and completed native Admin setup. No payment activation was performed by the agent.
- Remote GET requests to `/`, `/fr/`, `/pt-PT/` and `/_emdash/admin` returned 200 with private no-store headers before the language change. The admin rendered its native setup wizard. The developer subsequently navigated the authenticated settings/users pages. A cold-start session test is still outstanding.
- Portuguese is now Brazilian Portuguese (`pt-BR`), including public copy, examples, native admin allowlist, category seed, language metadata and links. Former `pt-PT` URLs have permanent redirects preserving slugs and queries. Earlier `pt-PT` results above remain historical evidence, not claims about the new locale.
- Remote preflight found zero recipes/terms and exactly one `pt-PT` category definition. The explicit migration changed that one locale row in a transaction after saving its private pre-change snapshot under ignored `backups/`. No account, credential, recipe text, media or translation-group ID was changed.
- Local validation: 14 targeted tests passed, including migration backup failure, transaction rollback, mixed-locale refusal, idempotence and legacy redirects. TypeScript checked 45 files with zero errors/warnings/hints; the Netlify build succeeded with the known admin chunk warning. HTTP acceptance against a separate local database with the two freshly seeded examples passed, including BR text, linked translations, missing translation, filtering and redirects.
- Reproduce the language checks with `node scripts/check-locale-deployment.mjs https://carlas-kitchen.netlify.app/` after the matching deployment. The same script defaults to localhost. Detailed data-migration commands and limits are in [the content model](content-model.md#existing-portuguese-data).

## Recipe administration labels — 2026-10-22

- EmDash's native collection/field definitions have a single schema label. Added a presentation-only, version-pinned compatibility patch so the recipe menu and all 15 recipe fields follow the administration's French or Brazilian Portuguese language. No production database migration or content edit is required.
- `npm test`: 17 passing tests, including full seeded field-label coverage, preservation of customized labels/field metadata and the shared raw manifest, repeated patch installation and upstream drift rejection. `npm run check`: 49 files, zero errors/warnings/hints. `npm run build`: successful Netlify Node build; existing admin chunk warning remains.
- In the actual local EmDash administration, using the native development account against the separate `brazilian-verification.db`, verified “Recettes” in the sidebar and list, the translated creation form, and French fields on the existing fictional tomato recipe. Native Settings language switching FR → pt-BR → FR immediately changed the recipe label to “Receitas” and back without a reload. No production account or recipe was changed.
- The administration language remains independent of the selected content language. Taxonomy labels follow the selected content locale through EmDash's native definitions. The Content Types builder retains canonical schema labels. Some upstream text remains partial, including Kumo's English “(optional)” input markers and native generic French grammatical agreement; this change does not claim complete upstream catalog coverage.
- Authenticated production UI verification still requires the developer's passkey session. Local development sign-in is never used on the deployed site.

## Remaining external acceptance

- [x] Create the dedicated Free Netlify site and Turso DB (performed by the developer).
- [x] Initialize remote Turso and establish the first real Admin (performed by the developer).
- [ ] Run the official core migration status check against the deployed remote configuration after future upgrades.
- [ ] Register/test two independent passkeys on the actual stable HTTPS hostname; test logout/re-login on Carla's real phone.
- [ ] Invite Carla via a manually copied native invitation link as Editor; verify her real session and denied admin permissions.
- [ ] Repeat the one-recipe/three-photo vertical slice using the deployed Node function and real site-wide Blobs context.
- [ ] Test a cold invocation and a second Netlify deployment with unchanged DB/media/session resources.
- [ ] Test supported large phone-photo reduction, platform payload boundaries and user-facing failures on Netlify.
- [ ] Test a real Turso outage and real Blobs permission/unavailability failure; confirm sanitized 503 / native upload error behavior.
- [ ] Execute complete SQL/media export and restoration to isolated resources, then the original-hostname passkey verification.
- [ ] Exercise iOS/Android keyboard, passkey sync, camera/file selection, alt text and the independent recovery passkey with Carla.

Deployment URL: **https://carlas-kitchen.netlify.app/**. Real Admin setup was completed by the developer. Remote full backups/restores, cold starts, media acceptance and redeployment persistence remain unverified. Follow [deployment](deployment.md) to complete them without changing host, CMS or storage.
