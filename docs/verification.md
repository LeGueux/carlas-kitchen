# Verification ledger

Date: **2026-10-21**. Environment: Windows, Node 24.22.1, npm 12.2.1. Dedicated local libSQL file and Netlify's local Blobs emulator. **No Netlify URL, remote Turso database, paid service or real Carla/developer passkey account was created.** The user explicitly chose local completion and documented external steps.

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

## Not executed: external acceptance

- [ ] Create the dedicated Free Netlify site and Turso DB without billing activation.
- [ ] Apply/check migrations against remote Turso and establish the first real Admin.
- [ ] Register/test two independent passkeys on the actual stable HTTPS hostname; test logout/re-login on Carla's real phone.
- [ ] Invite Carla via a manually copied native invitation link as Editor; verify her real session and denied admin permissions.
- [ ] Repeat the one-recipe/three-photo vertical slice using the deployed Node function and real site-wide Blobs context.
- [ ] Test a cold invocation and a second Netlify deployment with unchanged DB/media/session resources.
- [ ] Test supported large phone-photo reduction, platform payload boundaries and user-facing failures on Netlify.
- [ ] Test a real Turso outage and real Blobs permission/unavailability failure; confirm sanitized 503 / native upload error behavior.
- [ ] Execute complete SQL/media export and restoration to isolated resources, then the original-hostname passkey verification.
- [ ] Exercise iOS/Android keyboard, passkey sync, camera/file selection, alt text and the independent recovery passkey with Carla.

Deployment URL: **none**. Real-account creation, remote backups/restores, remote cold starts and redeployment persistence remain unverified. Follow [deployment](deployment.md) to complete them without changing host, CMS or storage.
