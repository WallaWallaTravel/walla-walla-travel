/**
 * Registration Confirmation Email Template
 *
 * Sent after a guest successfully registers (and pays deposit if required).
 * Brand-aware, dark-mode compatible, CAN-SPAM compliant.
 *
 * @module lib/email/templates/registration-confirmation-email
 */

import { getBrandEmailConfig, type BrandEmailConfig } from '@/lib/email-brands';
import { emailDarkModeStyles } from '@/lib/email/dark-mode-styles';

// ---------------------------------------------------------------------------
// Shared helpers (same pattern as trip-proposal-emails.ts)
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function emailShell(brand: BrandEmailConfig, headingText: string, subheadingText: string, bodyHtml: string, unsubscribeUrl?: string): string {
  return `<!DOCTYPE html>
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
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">${headingText}</h1>
      <p style="color: #d9d9d9; margin: 12px 0 0 0; font-size: 15px;">${subheadingText}</p>
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
      </p>${unsubscribeUrl ? `
      <p style="margin: 12px 0 0 0; font-size: 11px; color: #9ca3af;">
        <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> from marketing emails
      </p>` : ''}
    </div>

  </div>
</body>
</html>`;
}

function ctaButton(brand: BrandEmailConfig, label: string, url: string): string {
  return `<div style="text-align: center; margin: 32px 0;">
        <a href="${url}" style="display: inline-block; background-color: ${brand.primary_color}; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600;">${label}</a>
      </div>`;
}

function summaryCard(brand: BrandEmailConfig, title: string, rows: Array<{ label: string; value: string }>): string {
  return `<div class="em-card" style="background: #f9fafb; border-left: 4px solid ${brand.primary_color}; padding: 20px; margin: 24px 0;">
        <h2 style="margin: 0 0 14px 0; font-size: 17px; color: #111827; font-weight: 600;">${title}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          ${rows.map(r => `<tr>
              <td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 14px; width: 45%;">${r.label}</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${r.value}</td>
            </tr>`).join('\n          ')}
        </table>
      </div>`;
}

// ---------------------------------------------------------------------------
// Registration Confirmation Email
// ---------------------------------------------------------------------------

export interface RegistrationConfirmationData {
  guest_name: string;
  trip_title: string;
  start_date: string;
  end_date?: string | null;
  deposit_amount?: number | null;
  portal_url: string;
  brand_id: number;
  unsubscribe_url?: string;
}

export function buildRegistrationConfirmationEmail(data: RegistrationConfirmationData): { subject: string; html: string; text: string } {
  const brand = getBrandEmailConfig(data.brand_id);
  const safeName = escapeHtml(data.guest_name);
  const safeTripTitle = escapeHtml(data.trip_title);

  const depositHtml = data.deposit_amount && data.deposit_amount > 0
    ? `<!-- Deposit receipt -->
      <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 22px; margin: 0 0 24px 0; text-align: center;">
        <p style="margin: 0 0 4px 0; font-size: 13px; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Registration Deposit Received</p>
        <p style="margin: 0; font-size: 28px; color: #166534; font-weight: bold;">${formatCurrency(data.deposit_amount)}</p>
      </div>`
    : '';

  const dateRange = data.end_date && data.end_date !== data.start_date
    ? `${data.start_date} \u2013 ${data.end_date}`
    : data.start_date;

  const bodyHtml = `
      <p style="font-size: 16px; color: #111827; margin: 0 0 20px 0;">
        Hi ${safeName},
      </p>

      <p style="font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.6;">
        You're all set! You've been registered for <strong>${safeTripTitle}</strong>.
      </p>

${depositHtml}

${summaryCard(brand, 'Trip Details', [
    { label: 'Trip:', value: safeTripTitle },
    { label: 'Dates:', value: dateRange },
    ...(data.deposit_amount && data.deposit_amount > 0
      ? [{ label: 'Deposit Paid:', value: formatCurrency(data.deposit_amount) }]
      : []),
  ])}

      <!-- What's Next -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #111827; font-weight: 600;">What's Next</h3>
        <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
          <li>View your trip details anytime using the button below.</li>
          <li>You'll receive updates as the trip details are finalized.</li>
          <li>Reach out if you have any questions or dietary needs.</li>
        </ul>
      </div>

${ctaButton(brand, 'View Your Trip', data.portal_url)}

      <p style="font-size: 15px; color: #374151; margin: 32px 0 4px 0;">
        ${brand.closing},
      </p>
      <p style="font-size: 15px; color: #111827; margin: 0; font-weight: 600;">
        ${brand.signature}
      </p>`;

  const html = emailShell(brand, "You're Registered!", safeTripTitle, bodyHtml, data.unsubscribe_url);

  const text = `You're Registered! | ${brand.name}

Hi ${data.guest_name},

You're all set! You've been registered for ${data.trip_title}.
${data.deposit_amount && data.deposit_amount > 0 ? `\nRegistration Deposit Paid: ${formatCurrency(data.deposit_amount)}\n` : ''}
TRIP DETAILS
-----------------
Trip: ${data.trip_title}
Dates: ${dateRange}${data.deposit_amount && data.deposit_amount > 0 ? `\nDeposit Paid: ${formatCurrency(data.deposit_amount)}` : ''}

WHAT'S NEXT
-----------------
- View your trip details: ${data.portal_url}
- You'll receive updates as the trip details are finalized.
- Reach out if you have any questions or dietary needs.

${brand.closing},
${brand.signature}

---
${brand.phone} | ${brand.reply_to}
${brand.name} | ${brand.website}${data.unsubscribe_url ? `\nUnsubscribe: ${data.unsubscribe_url}` : ''}`;

  return {
    subject: `You're registered! \u2014 ${data.trip_title}`,
    html,
    text,
  };
}
