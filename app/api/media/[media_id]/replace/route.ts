import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import {
  uploadFile,
  ensureMediaBucket,
  ALLOWED_TYPES,
  ALLOWED_IMAGE_TYPES,
} from '@/lib/storage/supabase-storage';

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
export const POST = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ media_id: string }> }
) => {
  const { media_id } = await params;

  // Check if media exists
  const existingMedia = await query(
    `SELECT * FROM media_library WHERE id = $1 AND is_active = TRUE`,
    [media_id]
  );

  if (existingMedia.rows.length === 0) {
    throw new NotFoundError('Media not found');
  }

  const media = existingMedia.rows[0];

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
    category: media.category,
    subcategory: media.subcategory || undefined,
    fileName: file.name,
  });

  // Determine file type for database
  const fileType = ALLOWED_IMAGE_TYPES.includes(file.type) ? 'image' : 'video';

  // Update database with new file info
  const result = await query(
    `UPDATE media_library
     SET
       file_name = $1,
       file_path = $2,
       file_type = $3,
       file_size = $4,
       mime_type = $5,
       updated_at = NOW()
     WHERE id = $6 AND is_active = TRUE
     RETURNING *`,
    [
      file.name,
      uploadResult.publicUrl,
      fileType,
      file.size,
      file.type,
      media_id
    ]
  );

  return NextResponse.json({
    success: true,
    data: result.rows[0],
    message: 'File replaced successfully',
  });
});
