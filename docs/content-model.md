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

The explicit assumption is English (`en`, default), French (`fr`) and European Portuguese (`pt-PT`). Change `src/config/locales.ts`, `src/i18n/ui.ts`, the admin locale allowlist and taxonomy seed together when changing languages. Existing translated database content needs an explicit migration/review, not just a config edit.

Public paths are `/`, `/recipes/<english-slug>`, `/fr/`, `/fr/recipes/<french-slug>`, `/pt-PT/` and `/pt-PT/recipes/<portuguese-slug>`. All variants are not prefixed because EmDash's injected administration breaks when Astro prefixes the default locale. Native Astro routing remains enabled with its default prefix-other-locales strategy.

Each translation is an independent native entry with its own slug, draft/published status and revisions. The language switcher queries the translation group, then includes **only published** links. A missing language links to that language's collection with an explicit notice, not to invented translated text. No content fallback chain is configured; a missing localized recipe URL returns 404. Draft titles/slugs are never rendered in missing-language links. Photos can be public if any language using them is published.

## Examples

`seed/examples.json` creates roasted tomato toast in all three languages and lemon/honey yogurt in English and French only. Art in `public/placeholders/` is clearly labelled illustration, not real food photography. Example markers and editorial notes distinguish them from Carla's recipes and reviews. The seed has no dependency on an image host or translation API.

## Deliberate POC limits

- Title search loads the small published collection in pages of 100 and filters titles in memory, accent-insensitively. It is not full-text search. Media visibility checks also scan published recipe photo fields; keep this approach for a small personal notebook, then use a publication-aware index if scale warrants it.
- Native scheduler, scheduled publication, automatic backups, background imports, sandbox/workerd plugins, plugin installation routes and site transfer are excluded. Revision/media cleanup is not guaranteed on dormant functions; the developer should review growth manually.
- Large supported photos are reduced to JPEG in the browser, longest edge at most 2200 pixels, target at most 2.5 MB. JPEG/PNG/WebP below 2.5 MB pass through. The server still rejects anything above 3 MB or with mismatched file signatures. HEIC/video/PDF/SVG are not supported. Devices that cannot decode a selected image receive an error; no external preparation tool is required for supported photos.
- Private previews require an authenticated editor. Shared/public caching is disabled throughout the POC for correctness and privacy. No external fonts, analytics, newsletter, payments or paid translation service are used.
- Native administration contains some features beyond this recipe use case. Schema changes/settings stay Admin-only. Any future EmDash upgrade must review both compatibility seams and rerun acceptance before deployment.
