# Backup and restore

The developer owns backups. Carla should not need infrastructure access. A database backup contains media **metadata/references**, not photo bytes; back up Turso and Netlify media separately. Never use the media store as a public backup directory. No scheduler or automatic EmDash backup/transfer workflow is enabled.

## Before a backup

Set runtime `KITCHEN_WRITES=disabled` in the dedicated Netlify site's Functions environment and wait for in-flight writes to finish. If changing runtime environment requires a deploy, deploy the same code first and verify maintenance mode rejects a save. Keep the public read path available. Avoid schema changes during the snapshot.

Create an ignored `backups/` directory on the developer's machine. Retain encrypted copies somewhere independent of Netlify/Turso and independent of this Git checkout. Keep the encryption key, canonical site hostname and package-lock version in the protected recovery notes; **do not put secrets in the backup manifest or Git**.

## Turso

Use an authenticated official Turso CLI on the developer's machine:

```sh
turso db shell carlas-kitchen-poc .dump > backups/kitchen.sql
```

This [official dump workflow](https://docs.turso.tech/cli/db/shell) includes application tables, users, public passkey records, settings, revisions and migration state; it excludes libSQL/SQLite internal tables. Run privately; do not pipe dumps into public logs. On older Windows PowerShell, use UTF-8 output explicitly or a modern shell; do not create a UTF-16 SQL file accidentally.

Restore into a **new dedicated database**, retaining the original intact:

```sh
turso db create carlas-kitchen-recovery --from-dump backups/kitchen.sql
```

Generate a token for that database and set its URL/token only on a dedicated recovery site. Do not run the example seed over restored data. Compare collection, translation, user and media-record counts; check core migration status with the matching EmDash build. Turso Free currently has only one day of point-in-time restore; an independent SQL dump remains necessary. [Official create-from-dump reference](https://docs.turso.tech/cli/db/create).

## Netlify photos

`scripts/media-backup.mjs` exports keys, original bytes, MIME/size/timestamp metadata and SHA-256 checksums. It reads the **site-wide `kitchen-media` store** with strong consistency. It does not export the session store. Runtime code does not need these developer export credentials.

Set `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN` privately in a developer environment or ignored `.env.backup`, scoped to the dedicated source site. Never set them in the browser or commit them. Run:

```sh
node scripts/media-backup.mjs export backups/media-2026-10-21
```

The export refuses an existing directory and stores the manifest separately from photo files. Backups remain outside `public/` and outside `kitchen-media`. If cloud backup storage is added later, use a distinct private store such as `kitchen-backups`, with no public serving route.

For restoration, point the private developer environment at a **new dedicated recovery Netlify site** and run:

```sh
node scripts/media-backup.mjs restore backups/media-2026-10-21 --confirm-site=<recovery-site-id>
```

The script requires an empty destination media store, verifies all local checksums before uploading, preserves original keys and metadata, writes only new objects, and verifies downloaded bytes afterward. It refuses to overwrite a populated store. If restoration stops partway, retain that recovery site for investigation and use another empty recovery site for a clean retry; no automatic destructive cleanup is performed.

These external scripts have not been exercised against a real Netlify account in this session. Test a full export and restore on disposable dedicated resources before relying on them. The adapter's metadata/download/list primitives are covered by local tests.

## Verify the recovery before switching traffic

1. Deploy the matching Git version to the recovery site and point it at the restored dedicated database/media. Keep writes disabled.
2. Check the three language collections, independent slugs, drafts, category labels, notes and ratings. Compare counts with the original snapshot.
3. Check photo bytes and alt text; verify a draft-only image remains inaccessible anonymously and that internal backup keys return 404.
4. Accounts and passkey public records restore from Turso, but passkeys are hostname-bound. At a different recovery hostname, existing production passkeys will not authenticate. Do not delete passkeys or claim recovery is complete based on a development bypass. Test on the original hostname during a controlled final switch, preserving the original resources for rollback. Use the independently registered backup passkey.
5. Astro sessions are stored separately in Netlify `kitchen-sessions`. They survive normal redeployments on the same site, but are deliberately not restored to a new site; users sign in again.
6. After verifying the original hostname, take another backup, enable writes and retain a rollback record. Restore the old resource settings if acceptance fails.

Database dump/restore, cross-site media restoration and production passkey recovery remain external acceptance steps; they were documented, not claimed as completed.
