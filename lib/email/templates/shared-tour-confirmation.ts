/**
 * Shared Tour Confirmation Email Template
 *
 * @module lib/email/templates/shared-tour-confirmation
 * @description Rich HTML email sent after successful ticket payment
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
  wineries_preview: string[] | null;
}

interface TicketDetails {
  id: string;
  ticket_number: string;
  ticket_count: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  guest_names: string[] | null;
  includes_lunch: boolean;
  lunch_selection: string | null;
  price_per_person: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  dietary_restrictions: string | null;
  special_requests: string | null;
}

/**
 * Send shared tour confirmation email after payment
 */
export async function sendSharedTourConfirmationEmail(ticketId: string): Promise<boolean> {
  try {
    // Get ticket details
    const ticket = await sharedTourService.getTicketById(ticketId) as TicketDetails | null;
    if (!ticket) {
      logger.error('Cannot send confirmation email: ticket not found', { ticketId });
      return false;
    }

    // Get tour details
    const tour = await sharedTourService.getTourById(ticket.id.split('-')[0]) as TourDetails | null;
    // Fallback: try getting by tour_id stored on ticket
    const tourDetails = tour || await sharedTourService.getTourWithAvailability(
      (ticket as unknown as { tour_id: string }).tour_id
    ) as TourDetails | null;

    if (!tourDetails) {
      logger.error('Cannot send confirmation email: tour not found', { ticketId });
      return false;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const ticketUrl = `${appUrl}/shared-tours/tickets/${ticket.ticket_number}`;

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

    const html = generateConfirmationHtml({
      ticket,
      tourDetails,
      formattedDate,
      formattedTime,
      ticketUrl,
    });

    const text = generateConfirmationText({
      ticket,
      tourDetails,
      formattedDate,
      formattedTime,
      ticketUrl,
    });

    return await sendEmail({
      to: ticket.customer_email,
      subject: `🍷 Your Wine Tour is Confirmed! - ${formattedDate}`,
      html,
      text,
    });
  } catch (error) {
    logger.error('Failed to send shared tour confirmation email', { ticketId, error });
    return false;
  }
}

function generateConfirmationHtml({
  ticket,
  tourDetails,
  formattedDate,
  formattedTime,
  ticketUrl,
}: {
  ticket: TicketDetails;
  tourDetails: TourDetails;
  formattedDate: string;
  formattedTime: string;
  ticketUrl: string;
}): string {
  const guestList = ticket.guest_names && ticket.guest_names.length > 0
    ? [ticket.customer_name, ...ticket.guest_names].filter(Boolean)
    : [ticket.customer_name];

  const wineriesHtml = tourDetails.wineries_preview && tourDetails.wineries_preview.length > 0
    ? `
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-top: 16px;">
        <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">🍇 Featured Wineries</h3>
        <p style="color: #78350f; margin: 0; font-size: 14px;">
          ${tourDetails.wineries_preview.join(' • ')}
        </p>
        <p style="color: #9a3412; margin: 8px 0 0 0; font-size: 12px; font-style: italic;">
          *Itinerary may be adjusted based on availability and group preferences
        </p>
      </div>
    `
    : '';

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
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🍷 You're All Set!</h1>
          <p style="color: #fecaca; margin: 12px 0 0 0; font-size: 16px;">Your wine tour is confirmed</p>
        </div>

        <!-- Ticket Badge -->
        <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #E07A5F 0%, #B87333 100%);">
          <div style="display: inline-block; background: #ffffff; border-radius: 12px; padding: 20px 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">Ticket Number</p>
            <p style="color: #1f2937; font-size: 28px; font-weight: bold; margin: 0; font-family: monospace;">${ticket.ticket_number}</p>
          </div>
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 24px;">
          <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hi ${ticket.customer_name},</p>

          <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
            Thank you for booking with us! Your payment has been received and your spot is confirmed for our wine tour experience.
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
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📍 Meet at:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${tourDetails.meeting_location || 'Downtown Walla Walla - details to follow'}</td>
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

            ${wineriesHtml}
          </div>

          <!-- Guest List -->
          <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 14px; font-weight: bold;">👥 Guest List</h3>
            <ul style="margin: 0; padding-left: 20px; color: #1f2937; font-size: 14px; line-height: 1.8;">
              ${guestList.map(name => `<li>${name}</li>`).join('')}
            </ul>
            ${ticket.dietary_restrictions ? `
              <p style="color: #1e40af; font-size: 12px; margin: 12px 0 0 0;">
                <strong>Dietary notes:</strong> ${ticket.dietary_restrictions}
              </p>
            ` : ''}
          </div>

          <!-- Payment Summary -->
          <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #166534; margin: 0 0 12px 0; font-size: 14px; font-weight: bold;">✅ Payment Confirmed</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #4b5563;">${ticket.ticket_count} × $${ticket.price_per_person.toFixed(2)}</td>
                <td style="padding: 4px 0; color: #1f2937; text-align: right;">$${ticket.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #4b5563;">Tax (8.9%)</td>
                <td style="padding: 4px 0; color: #1f2937; text-align: right;">$${ticket.tax_amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #166534; font-weight: bold; border-top: 1px solid #bbf7d0;">Total Paid</td>
                <td style="padding: 8px 0; color: #166534; font-weight: bold; text-align: right; border-top: 1px solid #bbf7d0;">$${ticket.total_amount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- What to Bring -->
          <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 14px; font-weight: bold;">📝 What to Bring</h3>
            <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.8;">
              <li>Valid ID (21+ required for tastings)</li>
              <li>Comfortable shoes for walking</li>
              <li>Layers – valley weather can change</li>
              <li>Water bottle (we'll have some too)</li>
              <li>Your sense of adventure! 🍷</li>
            </ul>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-top: 32px;">
            <a href="${ticketUrl}" style="display: inline-block; background: #8B1538; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold;">View Your Ticket</a>
          </div>

          <p style="font-size: 14px; color: #9ca3af; text-align: center; margin-top: 24px;">
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

function generateConfirmationText({
  ticket,
  tourDetails,
  formattedDate,
  formattedTime,
  ticketUrl,
}: {
  ticket: TicketDetails;
  tourDetails: TourDetails;
  formattedDate: string;
  formattedTime: string;
  ticketUrl: string;
}): string {
  const guestList = ticket.guest_names && ticket.guest_names.length > 0
    ? [ticket.customer_name, ...ticket.guest_names].filter(Boolean)
    : [ticket.customer_name];

  return `
🍷 YOUR WINE TOUR IS CONFIRMED!

Hi ${ticket.customer_name},

Thank you for booking with us! Your payment has been received and your spot is confirmed.

TICKET NUMBER: ${ticket.ticket_number}

─────────────────────────────────
TOUR DETAILS
─────────────────────────────────
${tourDetails.title}

Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${tourDetails.duration_hours} hours
Meet at: ${tourDetails.meeting_location || 'Downtown Walla Walla - details to follow'}
Guests: ${ticket.ticket_count}
Lunch: ${ticket.includes_lunch ? 'Included' : 'Not included'}

${tourDetails.wineries_preview && tourDetails.wineries_preview.length > 0 ? `
Featured Wineries:
${tourDetails.wineries_preview.map(w => `• ${w}`).join('\n')}
*Itinerary may be adjusted based on availability
` : ''}

─────────────────────────────────
GUEST LIST
─────────────────────────────────
${guestList.map(name => `• ${name}`).join('\n')}
${ticket.dietary_restrictions ? `\nDietary notes: ${ticket.dietary_restrictions}` : ''}

─────────────────────────────────
PAYMENT CONFIRMED
─────────────────────────────────
${ticket.ticket_count} × $${ticket.price_per_person.toFixed(2)} = $${ticket.subtotal.toFixed(2)}
Tax (8.9%): $${ticket.tax_amount.toFixed(2)}
Total Paid: $${ticket.total_amount.toFixed(2)}

─────────────────────────────────
WHAT TO BRING
─────────────────────────────────
• Valid ID (21+ required for tastings)
• Comfortable shoes for walking
• Layers – valley weather can change
• Water bottle
• Your sense of adventure!

View your ticket: ${ticketUrl}

Questions? Reply to this email or call us at ${COMPANY_PHONE}

─────────────────────────────────
${COMPANY_NAME}
Your local wine country experts
${COMPANY_PHONE} • ${COMPANY_EMAIL}
  `.trim();
}

export default sendSharedTourConfirmationEmail;
