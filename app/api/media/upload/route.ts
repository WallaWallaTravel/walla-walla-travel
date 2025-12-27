import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

/**
 * POST /api/media/upload
 * Upload media files
 *
 * Supports: Images (jpg, png, webp, gif) and Videos (mp4, webm)
 */
export const POST = withErrorHandling(async (request: Request) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const category = formData.get('category') as string;
  const subcategory = formData.get('subcategory') as string || '';
  const title = formData.get('title') as string || '';
  const description = formData.get('description') as string || '';
  const alt_text = formData.get('alt_text') as string || '';
  const tags = formData.get('tags') as string || '';
  const is_hero = formData.get('is_hero') === 'true';

  if (!file) {
    throw new BadRequestError('No file provided');
  }

  if (!category) {
    throw new BadRequestError('Category is required');
  }

  // Validate file type
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/webm'];
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

  if (!allowedTypes.includes(file.type)) {
    throw new BadRequestError('Invalid file type. Allowed: JPG, PNG, WebP, GIF, MP4, WebM');
  }

  // Determine file type
  const fileType = allowedImageTypes.includes(file.type) ? 'image' : 'video';

  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const ext = file.name.split('.').pop();
  const safeFileName = `${timestamp}-${randomString}.${ext}`;

  // Create directory structure
  const uploadDir = path.join(process.cwd(), 'public', 'media', category, subcategory || '');
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  // Save file
  const filePath = path.join(uploadDir, safeFileName);
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  // Generate public URL path
  const publicPath = `/media/${category}/${subcategory ? subcategory + '/' : ''}${safeFileName}`;

  // Save to database
  const tagsArray = tags ? tags.split(',').map(t => t.trim()) : [];

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
      publicPath,
      fileType,
      file.size,
      file.type,
      category,
      subcategory,
      title || file.name,
      description,
      alt_text || title || file.name,
      tagsArray,
      is_hero
    ]
  );

  return NextResponse.json({
    success: true,
    data: result.rows[0],
    message: 'File uploaded successfully'
  });
});
