/**
 * Partner Registration Complete Email Template
 *
 * @module lib/email/templates/partner-registration-complete
 * @description Sent to hotel partner when their account registration is completed.
 */

import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { emailDarkModeStyles } from '@/lib/email/dark-mode-styles';
import { emailPreferencesService } from '@/lib/services/email-preferences.service';

const COMPANY_NAME = 'Walla Walla Travel';
const COMPANY_PHONE = '(509) 200-8000';
const COMPANY_EMAIL = 'info@wallawalla.travel';

interface PartnerDetails {
  hotelName: string;
  contactName: string | null;
  email: string;
}

/**
 * Send registration complete email to hotel partner
 */
export async function sendPartnerRegistrationCompleteEmail(
  partner: PartnerDetails
): Promise<boolean> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const portalUrl = `${appUrl}/partner-portal`;

    // Get unsubscribe headers for CAN-SPAM compliance
    const pref = await emailPreferencesService.getOrCreatePreference(partner.email);
    const unsubHeaders = emailPreferencesService.getUnsubscribeHeaders(pref.unsubscribe_token);
    const unsubscribeUrl = emailPreferencesService.getUnsubscribeUrl(pref.unsubscribe_token);

    const greeting = partner.contactName || partner.hotelName;

    const html = generateHtml({ partner, greeting, portalUrl, unsubscribeUrl });
    const text = generateText({ partner, greeting, portalUrl });

    return await sendEmail({
      to: partner.email,
      subject: `Welcome to the Partner Portal — ${partner.hotelName}`,
      html,
      text,
      headers: unsubHeaders,
    });
  } catch (error) {
    logger.error('Failed to send partner registration complete email', {
      email: partner.email,
      hotelName: partner.hotelName,
      error,
    });
    return false;
  }
}

function generateHtml({
  partner,
  greeting,
  portalUrl,
  unsubscribeUrl,
}: {
  partner: PartnerDetails;
  greeting: string;
  portalUrl: string;
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
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Welcome, Partner!</h1>
          <p style="color: #fecaca; margin: 12px 0 0 0; font-size: 16px;">Your account is ready</p>
        </div>

        <!-- Hotel Badge -->
        <div style="text-align: center; padding: 16px; background: #f0fdf4; border-bottom: 1px solid #e5e7eb;">
          <p style="color: #166534; font-size: 14px; margin: 0;">
            ${partner.hotelName} is now an active partner
          </p>
        </div>

        <!-- Main Content -->
        <div class="em-body" style="padding: 32px 24px;">
          <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hi ${greeting},</p>

          <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
            Your partner account has been successfully set up. You can now log in to the Partner Portal and start booking wine tours for your guests.
          </p>

          <!-- What You Can Do -->
          <div class="em-card" style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">Getting Started</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #1f2937; font-size: 14px; line-height: 1.6;">
                  <strong>1. Browse Tours</strong><br>
                  <span style="color: #6b7280;">View upcoming shared wine tours with real-time availability.</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #1f2937; font-size: 14px; line-height: 1.6;">
                  <strong>2. Book Guests</strong><br>
                  <span style="color: #6b7280;">Reserve spots for your guests — they receive a payment link by email.</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #1f2937; font-size: 14px; line-height: 1.6;">
                  <strong>3. Track Bookings</strong><br>
                  <span style="color: #6b7280;">Monitor payment status and manage your bookings from the dashboard.</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${portalUrl}" style="display: inline-block; background: #8B1538; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 18px; font-weight: bold;">Go to Partner Portal</a>
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
  partner,
  greeting,
  portalUrl,
}: {
  partner: PartnerDetails;
  greeting: string;
  portalUrl: string;
}): string {
  return `
WELCOME TO THE PARTNER PORTAL

Hi ${greeting},

Your partner account for ${partner.hotelName} has been successfully set up. You can now log in and start booking wine tours for your guests.

GETTING STARTED
─────────────────────────────────
1. Browse Tours — View upcoming shared wine tours with real-time availability.
2. Book Guests — Reserve spots for your guests; they receive a payment link by email.
3. Track Bookings — Monitor payment status and manage your bookings.

Go to Partner Portal: ${portalUrl}

Questions? Reply to this email or call us at ${COMPANY_PHONE}

─────────────────────────────────
${COMPANY_NAME}
Your local wine country experts
${COMPANY_PHONE} • ${COMPANY_EMAIL}
  `.trim();
}

export default sendPartnerRegistrationCompleteEmail;
