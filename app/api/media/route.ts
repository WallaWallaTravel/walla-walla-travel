import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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

  // Build dynamic query using Prisma.sql for conditional clauses
  const conditions: Prisma.Sql[] = [Prisma.sql`is_active = TRUE`];

  if (category) {
    conditions.push(Prisma.sql`category = ${category}`);
  }

  if (subcategory) {
    conditions.push(Prisma.sql`subcategory = ${subcategory}`);
  }

  if (fileType) {
    conditions.push(Prisma.sql`file_type = ${fileType}`);
  }

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(Prisma.sql`(
      title ILIKE ${searchPattern} OR
      description ILIKE ${searchPattern} OR
      file_name ILIKE ${searchPattern}
    )`);
  }

  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
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
    ${whereClause}
    ORDER BY is_hero DESC, display_order ASC, created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  // Get total count
  const countConditions: Prisma.Sql[] = [Prisma.sql`is_active = TRUE`];
  if (category) {
    countConditions.push(Prisma.sql`category = ${category}`);
  }
  const countWhereClause = Prisma.sql`WHERE ${Prisma.join(countConditions, ' AND ')}`;

  const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM media_library ${countWhereClause}`;

  const total = Number(countResult[0].count);

  return NextResponse.json({
    success: true,
    data: rows,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total
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

  const finalTitle = title || file_name;
  const finalAltText = alt_text || title || file_name;
  const finalTags = tags || [];
  const finalIsHero = is_hero || false;
  const finalDisplayOrder = display_order || 0;

  const result = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    INSERT INTO media_library (
      file_name, file_path, file_type, file_size, mime_type,
      category, subcategory, title, description, alt_text,
      tags, is_hero, display_order,
      thumbnail_path, medium_path, large_path
    ) VALUES (
      ${file_name}, ${file_path}, ${file_type}, ${file_size ?? null}, ${mime_type ?? null},
      ${category}, ${subcategory ?? null}, ${finalTitle}, ${description ?? null}, ${finalAltText},
      ${finalTags}, ${finalIsHero}, ${finalDisplayOrder},
      ${thumbnail_path ?? null}, ${medium_path ?? null}, ${large_path ?? null}
    )
    RETURNING *`;

  return NextResponse.json({
    success: true,
    data: result[0]
  });
})
);
