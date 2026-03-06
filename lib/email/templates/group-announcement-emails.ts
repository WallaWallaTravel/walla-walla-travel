/**
 * Group Announcement Email Template
 *
 * @module lib/email/templates/group-announcement-emails
 * @description Brand-aware email template for sending group announcements
 *   to trip proposal guests. Uses the same shell, helpers, and brand
 *   config as trip-proposal-emails.
 */

import { getBrandEmailConfig } from '@/lib/email-brands';
import { emailDarkModeStyles } from '@/lib/email/dark-mode-styles';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface GroupAnnouncementOptions {
  tripTitle: string;
  proposalNumber: string;
  guestName: string;
  senderName: string;
  message: string;
  portalUrl?: string;
  brandId?: number;
  unsubscribeUrl?: string;
}

export function buildGroupAnnouncementEmail(options: GroupAnnouncementOptions): {
  subject: string;
  html: string;
  text: string;
} {
  const brand = getBrandEmailConfig(options.brandId ?? undefined);
  const safeName = escapeHtml(options.guestName);
  const safeSender = escapeHtml(options.senderName);
  const safeTrip = escapeHtml(options.tripTitle);
  const safeMessage = escapeHtml(options.message).replace(/\n/g, '<br>');

  const portalButton = options.portalUrl
    ? `<div style="text-align: center; margin: 32px 0;">
        <a href="${options.portalUrl}" style="display: inline-block; background-color: ${brand.primary_color}; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600;">View Your Trip</a>
      </div>`
    : '';

  const bodyHtml = `
      <p style="font-size: 16px; color: #111827; margin: 0 0 20px 0;">
        Hi ${safeName},
      </p>

      <p style="font-size: 15px; color: #374151; margin: 0 0 8px 0;">
        <strong>${safeSender}</strong> sent an update about your trip:
      </p>

      <div style="background: #f9fafb; border-left: 4px solid ${brand.primary_color}; padding: 20px; margin: 16px 0 24px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.7;">${safeMessage}</p>
      </div>

${portalButton}

      <p style="font-size: 15px; color: #374151; margin: 32px 0 4px 0;">
        ${brand.closing},
      </p>
      <p style="font-size: 15px; color: #111827; margin: 0; font-weight: 600;">
        ${brand.signature}
      </p>`;

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
    <div style="background-color: ${brand.primary_color}; background: linear-gradient(135deg, ${brand.primary_color} 0%, ${brand.secondary_color} 100%); padding: 40px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">Trip Update</h1>
      <p style="color: #d9d9d9; margin: 12px 0 0 0; font-size: 15px;">${safeTrip}</p>
    </div>

    <!-- Body -->
    <div class="em-body" style="padding: 36px 28px;">
${bodyHtml}
    </div>

    <!-- Footer -->
    <div class="em-footer" style="background: #f9fafb; padding: 28px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
        Questions? We're here to help.
      </p>
      <p style="margin: 0; font-size: 14px; color: #111827;">
        <strong>${brand.phone}</strong> &bull;
        <a href="mailto:${brand.reply_to}" style="color: ${brand.primary_color}; text-decoration: none;">${brand.reply_to}</a>
      </p>
      <p style="margin: 16px 0 0 0; font-size: 12px; color: #6b7280;">
        ${brand.name} &bull; ${brand.website}
      </p>
${options.unsubscribeUrl ? `      <p style="margin: 12px 0 0 0; font-size: 11px; color: #9ca3af;"><a href="${options.unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> from marketing emails</p>` : ''}
    </div>

  </div>
</body>
</html>`;

  const text = `Trip Update: ${options.tripTitle} | ${brand.name}

Hi ${options.guestName},

${options.senderName} sent an update about your trip:

${options.message}
${options.portalUrl ? `\nView your trip: ${options.portalUrl}\n` : ''}
${brand.closing},
${brand.signature}

---
${brand.phone} | ${brand.reply_to}
${brand.name} | ${brand.website}${options.unsubscribeUrl ? `\nUnsubscribe: ${options.unsubscribeUrl}` : ''}`;

  return {
    subject: `Update from ${options.senderName}: ${options.tripTitle}`,
    html,
    text,
  };
}
