/**
 * Smart Import API Route
 * POST /api/admin/trip-proposals/smart-import
 *
 * Accepts multipart/form-data with 1-5 files, parses them,
 * extracts proposal data via AI, and returns structured results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { smartImportService } from '@/lib/services/smart-import.service';
import { MAX_FILE_SIZE, MAX_FILES, MIME_TYPE_LABELS } from '@/lib/import/types';
import { isAllowedMimeType } from '@/lib/import/parsers';
import { logger } from '@/lib/logger';

export const maxDuration = 60; // Vercel function timeout

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    // Validate file count
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files uploaded. Please select at least one file.' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_FILES} files allowed. You uploaded ${files.length}.` },
        { status: 400 }
      );
    }

    // Validate and convert files
    const uploadedFiles: { buffer: Buffer; filename: string; mimeType: string }[] = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        continue;
      }

      // Validate MIME type
      if (!isAllowedMimeType(file.type)) {
        const accepted = Object.values(MIME_TYPE_LABELS).join(', ');
        return NextResponse.json(
          {
            success: false,
            error: `File "${file.name}" has unsupported type "${file.type}". Accepted types: ${accepted}.`,
          },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        const maxMB = Math.round(MAX_FILE_SIZE / 1024 / 1024);
        return NextResponse.json(
          {
            success: false,
            error: `File "${file.name}" exceeds the ${maxMB}MB size limit.`,
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      uploadedFiles.push({
        buffer: Buffer.from(arrayBuffer),
        filename: file.name,
        mimeType: file.type,
      });
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid files found in the upload.' },
        { status: 400 }
      );
    }

    logger.info('Smart Import: processing files', {
      fileCount: uploadedFiles.length,
      fileNames: uploadedFiles.map(f => f.filename),
    });

    // Process files through the service
    const result = await smartImportService.processFiles(uploadedFiles);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Smart Import: processing failed', { error });

    // Check for Claude API timeout
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI analysis timed out. Try uploading fewer or smaller files.',
        },
        { status: 504 }
      );
    }

    // Check for Claude API errors
    if (error instanceof Error && (error.message.includes('Anthropic') || error.message.includes('API'))) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service temporarily unavailable. Please try again in a moment.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process files. Please try again.',
      },
      { status: 500 }
    );
  }
});
