import { getEmDashCollection, getEmDashEntry, getTranslations, getTaxonomyTerms, type MediaValue, type TaxonomyTerm, type TranslationSummary } from 'emdash';
import { getDb } from 'emdash/runtime';
import { localePath, locales, type Locale } from '../config/locales';

export interface Recipe extends Record<string, unknown> {
  id: string; slug: string; status: string; locale: string; title: string;
  description?: string; ingredients: string; steps: string;
  prep_minutes?: number; cook_minutes?: number; servings?: number; rating?: number;
  notes?: string; last_cooked?: string; source_url?: string; is_example?: boolean;
  cover_image?: MediaValue; photo_2?: MediaValue; photo_3?: MediaValue;
  terms?: Record<string, TaxonomyTerm[]>;
}

export async function publishedRecipes(locale: Locale, category?: string, tag?: string): Promise<Recipe[]> {
  await requireRecipeDatabase();
  const entries: Recipe[] = [];
  let cursor: string | undefined;
  do {
    const page = await getEmDashCollection<'recipes', Recipe>('recipes', {
      status: 'published', locale, limit: 100, cursor,
      ...((category || tag) ? { where: { ...(category ? { category } : {}), ...(tag ? { tag } : {}) } } : {}),
    });
    if (page.error) throw page.error;
    entries.push(...page.entries.map((entry) => entry.data).filter((data) => data.status === 'published' && data.locale === locale));
    cursor = page.nextCursor;
  } while (cursor);
  return entries;
}

async function requireRecipeDatabase() {
  // EmDash can intentionally render an empty collection after runtime init fails.
  // Distinguish an unavailable CMS from a genuinely empty recipe notebook.
  const db = await getDb();
  const schema = await db.selectFrom('_emdash_collections').select('slug').where('slug', '=', 'recipes').executeTakeFirst();
  if (!schema) throw new Error('Recipe schema is not initialized.');
}

export async function recipeIndexData(locale: Locale, params: URLSearchParams) {
  const query = (params.get('q') ?? '').slice(0, 160);
  const category = (params.get('category') ?? '').slice(0, 160);
  const tag = (params.get('tag') ?? '').slice(0, 160);
  const [allRecipes, categories, tags] = await Promise.all([
    publishedRecipes(locale, category || undefined, tag || undefined), getTaxonomyTerms('category', { locale, includeCounts: false }),
    getTaxonomyTerms('tag', { locale, includeCounts: false }),
  ]);
  return { query, category, categories, tag, tags, recipes: allRecipes.filter((recipe) => titleMatches(recipe.title, query)) };
}

export async function recipeDetail(locale: Locale, slug: string, role = 0) {
  await requireRecipeDatabase();
  const { entry, error, isPreview } = await getEmDashEntry<'recipes', Recipe>('recipes', slug, { locale });
  if (error) throw error;
  const privatePreview = !!isPreview && role >= 20;
  if (!entry || entry.data.locale !== locale || (entry.data.status !== 'published' && !privatePreview)) return null;
  const translated = await getTranslations('recipes', entry.data.id);
  if (translated.error) throw translated.error;
  return { recipe: entry.data, privatePreview, links: publishedLanguageLinks(translated.translations) };
}

export function publishedLanguageLinks(translations: TranslationSummary[]) {
  return Object.fromEntries(locales.map((locale) => {
    const translation = translations.find((entry) => entry.locale === locale && entry.status === 'published' && entry.slug);
    return [locale, translation ? localePath(locale, `recipes/${encodeURIComponent(translation.slug!)}`) : undefined];
  })) as Partial<Record<Locale, string>>;
}

export function photoUrl(value?: MediaValue): string | undefined {
  if (!value) return undefined;
  if (!value.provider || value.provider === 'local') {
    const key = value.meta?.storageKey;
    if (typeof key === 'string') return `/_emdash/api/media/file/${encodeURIComponent(key)}`;
    if (value.src?.startsWith('/_emdash/api/media/file/')) return value.src;
    return undefined;
  }
  // Only bundled fictional example art is allowed outside the media library.
  if (value.provider === 'external' && /^\/placeholders\/(?:tomato|lemon)\.png$/.test(value.src ?? '')) return value.src;
  return undefined;
}
export function lines(text = '') { return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); }
export function titleMatches(title: string, query: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
  return normalize(title).includes(normalize(query.trim()));
}
export function safeSourceUrl(value?: string) { return value && /^https?:\/\//i.test(value) ? value : undefined; }

export function recipeFilterUrl(locale: Locale, filters: { query?: string; category?: string; tag?: string }) {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.category) params.set('category', filters.category);
  if (filters.tag) params.set('tag', filters.tag);
  return localePath(locale) + (params.size ? `?${params}` : '');
}
