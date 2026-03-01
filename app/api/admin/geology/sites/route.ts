import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { query } from '@/lib/db';
import { z } from 'zod';

// ============================================================================
// Validation
// ============================================================================

const createSiteSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(150),
  description: z.string().optional().nullable(),
  site_type: z
    .enum(['viewpoint', 'formation', 'vineyard_example', 'educational_marker', 'museum', 'tour_stop'])
    .optional()
    .nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  directions: z.string().optional().nullable(),
  is_public_access: z.boolean().optional().default(true),
  requires_appointment: z.boolean().optional().default(false),
  best_time_to_visit: z.string().max(255).optional().nullable(),
  photos: z.array(z.string()).optional().nullable(),
  related_topic_ids: z.array(z.number()).optional().nullable(),
  nearby_winery_ids: z.array(z.number()).optional().nullable(),
  is_published: z.boolean().optional().default(false),
});

// ============================================================================
// GET /api/admin/geology/sites - List all sites
// ============================================================================

export const GET = withAdminAuth(async (_request: NextRequest, _session) => {
  const result = await query(`
    SELECT id, name, slug, description, site_type, latitude, longitude,
           address, is_public_access, requires_appointment, is_published, created_at
    FROM geology_sites
    ORDER BY name ASC
  `);

  return NextResponse.json({
    success: true,
    data: {
      sites: result.rows,
      count: result.rows.length,
    },
  });
});

// ============================================================================
// POST /api/admin/geology/sites - Create new site
// ============================================================================

export const POST = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();
  const validated = createSiteSchema.parse(body);

  const result = await query(
    `INSERT INTO geology_sites (
      name, slug, description, site_type, latitude, longitude, address, directions,
      is_public_access, requires_appointment, best_time_to_visit, photos,
      related_topic_ids, nearby_winery_ids, is_published
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      validated.name,
      validated.slug,
      validated.description || null,
      validated.site_type || null,
      validated.latitude || null,
      validated.longitude || null,
      validated.address || null,
      validated.directions || null,
      validated.is_public_access,
      validated.requires_appointment,
      validated.best_time_to_visit || null,
      validated.photos ? JSON.stringify(validated.photos) : null,
      validated.related_topic_ids || null,
      validated.nearby_winery_ids || null,
      validated.is_published,
    ]
  );

  return NextResponse.json({
    success: true,
    data: result.rows[0],
  });
});
