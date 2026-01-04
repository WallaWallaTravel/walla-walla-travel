import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

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

  const params: string[] = [];
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

  const result = await query(sqlQuery, params);

  // Get total count
  let countQuery = `SELECT COUNT(*) FROM media_library WHERE is_active = TRUE`;
  if (category) countQuery += ` AND category = $1`;
  const countResult = await query(
    countQuery,
    category ? [category] : []
  );

  return NextResponse.json({
    success: true,
    data: result.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
      hasMore: offset + result.rows.length < parseInt(countResult.rows[0].count)
    }
  });
});

/**
 * POST /api/media
 * Create new media entry (after file upload)
 */
export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json();
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

  const result = await query(
    `INSERT INTO media_library (
      file_name, file_path, file_type, file_size, mime_type,
      category, subcategory, title, description, alt_text,
      tags, is_hero, display_order,
      thumbnail_path, medium_path, large_path
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
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
    ]
  );

  return NextResponse.json({
    success: true,
    data: result.rows[0]
  });
});
