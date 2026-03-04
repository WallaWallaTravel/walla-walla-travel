/**
 * Partner Booking Confirmed Email Template
 *
 * @module lib/email/templates/partner-booking-confirmed
 * @description Sent to hotel partner when a booking is created for their guest.
 * Confirms the reservation details and informs about pending payment.
 */

import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { emailDarkModeStyles } from '@/lib/email/dark-mode-styles';
import { emailPreferencesService } from '@/lib/services/email-preferences.service';

const COMPANY_NAME = 'Walla Walla Travel';
const COMPANY_PHONE = '(509) 200-8000';
const COMPANY_EMAIL = 'info@wallawalla.travel';

interface BookingNotificationDetails {
  hotelName: string;
  hotelEmail: string;
  contactName: string | null;
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  ticketCount: number;
  totalAmount: number;
  tourTitle: string;
  tourDate: string;
  includesLunch: boolean;
}

/**
 * Send booking confirmed notification to hotel partner
 */
export async function sendPartnerBookingConfirmedEmail(
  details: BookingNotificationDetails
): Promise<boolean> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const bookingsUrl = `${appUrl}/partner-portal/shared-tours/bookings`;

    // Format tour date
    const tourDate = new Date(details.tourDate + 'T00:00:00');
    const formattedDate = tourDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Get unsubscribe headers
    const pref = await emailPreferencesService.getOrCreatePreference(details.hotelEmail);
    const unsubHeaders = emailPreferencesService.getUnsubscribeHeaders(pref.unsubscribe_token);
    const unsubscribeUrl = emailPreferencesService.getUnsubscribeUrl(pref.unsubscribe_token);

    const greeting = details.contactName || details.hotelName;

    const html = generateHtml({ details, greeting, formattedDate, bookingsUrl, unsubscribeUrl });
    const text = generateText({ details, greeting, formattedDate, bookingsUrl });

    return await sendEmail({
      to: details.hotelEmail,
      subject: `Booking Confirmed: ${details.customerName} — ${details.ticketNumber}`,
      html,
      text,
      headers: unsubHeaders,
    });
  } catch (error) {
    logger.error('Failed to send partner booking confirmed email', {
      hotelEmail: details.hotelEmail,
      ticketNumber: details.ticketNumber,
      error,
    });
    return false;
  }
}

function generateHtml({
  details,
  greeting,
  formattedDate,
  bookingsUrl,
  unsubscribeUrl,
}: {
  details: BookingNotificationDetails;
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
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Booking Confirmed</h1>
          <p style="color: #fecaca; margin: 12px 0 0 0; font-size: 16px;">A guest reservation has been created</p>
        </div>

        <!-- Hotel Badge -->
        <div style="text-align: center; padding: 16px; background: #eff6ff; border-bottom: 1px solid #e5e7eb;">
          <p style="color: #1e40af; font-size: 14px; margin: 0;">
            Booked by <strong>${details.hotelName}</strong>
          </p>
        </div>

        <!-- Main Content -->
        <div class="em-body" style="padding: 32px 24px;">
          <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hi ${greeting},</p>

          <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
            A booking has been created for your guest. A payment link has been sent to the guest's email. Here are the details:
          </p>

          <!-- Ticket Badge -->
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px 28px;">
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">Ticket Number</p>
              <p style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 0; font-family: monospace;">${details.ticketNumber}</p>
            </div>
          </div>

          <!-- Booking Details Card -->
          <div class="em-card" style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">${details.tourTitle}</h2>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Guest:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${details.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Guest Email:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${details.customerEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Tour Date:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Guests:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${details.ticketCount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Lunch:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${details.includesLunch ? 'Included' : 'Not included'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Total:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">$${details.totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- Payment Status -->
          <div class="em-card" style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              <strong>Payment Pending</strong> — A payment link has been sent to ${details.customerName} at ${details.customerEmail}. You will be notified when payment is received.
            </p>
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
  details,
  greeting,
  formattedDate,
  bookingsUrl,
}: {
  details: BookingNotificationDetails;
  greeting: string;
  formattedDate: string;
  bookingsUrl: string;
}): string {
  return `
BOOKING CONFIRMED

Hi ${greeting},

A booking has been created for your guest. A payment link has been sent to the guest's email.

TICKET NUMBER: ${details.ticketNumber}

─────────────────────────────────
BOOKING DETAILS
─────────────────────────────────
${details.tourTitle}

Guest: ${details.customerName}
Guest Email: ${details.customerEmail}
Tour Date: ${formattedDate}
Guests: ${details.ticketCount}
Lunch: ${details.includesLunch ? 'Included' : 'Not included'}
Total: $${details.totalAmount.toFixed(2)}

PAYMENT STATUS: Pending
A payment link has been sent to ${details.customerName}. You will be notified when payment is received.

View your bookings: ${bookingsUrl}

Questions? Reply to this email or call us at ${COMPANY_PHONE}

─────────────────────────────────
${COMPANY_NAME}
Your local wine country experts
${COMPANY_PHONE} • ${COMPANY_EMAIL}
  `.trim();
}

export default sendPartnerBookingConfirmedEmail;
