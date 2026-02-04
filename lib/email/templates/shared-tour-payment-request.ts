/**
 * Shared Tour Payment Request Email Template
 *
 * @module lib/email/templates/shared-tour-payment-request
 * @description Email sent to guests when a hotel partner books on their behalf,
 * containing a link to complete payment
 */

import { sendEmail } from '@/lib/email';
import { sharedTourService } from '@/lib/services/shared-tour.service';
import { logger } from '@/lib/logger';

const COMPANY_NAME = 'Walla Walla Travel';
const COMPANY_PHONE = '(509) 200-8000';
const COMPANY_EMAIL = 'info@wallawalla.travel';

interface TourDetails {
  title: string;
  tour_date: string;
  start_time: string;
  duration_hours: number;
  meeting_location: string | null;
}

interface TicketDetails {
  id: string;
  ticket_number: string;
  ticket_count: number;
  customer_name: string;
  customer_email: string;
  includes_lunch: boolean;
  total_amount: number;
}

/**
 * Send payment request email when hotel books for a guest
 */
export async function sendSharedTourPaymentRequestEmail(
  ticketId: string,
  hotelName: string
): Promise<boolean> {
  try {
    // Get ticket details
    const ticket = await sharedTourService.getTicketById(ticketId) as TicketDetails | null;
    if (!ticket) {
      logger.error('Cannot send payment request email: ticket not found', { ticketId });
      return false;
    }

    // Get tour details from ticket's tour_id
    const tourDetails = await sharedTourService.getTourWithAvailability(
      (ticket as unknown as { tour_id: string }).tour_id
    ) as TourDetails | null;

    if (!tourDetails) {
      logger.error('Cannot send payment request email: tour not found', { ticketId });
      return false;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paymentUrl = `${appUrl}/shared-tours/pay/${ticketId}`;

    // Format date and time
    const tourDate = new Date(tourDetails.tour_date + 'T00:00:00');
    const formattedDate = tourDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const [hours, minutes] = tourDetails.start_time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const formattedTime = `${hour12}:${minutes} ${ampm}`;

    const html = generatePaymentRequestHtml({
      ticket,
      tourDetails,
      hotelName,
      formattedDate,
      formattedTime,
      paymentUrl,
    });

    const text = generatePaymentRequestText({
      ticket,
      tourDetails,
      hotelName,
      formattedDate,
      formattedTime,
      paymentUrl,
    });

    return await sendEmail({
      to: ticket.customer_email,
      subject: `🍷 Complete Your Wine Tour Booking - ${formattedDate}`,
      html,
      text,
    });
  } catch (error) {
    logger.error('Failed to send payment request email', { ticketId, error });
    return false;
  }
}

function generatePaymentRequestHtml({
  ticket,
  tourDetails,
  hotelName,
  formattedDate,
  formattedTime,
  paymentUrl,
}: {
  ticket: TicketDetails;
  tourDetails: TourDetails;
  hotelName: string;
  formattedDate: string;
  formattedTime: string;
  paymentUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B1538 0%, #722F37 100%); padding: 40px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🍷 Wine Tour Reserved!</h1>
          <p style="color: #fecaca; margin: 12px 0 0 0; font-size: 16px;">Complete payment to confirm your spot</p>
        </div>

        <!-- Hotel Badge -->
        <div style="text-align: center; padding: 16px; background: #eff6ff; border-bottom: 1px solid #e5e7eb;">
          <p style="color: #1e40af; font-size: 14px; margin: 0;">
            🏨 Reserved for you by <strong>${hotelName}</strong>
          </p>
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 24px;">
          <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hi ${ticket.customer_name},</p>

          <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
            Great news! ${hotelName} has reserved a spot for you on our wine tour. To secure your place, please complete payment using the link below.
          </p>

          <!-- Tour Details Card -->
          <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">${tourDetails.title}</h2>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 100px;">📅 Date:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">⏰ Time:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${formattedTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">⏱️ Duration:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${tourDetails.duration_hours} hours</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">👥 Guests:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${ticket.ticket_count}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">🍽️ Lunch:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${ticket.includes_lunch ? 'Included' : 'Not included'}</td>
              </tr>
            </table>
          </div>

          <!-- Payment Box -->
          <div style="background: linear-gradient(135deg, #E07A5F 0%, #B87333 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
            <p style="color: #ffffff; font-size: 14px; margin: 0 0 8px 0; opacity: 0.9;">Amount Due</p>
            <p style="color: #ffffff; font-size: 36px; font-weight: bold; margin: 0 0 16px 0;">$${ticket.total_amount.toFixed(2)}</p>
            <a href="${paymentUrl}" style="display: inline-block; background: #ffffff; color: #8B1538; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 18px; font-weight: bold;">Complete Payment</a>
          </div>

          <!-- Urgency Note -->
          <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              ⏰ <strong>Please complete payment within 24 hours</strong> to secure your spot. Unreserved tickets may be released to other guests.
            </p>
          </div>

          <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0;">
            Once payment is complete, you'll receive a confirmation email with all the details you need for your tour, including where to meet and what to bring.
          </p>

          <p style="font-size: 14px; color: #9ca3af; text-align: center; margin-top: 32px;">
            Questions? Reply to this email or call us at ${COMPANY_PHONE}
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0; font-weight: bold;">${COMPANY_NAME}</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">Your local wine country experts</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
            ${COMPANY_PHONE} • ${COMPANY_EMAIL}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generatePaymentRequestText({
  ticket,
  tourDetails,
  hotelName,
  formattedDate,
  formattedTime,
  paymentUrl,
}: {
  ticket: TicketDetails;
  tourDetails: TourDetails;
  hotelName: string;
  formattedDate: string;
  formattedTime: string;
  paymentUrl: string;
}): string {
  return `
🍷 WINE TOUR RESERVED!

Hi ${ticket.customer_name},

Great news! ${hotelName} has reserved a spot for you on our wine tour.

─────────────────────────────────
TOUR DETAILS
─────────────────────────────────
${tourDetails.title}

Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${tourDetails.duration_hours} hours
Guests: ${ticket.ticket_count}
Lunch: ${ticket.includes_lunch ? 'Included' : 'Not included'}

─────────────────────────────────
PAYMENT REQUIRED
─────────────────────────────────
Amount Due: $${ticket.total_amount.toFixed(2)}

Complete payment here:
${paymentUrl}

⏰ Please complete payment within 24 hours to secure your spot.

Once payment is complete, you'll receive a confirmation email with all the details for your tour.

Questions? Reply to this email or call us at ${COMPANY_PHONE}

─────────────────────────────────
${COMPANY_NAME}
Your local wine country experts
${COMPANY_PHONE} • ${COMPANY_EMAIL}
  `.trim();
}

export default sendSharedTourPaymentRequestEmail;
