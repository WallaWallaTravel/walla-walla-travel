/**
 * PDF Parser
 *
 * Extracts text from PDF files using pdf-parse (v1).
 * For scanned PDFs with no extractable text, returns an error
 * (image-based PDF analysis requires a PDF-to-image library).
 */

import type { ParsedFile } from '../types';

// Lazy-load pdf-parse to avoid its test file being loaded at build time
let pdfParseFn: ((buffer: Buffer) => Promise<{ text: string; numpages: number }>) | null = null;

function getPdfParse() {
  if (!pdfParseFn) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pdfParseFn = require('pdf-parse');
  }
  return pdfParseFn!;
}

export async function parsePdf(buffer: Buffer, filename: string): Promise<ParsedFile> {
  try {
    const parse = getPdfParse();
    const data = await parse(buffer);
    const text = data.text?.trim();

    // If text is empty or very short, it's likely a scanned PDF
    if (!text || text.length < 20) {
      return {
        filename,
        mimeType: 'application/pdf',
        status: 'error',
        error: 'This PDF appears to be scanned/image-based with no extractable text. Try uploading a text-based PDF or a screenshot image instead.',
      };
    }

    return {
      filename,
      mimeType: 'application/pdf',
      textContent: text,
      status: 'success',
    };
  } catch (error) {
    return {
      filename,
      mimeType: 'application/pdf',
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to parse PDF',
    };
  }
}
