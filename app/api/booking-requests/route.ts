/**
 * Booking Request API
 * Handles new booking requests from the public booking form
 * Creates a reservation with status "pending" for admin review
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendEmail } from '@/lib/email';

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

      // Send confirmation email via Postmark
      try {
        // Format dates for email
        const formatDate = (dateStr: string) => {
          const [year, month, day] = dateStr.split('-');
          return `${month}/${day}/${year}`;
        };

        const tourDatesHtml = data.tourDays
          .map((day) => {
            const guests = typeof day.guests === 'number' ? `${day.guests} guests` : day.guests;
            return `<li style="margin-bottom: 8px;"><strong>${formatDate(day.date)}</strong> - ${day.hours} hours, ${guests}</li>`;
          })
          .join('');

        const tourDatesText = data.tourDays
          .map((day) => {
            const guests = typeof day.guests === 'number' ? `${day.guests} guests` : day.guests;
            return `  • ${formatDate(day.date)} - ${day.hours} hours, ${guests}`;
          })
          .join('\n');

        const firstName = data.contact.name.split(' ')[0];
        const tourTypeDisplay = data.tourType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Request Received!</h1>
                <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">We'll be in touch within 24 hours</p>
              </div>

              <!-- Main Content -->
              <div style="padding: 40px 20px;">
                <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hi ${firstName},</p>

                <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
                  Thank you for your booking request with <strong>${data.provider}</strong>! We've received your request and will be in touch within 24 hours to confirm availability and discuss the details of your tour.
                </p>

                <!-- Request Details Card -->
                <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
                  <h2 style="color: #10b981; margin: 0 0 20px 0; font-size: 20px; font-weight: bold;">📋 Your Request Details</h2>

                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Reference:</td>
                      <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${reservationNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Tour Type:</td>
                      <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${tourTypeDisplay}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Estimated Total:</td>
                      <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${data.estimatedTotal}</td>
                    </tr>
                  </table>

                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Tour Date${data.tourDays.length > 1 ? 's' : ''}:</p>
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #1f2937; font-size: 14px;">
                      ${tourDatesHtml}
                    </ul>
                  </div>

                  ${data.notes ? `
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Notes:</p>
                    <p style="color: #1f2937; font-size: 14px; margin: 0;">${data.notes}</p>
                  </div>
                  ` : ''}
                </div>

                <!-- What's Next -->
                <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
                  <h2 style="color: #065f46; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">📅 What's Next?</h2>

                  <ul style="margin: 0; padding: 0 0 0 20px; color: #1f2937;">
                    <li style="margin: 0 0 12px 0; line-height: 1.6;">We'll review your request and check availability</li>
                    <li style="margin: 0 0 12px 0; line-height: 1.6;">You'll receive a follow-up email or call within 24 hours</li>
                    <li style="margin: 0 0 12px 0; line-height: 1.6;">Once confirmed, we'll send deposit payment instructions</li>
                    <li style="margin: 0; line-height: 1.6;">Your date will be officially held once deposit is received</li>
                  </ul>
                </div>

                <!-- Contact Info -->
                <div style="text-align: center; padding: 20px 0; border-top: 2px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">Questions? We're here to help!</p>
                  <p style="margin: 0;">
                    <a href="mailto:info@nwtouring.com" style="color: #10b981; text-decoration: none; font-weight: 600;">info@nwtouring.com</a>
                    <span style="color: #d1d5db; margin: 0 10px;">|</span>
                    <a href="tel:+15095403600" style="color: #10b981; text-decoration: none; font-weight: 600;">(509) 540-3600</a>
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                  <strong style="color: #1f2937;">${data.provider}</strong><br>
                  Walla Walla, Washington
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} ${data.provider}. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        const emailText = `Hi ${firstName},

Thank you for your booking request with ${data.provider}!

We've received your request and will be in touch within 24 hours to confirm availability and discuss the details of your tour.

YOUR REQUEST DETAILS
─────────────────────
Reference: ${reservationNumber}
Tour Type: ${tourTypeDisplay}

Tour Date${data.tourDays.length > 1 ? 's' : ''}:
${tourDatesText}

Estimated Total: ${data.estimatedTotal}
${data.notes ? `\nNotes: ${data.notes}` : ''}

WHAT HAPPENS NEXT
─────────────────────
1. We'll review your request and check availability
2. You'll receive a follow-up email or call within 24 hours
3. Once confirmed, we'll send deposit payment instructions
4. Your date will be officially held once deposit is received

Questions? Reply to this email or call us at (509) 540-3600.

We look forward to showing you the best of Walla Walla wine country!

Best,
The ${data.provider} Team

─────────────────────
${data.provider}
info@nwtouring.com | (509) 540-3600
`;

        const emailSent = await sendEmail({
          to: data.contact.email,
          subject: `Booking Request Received - ${reservationNumber}`,
          html: emailHtml,
          text: emailText,
          from: 'Walla Walla Travel <bookings@wallawalla.travel>',
          replyTo: 'info@nwtouring.com',
        });

        if (emailSent) {
          console.log(`[Booking Request] Confirmation email sent to ${data.contact.email}`);
        } else {
          console.warn(`[Booking Request] Failed to send confirmation email to ${data.contact.email}`);
        }
      } catch (emailError) {
        // Log but don't fail the request if email fails
        console.error('[Booking Request] Failed to send confirmation email:', emailError);
      }

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
