export const uploadSignature = 'async function uploadMedia(file, opts) {';

export function patchAdminUploads(source, prepareModule) {
  if (source.includes('// kitchen-photo-preparation-v1')) return source;
  if (source.split(uploadSignature).length !== 2) {
    throw new Error('EmDash admin upload entry changed. Review the pinned compatibility patch before upgrading.');
  }
  return `// kitchen-photo-preparation-v1\n${prepareModule}\n` +
    source.replace(uploadSignature, `${uploadSignature}\n file = await kitchenPreparePhoto(file, opts?.signal);`);
}

// EmDash 1.3.1 has no public scheduler-disable or upload-preprocessor option.
// Keep the serverless adaptations here; localized labels are in admin-labels.mjs.
// All private compatibility seams are version-checked and fail closed on upgrades.
export function serverlessCompatibility() {
  return {
    name: 'kitchen-serverless-compatibility',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => updateConfig({
        vite: {
          // The package version stays fixed while our install-time patch changes it.
          // Do not reuse a development optimizer artifact from before that patch.
          optimizeDeps: { force: true },
          plugins: [{
            name: 'kitchen-emdash-compatibility',
            enforce: 'pre',
            resolveId(id) {
              if (id === 'virtual:emdash/scheduler') return '\0kitchen:no-scheduler';
            },
            load(id) {
              if (id === '\0kitchen:no-scheduler') return 'export const createScheduler = null;';
            },
          }],
        },
      }),
    },
  };
}
