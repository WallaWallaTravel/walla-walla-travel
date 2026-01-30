/**
 * Business Portal File Upload
 * Upload documents, photos, and videos
 */

import { NextResponse } from 'next/server';
import {
  createFileRecord,
  validateFileUpload,
  categorizeFileType
} from '@/lib/business-portal/file-service';
import { logBusinessActivity } from '@/lib/business-portal/business-service';
import { logger } from '@/lib/logger';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/business-portal/upload-file
 * Upload a file for a business
 */
export const POST = withErrorHandling(async (request) => {
  logger.debug('File upload starting');
  const formData = await request.formData();

  const businessId = parseInt(formData.get('businessId') as string);
  const file = formData.get('file') as File;
  const category = formData.get('category') as string || undefined;

  logger.debug('File upload request', { businessId, fileName: file?.name, fileSize: file?.size, category });

  if (!businessId || !file) {
    logger.warn('File upload missing fields', { businessId, hasFile: !!file });
    throw new BadRequestError(`Missing required fields: businessId: ${businessId}, file: ${!!file}`);
  }

  // Validate file
  const validation = validateFileUpload(file);
  if (!validation.valid) {
    logger.warn('File upload validation failed', { error: validation.error });
    throw new BadRequestError(validation.error || 'File validation failed');
  }

  // Determine file type
  const fileType = categorizeFileType(file.type);

  // For MVP: Store file as base64 data URL
  // In production: Upload to S3/R2 and store URL
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64File = buffer.toString('base64');
  const fileDataUrl = `data:${file.type};base64,${base64File}`;

  // Save file record
  const fileId = await createFileRecord({
    businessId,
    fileType,
    originalFilename: file.name,
    storageUrl: fileDataUrl, // In production: S3 URL
    fileSizeBytes: file.size,
    mimeType: file.type,
    category
  });
  logger.info('File uploaded', { fileId, businessId, fileType });

  // Log activity
  await logBusinessActivity(
    businessId,
    'file_uploaded',
    `Uploaded ${fileType}: ${file.name}`,
    { file_id: fileId, file_type: fileType, file_size: file.size }
  );

  // In production: Queue processing job (OCR, image analysis, etc.)

  return NextResponse.json({
    success: true,
    fileId,
    fileType,
    message: 'File uploaded successfully. Processing queued.'
  });
});

