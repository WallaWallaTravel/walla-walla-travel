/**
 * Admin API: Tour Operator Insights
 * Add strategic notes and recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/business-portal/[business_id]/insights
 * Get all insights for a business
 */
export const GET = withAdminAuth(async (
  request: NextRequest, _session, context
) => {
  const { business_id } = await context!.params;
  const businessId = parseInt(business_id);

  if (isNaN(businessId)) {
    throw new BadRequestError('Invalid business ID');
  }

  const result = await prisma.$queryRawUnsafe(
    `SELECT * FROM tour_operator_insights
     WHERE business_id = $1
     ORDER BY priority DESC, created_at DESC`,
    businessId
  ) as Record<string, any>[];

  return NextResponse.json({
    success: true,
    insights: result
  });
});

const BodySchema = z.object({
  insight_type: z.string().max(100).optional(),
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(5000),
  priority: z.number().int().min(1).max(10).optional(),
  is_public: z.boolean().optional(),
  tags: z.array(z.string().max(100)).optional(),
  best_for: z.array(z.string().max(255)).optional(),
  recommended_for: z.array(z.string().max(255)).optional(),
});

/**
 * POST /api/admin/business-portal/[business_id]/insights
 * Add or update insight
 */
export const POST = withCSRF(
  withAdminAuth(async (
  request: NextRequest, _session, context
) => {
  const { business_id } = await context!.params;
  const businessId = parseInt(business_id);
  const data = BodySchema.parse(await request.json());

  if (isNaN(businessId)) {
    throw new BadRequestError('Invalid business ID');
  }

  logger.debug('Adding insight for business', { businessId });

  const {
    insight_type,
    title,
    content,
    priority,
    is_public,
    tags,
    best_for,
    recommended_for
  } = data;

  // Insert insight
  const result = await prisma.$queryRawUnsafe(
    `INSERT INTO tour_operator_insights (
      business_id,
      insight_type,
      title,
      content,
      priority,
      is_public,
      tags,
      best_for,
      recommended_for,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    RETURNING *`,
    businessId,
    insight_type || 'general',
    title,
    content,
    priority || 5,
    is_public !== false,
    tags || [],
    best_for || [],
    recommended_for || []
  ) as Record<string, any>[];

  const insight = result[0];

  // Log activity
  await prisma.$queryRawUnsafe(
    `INSERT INTO business_activity_log (
      business_id,
      activity_type,
      activity_description,
      metadata
    ) VALUES ($1, 'insight_added', $2, $3)`,
    businessId,
    `Insight added: ${title}`,
    JSON.stringify({ insight_id: insight.id, type: insight_type })
  );

  logger.info('Insight added', { insightId: insight.id, businessId });

  return NextResponse.json({
    success: true,
    insight
  });
})
);

/**
 * DELETE /api/admin/business-portal/[business_id]/insights
 * Delete an insight
 */
export const DELETE = withCSRF(
  withAdminAuth(async (
  request: NextRequest, _session
) => {
  const { searchParams } = new URL(request.url);
  const insightId = parseInt(searchParams.get('insight_id') || '');

  if (isNaN(insightId)) {
    throw new BadRequestError('Invalid insight ID');
  }

  await prisma.$queryRawUnsafe('DELETE FROM tour_operator_insights WHERE id = $1', insightId);

  return NextResponse.json({
    success: true,
    message: 'Insight deleted'
  });
})
);
