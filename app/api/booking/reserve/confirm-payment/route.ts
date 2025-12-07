/**
 * Confirm Payment and Update Reservation
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { confirmPaymentSuccess } from '@/lib/stripe';
import { sendReservationConfirmation } from '@/lib/email';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { paymentIntentId, reservationId } = body;

    if (!paymentIntentId || !reservationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify payment with Stripe
    const paymentSuccessful = await confirmPaymentSuccess(paymentIntentId);

    if (!paymentSuccessful) {
      return NextResponse.json(
        { error: 'Payment not confirmed' },
        { status: 400 }
      );
    }

    // Update reservation with payment info
    const updateResult = await client.query(
      `UPDATE reservations 
       SET deposit_paid = true, 
           payment_method = 'card',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [reservationId]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    const reservation = updateResult.rows[0];

    // Get customer info
    const customerResult = await client.query(
      'SELECT * FROM customers WHERE id = $1',
      [reservation.customer_id]
    );

    const customer = customerResult.rows[0];

    // Send confirmation email with payment receipt
    if (customer) {
      await sendReservationConfirmation(
        {
          customer_name: customer.name,
          customer_email: customer.email,
          reservation_number: reservation.reservation_number,
          party_size: reservation.party_size,
          preferred_date: reservation.preferred_date,
          alternate_date: reservation.alternate_date,
          event_type: reservation.event_type || 'Wine Tour',
          special_requests: reservation.special_requests,
          deposit_amount: parseFloat(reservation.deposit_amount),
          payment_method: 'card',
          consultation_hours: 24,
          confirmation_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/book/reserve/confirmation?id=${reservation.id}`
        },
        customer.email,
        reservation.brand_id
      );
    }

    return NextResponse.json({
      success: true,
      reservationId: reservation.id,
      reservationNumber: reservation.reservation_number,
    });

  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm payment' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}


