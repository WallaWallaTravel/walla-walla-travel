import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { withCSRF } from '@/lib/api/middleware/csrf';

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
  const sites = await prisma.geology_sites.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      site_type: true,
      latitude: true,
      longitude: true,
      address: true,
      is_public_access: true,
      requires_appointment: true,
      is_published: true,
      created_at: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    success: true,
    data: {
      sites,
      count: sites.length,
    },
  });
});

// ============================================================================
// POST /api/admin/geology/sites - Create new site
// ============================================================================

export const POST = withCSRF(
  withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();
  const validated = createSiteSchema.parse(body);

  const site = await prisma.geology_sites.create({
    data: {
      name: validated.name,
      slug: validated.slug,
      description: validated.description || null,
      site_type: validated.site_type || null,
      latitude: validated.latitude || null,
      longitude: validated.longitude || null,
      address: validated.address || null,
      directions: validated.directions || null,
      is_public_access: validated.is_public_access,
      requires_appointment: validated.requires_appointment,
      best_time_to_visit: validated.best_time_to_visit || null,
      photos: validated.photos ? (validated.photos as Prisma.InputJsonValue) : Prisma.JsonNull,
      related_topic_ids: validated.related_topic_ids || [],
      nearby_winery_ids: validated.nearby_winery_ids || [],
      is_published: validated.is_published,
    },
  });

  return NextResponse.json({
    success: true,
    data: site,
  });
})
);
