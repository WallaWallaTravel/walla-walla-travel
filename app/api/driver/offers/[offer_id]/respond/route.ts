





























import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function POST(
  request: NextRequest,
  { params }: { params: { offer_id: string } }
) {
  const client = await pool.connect();
  
  try {
    const offer_id = parseInt(params.offer_id);
    const body = await request.json();
    const { action, notes } = body;

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Get offer details
    const offerResult = await client.query(`
      SELECT 
        to.*,
        b.booking_number,
        b.customer_name
      FROM tour_offers to
      JOIN bookings b ON to.booking_id = b.id
      WHERE to.id = $1
    `, [offer_id]);

    if (offerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    const offer = offerResult.rows[0];

    // Check if offer is still pending
    if (offer.status !== 'pending') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Offer is no longer available' },
        { status: 400 }
      );
    }

    // Check if offer has expired
    if (new Date(offer.expires_at) < new Date()) {
      await client.query(`
        UPDATE tour_offers
        SET status = 'expired', updated_at = NOW()
        WHERE id = $1
      `, [offer_id]);
      
      await client.query('COMMIT');
      
      return NextResponse.json(
        { error: 'Offer has expired' },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      // Update offer status
      await client.query(`
        UPDATE tour_offers
        SET 
          status = 'accepted',
          response_at = NOW(),
          response_notes = $2
        WHERE id = $1
      `, [offer_id, notes || null]);

      // Assign driver to booking
      await client.query(`
        UPDATE bookings
        SET 
          driver_id = $1,
          status = CASE 
            WHEN status = 'pending' THEN 'confirmed'
            ELSE status
          END,
          updated_at = NOW()
        WHERE id = $2
      `, [offer.driver_id, offer.booking_id]);

      // Assign vehicle if specified
      if (offer.vehicle_id) {
        await client.query(`
          INSERT INTO vehicle_assignments (
            vehicle_id,
            booking_id,
            driver_id,
            assigned_at,
            status
          ) VALUES ($1, $2, $3, NOW(), 'assigned')
          ON CONFLICT (booking_id) 
          DO UPDATE SET 
            vehicle_id = $1,
            driver_id = $3,
            assigned_at = NOW(),
            status = 'assigned'
        `, [offer.vehicle_id, offer.booking_id, offer.driver_id]);
      }

      // Withdraw other pending offers for this booking
      await client.query(`
        UPDATE tour_offers
        SET 
          status = 'withdrawn',
          response_at = NOW(),
          response_notes = 'Automatically withdrawn - booking accepted by another driver'
        WHERE booking_id = $1
        AND id != $2
        AND status = 'pending'
      `, [offer.booking_id, offer_id]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Tour accepted! You have been assigned to this booking.',
        booking_id: offer.booking_id,
        booking_number: offer.booking_number,
      });

    } else if (action === 'decline') {
      // Update offer status
      await client.query(`
        UPDATE tour_offers
        SET 
          status = 'declined',
          response_at = NOW(),
          response_notes = $2
        WHERE id = $1
      `, [offer_id, notes || null]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Tour declined.',
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error responding to offer:', error);
    return NextResponse.json(
      { error: 'Failed to respond to offer' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

