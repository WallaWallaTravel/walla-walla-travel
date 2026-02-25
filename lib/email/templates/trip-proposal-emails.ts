/**
 * Trip Proposal Email Templates
 *
 * @module lib/email/templates/trip-proposal-emails
 * @description Brand-aware email templates for the trip proposal lifecycle:
 *   - Proposal sent to customer
 *   - Proposal accepted (customer confirmation)
 *   - Proposal accepted (staff notification)
 *   - Deposit received (customer receipt)
 *   - Deposit received (staff notification)
 *
 * All templates use inline CSS for email client compatibility,
 * brand colors from getBrandEmailConfig, and return { subject, html, text }.
 */

import { getBrandEmailConfig, type BrandEmailConfig } from '@/lib/email-brands';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wallawalla.travel';

// ---------------------------------------------------------------------------
// Shared helpers
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

/**
 * Wraps content in the standard branded email shell (header + footer).
 */
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
  return `<div style="text-align: center; margin: 32px 0;">
        <a href="${url}" style="display: inline-block; background-color: ${brand.primary_color}; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600;">${label}</a>
      </div>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
              <td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 14px; width: 45%;">${label}</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${value}</td>
            </tr>`;
}

function summaryCard(brand: BrandEmailConfig, title: string, rows: Array<{ label: string; value: string }>): string {
  return `<div style="background: #f9fafb; border-left: 4px solid ${brand.primary_color}; padding: 20px; margin: 24px 0;">
        <h2 style="margin: 0 0 14px 0; font-size: 17px; color: #111827; font-weight: 600;">${title}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          ${rows.map(r => detailRow(r.label, r.value)).join('\n          ')}
        </table>
      </div>`;
}

// ---------------------------------------------------------------------------
// 1. Proposal Sent — "Your Trip Proposal is Ready"
// ---------------------------------------------------------------------------

interface ProposalSentData {
  customer_name: string;
  proposal_number: string;
  access_token: string;
  trip_type: string;
  start_date: string;
  end_date: string;
  party_size: number;
  total: number;
  deposit_amount: number;
  valid_until: string;
  brand_id: number;
  custom_message?: string;
}

