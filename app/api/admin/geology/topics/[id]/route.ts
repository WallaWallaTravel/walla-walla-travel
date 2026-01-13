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

const updateTopicSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(150)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only')
    .optional(),
  title: z.string().min(1).max(255).optional(),
  subtitle: z.string().max(500).optional().nullable(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(500).optional().nullable(),
  topic_type: z
    .enum([
      'ice_age_floods',
      'soil_types',
      'basalt',
      'terroir',
      'climate',
      'water',
      'overview',
      'wine_connection',
    ])
    .optional(),
  difficulty: z.enum(['general', 'intermediate', 'advanced']).optional(),
  hero_image_url: z.string().url().optional().nullable(),
  display_order: z.number().int().optional(),
  is_featured: z.boolean().optional(),
  is_published: z.boolean().optional(),
  related_winery_ids: z.array(z.number()).optional().nullable(),
  related_topic_ids: z.array(z.number()).optional().nullable(),
  author_name: z.string().max(255).optional().nullable(),
  sources: z.string().optional().nullable(),
  verified: z.boolean().optional(),
});

// ============================================================================
// GET /api/admin/geology/topics/[id] - Get a single topic
// ============================================================================

export const GET = withErrorHandling<unknown, RouteParams>(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || !canAccessGeology(session.user.role)) {
      throw new UnauthorizedError('Admin access required');
    }

    const { id } = await context.params;
    const topicId = parseInt(id);

    if (isNaN(topicId)) {
      throw new NotFoundError('Invalid topic ID');
    }

    const result = await query('SELECT * FROM geology_topics WHERE id = $1', [topicId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Topic not found');
    }

    // Also get related facts
    const factsResult = await query(
      'SELECT * FROM geology_facts WHERE topic_id = $1 ORDER BY display_order ASC',
      [topicId]
    );

    return NextResponse.json({
      success: true,
      data: {
        topic: result.rows[0],
        relatedFacts: factsResult.rows,
      },
    });
  }
);

// ============================================================================
// PUT /api/admin/geology/topics/[id] - Update a topic
// ============================================================================

export const PUT = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || !canAccessGeology(session.user.role)) {
      throw new UnauthorizedError('Admin access required');
    }

    const { id } = await context.params;
    const topicId = parseInt(id);

    if (isNaN(topicId)) {
      throw new NotFoundError('Invalid topic ID');
    }

    const body = await request.json();
    const validated = updateTopicSchema.parse(body);

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields = [
      'slug',
      'title',
      'subtitle',
      'content',
      'excerpt',
      'topic_type',
      'difficulty',
      'hero_image_url',
      'display_order',
      'is_featured',
      'is_published',
      'related_winery_ids',
      'related_topic_ids',
      'author_name',
      'sources',
      'verified',
    ];

    for (const field of fields) {
      if (field in validated) {
        updates.push(`${field} = $${paramIndex}`);
        values.push((validated as Record<string, unknown>)[field]);
        paramIndex++;
      }
    }

    // Add verified_at if setting verified to true
    if (validated.verified === true) {
      updates.push(`verified_at = NOW()`);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(topicId);

    const result = await query(
      `UPDATE geology_topics SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Topic not found');
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  }
);

// ============================================================================
// DELETE /api/admin/geology/topics/[id] - Delete a topic
// ============================================================================

export const DELETE = withErrorHandling<unknown, RouteParams>(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const session = await getSession();
    if (!session || !canAccessGeology(session.user.role)) {
      throw new UnauthorizedError('Admin access required');
    }

    const { id } = await context.params;
    const topicId = parseInt(id);

    if (isNaN(topicId)) {
      throw new NotFoundError('Invalid topic ID');
    }

    const result = await query('DELETE FROM geology_topics WHERE id = $1 RETURNING id', [topicId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Topic not found');
    }

    return NextResponse.json({
      success: true,
      message: 'Topic deleted',
    });
  }
);
