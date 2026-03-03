/**
 * Image Processing Utilities
 *
 * Strips EXIF metadata (including GPS coordinates) from uploaded images
 * to protect user privacy. Uses sharp for efficient processing.
 */

import sharp from 'sharp';

/** MIME types that should have EXIF data stripped */
const STRIPPABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Strip EXIF metadata from an image buffer while preserving image quality.
 * Returns the original buffer unchanged for non-image file types.
 *
 * @param buffer - Raw image buffer
 * @param mimeType - MIME type of the file
 * @returns Cleaned buffer with EXIF data removed
 */
export async function stripExif(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (!STRIPPABLE_TYPES.includes(mimeType)) {
    return buffer;
  }

  const image = sharp(buffer).rotate(); // .rotate() auto-orients based on EXIF before stripping

  switch (mimeType) {
    case 'image/jpeg':
      return image.jpeg({ quality: 95 }).toBuffer();
    case 'image/png':
      return image.png().toBuffer();
    case 'image/webp':
      return image.webp({ quality: 95 }).toBuffer();
    default:
      return buffer;
  }
}
