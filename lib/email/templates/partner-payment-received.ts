/**
 * Partner Payment Received Email Template
 *
 * @module lib/email/templates/partner-payment-received
 * @description Sent to hotel partner when payment is received for a booking
 * they created for their guest.
 */

import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { emailDarkModeStyles } from '@/lib/email/dark-mode-styles';
import { emailPreferencesService } from '@/lib/services/email-preferences.service';
import { query } from '@/lib/db';

const COMPANY_NAME = 'Walla Walla Travel';
const COMPANY_PHONE = '(509) 200-8000';
const COMPANY_EMAIL = 'info@wallawalla.travel';

interface TicketWithHotel {
  ticket_number: string;
  customer_name: string;
  customer_email: string;
  ticket_count: number;
  total_amount: number;
  tour_title: string;
  tour_date: string;
  includes_lunch: boolean;
  hotel_name: string;
  hotel_email: string;
  hotel_contact_name: string | null;
}

/**
 * Send payment received notification to hotel partner.
 * Called from the Stripe webhook when a partner-booked ticket is paid.
 */
export async function sendPartnerPaymentReceivedEmail(
  ticketId: string
): Promise<boolean> {
  try {
    // Fetch ticket + hotel details in one query (base tables, not views)
    const result = await query<TicketWithHotel>(
      `SELECT
         t.ticket_number,
         t.primary_guest_name AS customer_name,
         t.primary_guest_email AS customer_email,
         t.guest_count AS ticket_count,
         ROUND(t.total_price * 1.089, 2) AS total_amount,
         t.lunch_included AS includes_lunch,
         st.title AS tour_title,
         st.tour_date,
         hp.name AS hotel_name,
         hp.email AS hotel_email,
         hp.contact_name AS hotel_contact_name
       FROM shared_tours_tickets t
       JOIN shared_tours st ON t.shared_tour_id = st.id
       JOIN hotel_partners hp ON t.hotel_partner_id = hp.id
       WHERE t.id = $1 AND t.hotel_partner_id IS NOT NULL`,
      [ticketId]
    );

    const ticket = result.rows[0];
    if (!ticket) {
      // Not a partner booking or ticket not found — skip silently
      logger.debug('Skipping partner payment notification: not a partner booking', { ticketId });
      return false;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const bookingsUrl = `${appUrl}/partner-portal/shared-tours/bookings`;

    // Format tour date
    const tourDate = new Date(ticket.tour_date + 'T00:00:00');
    const formattedDate = tourDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Get unsubscribe headers
    const pref = await emailPreferencesService.getOrCreatePreference(ticket.hotel_email);
    const unsubHeaders = emailPreferencesService.getUnsubscribeHeaders(pref.unsubscribe_token);
    const unsubscribeUrl = emailPreferencesService.getUnsubscribeUrl(pref.unsubscribe_token);

    const greeting = ticket.hotel_contact_name || ticket.hotel_name;

    const html = generateHtml({ ticket, greeting, formattedDate, bookingsUrl, unsubscribeUrl });
    const text = generateText({ ticket, greeting, formattedDate, bookingsUrl });

    return await sendEmail({
      to: ticket.hotel_email,
      subject: `Payment Received: ${ticket.customer_name} — ${ticket.ticket_number}`,
      html,
      text,
      headers: unsubHeaders,
    });
  } catch (error) {
    logger.error('Failed to send partner payment received email', { ticketId, error });
    return false;
  }
}

function generateHtml({
  ticket,
  greeting,
  formattedDate,
  bookingsUrl,
  unsubscribeUrl,
}: {
  ticket: TicketWithHotel;
  greeting: string;
  formattedDate: string;
  bookingsUrl: string;
  unsubscribeUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${emailDarkModeStyles()}
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div class="em-wrapper" style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background-color: #8B1538; background: linear-gradient(135deg, #8B1538 0%, #722F37 100%); padding: 40px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Payment Received</h1>
          <p style="color: #fecaca; margin: 12px 0 0 0; font-size: 16px;">Your guest's booking is fully paid</p>
        </div>

        <!-- Main Content -->
        <div class="em-body" style="padding: 32px 24px;">
          <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hi ${greeting},</p>

          <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
            Great news! Payment has been received for the booking you created. Your guest is confirmed for the tour.
          </p>

          <!-- Payment Success Banner -->
          <div class="em-card" style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="color: #166534; font-size: 24px; font-weight: bold; margin: 0 0 4px 0;">$${ticket.total_amount.toFixed(2)}</p>
            <p style="color: #166534; font-size: 14px; margin: 0;">Payment confirmed</p>
          </div>

          <!-- Booking Details Card -->
          <div class="em-card" style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">${ticket.tour_title}</h2>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Ticket:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600; font-family: monospace;">${ticket.ticket_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Guest:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${ticket.customer_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Tour Date:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Guests:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${ticket.ticket_count}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Lunch:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${ticket.includes_lunch ? 'Included' : 'Not included'}</td>
              </tr>
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${bookingsUrl}" style="display: inline-block; background: #8B1538; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold;">View My Bookings</a>
          </div>

          <p style="font-size: 14px; color: #9ca3af; text-align: center; margin-top: 24px;">
            Questions? Reply to this email or call us at ${COMPANY_PHONE}
          </p>
        </div>

        <!-- Footer -->
        <div class="em-footer" style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0; font-weight: bold;">${COMPANY_NAME}</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">Your local wine country experts</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
            ${COMPANY_PHONE} • ${COMPANY_EMAIL}
          </p>
          <p style="margin: 12px 0 0 0;">
            <a href="${unsubscribeUrl}" style="color: #9ca3af; font-size: 11px; text-decoration: underline;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateText({
  ticket,
  greeting,
  formattedDate,
  bookingsUrl,
}: {
  ticket: TicketWithHotel;
  greeting: string;
  formattedDate: string;
  bookingsUrl: string;
}): string {
  return `
PAYMENT RECEIVED

Hi ${greeting},

Great news! Payment has been received for the booking you created. Your guest is confirmed for the tour.

AMOUNT PAID: $${ticket.total_amount.toFixed(2)}

─────────────────────────────────
BOOKING DETAILS
─────────────────────────────────
${ticket.tour_title}

Ticket: ${ticket.ticket_number}
Guest: ${ticket.customer_name}
Tour Date: ${formattedDate}
Guests: ${ticket.ticket_count}
Lunch: ${ticket.includes_lunch ? 'Included' : 'Not included'}

View your bookings: ${bookingsUrl}

Questions? Reply to this email or call us at ${COMPANY_PHONE}

─────────────────────────────────
${COMPANY_NAME}
Your local wine country experts
${COMPANY_PHONE} • ${COMPANY_EMAIL}
  `.trim();
}

export default sendPartnerPaymentReceivedEmail;
