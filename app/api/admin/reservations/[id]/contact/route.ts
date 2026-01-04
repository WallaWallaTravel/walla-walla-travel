/**
 * Mark Reservation as Contacted API
 * Update reservation status after calling customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/reservations/[id]/contact
 * Mark reservation as contacted
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservationId = parseInt(id);
    
    if (isNaN(reservationId)) {
      return NextResponse.json(
        { error: 'Invalid reservation ID' },
        { status: 400 }
      );
    }
    
    const result = await query(
      `UPDATE reservations 
       SET status = 'contacted',
           contacted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, reservation_number`,
      [reservationId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }
    
    logger.info('Reservation marked as contacted', { reservationNumber: result.rows[0].reservation_number });
    
    return NextResponse.json({
      success: true,
      message: 'Reservation marked as contacted'
    });
    
  } catch (error) {
    logger.error('Mark Contacted API error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update reservation', details: message },
      { status: 500 }
    );
  }
}


