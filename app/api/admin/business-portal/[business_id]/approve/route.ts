/**
 * Admin API: Approve Business
 * Mark business as approved and ready for directory
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/business-portal/[business_id]/approve
 * Approve business submission
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ business_id: string }> }
) {
  try {
    const { business_id } = await params;
    const businessId = parseInt(business_id);
    const { status, notes } = await request.json();

    if (isNaN(businessId)) {
      return NextResponse.json(
        { error: 'Invalid business ID' },
        { status: 400 }
      );
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    logger.info('Setting business status', { businessId, status });

    // Update business status
    const result = await query(
      `UPDATE businesses 
       SET 
         status = $1,
         approved_at = NOW(),
         public_profile = $2
       WHERE id = $3
       RETURNING *`,
      [status, status === 'approved', businessId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const business = result.rows[0];

    // Log activity
    await query(
      `INSERT INTO business_activity_log (
        business_id,
        activity_type,
        activity_description,
        metadata
      ) VALUES ($1, $2, $3, $4)`,
      [
        businessId,
        status === 'approved' ? 'business_approved' : 'business_rejected',
        `Business ${status === 'approved' ? 'approved' : 'rejected'} for directory`,
        JSON.stringify({ notes })
      ]
    );

    logger.info('Business status updated successfully', { businessId });

    return NextResponse.json({
      success: true,
      business,
      message: `Business ${status === 'approved' ? 'approved' : 'rejected'} successfully`
    });

  } catch (error) {
    logger.error('Error updating business status', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update business status', details: message },
      { status: 500 }
    );
  }
}

