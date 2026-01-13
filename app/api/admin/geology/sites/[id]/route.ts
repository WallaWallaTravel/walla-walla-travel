import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  UnauthorizedError,
  NotFoundError,
  RouteContext,
} from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { query } from '@/lib/db';
import { z } from 'zod';

interface RouteParams {
  id: string;
}

// ============================================================================
// Validation
// ============================================================================

const updateSiteSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(150).optional(),
  description: z.string().optional().nullable(),
  site_type: z
    .enum(['viewpoint', 'formation', 'vineyard_example', 'educational_marker'])
    .optional()
    .nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  directions: z.string().optional().nullable(),
  is_public_access: z.boolean().optional(),
  requires_appointment: z.boolean().optional(),
  best_time_to_visit: z.string().max(255).optional().nullable(),
  photos: z.array(z.string()).optional().nullable(),
  related_topic_ids: z.array(z.number()).optional().nullable(),
  nearby_winery_ids: z.array(z.number()).optional().nullable(),
  is_published: z.boolean().optional(),
});

// ============================================================================
// GET /api/admin/geology/sites/[id] - Get single site
// ============================================================================

export const GET = withErrorHandling<unknown, RouteParams>(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || !canAccessGeology(session.user.role)) {
      throw new UnauthorizedError('Admin access required');
    }

    const { id } = await context.params;
    const siteId = parseInt(id);

    if (isNaN(siteId)) {
      throw new NotFoundError('Invalid site ID');
    }

    const result = await query('SELECT * FROM geology_sites WHERE id = $1', [siteId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Site not found');
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  }
);

// ============================================================================
// PUT /api/admin/geology/sites/[id] - Update site
// ============================================================================

export const PUT = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || !canAccessGeology(session.user.role)) {
      throw new UnauthorizedError('Admin access required');
    }

    const { id } = await context.params;
    const siteId = parseInt(id);

    if (isNaN(siteId)) {
      throw new NotFoundError('Invalid site ID');
    }

    const body = await request.json();
    const validated = updateSiteSchema.parse(body);

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields = [
      'name',
      'slug',
      'description',
      'site_type',
      'latitude',
      'longitude',
      'address',
      'directions',
      'is_public_access',
      'requires_appointment',
      'best_time_to_visit',
      'photos',
      'related_topic_ids',
      'nearby_winery_ids',
      'is_published',
    ];

    for (const field of fields) {
      if (field in validated) {
        updates.push(`${field} = $${paramIndex}`);
        let value = (validated as Record<string, unknown>)[field];
        // JSON stringify arrays
        if (field === 'photos' && Array.isArray(value)) {
          value = JSON.stringify(value);
        }
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(siteId);

    const result = await query(
      `UPDATE geology_sites SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Site not found');
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  }
);

// ============================================================================
// DELETE /api/admin/geology/sites/[id] - Delete site
// ============================================================================

export const DELETE = withErrorHandling<unknown, RouteParams>(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || !canAccessGeology(session.user.role)) {
      throw new UnauthorizedError('Admin access required');
    }

    const { id } = await context.params;
    const siteId = parseInt(id);

    if (isNaN(siteId)) {
      throw new NotFoundError('Invalid site ID');
    }

    const result = await query('DELETE FROM geology_sites WHERE id = $1 RETURNING id', [siteId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Site not found');
    }

    return NextResponse.json({
      success: true,
      message: 'Site deleted',
    });
  }
);
