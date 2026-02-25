/**
 * Image Parser
 *
 * Converts image buffers to base64 for Claude Vision analysis.
 * Supports PNG, JPEG, and WebP.
 */

import type { ParsedFile } from '../types';

const MIME_TO_MEDIA: Record<string, 'image/png' | 'image/jpeg' | 'image/webp'> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/webp': 'image/webp',
};

export function parseImage(buffer: Buffer, filename: string, mimeType: string): ParsedFile {
  const mediaType = MIME_TO_MEDIA[mimeType];

  if (!mediaType) {
    return {
      filename,
      mimeType,
      status: 'error',
      error: `Unsupported image type: ${mimeType}`,
    };
  }

  const base64 = buffer.toString('base64');

  return {
    filename,
    mimeType,
    imageContent: [{ base64, mediaType }],
    status: 'success',
  };
}
