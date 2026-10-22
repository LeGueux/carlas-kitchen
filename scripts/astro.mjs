import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const entry = join(dirname(fileURLToPath(import.meta.resolve('astro/package.json'))), 'bin/astro.mjs');
const localConfig = process.platform === 'win32' && process.argv[2] === 'dev'
  ? { APPDATA: join(process.cwd(), '.netlify/host-local'), LOCALAPPDATA: join(process.cwd(), '.netlify/host-local') }
  : {};
const child = spawn(process.execPath, [entry, ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, ...localConfig, ASTRO_TELEMETRY_DISABLED: '1', NETLIFY_TELEMETRY_DISABLED: '1' },
});
child.on('exit', (code) => process.exit(code ?? 1));
