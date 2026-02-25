/**
 * DOCX Parser
 *
 * Extracts raw text from Word documents using mammoth.
 */

import type { ParsedFile } from '../types';

export async function parseDocx(buffer: Buffer, filename: string): Promise<ParsedFile> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value?.trim();

    if (!text) {
      return {
        filename,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        textContent: '',
        status: 'success',
      };
    }

    return {
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      textContent: text,
      status: 'success',
    };
  } catch (error) {
    return {
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to parse Word document',
    };
  }
}
