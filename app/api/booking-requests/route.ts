/**
 * Booking Request API
 * Handles new booking requests from the public booking form
 * Creates a reservation with status "pending" for admin review
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TourDay {
  date: string;
  guests: number | string; // number or "Large Group (~X)"
  hours: number;
}

interface AdditionalService {
  type: string;
  details: string;
}

interface BookingRequestData {
  provider: string;
  providerId: string;
  tourType: string;
  tourDays: TourDay[];
  additionalServices?: AdditionalService[];
  contact: {
    name: string;
    email: string;
    phone: string;
    textConsent: boolean;
  };
  notes?: string;
  estimatedTotal: string;
}

/**
 * POST /api/booking-requests
 * Create a new booking request (reservation) for admin review
 */
export async function POST(request: NextRequest) {
  try {
    const data: BookingRequestData = await request.json();

    // Validate required fields
    if (!data.contact?.name || !data.contact?.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    if (!data.tourDays || data.tourDays.length === 0) {
      return NextResponse.json(
        { error: 'At least one tour day is required' },
        { status: 400 }
      );
    }

    // Start transaction
    await query('BEGIN');

    try {
      // 1. Create or find customer
      let customerId: number;

      const existingCustomer = await query(
        'SELECT id FROM customers WHERE LOWER(email) = LOWER($1)',
        [data.contact.email]
      );

      if (existingCustomer.rows.length > 0) {
        customerId = existingCustomer.rows[0].id;

        // Update customer info including SMS consent
        await query(
          `UPDATE customers
           SET name = $1,
               phone = $2,
               sms_marketing_consent = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [data.contact.name, data.contact.phone || null, data.contact.textConsent, customerId]
        );
      } else {
        // Create new customer
        const newCustomer = await query(
          `INSERT INTO customers (email, name, phone, sms_marketing_consent, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING id`,
          [data.contact.email, data.contact.name, data.contact.phone || null, data.contact.textConsent]
        );
        customerId = newCustomer.rows[0].id;
      }

      // 2. Determine party size (from first day, or use 0 for large groups)
      const firstDay = data.tourDays[0];
      const partySize = typeof firstDay.guests === 'number' ? firstDay.guests : 0;

      // 3. Get dates for multi-day support
      const sortedDays = [...data.tourDays].sort((a, b) => a.date.localeCompare(b.date));
      const startDate = sortedDays[0].date;
      const endDate = sortedDays[sortedDays.length - 1].date;
      const isMultiDay = data.tourDays.length > 1;

      // 4. Generate reservation number
      const reservationNumber = `REQ${Date.now().toString().slice(-8)}`;

      // 5. Build special requests with all booking details
      const specialRequestsData = {
        provider: data.provider,
        providerId: data.providerId,
        tourDays: data.tourDays,
        additionalServices: data.additionalServices || [],
        estimatedTotal: data.estimatedTotal,
        customerNotes: data.notes || '',
        textConsent: data.contact.textConsent,
      };

      // 6. Map provider to brand code (defaults to NW Touring)
      const brandCodeMap: Record<string, string> = {
        'nw-touring': 'NWT',
        'herding-cats': 'HCT',
      };
      const brandCode = brandCodeMap[data.providerId] || 'NWT';

      // Look up brand ID
      const brandResult = await query(
        'SELECT id FROM brands WHERE brand_code = $1',
        [brandCode]
      );
      const brandId = brandResult.rows[0]?.id || 1;

      // 7. Create reservation record
      const reservation = await query(
        `INSERT INTO reservations (
          reservation_number,
          customer_id,
          party_size,
          preferred_date,
          tour_type,
          tour_duration_type,
          tour_start_date,
          tour_end_date,
          special_requests,
          deposit_amount,
          deposit_paid,
          status,
          brand_id,
          brand_code,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING id`,
        [
          reservationNumber,
          customerId,
          partySize,
          startDate,
          data.tourType,
          isMultiDay ? 'multi' : 'single',
          startDate,
          endDate,
          JSON.stringify(specialRequestsData),
          0, // Deposit amount - will be set after admin reviews
          false, // Deposit not paid yet
          'pending', // Status: pending → contacted → confirmed → completed
          brandId,
          brandCode,
        ]
      );

      const reservationId = reservation.rows[0].id;

      await query('COMMIT');

      console.log(
        `[Booking Request] New request ${reservationNumber} - ` +
          `${data.contact.name} - ${data.tourDays.length} day(s) - Provider: ${data.provider}`
      );

      return NextResponse.json({
        success: true,
        reservationId,
        reservationNumber,
        message: "We've received your booking request! You'll receive a confirmation email shortly.",
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error: unknown) {
    console.error('[Booking Request API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create booking request', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/booking-requests
 * Get pending booking requests count (for sidebar badge)
 */
export async function GET() {
  try {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM reservations
       WHERE status = 'pending'`
    );

    return NextResponse.json({
      pendingCount: parseInt(result.rows[0].count, 10),
    });
  } catch (error: unknown) {
    console.error('[Booking Request API] Error fetching count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending count' },
      { status: 500 }
    );
  }
}
