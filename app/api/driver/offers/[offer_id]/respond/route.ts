





























import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { sendEmail, EmailTemplates } from '@/lib/email';
import { sendDriverAssignmentToCustomer } from '@/lib/services/email-automation.service';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ offer_id: string }> }
) {
  const client = await pool.connect();
  
  try {
    const { offer_id: offerId } = await params;
    const offer_id = parseInt(offerId);
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

      // Get full booking and driver details for emails
      const bookingDetails = await pool.query(`
        SELECT 
          b.*,
          u.name as driver_name,
          u.email as driver_email,
          u.phone as driver_phone,
          v.make as vehicle_make,
          v.model as vehicle_model,
          v.vehicle_number
        FROM bookings b
        LEFT JOIN users u ON b.driver_id = u.id
        LEFT JOIN vehicles v ON v.id = $2
        WHERE b.id = $1
      `, [offer.booking_id, offer.vehicle_id]);

      const bookingData = bookingDetails.rows[0];

      // Send confirmation email to driver
      if (bookingData?.driver_email) {
        const template = EmailTemplates.driverAssignment({
          driver_name: bookingData.driver_name,
          customer_name: bookingData.customer_name,
          booking_number: bookingData.booking_number,
          tour_date: bookingData.tour_date,
          start_time: bookingData.start_time,
          pickup_location: bookingData.pickup_location || 'TBD',
          vehicle_name: bookingData.vehicle_number ? 
            `${bookingData.vehicle_number} (${bookingData.vehicle_make} ${bookingData.vehicle_model})` : undefined,
        });

        await sendEmail({
          to: bookingData.driver_email,
          ...template,
        });
      }

      // Notify admin that driver accepted
      const adminEmail = process.env.ADMIN_EMAIL || 'info@wallawallatravel.com';
      await sendEmail({
        to: adminEmail,
        subject: `✅ Driver Accepted: ${bookingData?.booking_number || offer.booking_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">✅ Tour Offer Accepted!</h2>
            <p><strong>${bookingData?.driver_name || 'Driver'}</strong> has accepted the tour.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Booking:</strong> ${bookingData?.booking_number || offer.booking_number}</p>
              <p><strong>Customer:</strong> ${bookingData?.customer_name || offer.customer_name}</p>
              <p><strong>Date:</strong> ${bookingData?.tour_date ? new Date(bookingData.tour_date).toLocaleDateString() : 'TBD'}</p>
            </div>
            <p>The driver and booking have been automatically linked.</p>
          </div>
        `,
      });

      // Notify customer that driver has been assigned (async)
      sendDriverAssignmentToCustomer(offer.booking_id).catch(err => {
        console.error('[TourOffer] Failed to send customer notification:', err);
      });

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

