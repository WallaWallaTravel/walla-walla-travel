/**
 * File Parser Router
 *
 * Routes uploaded files to the correct parser based on MIME type.
 */

import type { ParsedFile, AllowedMimeType } from '../types';
import { ALLOWED_MIME_TYPES } from '../types';
import { parsePdf } from './pdf-parser';
import { parseDocx } from './docx-parser';
import { parseSpreadsheet } from './spreadsheet-parser';
import { parseImage } from './image-parser';

export function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export async function parseFile(buffer: Buffer, filename: string, mimeType: string): Promise<ParsedFile> {
  if (!isAllowedMimeType(mimeType)) {
    return {
      filename,
      mimeType,
      status: 'error',
      error: `Unsupported file type: ${mimeType}. Accepted: PDF, Word, Excel, CSV, PNG, JPEG, WebP.`,
    };
  }

  switch (mimeType) {
    case 'application/pdf':
      return parsePdf(buffer, filename);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDocx(buffer, filename);

    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'text/csv':
      return parseSpreadsheet(buffer, filename, mimeType);

    case 'image/png':
    case 'image/jpeg':
    case 'image/webp':
      return parseImage(buffer, filename, mimeType);

    default:
      return {
        filename,
        mimeType,
        status: 'error',
        error: `No parser available for: ${mimeType}`,
      };
  }
}
