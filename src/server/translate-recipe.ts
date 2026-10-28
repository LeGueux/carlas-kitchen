export const translatedFields = { title: 160, description: 600, ingredients: 12000, steps: 20000, notes: 10000 } as const;
export type TranslationTarget = 'en' | 'fr';
export class RecipeTranslationError extends Error {
  constructor(public code: string, public status = 502) { super(code); }
}

/** Translate only editorial text. Shared photos, numbers and links never leave the site. */
export async function translateRecipe(data: Record<string, unknown>, target: TranslationTarget, apiKey: string, request: typeof fetch = fetch) {
  if (!apiKey) throw new RecipeTranslationError('NOT_CONFIGURED', 503);
  const fields = Object.keys(translatedFields) as (keyof typeof translatedFields)[];
  const values = fields.map((field) => {
    const text = data[field] ?? '';
    if (typeof text !== 'string' || text.length > translatedFields[field]) throw new RecipeTranslationError('INVALID_SOURCE', 400);
    return text;
  });
  if (!values[0]?.trim() || !values[2]?.trim() || !values[3]?.trim()) throw new RecipeTranslationError('INVALID_SOURCE', 400);
  const selected = values.flatMap((value, index) => value.trim() ? [index] : []);
  // Free/legacy API keys end in :fx. The key stays exclusively in server memory.
  const host = apiKey.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  let response: Response;
  try {
    response = await request(`https://${host}/v2/translate`, {
      method: 'POST', headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: selected.map((i) => values[i]), target_lang: target === 'en' ? 'EN-US' : 'FR', preserve_formatting: true, split_sentences: 'nonewlines' }),
      signal: AbortSignal.timeout(20000),
    });
  } catch { throw new RecipeTranslationError('SERVICE_UNAVAILABLE', 503); }
  if (!response.ok) throw new RecipeTranslationError(response.status === 456 ? 'QUOTA_EXCEEDED' : response.status === 429 ? 'RATE_LIMITED' : 'SERVICE_UNAVAILABLE', 503);
  let payload: { translations?: { text?: unknown }[] };
  try { payload = await response.json(); } catch { throw new RecipeTranslationError('INVALID_TRANSLATION'); }
  if (!Array.isArray(payload.translations) || payload.translations.length !== selected.length) throw new RecipeTranslationError('INVALID_TRANSLATION');
  const translated = fields.map(() => '');
  for (const [position, index] of selected.entries()) {
    const result = payload.translations[position]?.text;
    const field = fields[index]!;
    if (typeof result !== 'string' || !result.trim() || result.length > translatedFields[field]) throw new RecipeTranslationError('INVALID_TRANSLATION');
    // One ingredient/step per line is structural data, not cosmetic wrapping.
    if ((field === 'ingredients' || field === 'steps') && result.split(/\r?\n/).length !== values[index]!.split(/\r?\n/).length) throw new RecipeTranslationError('INVALID_TRANSLATION');
    translated[index] = result;
  }
  return Object.fromEntries(fields.map((field, index) => [field, translated[index]]));
}
