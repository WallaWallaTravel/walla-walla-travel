/**
 * Spreadsheet Parser
 *
 * Handles both .xlsx and .csv files using SheetJS (xlsx).
 * Outputs CSV text per sheet for AI extraction.
 */

import type { ParsedFile } from '../types';

export async function parseSpreadsheet(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ParsedFile> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheets: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);

      if (csv.trim()) {
        if (workbook.SheetNames.length > 1) {
          sheets.push(`--- Sheet: ${sheetName} ---\n${csv}`);
        } else {
          sheets.push(csv);
        }
      }
    }

    const text = sheets.join('\n\n');

    return {
      filename,
      mimeType,
      textContent: text || '(Empty spreadsheet)',
      status: 'success',
    };
  } catch (error) {
    return {
      filename,
      mimeType,
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to parse spreadsheet',
    };
  }
}