export function buildProposalSentEmail(data: ProposalSentData): { subject: string; html: string; text: string } {
  const brand = getBrandEmailConfig(data.brand_id);
  const proposalUrl = `${BASE_URL}/my-trip/${data.access_token}`;

  const safeName = escapeHtml(data.customer_name);
  const safeProposalNumber = escapeHtml(data.proposal_number);

  const customMessageHtml = data.custom_message
    ? `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 18px; margin: 0 0 24px 0;">
        <p style="margin: 0; font-size: 15px; color: #1e3a8a; line-height: 1.6;">${escapeHtml(data.custom_message)}</p>
      </div>`
    : '';

  const bodyHtml = `
      <p style="font-size: 16px; color: #111827; margin: 0 0 20px 0;">
        Hi ${safeName},
      </p>

      <p style="font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.6;">
        Your personalized trip proposal is ready for review. We've put together an experience tailored to your group — take a look at the details below.
      </p>

${customMessageHtml}

${summaryCard(brand, 'Proposal Summary', [
    { label: 'Proposal #:', value: safeProposalNumber },
    { label: 'Trip Type:', value: escapeHtml(data.trip_type) },
    { label: 'Dates:', value: `${data.start_date} – ${data.end_date}` },
    { label: 'Party Size:', value: `${data.party_size} guests` },
    { label: 'Total:', value: formatCurrency(data.total) },
    { label: 'Deposit Required:', value: formatCurrency(data.deposit_amount) },
    { label: 'Valid Until:', value: data.valid_until },
  ])}

${ctaButton(brand, 'View Your Proposal', proposalUrl)}

      <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0 0; line-height: 1.6; text-align: center;">
        This proposal is valid until ${data.valid_until}. If you have any questions, don't hesitate to reach out.
      </p>

      <p style="font-size: 15px; color: #374151; margin: 32px 0 4px 0;">
        ${brand.closing},
      </p>
      <p style="font-size: 15px; color: #111827; margin: 0; font-weight: 600;">
        ${brand.signature}
      </p>`;

  const html = emailShell(brand, 'Your Trip Proposal is Ready', brand.tagline, bodyHtml);

  const text = `Your Trip Proposal is Ready | ${brand.name}

Hi ${data.customer_name},

Your personalized trip proposal is ready for review.
${data.custom_message ? `\nMessage from our team:\n${data.custom_message}\n` : ''}
PROPOSAL SUMMARY
-----------------
Proposal #: ${data.proposal_number}
Trip Type: ${data.trip_type}
Dates: ${data.start_date} - ${data.end_date}
Party Size: ${data.party_size} guests
Total: ${formatCurrency(data.total)}
Deposit Required: ${formatCurrency(data.deposit_amount)}
Valid Until: ${data.valid_until}

View your proposal: ${proposalUrl}

This proposal is valid until ${data.valid_until}.

${brand.closing},
${brand.signature}

---
${brand.phone} | ${brand.reply_to}
${brand.name} | ${brand.website}`;

  return {
    subject: `Your Trip Proposal is Ready | ${brand.name}`,
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// 2. Proposal Accepted — Customer confirmation
// ---------------------------------------------------------------------------

interface ProposalAcceptedData {
  customer_name: string;
  proposal_number: string;
  access_token: string;
  trip_type: string;
  start_date: string;
  end_date: string;
  party_size: number;
  total: number;
  deposit_amount: number;
  brand_id: number;
}

export function buildProposalAcceptedEmail(data: ProposalAcceptedData): { subject: string; html: string; text: string } {
  const brand = getBrandEmailConfig(data.brand_id);
  const payUrl = `${BASE_URL}/my-trip/${data.access_token}/pay`;

  const safeName = escapeHtml(data.customer_name);

  const bodyHtml = `
      <p style="font-size: 16px; color: #111827; margin: 0 0 20px 0;">
        Hi ${safeName},
      </p>

      <p style="font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.6;">
        Great news — your trip is confirmed! Here's a summary of what's booked.
      </p>

${summaryCard(brand, 'Trip Details', [
    { label: 'Proposal #:', value: escapeHtml(data.proposal_number) },
    { label: 'Trip Type:', value: escapeHtml(data.trip_type) },
    { label: 'Dates:', value: `${data.start_date} – ${data.end_date}` },
    { label: 'Party Size:', value: `${data.party_size} guests` },
    { label: 'Total:', value: formatCurrency(data.total) },
  ])}

      <!-- Deposit box -->
      <div style="background: #fefce8; border: 1px solid #facc15; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 4px 0; font-size: 13px; color: #713f12; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Deposit Due</p>
        <p style="margin: 0 0 12px 0; font-size: 28px; color: #111827; font-weight: bold;">${formatCurrency(data.deposit_amount)}</p>
        <p style="margin: 0; font-size: 13px; color: #854d0e; line-height: 1.5;">
          50% deposit to confirm. Balance due 48 hours after tour concludes.
        </p>
      </div>

${ctaButton(brand, 'Pay Deposit Now', payUrl)}

      <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0 0; line-height: 1.6;">
        <strong>Payment terms:</strong> 50% deposit to confirm your booking. The remaining balance is due 48 hours after your tour concludes, to accurately reflect final service time and any additions.
      </p>

      <p style="font-size: 15px; color: #374151; margin: 32px 0 4px 0;">
        ${brand.closing},
      </p>
      <p style="font-size: 15px; color: #111827; margin: 0; font-weight: 600;">
        ${brand.signature}
      </p>`;

  const html = emailShell(brand, 'Your Trip is Confirmed!', brand.tagline, bodyHtml);

  const text = `Your Trip is Confirmed! | ${brand.name}

Hi ${data.customer_name},

Great news - your trip is confirmed!

TRIP DETAILS
-----------------
Proposal #: ${data.proposal_number}
Trip Type: ${data.trip_type}
Dates: ${data.start_date} - ${data.end_date}
Party Size: ${data.party_size} guests
Total: ${formatCurrency(data.total)}

DEPOSIT DUE: ${formatCurrency(data.deposit_amount)}

Pay your deposit here: ${payUrl}

Payment terms: 50% deposit to confirm. Balance due 48 hours after tour concludes.

${brand.closing},
${brand.signature}

---
${brand.phone} | ${brand.reply_to}
${brand.name} | ${brand.website}`;

  return {
    subject: `Your Trip is Confirmed! | ${brand.name}`,
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// 3. Proposal Accepted — Staff notification
// ---------------------------------------------------------------------------

interface ProposalAcceptedStaffData {
  customer_name: string;
  customer_email: string;
  proposal_number: string;
  trip_type: string;
  start_date: string;
  party_size: number;
  total: number;
  deposit_amount: number;
  brand_id: number;
  proposalId: string;
}

export function buildProposalAcceptedStaffEmail(data: ProposalAcceptedStaffData): { subject: string; html: string; text: string } {
  const brand = getBrandEmailConfig(data.brand_id);
  const adminUrl = `${BASE_URL}/admin/trip-proposals/${data.proposalId}`;

  const bodyHtml = `
      <p style="font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.6;">
        A trip proposal has been accepted by the customer. Details below.
      </p>

${summaryCard(brand, 'Customer', [
    { label: 'Name:', value: escapeHtml(data.customer_name) },
    { label: 'Email:', value: escapeHtml(data.customer_email) },
  ])}

${summaryCard(brand, 'Proposal Details', [
    { label: 'Proposal #:', value: escapeHtml(data.proposal_number) },
    { label: 'Trip Type:', value: escapeHtml(data.trip_type) },
    { label: 'Start Date:', value: data.start_date },
    { label: 'Party Size:', value: `${data.party_size} guests` },
    { label: 'Total:', value: formatCurrency(data.total) },
    { label: 'Deposit Amount:', value: formatCurrency(data.deposit_amount) },
  ])}

${ctaButton(brand, 'View in Admin', adminUrl)}

      <p style="font-size: 13px; color: #6b7280; margin: 24px 0 0 0; text-align: center;">
        This is an automated staff notification from ${brand.name}.
      </p>`;

  const html = emailShell(brand, 'Trip Proposal Accepted', `${escapeHtml(data.proposal_number)} — ${escapeHtml(data.customer_name)}`, bodyHtml);

  const text = `Trip Proposal Accepted: ${data.proposal_number}

A trip proposal has been accepted by the customer.

CUSTOMER
--------
Name: ${data.customer_name}
Email: ${data.customer_email}

PROPOSAL DETAILS
-----------------
Proposal #: ${data.proposal_number}
Trip Type: ${data.trip_type}
Start Date: ${data.start_date}
Party Size: ${data.party_size} guests
Total: ${formatCurrency(data.total)}
Deposit Amount: ${formatCurrency(data.deposit_amount)}

View in admin: ${adminUrl}

---
${brand.name} — Staff Notification`;

  return {
    subject: `Trip Proposal Accepted: ${data.proposal_number}`,
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// 4. Deposit Received — Customer receipt
// ---------------------------------------------------------------------------

interface DepositReceivedData {
  customer_name: string;
  proposal_number: string;
  trip_type: string;
  start_date: string;
  party_size: number;
  total: number;
  deposit_amount: number;
  amount_paid: number;
  balance_remaining: number;
  brand_id: number;
}

export function buildDepositReceivedEmail(data: DepositReceivedData): { subject: string; html: string; text: string } {
  const brand = getBrandEmailConfig(data.brand_id);

  const safeName = escapeHtml(data.customer_name);
  const safeProposalNumber = escapeHtml(data.proposal_number);

  const bodyHtml = `
      <p style="font-size: 16px; color: #111827; margin: 0 0 20px 0;">
        Hi ${safeName},
      </p>

      <p style="font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.6;">
        Thank you! We've received your deposit payment. Your trip is officially locked in.
      </p>

      <!-- Payment receipt -->
      <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 22px; margin: 0 0 24px 0;">
        <h2 style="margin: 0 0 16px 0; font-size: 17px; color: #166534; font-weight: 600;">Payment Receipt</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #374151;">Proposal #</td>
            <td style="padding: 8px 0; font-size: 14px; color: #111827; text-align: right; font-weight: 600;">${safeProposalNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #374151;">Trip Total</td>
            <td style="padding: 8px 0; font-size: 14px; color: #111827; text-align: right;">${formatCurrency(data.total)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #166534; font-weight: 600; border-top: 1px solid #bbf7d0;">Amount Paid</td>
            <td style="padding: 8px 0; font-size: 20px; color: #166534; text-align: right; font-weight: bold; border-top: 1px solid #bbf7d0;">${formatCurrency(data.amount_paid)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #374151;">Balance Remaining</td>
            <td style="padding: 8px 0; font-size: 14px; color: #111827; text-align: right; font-weight: 600;">${formatCurrency(data.balance_remaining)}</td>
          </tr>
        </table>
      </div>

${summaryCard(brand, 'Trip Summary', [
    { label: 'Trip Type:', value: data.trip_type },
    { label: 'Start Date:', value: data.start_date },
    { label: 'Party Size:', value: `${data.party_size} guests` },
  ])}

      <!-- Next steps -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #111827; font-weight: 600;">What Happens Next</h3>
        <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
          <li>We'll reach out 48 hours before your trip to confirm pickup details.</li>
          <li>The remaining balance of ${formatCurrency(data.balance_remaining)} is due 48 hours after your tour concludes.</li>
        </ul>
      </div>

      <p style="font-size: 15px; color: #374151; margin: 32px 0 4px 0;">
        ${brand.closing},
      </p>
      <p style="font-size: 15px; color: #111827; margin: 0; font-weight: 600;">
        ${brand.signature}
      </p>`;

  const html = emailShell(brand, 'Deposit Received', `Thank you for your payment, ${data.customer_name}`, bodyHtml);

  const text = `Deposit Received - ${data.proposal_number} | ${brand.name}

Hi ${data.customer_name},

Thank you! We've received your deposit payment. Your trip is officially locked in.

PAYMENT RECEIPT
-----------------
Proposal #: ${data.proposal_number}
Trip Total: ${formatCurrency(data.total)}
Amount Paid: ${formatCurrency(data.amount_paid)}
Balance Remaining: ${formatCurrency(data.balance_remaining)}

TRIP SUMMARY
-----------------
Trip Type: ${data.trip_type}
Start Date: ${data.start_date}
Party Size: ${data.party_size} guests

WHAT HAPPENS NEXT
-----------------
- We'll reach out 48 hours before your trip to confirm pickup details.
- The remaining balance of ${formatCurrency(data.balance_remaining)} is due 48 hours after your tour concludes.

${brand.closing},
${brand.signature}

---
${brand.phone} | ${brand.reply_to}
${brand.name} | ${brand.website}`;

  return {
    subject: `Deposit Received - ${data.proposal_number} | ${brand.name}`,
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// 5. Deposit Received — Staff notification
// ---------------------------------------------------------------------------

interface DepositReceivedStaffData {
  customer_name: string;
  customer_email: string;
  proposal_number: string;
  amount_paid: number;
  total: number;
  balance_remaining: number;
  brand_id: number;
}

export function buildDepositReceivedStaffEmail(data: DepositReceivedStaffData): { subject: string; html: string; text: string } {
  const brand = getBrandEmailConfig(data.brand_id);

  const bodyHtml = `
      <p style="font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.6;">
        A deposit payment has been received. Details below.
      </p>

${summaryCard(brand, 'Payment Details', [
    { label: 'Proposal #:', value: escapeHtml(data.proposal_number) },
    { label: 'Customer:', value: escapeHtml(data.customer_name) },
    { label: 'Email:', value: escapeHtml(data.customer_email) },
    { label: 'Amount Paid:', value: formatCurrency(data.amount_paid) },
    { label: 'Trip Total:', value: formatCurrency(data.total) },
    { label: 'Balance Remaining:', value: formatCurrency(data.balance_remaining) },
  ])}

      <p style="font-size: 13px; color: #6b7280; margin: 24px 0 0 0; text-align: center;">
        This is an automated staff notification from ${brand.name}.
      </p>`;

  const html = emailShell(brand, 'Deposit Received', `${data.proposal_number} — ${formatCurrency(data.amount_paid)}`, bodyHtml);

  const text = `Deposit Received: ${data.proposal_number} - ${formatCurrency(data.amount_paid)}

A deposit payment has been received.

PAYMENT DETAILS
-----------------
Proposal #: ${data.proposal_number}
Customer: ${data.customer_name}
Email: ${data.customer_email}
Amount Paid: ${formatCurrency(data.amount_paid)}
Trip Total: ${formatCurrency(data.total)}
Balance Remaining: ${formatCurrency(data.balance_remaining)}

---
${brand.name} — Staff Notification`;

  return {
    subject: `Deposit Received: ${data.proposal_number} - ${formatCurrency(data.amount_paid)}`,
    html,
    text,
  };
}
