export const adminLabelsMarker = '// kitchen-admin-labels-v1';
const endMarker = '// kitchen-admin-labels-end-v1';
const manifestQuery = 'queryFn: fetchManifest';
const expectedQueries = 27;

// EmDash 1.3.1 stores one label per collection/field, without per-admin-locale labels.
// Select a translated presentation for each observer; never change the raw query cache.
export function patchAdminLabels(source, helper) {
  if (source.startsWith(adminLabelsMarker)) {
    const end = source.indexOf(endMarker);
    if (end < 0) throw new Error('Invalid installed admin label compatibility patch. Reinstall the pinned package.');
    source = source.slice(end + endMarker.length).replace(/^\r?\n/, '')
      .replaceAll(', select: useKitchenRecipeLabels()', '');
  }
  if (source.split(manifestQuery).length - 1 !== expectedQueries || source.includes('select: useKitchenRecipeLabels')) {
    throw new Error('EmDash manifest consumers changed. Review the pinned admin label compatibility patch before upgrading.');
  }
  const hook = `
function useKitchenRecipeLabels() {
  const { i18n } = useLingui();
  const locale = i18n.locale;
  return React$1.useCallback((manifest) => kitchenLocalizeRecipeManifest(manifest, locale), [locale]);
}
`;
  return `${adminLabelsMarker}\n${helper}\n${hook}\n${endMarker}\n` + source.replaceAll(manifestQuery,
    `${manifestQuery}, select: useKitchenRecipeLabels()`);
}
