import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import {
  uploadFile,
  ensureMediaBucket,
  ALLOWED_TYPES,
  ALLOWED_IMAGE_TYPES,
} from '@/lib/storage/supabase-storage';

/**
 * POST /api/media/upload
 * Upload media files to Supabase Storage
 *
 * Supports: Images (jpg, png, webp, gif) and Videos (mp4, webm)
 */
export const POST = withErrorHandling(async (request: Request) => {
  // Ensure the storage bucket exists
  await ensureMediaBucket();

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const category = formData.get('category') as string;
  const subcategory = (formData.get('subcategory') as string) || '';
  const title = (formData.get('title') as string) || '';
  const description = (formData.get('description') as string) || '';
  const alt_text = (formData.get('alt_text') as string) || '';
  const tags = (formData.get('tags') as string) || '';
  const is_hero = formData.get('is_hero') === 'true';

  if (!file) {
    throw new BadRequestError('No file provided');
  }

  if (!category) {
    throw new BadRequestError('Category is required');
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new BadRequestError(
      'Invalid file type. Allowed: JPG, PNG, WebP, GIF, MP4, WebM'
    );
  }

  // Upload to Supabase Storage
  const uploadResult = await uploadFile(file, file.type, {
    category,
    subcategory: subcategory || undefined,
    fileName: file.name,
  });

  // Determine file type for database
  const fileType = ALLOWED_IMAGE_TYPES.includes(file.type) ? 'image' : 'video';

  // Parse tags
  const tagsArray = tags ? tags.split(',').map((t) => t.trim()) : [];

  // Save to database
  const result = await query(
    `INSERT INTO media_library (
      file_name,
      file_path,
      file_type,
      file_size,
      mime_type,
      category,
      subcategory,
      title,
      description,
      alt_text,
      tags,
      is_hero
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      file.name,
      uploadResult.publicUrl, // Store the full public URL from Supabase
      fileType,
      file.size,
      file.type,
      category,
      subcategory,
      title || file.name,
      description,
      alt_text || title || file.name,
      tagsArray,
      is_hero,
    ]
  );

  return NextResponse.json({
    success: true,
    data: result.rows[0],
    message: 'File uploaded successfully',
  });
});
