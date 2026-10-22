# First deployment walkthrough

Checked against the project and official documentation on **2026-10-22**. This is a procedure to execute, not evidence that remote deployment has already succeeded. Keep the existing pinned dependencies for this first deployment.

## What each part does

| Part | Responsibility |
| --- | --- |
| GitHub repository | Source code and lockfile. Recipes are not edited in Git. |
| Astro + EmDash | Public pages, native administration, content model and authentication. EmDash is installed with the application; no separate hosted EmDash account is needed. |
| Netlify | Builds the repository, serves the site and runs its Node server function. |
| Turso libSQL database | Recipes, translations, categories, users and media references. |
| Netlify Blobs | Photo bytes in `kitchen-media`; separate persistent sessions in `kitchen-sessions`. |

You administer the infrastructure. Carla uses only `https://YOUR-SITE.netlify.app/_emdash/admin`.

## 1. Prepare the source

In PowerShell, from this checkout:

```powershell
Set-Location C:\Users\alexa\Downloads\dev\carla-website
node --version
npm --version
git branch --show-current
git status --short
npm ci
```

Use Node 24.22.1 or later within Node 24 and npm 12. The implemented POC is on `codex/carlas-kitchen-poc`; the chosen GitHub repository name is `LeGueux/carlas-kitchen`. The local checkout folder can keep its existing `carla-website` name.

If the GitHub repository is still named `carla-website`, rename it in its **Settings → General → Repository name** field first. After GitHub confirms the rename, update the local remote:

```powershell
git remote set-url origin git@github.com:LeGueux/carlas-kitchen.git
git remote -v
```

Verify this branch contains the implementation before uploading it:

```powershell
git push -u origin codex/carlas-kitchen-poc
```

This is a command for you to run; this guide does not push automatically. In GitHub, verify that `astro.config.mjs`, `netlify.toml`, `src/` and `package-lock.json` appear on that branch. No merge into `main` is required for the dedicated POC: select this branch as Netlify's **production branch**. A production branch can have any name; a non-production branch deployment is deliberately blocked by this app.

Do not upload `data/`, `.netlify/`, `test-results/`, backups or environment files. Existing local content/accounts are disposable and do not migrate to the new database.

## 2. Create the dedicated Turso database

