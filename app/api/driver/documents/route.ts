/**
 * GET/POST /api/driver/documents
 *
 * List and upload driver qualification documents (CDL, medical cert, MVR, etc.)
 * Only accessible by authenticated drivers.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  BadRequestError,
} from '@/lib/api/middleware/error-handler';
import { requireAuth, requireDriver } from '@/lib/api/middleware/auth';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { MEDIA_BUCKET } from '@/lib/storage/supabase-storage';
import { stripExif } from '@/lib/utils/image-processing';
import { generateSecureString } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const ALLOWED_DOCUMENT_TYPES = [
  'cdl',
  'medical_cert',
  'mvr',
  'insurance',
  'vehicle_registration',
];

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await requireAuth(request);
  await requireDriver(session);

  const documents = await prisma.$queryRawUnsafe<Record<string, any>[]>(
    'SELECT * FROM driver_documents WHERE driver_id = $1 AND is_active = true ORDER BY created_at DESC',
    session.user.id
  );

  return NextResponse.json({
    success: true,
    documents,
  });
});

export const POST = withCSRF(
  withErrorHandling(async (request: NextRequest) => {
    const session = await requireAuth(request);
    await requireDriver(session);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('document_type') as string | null;
    const documentName = formData.get('document_name') as string | null;
    const expiresAt = formData.get('expires_at') as string | null;

    if (!file) {
      throw new BadRequestError('Missing required file');
    }
    if (!documentType) {
      throw new BadRequestError('Missing required document_type');
    }
    if (!documentName) {
      throw new BadRequestError('Missing required document_name');
    }

    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      throw new BadRequestError(
        `Invalid document type. Must be one of: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`
      );
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new BadRequestError(
        'Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed'
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestError('File too large. Maximum size is 10MB');
    }

    // Generate storage path
    const timestamp = Date.now();
    const randomString = generateSecureString(7);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const storagePath = `driver-documents/${session.user.id}/${timestamp}-${randomString}.${ext}`;

    // Process file: strip EXIF for images, pass PDFs through unchanged
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const fileData = await stripExif(rawBuffer, file.type);

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, fileData, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      logger.error('Document upload failed', { error, storagePath });
      throw new Error(`Upload failed: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(data.path);

    // Determine file type label for DB
    const fileTypeLabel = file.type === 'application/pdf' ? 'pdf' : ext;

    // Insert into database
    const insertRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
      `INSERT INTO driver_documents (
        driver_id, document_type, document_name, document_url,
        file_type, file_size_bytes, expiry_date, source,
        original_filename, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      session.user.id,
      documentType,
      documentName,
      publicUrl,
      fileTypeLabel,
      file.size,
      expiresAt || null,
      'upload',
      file.name,
      session.user.id,
    );

    logger.info('Driver document uploaded', {
      driverId: session.user.id,
      documentType,
      path: data.path,
    });

    return NextResponse.json(
      {
        success: true,
        document: insertRows[0],
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  })
);
