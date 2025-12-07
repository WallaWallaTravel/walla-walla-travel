/**
 * Get Reservation Details API
 * Fetch a specific reservation by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/booking/reserve/[id]
 * Get reservation details
 */
export async function GET(
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
      `SELECT 
        r.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone
       FROM reservations r
       JOIN customers c ON r.customer_id = c.id
       WHERE r.id = $1`,
      [reservationId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      reservation: result.rows[0]
    });
    
  } catch (error: any) {
    console.error('[Get Reservation API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservation', details: error.message },
      { status: 500 }
    );
  }
}