In your Turso dashboard, create a new Free database named `carlas-kitchen-poc`, choose the **libSQL** engine and retrieve its connection URL plus a database read/write token. The URL must start with `libsql://` for this project. Turso also offers a newer engine: do not choose `--tursodb`, a `turso://` URL or replace the installed SDK for this POC. [Official engine distinction](https://docs.turso.tech/quickstart).

If using the CLI instead of the dashboard, its official Windows installation uses WSL. Follow the [installation instructions](https://docs.turso.tech/cli/installation), then run these commands **inside WSL**:

```sh
turso auth login
turso db create carlas-kitchen-poc
turso db show carlas-kitchen-poc --url
turso db tokens create carlas-kitchen-poc --expiration 30d
```

Do not create tables manually. The initialization below creates the EmDash tables and recipe schema. Store the token privately, record its expiry and plan to replace it before expiry. A database token is distinct from an account/API token. Do not send either token through chat.

Expected result: one new dedicated database, its `libsql://` URL and a private read/write token.

## 3. Initialize Turso from the developer machine

Return to **Windows PowerShell**, in the project directory. Keep `.env` absent or configured for the local file database. Use a separate file that Astro does not automatically load for development:

```powershell
if (-not (Test-Path -LiteralPath .env.remote)) {
  Copy-Item -LiteralPath .env.example -Destination .env.remote
}
notepad .env.remote
```

Edit the copy privately. The following values are fictional examples:

```dotenv
LIBSQL_DATABASE_URL=libsql://YOUR-DEDICATED-HOST.turso.io
LIBSQL_AUTH_TOKEN=REPLACE_WITH_YOUR_DATABASE_TOKEN
KITCHEN_WRITES=enabled
```

Remove the `#` before `LIBSQL_AUTH_TOKEN`, replace the local `file:` URL, and save. The site URL can be updated once Netlify assigns the hostname. Generate the encryption key directly into this ignored file:

```powershell
npx --no-install emdash secrets generate --write .env.remote
git check-ignore .env.remote
node --env-file=.env.remote --import tsx scripts/bootstrap.ts --remote
```

Expected result: `.env.remote` is reported as ignored; initialization exits successfully and reports core migrations plus the recipe structure. This command explicitly loads the remote file for this process only. It does not change the environment of later `npm run dev` commands.

Optional, once, to insert the two fictional recipes and their translations:

```powershell
node --env-file=.env.remote --import tsx scripts/bootstrap.ts --remote --demo
```

Both scripts use conflict mode `skip`. Do not add these commands to Netlify's build command or function startup. Do not run the development bypass or local acceptance scripts against this remote database. Remote credentials in an automatically loaded `.env` would make local development use remote content; retain the separation above.

## 4. Import the repository into Netlify

In the Netlify Free dashboard, use **Add new project / Import an existing project** (wording may vary), choose GitHub and authorize access to the `carlas-kitchen` repository. Configure:

| Setting | Value |
| --- | --- |
| Repository | `LeGueux/carlas-kitchen` |
| Production branch | `codex/carlas-kitchen-poc` |
| Base directory | Empty / repository root |
| Build command | `npm run check && npm run build` |
| Publish directory | `dist` |
| Functions directory | Leave the default; the Astro adapter emits the function automatically |

The build settings are already recorded in `netlify.toml`. Use Git import for this SSR app, rather than uploading only the static `dist` folder. No separate Netlify CMS, database, Lambda or Blobs plugin is needed. [Official Git deployment workflow](https://docs.netlify.com/deploy/create-deploys/).

If the creation flow offers a way to defer the first deploy, configure the variables first. If it starts immediately, the initial build can fail because the Turso URL is missing; add the variables and retry. Do not change the database guard to work around that failure.

Choose `carlas-kitchen` as the Netlify project name if available, and record the actual stable `https://YOUR-SITE.netlify.app` hostname assigned to it. GitHub repository names and Netlify hostname availability are independent. Use the stable address for authentication, rather than a deploy permalink or preview hostname. Settle the name before registering passkeys.

## 5. Add the Netlify environment variables

Open the new project's **Project configuration → Environment variables**. Add individual **site** variables using the UI. For each, set a value only for **Production**; do not apply it to all deploy contexts.

| Key | Production value |
| --- | --- |
| `LIBSQL_DATABASE_URL` | The same dedicated `libsql://` URL |
| `LIBSQL_AUTH_TOKEN` | The same dedicated database token |
| `EMDASH_SITE_URL` | The stable `https://YOUR-SITE.netlify.app` origin, without an admin path |
| `EMDASH_ENCRYPTION_KEY` | The generated 64-hex-character value in `.env.remote` |
| `AWS_LAMBDA_JS_RUNTIME` | `nodejs24.x` |
| `KITCHEN_WRITES` | `enabled` |

On **Free**, variables apply to all scopes: keep that default. Custom Builds/Functions scopes require Pro/Enterprise; do not upgrade for them. The **Production deploy context** is a separate setting and should still restrict where the values are supplied. These runtime values belong in the UI, not `netlify.toml`. No `PUBLIC_` prefix and no Netlify personal token is needed. [Official contexts and scopes](https://docs.netlify.com/build/environment-variables/overview/).

Node's build version is pinned in TOML; `AWS_LAMBDA_JS_RUNTIME` is set in the UI and takes effect on redeployment. If the dashboard offers paid secret-management features, skip them; they are not required to add site variables. Keep the encryption key stable and backed up. [Runtime configuration](https://docs.netlify.com/build/functions/configuration/).

Update the non-secret `EMDASH_SITE_URL` in `.env.remote` to the same address for your records. Do not bulk-import the whole file into all contexts. Verify that production credentials have no values under Deploy Previews, Branch deploys or Local development.

## 6. Deploy and establish the real administrator

From **Deploys**, trigger/retry the production deployment of the selected branch. Wait for the successful published status. The log should show successful TypeScript checking, an Astro build and a generated SSR function. The known large EmDash admin bundle warning does not by itself fail the build. Existing dependency audit findings remain documented in [verification](verification.md).

Visit:

```text
https://YOUR-SITE.netlify.app/
https://YOUR-SITE.netlify.app/_emdash/admin
```

Without examples, the public notebook should show its empty state. With `--demo`, the two fictional recipes should appear. Complete the native setup wizard promptly: site details, your email/name, then a passkey. The first user becomes **Admin**. Windows Hello/security key/phone authenticator availability depends on the device. Add and test an independent second passkey in account settings before signing out. Do not use the local development bypass on the deployed site. [Native setup and authentication](https://docs.emdashcms.com/guides/authentication/).

Expected result: the public site and real administrator work at the same stable hostname. This step needs your own browser authentication ceremony; it has not been executed by the implementation session.

## 7. Run the first remote acceptance test

Before inviting Carla:

1. Sign out and sign in again; open several admin pages.
2. Create a recipe in the native editor and upload three JPEG/PNG/WebP photos. Save a draft; confirm its public URL is inaccessible in a private browser window.
3. Publish immediately; confirm the recipe and photos appear publicly without a Git push or rebuild.
4. Add a category and personal rating. Create a linked translation, give it a different slug, and publish it separately. Check language navigation and the missing-language notice.
5. Keep the admin session open, then trigger a second deploy of the same code **without rerunning initialization or demo import**. Reload the editor/public page and check that session, recipe and photos remain.
6. Repeat creation/edit/upload on a real phone, including a large supported photo. Check that draft-only images remain private.

You do not pre-create `kitchen-media` or `kitchen-sessions`: the SDK uses the named site-wide stores when operations occur. Look for them in the project's Blobs/data area after signing in/uploading. Their absence before any write is not a reason to add a token to the app. If Blobs access fails, inspect the SSR function log with secrets redacted; do not switch to temporary function disk storage.

Record the actual URL and results in [verification](verification.md). A green build alone is not proof that Turso, Blobs and authentication work remotely.

## 8. Invite Carla and establish the routine

As Admin, open **Users → Invite User**, enter Carla's email and choose **Editor**. Submit, copy the generated invitation link and share it privately yourself; no email provider is configured. Carla opens the link on the permanent hostname, creates her account with a passkey, and registers/tests a second passkey. Verify she can publish and manage categories but cannot manage users/settings. No Netlify, Turso or GitHub invitation is needed.

Use [Carla's guide](carla-guide.md) for recipe/photo/translation work. Code updates use Git pushes; recipe publication uses EmDash directly. Use [backup and restore](backup-restore.md) before upgrades; database metadata and photo bytes need separate backups. Rotate the expiring database token before its expiry, update the Production variable and redeploy.

## Troubleshooting checkpoints

| Symptom | First checks |
| --- | --- |
| `Netlify requires a dedicated remote LIBSQL_DATABASE_URL` during build | URL is set for Production; selected production branch is the POC branch; URL starts `libsql://`. |
| Published site returns temporary-unavailable 503 | Token is present/valid, remote initialization completed, environment changes were followed by a deploy. Check redacted function logs. |
| `Deploy previews are disabled` | You opened a preview/branch deploy, or selected the wrong production branch. Use the stable production hostname. |
| Missing recipes/schema | Initialization targeted the same database URL as Netlify. Examples require the optional `--demo` command. |
| Login/passkey fails | HTTPS, unchanged stable hostname, passkey registered for that hostname; localhost passkeys are separate. Email login has no configured provider. |
| An upload fails | Supported type, browser reduction completed, valid platform Blobs context; inspect the native error and redacted function logs. Do not add `NETLIFY_AUTH_TOKEN` to fix runtime context. |
| Local technical recipe URL is 404 | `mobile-technical-example` was a disposable test moved to trash. Open `/fr/` and use the two seeded examples or create a new recipe. |

Keep plans Free and the resources dedicated. If a step asks for billing activation, stop at that step and check the selected option. No remote account configuration, database initialization, push or deployment is performed merely by reading this guide.
