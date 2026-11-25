import { Injectable } from '@angular/core';

/** Longest side of a stored memory photo, in pixels. */
export const MAX_PHOTO_SIDE = 1600;
const JPEG_QUALITY = 0.82;

/** Size to draw an image of `width`×`height` at so its longest side is at most `max` (never upscales). */
export function fitWithin(width: number, height: number, max = MAX_PHOTO_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

@Injectable({ providedIn: 'root' })
export class ImageService {
  /**
   * Re-encodes a picked photo as a smaller JPEG data URL. Drawing onto a canvas drops all metadata
   * (EXIF: GPS location, camera model, time), applies the camera orientation and caps the size.
   */
  async prepareMemoryPhoto(file: File): Promise<string> {
    const bitmap = await this.decode(file);
    try {
      const { width, height } = fitWithin(bitmap.width, bitmap.height);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not available');
      ctx.fillStyle = '#fff'; // flatten transparency (PNG) onto white for JPEG
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    } finally {
      if ('close' in bitmap) bitmap.close();
    }
  }

  private async decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {
        // fall back to <img> decoding below
      }
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
