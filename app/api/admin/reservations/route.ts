/**
 * Admin Reservations API
 * Get all reservations for admin dashboard
 *
 * ✅ REFACTORED: Structured logging + proper error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/reservations
 * Get all reservations
 */
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT
        r.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.sms_marketing_consent as sms_consent
       FROM reservations r
       LEFT JOIN customers c ON r.customer_id = c.id
       ORDER BY
         CASE
           WHEN r.status = 'pending' THEN 1
           WHEN r.status = 'contacted' THEN 2
           WHEN r.status = 'confirmed' THEN 3
           ELSE 4
         END,
         r.created_at DESC`,
      []
    );

    return NextResponse.json({
      success: true,
      reservations: result.rows
    });

  } catch (error) {
    logger.error('Admin Reservations API error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch reservations', details: message },
      { status: 500 }
    );
  }
}


