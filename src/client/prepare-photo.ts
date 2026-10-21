const MAX_BYTES = 3_000_000;
const TARGET_BYTES = 2_500_000;

/** Called inside EmDash's shared media upload function, before hashing or metadata. */
export async function preparePhoto(file: File, signal?: AbortSignal): Promise<File> {
  signal?.throwIfAborted();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Please choose a JPEG, PNG or WebP photo.');
  }
  if (file.size <= TARGET_BYTES) return file;
  if (file.size > 40_000_000) throw new Error('This photo is too large to open safely (40 MB maximum). Choose a smaller photo.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { throw new Error('This photo could not be opened. Choose a JPEG, PNG or WebP photo.'); }
  try {
    let scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 5; attempt++) {
      signal?.throwIfAborted();
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Photo resizing is unavailable in this browser.');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84 - attempt * 0.06));
      canvas.width = canvas.height = 1;
      if (blob && blob.size <= TARGET_BYTES) {
        return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
      }
      scale *= 0.75;
    }
  } finally { bitmap.close(); }
  throw new Error(`The photo could not be reduced below ${MAX_BYTES / 1_000_000} MB. Choose another photo.`);
}
