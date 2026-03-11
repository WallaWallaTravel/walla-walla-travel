import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, NotFoundError } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';

const PutBodySchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  alt_text: z.string().max(500).optional(),
  tags: z.array(z.string().max(100)).optional(),
  category: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  is_hero: z.boolean().optional(),
  display_order: z.number().int().nonnegative().optional(),
});

const PatchBodySchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  alt_text: z.string().max(500).optional(),
  tags: z.array(z.string().max(100)).optional(),
  category: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  is_hero: z.boolean().optional(),
});

/**
 * GET /api/media/[media_id]
 * Get single media item with usage information
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ media_id: string }> }
) => {
  const { media_id } = await params;
  const mediaIdNum = parseInt(media_id, 10);

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT * FROM media_library WHERE id = ${mediaIdNum} AND is_active = TRUE`;

  if (rows.length === 0) {
    throw new NotFoundError('Media not found');
  }

  const media = rows[0];

  // Get usage information
  const [proposalRows, wineryRows, vehicleRows] = await Promise.all([
    prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT p.id, p.proposal_number, p.title, p.client_name, p.status
       FROM proposals p
       JOIN proposal_media pm ON pm.proposal_id = p.id
       WHERE pm.media_id = ${mediaIdNum}
       ORDER BY p.created_at DESC`,
    prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT w.id, w.name, w.slug
       FROM wineries w
       JOIN winery_media wm ON wm.winery_id = w.id
       WHERE wm.media_id = ${mediaIdNum}`,
    prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT v.id, v.name, v.license_plate
       FROM vehicles v
       JOIN vehicle_media vm ON vm.vehicle_id = v.id
       WHERE vm.media_id = ${mediaIdNum}`,
  ]);

  const usage = {
    proposals: proposalRows,
    wineries: wineryRows,
    vehicles: vehicleRows,
    total_uses: proposalRows.length + wineryRows.length + vehicleRows.length
  };

  // Increment view count
  await prisma.$executeRaw`
    UPDATE media_library SET view_count = view_count + 1 WHERE id = ${mediaIdNum}`;

  return NextResponse.json({
    success: true,
    data: {
      ...media,
      usage
    }
  });
});

/**
 * PUT /api/media/[media_id]
 * Update media metadata
 */
export const PUT = withCSRF(
  withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ media_id: string }> }
) => {
  const { media_id } = await params;
  const mediaIdNum = parseInt(media_id, 10);
  const body = PutBodySchema.parse(await request.json());

  const {
    title,
    description,
    alt_text,
    tags,
    category,
    subcategory,
    is_hero,
    display_order
  } = body;

  const result = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    UPDATE media_library
     SET
       title = COALESCE(${title ?? null}, title),
       description = COALESCE(${description ?? null}, description),
       alt_text = COALESCE(${alt_text ?? null}, alt_text),
       tags = COALESCE(${tags ?? null}, tags),
       category = COALESCE(${category ?? null}, category),
       subcategory = COALESCE(${subcategory ?? null}, subcategory),
       is_hero = COALESCE(${is_hero ?? null}, is_hero),
       display_order = COALESCE(${display_order ?? null}, display_order),
       updated_at = NOW()
     WHERE id = ${mediaIdNum} AND is_active = TRUE
     RETURNING *`;

  if (result.length === 0) {
    throw new NotFoundError('Media not found');
  }

  return NextResponse.json({
    success: true,
    data: result[0]
  });
})
);

/**
 * PATCH /api/media/[media_id]
 * Partial update of media metadata
 */
export const PATCH = withCSRF(
  withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ media_id: string }> }
) => {
  const { media_id } = await params;
  const mediaIdNum = parseInt(media_id, 10);
  const body = PatchBodySchema.parse(await request.json());

  const {
    title,
    description,
    alt_text,
    tags,
    category,
    subcategory,
    is_hero
  } = body;

  const result = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    UPDATE media_library
     SET
       title = COALESCE(${title ?? null}, title),
       description = COALESCE(${description ?? null}, description),
       alt_text = COALESCE(${alt_text ?? null}, alt_text),
       tags = COALESCE(${tags ?? null}, tags),
       category = COALESCE(${category ?? null}, category),
       subcategory = COALESCE(${subcategory ?? null}, subcategory),
       is_hero = COALESCE(${is_hero ?? null}, is_hero),
       updated_at = NOW()
     WHERE id = ${mediaIdNum} AND is_active = TRUE
     RETURNING *`;

  if (result.length === 0) {
    throw new NotFoundError('Media not found');
  }

  return NextResponse.json({
    success: true,
    data: result[0]
  });
})
);

/**
 * DELETE /api/media/[media_id]
 * Soft delete media (set is_active = false)
 */
export const DELETE = withCSRF(
  withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ media_id: string }> }
) => {
  const { media_id } = await params;
  const mediaIdNum = parseInt(media_id, 10);

  const result = await prisma.$queryRaw<Array<{ id: number }>>`
    UPDATE media_library
     SET is_active = FALSE, updated_at = NOW()
     WHERE id = ${mediaIdNum}
     RETURNING id`;

  if (result.length === 0) {
    throw new NotFoundError('Media not found');
  }

  return NextResponse.json({
    success: true,
    message: 'Media deleted successfully'
  });
})
);
