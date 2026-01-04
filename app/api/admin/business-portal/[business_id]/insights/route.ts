/**
 * Admin API: Tour Operator Insights
 * Add strategic notes and recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/business-portal/[business_id]/insights
 * Get all insights for a business
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ business_id: string }> }
) {
  try {
    const { business_id } = await params;
    const businessId = parseInt(business_id);

    if (isNaN(businessId)) {
      return NextResponse.json(
        { error: 'Invalid business ID' },
        { status: 400 }
      );
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

  } catch (error) {
    logger.error('Error fetching insights', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch insights', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/business-portal/[business_id]/insights
 * Add or update insight
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ business_id: string }> }
) {
  try {
    const { business_id } = await params;
    const businessId = parseInt(business_id);
    const data = await request.json();

    if (isNaN(businessId)) {
      return NextResponse.json(
        { error: 'Invalid business ID' },
        { status: 400 }
      );
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

  } catch (error) {
    logger.error('Error adding insight', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to add insight', details: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/business-portal/[business_id]/insights
 * Delete an insight
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ business_id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const insightId = parseInt(searchParams.get('insight_id') || '');

    if (isNaN(insightId)) {
      return NextResponse.json(
        { error: 'Invalid insight ID' },
        { status: 400 }
      );
    }

    await query('DELETE FROM tour_operator_insights WHERE id = $1', [insightId]);

    return NextResponse.json({
      success: true,
      message: 'Insight deleted'
    });

  } catch (error) {
    logger.error('Error deleting insight', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete insight', details: message },
      { status: 500 }
    );
  }
}

