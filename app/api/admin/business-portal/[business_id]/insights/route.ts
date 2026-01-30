/**
 * Admin API: Tour Operator Insights
 * Add strategic notes and recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/business-portal/[business_id]/insights
 * Get all insights for a business
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ business_id: string }> }
) => {
  const { business_id } = await params;
  const businessId = parseInt(business_id);

  if (isNaN(businessId)) {
    throw new BadRequestError('Invalid business ID');
  }

  const result = await query(
    `SELECT * FROM tour_operator_insights
     WHERE business_id = $1
     ORDER BY priority DESC, created_at DESC`,
    [businessId]
  );

  return NextResponse.json({
    success: true,
    insights: result.rows
  });
});

/**
 * POST /api/admin/business-portal/[business_id]/insights
 * Add or update insight
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ business_id: string }> }
) => {
  const { business_id } = await params;
  const businessId = parseInt(business_id);
  const data = await request.json();

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
  const result = await query(
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
    [
      businessId,
      insight_type || 'general',
      title,
      content,
      priority || 5,
      is_public !== false,
      tags || [],
      best_for || [],
      recommended_for || []
    ]
  );

  const insight = result.rows[0];

  // Log activity
  await query(
    `INSERT INTO business_activity_log (
      business_id,
      activity_type,
      activity_description,
      metadata
    ) VALUES ($1, 'insight_added', $2, $3)`,
    [
      businessId,
      `Insight added: ${title}`,
      JSON.stringify({ insight_id: insight.id, type: insight_type })
    ]
  );

  logger.info('Insight added', { insightId: insight.id, businessId });

  return NextResponse.json({
    success: true,
    insight
  });
});

/**
 * DELETE /api/admin/business-portal/[business_id]/insights
 * Delete an insight
 */
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  _context: { params: Promise<{ business_id: string }> }
) => {
  const { searchParams } = new URL(request.url);
  const insightId = parseInt(searchParams.get('insight_id') || '');

  if (isNaN(insightId)) {
    throw new BadRequestError('Invalid insight ID');
  }

  await query('DELETE FROM tour_operator_insights WHERE id = $1', [insightId]);

  return NextResponse.json({
    success: true,
    message: 'Insight deleted'
  });
});
