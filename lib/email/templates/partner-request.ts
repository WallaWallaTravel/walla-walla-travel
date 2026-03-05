/**
 * Partner Booking Request Email Template
 *
 * @module lib/email/templates/partner-request
 * @description Renders the HTML + plain-text email sent to venue partners
 * when admin requests a reservation/availability/quote.
 * Includes response buttons linking to the public response page.
 */

import { emailDarkModeStyles } from '@/lib/email/dark-mode-styles';

interface PartnerRequestEmailParams {
  partnerName: string;
  customerFirstName: string;
  date: string;           // Pre-formatted: "Saturday, July 15, 2026"
  time: string;           // Pre-formatted: "11:00 AM"
  partySize: number;
  duration?: string;      // e.g. "~60 minutes"
  customMessage: string;
  responseUrl: string;    // Base URL: {APP_URL}/partner-respond/{token}
  stopType: string;       // "winery", "restaurant", "hotel", etc.
}

export function renderPartnerRequestEmail(params: PartnerRequestEmailParams): {
  html: string;
  text: string;
} {
  const {
    partnerName,
    customerFirstName,
    date,
    time,
    partySize,
    duration,
    customMessage,
    responseUrl,
    stopType,
  } = params;

  const confirmUrl = `${responseUrl}?action=confirm`;
  const modifyUrl = `${responseUrl}?action=modify`;
  const declineUrl = `${responseUrl}?action=decline`;

  const stopLabel = {
    winery: 'wine tasting',
    restaurant: 'dining reservation',
    hotel: 'hotel accommodation',
    activity: 'activity',
    custom: 'booking',
  }[stopType] || 'booking';

  const escapedMessage = customMessage
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${emailDarkModeStyles()}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div class="em-wrapper" style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    <!-- Header -->
    <div style="background-color: #8B1538; padding: 28px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold;">Reservation Request</h1>
      <p style="color: #fecaca; margin: 6px 0 0 0; font-size: 14px;">from Walla Walla Travel</p>
    </div>

    <!-- Body -->
    <div class="em-body" style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi ${partnerName.replace(/</g, '&lt;').replace(/>/g, '&gt;')},
      </p>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        We&rsquo;d like to arrange a ${stopLabel} for our guest${customerFirstName ? `, ${customerFirstName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}` : ''}:
      </p>

      <!-- Details Card -->
      <div class="em-card" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 100px;">Date</td>
            <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Time</td>
            <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${time}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Party Size</td>
            <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${partySize} guest${partySize !== 1 ? 's' : ''}</td>
          </tr>
          ${duration ? `<tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Duration</td>
            <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${duration}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Custom Message -->
      ${customMessage.trim() ? `
      <div style="margin: 0 0 28px 0; padding: 16px 20px; border-left: 3px solid #8B1538; background-color: #fdf2f4;">
        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">
          ${escapedMessage}
        </p>
      </div>` : ''}

      <!-- Divider -->
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 24px 0;">

      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
        Please respond using the buttons below:
      </p>

      <!-- Action Buttons -->
      <div style="text-align: center; margin: 0 0 12px 0;">
        <a href="${confirmUrl}" class="em-cta" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; margin: 4px;">
          Confirm
        </a>
        <a href="${modifyUrl}" class="em-cta" style="display: inline-block; padding: 12px 24px; background-color: #d97706; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; margin: 4px;">
          Suggest Changes
        </a>
        <a href="${declineUrl}" class="em-cta" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; margin: 4px;">
          Can&rsquo;t Accommodate
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 16px 0 0 0; text-align: center;">
        Or reply to this email &mdash; your response will be tracked automatically.
      </p>
    </div>

    <!-- Footer -->
    <div class="em-footer" style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 24px; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Walla Walla Travel &bull; <a href="https://wallawalla.travel" style="color: #9ca3af; text-decoration: underline;">wallawalla.travel</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `Reservation Request from Walla Walla Travel

Hi ${partnerName},

We'd like to arrange a ${stopLabel} for our guest${customerFirstName ? `, ${customerFirstName}` : ''}:

Date: ${date}
Time: ${time}
Party Size: ${partySize} guest${partySize !== 1 ? 's' : ''}${duration ? `\nDuration: ${duration}` : ''}

${customMessage.trim() ? customMessage.trim() + '\n' : ''}
---

Please respond:

Confirm: ${confirmUrl}
Suggest Changes: ${modifyUrl}
Can't Accommodate: ${declineUrl}

Or reply to this email — your response will be tracked automatically.

---
Walla Walla Travel | wallawalla.travel`;

  return { html, text };
}
