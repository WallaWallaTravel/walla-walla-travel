import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import {
  uploadFile,
  ensureMediaBucket,
  ALLOWED_TYPES,
  ALLOWED_IMAGE_TYPES,
} from '@/lib/storage/supabase-storage';
import { withCSRF } from '@/lib/api/middleware/csrf';

/**
 * POST /api/media/upload
 * Upload media files to Supabase Storage
 *
 * Supports: Images (jpg, png, webp, gif) and Videos (mp4, webm)
 */
export const POST = withCSRF(
  withErrorHandling(async (request: Request) => {
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

  const finalTitle = title || file.name;
  const finalAltText = alt_text || title || file.name;

  // Save to database
  const result = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    INSERT INTO media_library (
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
    ) VALUES (
      ${file.name},
      ${uploadResult.publicUrl},
      ${fileType},
      ${file.size},
      ${file.type},
      ${category},
      ${subcategory},
      ${finalTitle},
      ${description},
      ${finalAltText},
      ${tagsArray},
      ${is_hero}
    )
    RETURNING *`;

  return NextResponse.json({
    success: true,
    data: result[0],
    message: 'File uploaded successfully',
  });
})
);
