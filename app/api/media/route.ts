import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';

const PostBodySchema = z.object({
  file_name: z.string().min(1).max(255),
  file_path: z.string().min(1).max(1000),
  file_type: z.string().min(1).max(50),
  file_size: z.number().int().nonnegative().optional(),
  mime_type: z.string().max(100).optional(),
  category: z.string().min(1).max(100),
  subcategory: z.string().max(100).optional(),
  title: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  alt_text: z.string().max(500).optional(),
  tags: z.array(z.string().max(100)).optional(),
  is_hero: z.boolean().optional(),
  display_order: z.number().int().nonnegative().optional(),
  thumbnail_path: z.string().max(1000).optional(),
  medium_path: z.string().max(1000).optional(),
  large_path: z.string().max(1000).optional(),
});

/**
 * GET /api/media
 * List media with optional filters
 */
export const GET = withErrorHandling(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const subcategory = searchParams.get('subcategory');
  const fileType = searchParams.get('file_type');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  let sqlQuery = `
    SELECT
      id,
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
      is_hero,
      display_order,
      thumbnail_path,
      medium_path,
      large_path,
      view_count,
      created_at,
      updated_at
    FROM media_library
    WHERE is_active = TRUE
  `;

  const params: (string | number)[] = [];
  let paramCount = 0;

  if (category) {
    paramCount++;
    sqlQuery += ` AND category = $${paramCount}`;
    params.push(category);
  }

  if (subcategory) {
    paramCount++;
    sqlQuery += ` AND subcategory = $${paramCount}`;
    params.push(subcategory);
  }

  if (fileType) {
    paramCount++;
    sqlQuery += ` AND file_type = $${paramCount}`;
    params.push(fileType);
  }

  if (search) {
    paramCount++;
    sqlQuery += ` AND (
      title ILIKE $${paramCount} OR
      description ILIKE $${paramCount} OR
      file_name ILIKE $${paramCount}
    )`;
    params.push(`%${search}%`);
  }

  sqlQuery += ` ORDER BY is_hero DESC, display_order ASC, created_at DESC`;
  sqlQuery += ` LIMIT ${limit} OFFSET ${offset}`;

  const result = await prisma.$queryRawUnsafe(sqlQuery, ...params) as Record<string, any>[];

  // Get total count
  let countQuery = `SELECT COUNT(*) FROM media_library WHERE is_active = TRUE`;
  if (category) countQuery += ` AND category = $1`;
  const countResult = category
    ? await prisma.$queryRawUnsafe(countQuery, category) as Record<string, any>[]
    : await prisma.$queryRawUnsafe(countQuery) as Record<string, any>[];

  return NextResponse.json({
    success: true,
    data: result,
    pagination: {
      total: parseInt(countResult[0].count),
      limit,
      offset,
      hasMore: offset + result.length < parseInt(countResult[0].count)
    }
  });
});

/**
 * POST /api/media
 * Create new media entry (after file upload)
 */
export const POST = withCSRF(
  withErrorHandling(async (request: Request) => {
  const body = PostBodySchema.parse(await request.json());
  const {
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
    is_hero,
    display_order,
    thumbnail_path,
    medium_path,
    large_path
  } = body;

  // Validate required fields
  if (!file_name || !file_path || !file_type || !category) {
    throw new BadRequestError('Missing required fields: file_name, file_path, file_type, category');
  }

  const result = await prisma.$queryRawUnsafe(
    `INSERT INTO media_library (
      file_name, file_path, file_type, file_size, mime_type,
      category, subcategory, title, description, alt_text,
      tags, is_hero, display_order,
      thumbnail_path, medium_path, large_path
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    file_name,
    file_path,
    file_type,
    file_size,
    mime_type,
    category,
    subcategory,
    title || file_name,
    description,
    alt_text || title || file_name,
    tags || [],
    is_hero || false,
    display_order || 0,
    thumbnail_path,
    medium_path,
    large_path
  ) as Record<string, any>[];

  return NextResponse.json({
    success: true,
    data: result[0]
  });
})
);
