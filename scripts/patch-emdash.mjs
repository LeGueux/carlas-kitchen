import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import { patchAdminUploads } from '../integrations/serverless.mjs';
import { patchAdminLabels } from '../integrations/admin-labels.mjs';

const path = new URL('../node_modules/@emdash-cms/admin/dist/index.js', import.meta.url);
const marker = '// kitchen-photo-preparation-v1';
const version = JSON.parse(await readFile(new URL('../node_modules/@emdash-cms/admin/package.json', import.meta.url), 'utf8')).version;
if (version !== '1.3.1') throw new Error('Review the EmDash compatibility patches before upgrading @emdash-cms/admin.');
let code = await readFile(path, 'utf8');
if (!code.includes(marker)) {
  const source = await readFile(new URL('../src/client/prepare-photo.ts', import.meta.url), 'utf8');
  const helper = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })
    .replace('export async function preparePhoto(', 'async function kitchenPreparePhoto(');
  code = patchAdminUploads(code, helper);
}
const labels = await readFile(new URL('../src/i18n/admin-labels.ts', import.meta.url), 'utf8');
const labelHelper = ts.transpile(labels, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })
  .replace('export function localizeRecipeManifest(', 'function kitchenLocalizeRecipeManifest(');
code = patchAdminLabels(code, labelHelper);
await writeFile(path, code);
console.log('EmDash 1.3.1: automatic photo preparation and localized recipe labels installed.');
