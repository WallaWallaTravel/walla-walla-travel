/**
 * Payment Reminder Email Templates
 *
 * Four urgency levels for guest payment reminders:
 *   - friendly (30, 20 days before deadline)
 *   - firm (10 days before)
 *   - urgent (5 days before)
 *   - final (1 day before)
 *
 * All templates use the shared emailShell pattern with brand-aware styling.
 * Returns { subject, html, text } for each urgency level.
 *
 * @module lib/email/templates/payment-reminder-emails
 */

import { getBrandEmailConfig, type BrandEmailConfig } from '@/lib/email-brands';

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

function emailShell(brand: BrandEmailConfig, headingText: string, subheadingText: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${brand.primary_color} 0%, ${brand.secondary_color} 100%); padding: 40px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">${headingText}</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 12px 0 0 0; font-size: 15px;">${subheadingText}</p>
    </div>

    <!-- Body -->
    <div style="padding: 36px 28px;">
${bodyHtml}
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 28px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
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
    </div>

  </div>
</body>
</html>`;
}

function ctaButton(brand: BrandEmailConfig, label: string, url: string): string {
  // B8 FIX: Escape the URL to prevent XSS in email href attributes
  const safeUrl = escapeHtml(url);
  return `<div style="text-align: center; margin: 32px 0;">
        <a href="${safeUrl}" style="display: inline-block; background-color: ${brand.primary_color}; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600;">${label}</a>
      </div>`;
}

function amountCard(brand: BrandEmailConfig, amountRemaining: number, deadline: string): string {
  // D fix: Clamp negative values to $0
  const displayAmount = Math.max(0, amountRemaining);
  return `<div style="background: #f9fafb; border-left: 4px solid ${brand.primary_color}; padding: 20px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 14px; width: 45%;">Amount Due</td>
            <td style="padding: 8px 0; color: #111827; font-size: 18px; font-weight: 700;">${formatCurrency(displayAmount)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 14px;">Payment Deadline</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px;">${escapeHtml(deadline)}</td>
          </tr>
        </table>
      </div>`;
}

// ---------------------------------------------------------------------------
// Template input
// ---------------------------------------------------------------------------

interface PaymentReminderData {
  guest_name: string;
  amount_remaining: number;
  payment_deadline: string;
  trip_name: string;
  trip_date: string;
  payment_link: string;
  custom_message?: string;
  brand_id: number;
}

// ---------------------------------------------------------------------------
// 1. FRIENDLY — "Just a reminder..."
// ---------------------------------------------------------------------------

export function paymentReminderFriendly(data: PaymentReminderData): { subject: string; html: string; text: string } {
  const brand = getBrandEmailConfig(data.brand_id);
  const guestName = escapeHtml(data.guest_name);
  const tripName = escapeHtml(data.trip_name);

  const customBlock = data.custom_message
    ? `<p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 16px 0; padding: 16px; background: #eff6ff; border-radius: 8px; font-style: italic;">${escapeHtml(data.custom_message)}</p>`
    : '';

  const bodyHtml = `
      <p style="font-size: 16px; color: #111827; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${guestName},
      </p>
      <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
        Just a friendly reminder that your payment for <strong>${tripName}</strong> is coming up. We want to make sure everything is set so you can focus on enjoying the trip!
      </p>
      ${customBlock}
      ${amountCard(brand, data.amount_remaining, data.payment_deadline)}
      ${ctaButton(brand, 'Make Your Payment', data.payment_link)}
      <p style="font-size: 14px; color: #6b7280; line-height: 1.5; margin: 16px 0 0 0;">
        If you've already made this payment, please disregard this email. If you have any questions, don't hesitate to reach out.
      </p>`;

  const html = emailShell(brand, 'Payment Reminder', tripName, bodyHtml);

  const text = `Hi ${data.guest_name},

Just a friendly reminder that your payment for ${data.trip_name} is coming up.

Amount Due: ${formatCurrency(data.amount_remaining)}
Payment Deadline: ${data.payment_deadline}

Make your payment here: ${data.payment_link}

${data.custom_message ? `Note: ${data.custom_message}\n` : ''}If you've already made this payment, please disregard this email.

${brand.closing},
${brand.signature}

---
${brand.phone} | ${brand.reply_to}
${brand.name} | ${brand.website}`;

  return {
    subject: `Payment Reminder: ${data.trip_name}`,
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// 2. FIRM — "Your payment is due in 10 days..."
// ---------------------------------------------------------------------------

export function paymentReminderFirm(data: PaymentReminderData): { subject: string; html: string; text: string } {
  const brand = getBrandEmailConfig(data.brand_id);
  const guestName = escapeHtml(data.guest_name);
  const tripName = escapeHtml(data.trip_name);

  const customBlock = data.custom_message
    ? `<p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 16px 0; padding: 16px; background: #eff6ff; border-radius: 8px; font-style: italic;">${escapeHtml(data.custom_message)}</p>`
    : '';

  const bodyHtml = `
      <p style="font-size: 16px; color: #111827; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${guestName},
      </p>
      <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
        Your payment for <strong>${tripName}</strong> is due soon. Please take a moment to complete your payment before the deadline to ensure your spot is confirmed.
      </p>
      ${customBlock}
      ${amountCard(brand, data.amount_remaining, data.payment_deadline)}
      ${ctaButton(brand, 'Pay Now', data.payment_link)}
      <p style="font-size: 14px; color: #6b7280; line-height: 1.5; margin: 16px 0 0 0;">
        If you've already submitted your payment, thank you! It may take a moment for our records to update.
      </p>`;

  const html = emailShell(brand, 'Payment Due Soon', tripName, bodyHtml);

  const text = `Hi ${data.guest_name},

Your payment for ${data.trip_name} is due soon. Please complete your payment before the deadline.

Amount Due: ${formatCurrency(data.amount_remaining)}
Payment Deadline: ${data.payment_deadline}

Pay now: ${data.payment_link}

${data.custom_message ? `Note: ${data.custom_message}\n` : ''}If you've already submitted your payment, thank you!

${brand.closing},
${brand.signature}

---
${brand.phone} | ${brand.reply_to}
${brand.name} | ${brand.website}`;

  return {
    subject: `Payment Due Soon: ${data.trip_name}`,
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// 3. URGENT — "Please take action..."
// ---------------------------------------------------------------------------

export function paymentReminderUrgent(data: PaymentReminderData): { subject: string; html: string; text: string } {
  const brand = getBrandEmailConfig(data.brand_id);
  const guestName = escapeHtml(data.guest_name);
  const tripName = escapeHtml(data.trip_name);

  const customBlock = data.custom_message
    ? `<p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 16px 0; padding: 16px; background: #eff6ff; border-radius: 8px; font-style: italic;">${escapeHtml(data.custom_message)}</p>`
    : '';

  const bodyHtml = `
      <p style="font-size: 16px; color: #111827; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${guestName},
      </p>
      <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
        This is an important reminder — your payment for <strong>${tripName}</strong> is due very soon. Please take action now to avoid any issues with your reservation.
      </p>
      ${customBlock}
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">
          Your payment deadline is approaching quickly.
        </p>
      </div>
      ${amountCard(brand, data.amount_remaining, data.payment_deadline)}
      ${ctaButton(brand, 'Pay Now — Don\'t Delay', data.payment_link)}
      <p style="font-size: 14px; color: #6b7280; line-height: 1.5; margin: 16px 0 0 0;">
        Having trouble making your payment? Please reach out to us and we'll help sort things out.
      </p>`;

  const html = emailShell(brand, 'Action Required', `Payment for ${tripName}`, bodyHtml);

  const text = `Hi ${data.guest_name},

IMPORTANT: Your payment for ${data.trip_name} is due very soon. Please take action now.

Amount Due: ${formatCurrency(data.amount_remaining)}
Payment Deadline: ${data.payment_deadline}

Pay now: ${data.payment_link}

${data.custom_message ? `Note: ${data.custom_message}\n` : ''}Having trouble? Please reach out and we'll help sort things out.

${brand.closing},
${brand.signature}

---
${brand.phone} | ${brand.reply_to}
${brand.name} | ${brand.website}`;

  return {
    subject: `Action Required: Payment for ${data.trip_name}`,
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// 4. FINAL — "Final notice: payment due tomorrow..."
// ---------------------------------------------------------------------------

export function paymentReminderFinal(data: PaymentReminderData): { subject: string; html: string; text: string } {
  const brand = getBrandEmailConfig(data.brand_id);
  const guestName = escapeHtml(data.guest_name);
  const tripName = escapeHtml(data.trip_name);

  const customBlock = data.custom_message
    ? `<p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 16px 0; padding: 16px; background: #eff6ff; border-radius: 8px; font-style: italic;">${escapeHtml(data.custom_message)}</p>`
    : '';

  const bodyHtml = `
      <p style="font-size: 16px; color: #111827; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${guestName},
      </p>
      <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
        This is a final notice — your payment for <strong>${tripName}</strong> is due <strong>tomorrow</strong>. Please complete your payment today to keep your reservation secured.
      </p>
      ${customBlock}
      <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">
          Final Notice: Payment deadline is tomorrow. Please pay today.
        </p>
      </div>
      ${amountCard(brand, data.amount_remaining, data.payment_deadline)}
      ${ctaButton(brand, 'Complete Payment Now', data.payment_link)}
      <p style="font-size: 14px; color: #6b7280; line-height: 1.5; margin: 16px 0 0 0;">
        If you need to discuss your payment or need an extension, please contact us immediately at <strong>${brand.phone}</strong>.
      </p>`;

  const html = emailShell(brand, 'Final Payment Notice', `Payment for ${tripName}`, bodyHtml);

  const text = `Hi ${data.guest_name},

FINAL NOTICE: Your payment for ${data.trip_name} is due TOMORROW. Please complete your payment today.

Amount Due: ${formatCurrency(data.amount_remaining)}
Payment Deadline: ${data.payment_deadline}

Pay now: ${data.payment_link}

${data.custom_message ? `Note: ${data.custom_message}\n` : ''}Need an extension? Contact us immediately at ${brand.phone}.

${brand.closing},
${brand.signature}

---
${brand.phone} | ${brand.reply_to}
${brand.name} | ${brand.website}`;

  return {
    subject: `FINAL NOTICE: Payment Due Tomorrow — ${data.trip_name}`,
    html,
    text,
  };
}
