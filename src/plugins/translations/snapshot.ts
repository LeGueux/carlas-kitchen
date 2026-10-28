export function savedRecipeStamp(item: { updatedAt: string; draftRevisionId?: string | null; liveRevisionId?: string | null; version?: number }) {
  return JSON.stringify([item.updatedAt, item.draftRevisionId ?? null, item.liveRevisionId ?? null, item.version ?? null]);
}
