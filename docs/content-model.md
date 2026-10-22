# Content and language decisions

`seed/schema.json` defines one `recipes` collection using EmDash fields, revisions, drafts, preview support and taxonomy assignments. `slug`, status, locale and translation groups are native system values, not duplicate custom fields. There are no comments or visitor accounts.

| Field | Storage/editor | Translation behavior |
| --- | --- | --- |
| Title, short description | Native string/text | Per language |
| Ingredients including quantities | Native multiline text, one item per line | Per language, including localized units |
| Preparation | Native multiline text, one ordered step per line | Per language |
| Prep/cook minutes, servings | Native integer | Shared, `translatable: false` |
| Personal rating | Optional integer 1–5 | Shared |
| Cooking notes | Native text | Per language |
| Last cooked | Optional native datetime | Shared; public display uses the stored calendar date in UTC |
| Source | Optional native URL | Shared; only http(s) links render |
| Cover + two gallery slots | Three native image fields | Shared media IDs and metadata; maximum three slots |
| Fictional example marker | Native boolean | Shared |
| Categories | Native taxonomy, translated terms | Shared term translation groups, localized labels/slugs |

Ingredients and steps deliberately use simple text, avoiding a custom structured editor. Public steps are numbered from their line order. There is no per-cooking-session history. Three fixed image slots impose the limit through the schema without a disproportionate gallery plugin. The library itself can contain additional reusable photos; the three-photo limit applies to a recipe.

EmDash 1.3.1 synchronizes fields marked `translatable: false` across linked entries. With revisions enabled, saving stages a draft; **publishing** propagates changed shared values to sibling locales. Numerical values and photos do not require manually entering the same values in each locale. A sibling's independently changed draft value may be retained by native revision conflict handling; avoid editing shared values in several language drafts simultaneously. Publishing a shared value can change another published language without publishing its text draft. Photo alt text is part of the shared media value in this POC; it is not independently localized. Supply meaningful, concise alt text in the media editor. If a localized alt-text workflow is needed, add small per-locale alt fields later.

## Locales and URLs

The configured languages are English (`en`, default), French (`fr`) and **Brazilian Portuguese (`pt-BR`)**, because Carla is Brazilian. Public copy, example text and the native admin language catalog use the Brazilian variant. The admin allowlist is derived from `src/config/locales.ts`. Update that list, `src/i18n/ui.ts` and taxonomy seeds together when changing languages. Existing translated database content needs an explicit migration/review, not just a config edit.

Public paths are `/`, `/recipes/<english-slug>`, `/fr/`, `/fr/recipes/<french-slug>`, `/pt-BR/` and `/pt-BR/recipes/<portuguese-slug>`. Former `/pt-PT/` paths redirect permanently to `/pt-BR/`, retaining the recipe slug and query. Existing slugs are not automatically translated or renamed. All variants are not prefixed because EmDash's injected administration breaks when Astro prefixes the default locale. Native Astro routing remains enabled with its default prefix-other-locales strategy.

### Administration labels

EmDash 1.3.1 stores a single collection/field label, independent of the administration's language. The English labels in `seed/schema.json` are canonical schema values, not entries in EmDash's translated interface catalog. Without an adaptation, changing the UI to French leaves the collection named “Recipes” and its custom fields in English.

`src/i18n/admin-labels.ts` provides French and Brazilian Portuguese display labels for the recipe collection and all 15 custom fields. The version-checked install patch in `integrations/admin-labels.mjs` adds a memoized React Query selector to the native manifest consumers. It follows the **administration language**, including immediate language changes, independently of the recipe's content language. The raw query cache, API responses, database schema, content and technical `recipes` slug remain unchanged. Custom administrator labels and unknown fields are preserved. The developer's Content Types schema builder still shows the canonical schema labels.

This is a project compatibility adaptation, not a native localized-label API. Its 27 pinned manifest consumers must be reviewed when upgrading EmDash. Native buttons/settings continue to use EmDash's own language catalogs; missing upstream translations can still fall back to English. [Official collection labels](https://docs.emdashcms.com/concepts/collections/) and [native translation behavior](https://docs.emdashcms.com/contributing/translating/).

### Existing Portuguese data

`scripts/migrate-portuguese.ts` is an explicit, one-time locale migration. It changes only `locale` columns from `pt-PT` to `pt-BR`, retaining row IDs, translation groups, slugs, publication state, revisions and media references. It does not translate user-authored recipe text. Review any pre-existing Portuguese editorial content separately. The initial deployed database had no recipes/terms and only one Portuguese category definition.

From Bash, inspect first, then apply deliberately:

```bash
# Local file database:
npm run db:portuguese
npm run db:portuguese -- --apply
# Dedicated remote database, using the ignored developer environment:
node --env-file=.env.remote --import tsx scripts/migrate-portuguese.ts --remote
node --env-file=.env.remote --import tsx scripts/migrate-portuguese.ts --remote --apply
```

Writes require `--apply`; remote access requires `--remote`. The migration takes a transaction-consistent private snapshot of affected rows under ignored `backups/` before writing. Any backup/update failure rolls back; a repeated run changes zero rows. Mixed `pt-PT` and `pt-BR` data is refused for manual review rather than merged. This row snapshot is not a complete database backup; use [the backup procedure](backup-restore.md) for full recovery. No migration runs during requests, startup or deploy. Do not re-import seeds to migrate an existing database.

Each translation is an independent native entry with its own slug, draft/published status and revisions. The language switcher queries the translation group, then includes **only published** links. A missing language links to that language's collection with an explicit notice, not to invented translated text. No content fallback chain is configured; a missing localized recipe URL returns 404. Draft titles/slugs are never rendered in missing-language links. Photos can be public if any language using them is published.

## Examples

`seed/examples.json` creates roasted tomato toast in all three languages and lemon/honey yogurt in English and French only. Art in `public/placeholders/` is clearly labelled illustration, not real food photography. Example markers and editorial notes distinguish them from Carla's recipes and reviews. The seed has no dependency on an image host or translation API.

## Deliberate POC limits

- Title search loads the small published collection in pages of 100 and filters titles in memory, accent-insensitively. It is not full-text search. Media visibility checks also scan published recipe photo fields; keep this approach for a small personal notebook, then use a publication-aware index if scale warrants it.
- Native scheduler, scheduled publication, automatic backups, background imports, sandbox/workerd plugins, plugin installation routes and site transfer are excluded. Revision/media cleanup is not guaranteed on dormant functions; the developer should review growth manually.
- Large supported photos are reduced to JPEG in the browser, longest edge at most 2200 pixels, target at most 2.5 MB. JPEG/PNG/WebP below 2.5 MB pass through. The server still rejects anything above 3 MB or with mismatched file signatures. HEIC/video/PDF/SVG are not supported. Devices that cannot decode a selected image receive an error; no external preparation tool is required for supported photos.
- Private previews require an authenticated editor. Shared/public caching is disabled throughout the POC for correctness and privacy. No external fonts, analytics, newsletter, payments or paid translation service are used.
- Native administration contains some features beyond this recipe use case. Schema changes/settings stay Admin-only. Any future EmDash upgrade must review the private compatibility seams and rerun acceptance before deployment.
