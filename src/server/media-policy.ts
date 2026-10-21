import type { MediaValue } from 'emdash';

export const imageFields = ['cover_image', 'photo_2', 'photo_3'] as const;
export function publishedRecipeUsesMedia(data: { status?: unknown; cover_image?: unknown; photo_2?: unknown; photo_3?: unknown }, mediaId: string, key: string): boolean {
  if (data.status !== 'published') return false;
  return imageFields.some((field) => {
    const value = data[field] as MediaValue | undefined;
    if (!value || (value.provider && value.provider !== 'local')) return false;
    return value.id === mediaId || value.src === `/_emdash/api/media/file/${encodeURIComponent(key)}`;
  });
}
