import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import {
  uploadFile,
  ensureMediaBucket,
  ALLOWED_TYPES,
  ALLOWED_IMAGE_TYPES,
} from '@/lib/storage/supabase-storage';
import { withCSRF } from '@/lib/api/middleware/csrf';

/**
 * POST /api/media/[media_id]/replace
 * Replace an existing media file with a new one
 *
 * Keeps metadata but updates:
 * - file_name
 * - file_path
 * - file_size
 * - mime_type
 * - file_type (if changed between image/video)
 */
export const POST = withCSRF(
  withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ media_id: string }> }
) => {
  const { media_id } = await params;

  // Check if media exists
  const existingMediaRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM media_library WHERE id = ${parseInt(media_id)} AND is_active = TRUE
  `;

  if (existingMediaRows.length === 0) {
    throw new NotFoundError('Media not found');
  }

  const media = existingMediaRows[0];

  // Ensure the storage bucket exists
  await ensureMediaBucket();

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    throw new BadRequestError('No file provided');
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new BadRequestError(
      'Invalid file type. Allowed: JPG, PNG, WebP, GIF, MP4, WebM'
    );
  }

  // Upload to Supabase Storage (use existing category/subcategory)
  const uploadResult = await uploadFile(file, file.type, {
    category: media.category as string,
    subcategory: (media.subcategory as string) || undefined,
    fileName: file.name,
  });

  // Determine file type for database
  const fileType = ALLOWED_IMAGE_TYPES.includes(file.type) ? 'image' : 'video';

  // Update database with new file info
  const mediaIdNum = parseInt(media_id);
  const updatedRows = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE media_library
     SET
       file_name = ${file.name},
       file_path = ${uploadResult.publicUrl},
       file_type = ${fileType},
       file_size = ${file.size},
       mime_type = ${file.type},
       updated_at = NOW()
     WHERE id = ${mediaIdNum} AND is_active = TRUE
     RETURNING *
  `;

  return NextResponse.json({
    success: true,
    data: updatedRows[0],
    message: 'File replaced successfully',
  });
})
);
