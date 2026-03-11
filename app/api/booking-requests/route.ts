/**
 * Booking Request API
 * Handles new booking requests from the public booking form
 * Creates a reservation with status "pending" for admin review
 *
 * REFACTORED: Zod validation + withErrorHandling
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { crmSyncService } from '@/lib/services/crm-sync.service';
import { crmTaskAutomationService } from '@/lib/services/crm-task-automation.service';
import { noDisposableEmail } from '@/lib/utils/email-validation';
import { emailDarkModeStyles } from '@/lib/email/dark-mode-styles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Request body schema
const TourDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.union([z.number().int().positive(), z.string()]), // number or "Large Group (~X)"
  hours: z.number().positive(),
});

const AdditionalServiceSchema = z.object({
  type: z.string(),
  details: z.string(),
});

const BookingRequestSchema = z.object({
  provider: z.string().min(1),
  providerId: z.string().min(1),
  tourType: z.string().min(1),
  tourDays: z.array(TourDaySchema).min(1, 'At least one tour day is required'),
  additionalServices: z.array(AdditionalServiceSchema).optional(),
  contact: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required').superRefine(noDisposableEmail),
    phone: z.string().optional(),
    textConsent: z.boolean(),
  }),
  notes: z.string().max(2000).optional(),
  estimatedTotal: z.string(),
});

/**
 * POST /api/booking-requests
 * Create a new booking request (reservation) for admin review
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Parse and validate request body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    throw new BadRequestError('Invalid JSON in request body');
  }

  const parseResult = BookingRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    throw new BadRequestError(parseResult.error.issues.map((e) => e.message).join(', '));
  }

  const data = parseResult.data;

  // Use Prisma transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create or find customer
    let customerId: number;

    const existingCustomerRows = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM customers WHERE LOWER(email) = LOWER(${data.contact.email})`;

    if (existingCustomerRows.length > 0) {
      customerId = existingCustomerRows[0].id;

      // Update customer info including SMS consent
      await tx.$executeRaw`
        UPDATE customers
        SET name = ${data.contact.name},
            phone = ${data.contact.phone || null},
            sms_marketing_consent = ${data.contact.textConsent},
            updated_at = NOW()
        WHERE id = ${customerId}`;
    } else {
      // Create new customer
      const newCustomerRows = await tx.$queryRaw<{ id: number }[]>`
        INSERT INTO customers (email, name, phone, sms_marketing_consent, created_at, updated_at)
        VALUES (${data.contact.email}, ${data.contact.name}, ${data.contact.phone || null}, ${data.contact.textConsent}, NOW(), NOW())
        RETURNING id`;
      customerId = newCustomerRows[0].id;
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
    const brandRows = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM brands WHERE brand_code = ${brandCode}`;
    const brandId = brandRows[0]?.id || 1;

    // 7. Create reservation record
    const reservationRows = await tx.$queryRaw<{ id: number }[]>`
      INSERT INTO reservations (
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
      ) VALUES (${reservationNumber}, ${customerId}, ${partySize}, ${startDate}, ${data.tourType}, ${isMultiDay ? 'multi' : 'single'}, ${startDate}, ${endDate}, ${JSON.stringify(specialRequestsData)}, 0, false, 'pending', ${brandId}, ${brandCode}, NOW(), NOW())
      RETURNING id`;

    const reservationId = reservationRows[0].id;

    return { reservationId, reservationNumber, customerId, partySize, startDate, brandId };
  });

  logger.info('Booking request created', {
    reservationNumber: result.reservationNumber,
    customerName: data.contact.name,
    days: data.tourDays.length,
    provider: data.provider,
  });

  // Sync to CRM (async, don't block booking request)
  syncBookingRequestToCrm({
    customerId: result.customerId,
    customerName: data.contact.name,
    customerEmail: data.contact.email,
    customerPhone: data.contact.phone,
    reservationNumber: result.reservationNumber,
    partySize: result.partySize,
    tourType: data.tourType,
    startDate: result.startDate,
    provider: data.provider,
    estimatedTotal: data.estimatedTotal,
    notes: data.notes,
    brandId: result.brandId,
  }).catch((err) => {
    logger.error('Failed to sync booking request to CRM', { error: err, reservationNumber: result.reservationNumber });
  });

  // Send confirmation email via Resend
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
        ${emailDarkModeStyles()}
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <div class="em-wrapper" style="max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background-color: #10b981; background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Request Received!</h1>
            <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">We'll be in touch within 24 hours</p>
          </div>

          <!-- Main Content -->
          <div class="em-body" style="padding: 40px 20px;">
            <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hi ${firstName},</p>

            <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
              Thank you for your booking request with <strong>${data.provider}</strong>! We've received your request and will be in touch within 24 hours to confirm availability and discuss the details of your tour.
            </p>

            <!-- Request Details Card -->
            <div class="em-card" style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
              <h2 style="color: #10b981; margin: 0 0 20px 0; font-size: 20px; font-weight: bold;">📋 Your Request Details</h2>

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Reference:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${result.reservationNumber}</td>
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
            <div class="em-card" style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
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
          <div class="em-footer" style="background: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
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
Reference: ${result.reservationNumber}
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
      subject: `Booking Request Received - ${result.reservationNumber}`,
      html: emailHtml,
      text: emailText,
      from: 'Walla Walla Travel <bookings@wallawalla.travel>',
      replyTo: 'info@nwtouring.com',
    });

    if (emailSent) {
      logger.info('Confirmation email sent', { email: data.contact.email });
    } else {
      logger.warn('Failed to send confirmation email', { email: data.contact.email });
    }
  } catch (emailError) {
    // Log but don't fail the request if email fails
    logger.error('Failed to send confirmation email', { error: emailError });
  }

  return NextResponse.json({
    success: true,
    reservationId: result.reservationId,
    reservationNumber: result.reservationNumber,
    message: "We've received your booking request! You'll receive a confirmation email shortly.",
  });
});

/**
 * GET /api/booking-requests
 * Get pending booking requests count and consultation counts (for sidebar badges)
 */
