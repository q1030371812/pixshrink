import type { DecodedImage } from '../../lib/types';

// Decodes any browser-supported image file into RGBA pixel data.
// Uses createImageBitmap + OffscreenCanvas so this can run inside a Worker.
export async function decodeImage(file: File): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  if (width === 0 || height === 0) {
    bitmap.close();
    throw new Error('Image has zero dimensions.');
  }
  // Cap absurdly large images to keep the Worker responsive. Users can still
  // compress images up to ~64 megapixels; above that, we surface a friendly
  // error rather than locking the tab.
  const MAX_PIXELS = 64 * 1024 * 1024;
  if (width * height > MAX_PIXELS) {
    bitmap.close();
    throw new Error(
      `Image is too large (${width}\u00d7${height}). Please resize it below 64 megapixels first.`
    );
  }
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    throw new Error('OffscreenCanvas 2D context not available in this browser.');
  }
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  bitmap.close();
  return { data: imageData.data, width, height };
}
