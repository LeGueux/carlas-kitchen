import type { RouteContext } from 'emdash';
import { RecipeTranslationError, translateRecipe } from './translate-recipe';
import { savedRecipeStamp } from '../plugins/translations/snapshot';

const failure = (code: string, status: number) => Response.json({ success: false, error: { code } }, { status });

/** Native EmDash routes authorize the editor, enforce CSRF and bound the JSON body. */
export async function handleRecipeTranslation(ctx: Pick<RouteContext, 'user' | 'content' | 'input'>) {
  if (!ctx.user || ctx.user.role < 40) return failure('FORBIDDEN', 403);
  const body = ctx.input as { id?: unknown; target?: unknown; revision?: unknown } | null;
  if (!body || typeof body.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(body.id) || (body.target !== 'en' && body.target !== 'fr') || typeof body.revision !== 'string') return failure('INVALID_REQUEST', 400);
  if (!process.env.DEEPL_API_KEY) return failure('NOT_CONFIGURED', 503);
  try {
    const item = await ctx.content?.get('recipes', body.id);
    if (!item) return failure('NOT_FOUND', 404);
    if (item.locale !== 'pt-BR') return failure('INVALID_SOURCE', 400);
    if (savedRecipeStamp(item) !== body.revision) return failure('CONFLICT', 409);
    let source = item.data;
    if (item.draftRevisionId) {
      const draft = await ctx.content?.getRevision?.('recipes', body.id, item.draftRevisionId);
      if (!draft || draft.collection !== 'recipes' || draft.entryId !== body.id) return failure('CONFLICT', 409);
      source = { ...source, ...draft.data };
    }
    const data = await translateRecipe(source, body.target, process.env.DEEPL_API_KEY);
    const latest = await ctx.content?.get('recipes', body.id);
    if (!latest || savedRecipeStamp(latest) !== body.revision) return failure('CONFLICT', 409);
    return Response.json({ success: true, data });
  } catch (error) {
    return error instanceof RecipeTranslationError ? failure(error.code, error.status) : failure('SERVICE_UNAVAILABLE', 503);
  }
}