export const GET = withErrorHandling(async () => {
  // Get reservation count
  const reservationRows = await prisma.$queryRaw<{ count: string }[]>`
    SELECT COUNT(*) as count
    FROM reservations
    WHERE status = 'pending'`;

  // Get consultation count (trips handed off but not yet assigned)
  const consultationRows = await prisma.$queryRaw<{ count: string }[]>`
    SELECT COUNT(*) as count
    FROM trips
    WHERE status = 'handed_off'
      AND assigned_staff_id IS NULL
      AND handoff_requested_at IS NOT NULL`;

  return NextResponse.json({
    pendingCount: parseInt(reservationRows[0].count, 10),
    pendingReservations: parseInt(reservationRows[0].count, 10),
    pendingConsultations: parseInt(consultationRows[0].count, 10),
  });
});

// ============================================================================
// CRM Integration Helper
// ============================================================================

interface SyncBookingRequestParams {
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  reservationNumber: string;
  partySize: number;
  tourType: string;
  startDate: string;
  provider: string;
  estimatedTotal: string;
  notes?: string;
  brandId?: number;
}

async function syncBookingRequestToCrm(params: SyncBookingRequestParams): Promise<void> {
  // Find or create CRM contact
  const contactRows = await prisma.$queryRaw<{ id: number; email: string }[]>`
    SELECT id, email FROM crm_contacts WHERE LOWER(email) = LOWER(${params.customerEmail})`;
  let contact = contactRows[0] ?? null;

  if (!contact) {
    // Create new contact as a lead
    const newContactRows = await prisma.$queryRaw<{ id: number; email: string }[]>`
      INSERT INTO crm_contacts (
        email, name, phone, customer_id, contact_type, lifecycle_stage,
        lead_temperature, source, source_detail,
        notes, brand_id, created_at, updated_at
      ) VALUES (${params.customerEmail}, ${params.customerName}, ${params.customerPhone || null}, ${params.customerId}, 'individual', 'lead', 'hot', 'booking_request', ${params.provider}, ${`Booking Request ${params.reservationNumber}: ${params.tourType} for ${params.partySize} guests on ${params.startDate}`}, ${params.brandId || null}, NOW(), NOW())
      RETURNING id, email`;
    contact = newContactRows[0] ?? null;

    logger.info('[CRM] Created contact for booking request', { contactId: contact?.id, reservationNumber: params.reservationNumber });
  } else {
    // Update existing contact with booking request info
    await prisma.$executeRaw`
      UPDATE crm_contacts
      SET customer_id = COALESCE(customer_id, ${params.customerId}),
          lead_temperature = 'hot',
          notes = COALESCE(notes || E'\n\n---\n', '') || ${`[Booking Request ${params.reservationNumber}] ${params.tourType} for ${params.partySize} guests on ${params.startDate}`},
          last_contacted_at = NOW(),
          updated_at = NOW()
      WHERE id = ${contact.id}`;

    logger.info('[CRM] Updated contact for booking request', { contactId: contact.id, reservationNumber: params.reservationNumber });
  }

  if (!contact) return;

  // Log the booking request as a CRM activity
  await crmSyncService.logActivity({
    contactId: contact.id,
    activityType: 'note',
    subject: `Booking Request: ${params.reservationNumber}`,
    body: formatBookingRequestDetails(params),
  });

  // Create follow-up task for the new booking request (hot lead!)
  await crmTaskAutomationService.onNewLead({
    contactId: contact.id,
    customerName: params.customerName,
    source: 'booking_request',
  });
}

function formatBookingRequestDetails(params: SyncBookingRequestParams): string {
  const lines = [
    `Reservation #: ${params.reservationNumber}`,
    `Name: ${params.customerName}`,
    `Email: ${params.customerEmail}`,
  ];

  if (params.customerPhone) lines.push(`Phone: ${params.customerPhone}`);
  lines.push(`Party Size: ${params.partySize}`);
  lines.push(`Tour Type: ${params.tourType}`);
  lines.push(`Date: ${params.startDate}`);
  lines.push(`Provider: ${params.provider}`);
  lines.push(`Estimated Total: ${params.estimatedTotal}`);
  if (params.notes) lines.push(`Notes: ${params.notes}`);

  return lines.join('\n');
}
