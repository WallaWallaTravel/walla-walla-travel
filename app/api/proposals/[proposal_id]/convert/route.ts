import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDbConfig } from '@/lib/config/database';
import { getSession } from '@/lib/auth/session';

/**
 * POST /api/proposals/[proposal_id]/convert
 * Convert an accepted proposal to a booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
) {
  const pool = new Pool(getDbConfig());
  const { proposal_id } = await params;

  try {
    // Check authentication
    const session = await getSession();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get proposal
    const proposalResult = await pool.query(
      `SELECT * FROM proposals 
       WHERE id = $1 OR proposal_number = $1`,
      [proposal_id]
    );

    if (proposalResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    const proposal = proposalResult.rows[0];

    // Check if proposal can be converted
    if (proposal.status !== 'accepted') {
      return NextResponse.json(
        { success: false, error: `Cannot convert proposal with status: ${proposal.status}. Only accepted proposals can be converted.` },
        { status: 400 }
      );
    }

    // Check if already converted
    if (proposal.converted_to_booking_id) {
      return NextResponse.json(
        { success: false, error: 'This proposal has already been converted to a booking' },
        { status: 400 }
      );
    }

    // Extract service items to get tour details
    const serviceItems = proposal.service_items || [];
    
    // Find the main tour service (usually the first one)
    const tourService = serviceItems.find((item: any) => 
      item.type === 'tour' || item.name?.toLowerCase().includes('tour')
    ) || serviceItems[0] || {};

    // Extract tour date - check multiple possible locations
    let tourDate = proposal.tour_date || tourService.tour_date || tourService.date;
    
    // If no tour date, try to extract from service item description or use proposal creation date + 7 days
    if (!tourDate) {
      // Default to 7 days from now if no date found
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      tourDate = defaultDate.toISOString().split('T')[0];
    }

    // Extract other details
    const partySize = proposal.party_size || tourService.party_size || tourService.guests || 2;
    const durationHours = proposal.duration_hours || tourService.duration_hours || tourService.duration || 6;
    const pickupLocation = proposal.pickup_location || tourService.pickup_location || 'TBD';
    
    // Calculate times
    const startTime = tourService.start_time || '10:00';
    const endHour = parseInt(startTime.split(':')[0]) + durationHours;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;

    // Pricing
    const basePrice = parseFloat(proposal.subtotal || proposal.total || 0);
    const gratuity = parseFloat(proposal.gratuity_amount || 0);
    const total = parseFloat(proposal.final_total || proposal.total || basePrice);
    const depositAmount = total * 0.5;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Generate booking number
      const year = new Date().getFullYear();
      const seqResult = await client.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM 10) AS INTEGER)), 0) + 1 as next_seq
         FROM bookings
         WHERE booking_number LIKE $1`,
        [`WWT-${year}-%`]
      );
      const nextSeq = seqResult.rows[0].next_seq || 1;
      const bookingNumber = `WWT-${year}-${nextSeq.toString().padStart(5, '0')}`;

      // Create customer if doesn't exist
      const customerResult = await client.query(
        `INSERT INTO customers (email, name, phone)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET
           name = COALESCE(EXCLUDED.name, customers.name),
           phone = COALESCE(EXCLUDED.phone, customers.phone)
         RETURNING id`,
        [proposal.client_email, proposal.client_name, proposal.client_phone]
      );
      const customerId = customerResult.rows[0].id;

      // Create booking
      const bookingResult = await client.query(
        `INSERT INTO bookings (
          booking_number,
          customer_id,
          customer_name,
          customer_email,
          customer_phone,
          party_size,
          tour_date,
          start_time,
          end_time,
          duration_hours,
          pickup_location,
          special_requests,
          base_price,
          gratuity,
          total_price,
          deposit_amount,
          final_payment_amount,
          status,
          booking_source,
          booked_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
         RETURNING *`,
        [
          bookingNumber,
          customerId,
          proposal.client_name,
          proposal.client_email,
          proposal.client_phone,
          partySize,
          tourDate,
          startTime,
          endTime,
          durationHours,
          pickupLocation,
          proposal.notes || proposal.internal_notes || null,
          basePrice,
          gratuity,
          total,
          depositAmount,
          total - depositAmount,
          'confirmed', // Auto-confirm since proposal was accepted
          'proposal',
          session.user.id
        ]
      );
      const booking = bookingResult.rows[0];

      // Update proposal with booking reference
      await client.query(
        `UPDATE proposals SET
          status = 'converted',
          converted_to_booking_id = $1,
          converted_at = NOW(),
          updated_at = NOW()
         WHERE id = $2`,
        [booking.id, proposal.id]
      );

      // Log activity on proposal
      await client.query(
        `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
         VALUES ($1, $2, $3, $4)`,
        [
          proposal.id,
          'converted',
          `Proposal converted to booking ${bookingNumber}`,
          JSON.stringify({
            booking_id: booking.id,
            booking_number: bookingNumber,
            converted_by: session.user.name,
            converted_by_id: session.user.id,
            timestamp: new Date().toISOString()
          })
        ]
      );

      // Log activity on booking timeline
      await client.query(
        `INSERT INTO booking_timeline (booking_id, event_type, event_description, event_data, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          booking.id,
          'created',
          `Booking created from proposal ${proposal.proposal_number}`,
          JSON.stringify({
            source: 'proposal_conversion',
            proposal_id: proposal.id,
            proposal_number: proposal.proposal_number
          }),
          session.user.id
        ]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          booking_id: booking.id,
          booking_number: bookingNumber,
          proposal_id: proposal.id,
          proposal_number: proposal.proposal_number,
          message: 'Proposal successfully converted to booking'
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error converting proposal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to convert proposal to booking' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}


