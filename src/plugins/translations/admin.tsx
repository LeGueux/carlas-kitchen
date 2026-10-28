import { useEffect, useRef, useState } from 'react';
import { useLingui } from '@lingui/react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@cloudflare/kumo';
import { apiFetch, createContent, fetchContent, fetchTranslations, updateContent, type ContentEditorPanelContext, type ContentEditorPanelExtension } from '@emdash-cms/admin';
import { savedRecipeStamp } from './snapshot';
import { translationCopy } from './copy';

type Outcome = { locale: 'en' | 'fr'; status: 'success' | 'skipped' | 'failed'; id?: string };
const endpoint = '/_emdash/api/plugins/kitchen-translations';

function TranslationPanel({ entry }: ContentEditorPanelContext) {
  const { i18n } = useLingui();
  const copy = translationCopy[i18n.locale as keyof typeof translationCopy] ?? translationCopy.en;
  const queryClient = useQueryClient();
  const [configured, setConfigured] = useState<boolean>();
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setOutcomes([]); setError(''); setReplace(false); setConfigured(undefined);
    apiFetch(`${endpoint}/status`).then(async (response) => {
      if (!response.ok) throw new Error('unavailable');
      const result = await response.json();
      if (active) setConfigured(result.data?.configured === true);
    }).catch(() => { if (active) setConfigured(false); });
    return () => { active = false; };
  }, [entry.id]);

  async function generate() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(''); setOutcomes([]);
    const completed: Outcome[] = [];
    try {
      const source = await fetchContent('recipes', entry.id);
      if (source.locale !== 'pt-BR' || !source._rev) throw new Error('CONFLICT');
      const siblings = await fetchTranslations('recipes', entry.id);
      for (const locale of ['fr', 'en'] as const) {
        const sibling = siblings.translations.find((item) => item.locale === locale);
        if (sibling && !replace) {
          completed.push({ locale, status: 'skipped', id: sibling.id }); setOutcomes([...completed]); continue;
        }
        // Capture the revision before translating so a concurrent manual edit wins.
        const existing = sibling ? await fetchContent('recipes', sibling.id, { locale }) : undefined;
        if (existing && (!existing._rev || existing.scheduledAt)) throw new Error('CONFLICT');
        try {
          const response = await apiFetch(`${endpoint}/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: source.id, revision: savedRecipeStamp(source), target: locale }) });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error(result.error?.code ?? 'SERVICE_UNAVAILABLE');
          const saved = existing
            ? await updateContent('recipes', existing.id, { data: result.data, _rev: existing._rev }, { locale })
            : await createContent('recipes', { data: result.data, locale, translationOf: source.id, status: 'draft' });
          completed.push({ locale, status: 'success', id: saved.id });
          setOutcomes([...completed]);
          // Refresh the native translation links without reloading unsaved editor text.
          await queryClient.invalidateQueries({ queryKey: ['translations', 'recipes', entry.id] });
        } catch (cause) {
          completed.push({ locale, status: 'failed' }); setOutcomes([...completed]); throw cause;
        }
      }
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : '';
      setError(code.includes('QUOTA_EXCEEDED') ? copy.quota : /CONFLICT|LOCK|changed|modified|revision/i.test(code) ? copy.conflict : copy.failed);
    } finally { running.current = false; setBusy(false); }
  }

  if (entry.locale !== 'pt-BR') return <p className="text-sm text-kumo-subtle">{copy.source}</p>;
  return <div className="flex flex-col gap-3 text-sm">
    <p className="text-kumo-subtle">{copy.note}</p>
    <p className="text-kumo-subtle">{copy.keep}</p>
    <label className="flex items-start gap-2"><input type="checkbox" checked={replace} disabled={busy} onChange={(event) => setReplace(event.target.checked)} /><span>{copy.replace}</span></label>
    {configured === false && <p role="status">{copy.unavailable}</p>}
    <Button type="button" disabled={!configured || busy} onClick={generate}>{busy ? copy.busy : copy.generate}</Button>
    <div aria-live="polite" aria-busy={busy}>
      {outcomes.map((item) => <p key={item.locale} className="mt-2">{item.locale.toUpperCase()} : {item.status === 'success' ? copy.success : item.status === 'skipped' ? copy.skipped : copy.failed}{item.id && <> · <a className="underline" href={`/_emdash/admin/content/recipes/${encodeURIComponent(item.id)}?locale=${item.locale}`}>{copy.review}</a></>}</p>)}
      {error && <p role="alert" className="mt-2">{error}</p>}
    </div>
  </div>;
}

export const contentEditorPanels = [{ id: 'translate-recipe', title: 'FR + EN', component: TranslationPanel, collections: ['recipes'], minRole: 40, order: 10 }] satisfies readonly ContentEditorPanelExtension[];
