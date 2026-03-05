/**
 * Document Renewal Reminder Email Templates
 *
 * Sent when driver documents (licenses, medical certs, etc.) are
 * approaching their expiration date. Brand-aware, dark-mode compatible.
 *
 * Two templates:
 *   - Driver reminder: sent to the driver
 *   - Admin digest: sent to staff with all expiring documents
 *
 * @module lib/email/templates/document-renewal-email
 */

import { getBrandEmailConfig, type BrandEmailConfig } from '@/lib/email-brands';
import { emailDarkModeStyles } from '@/lib/email/dark-mode-styles';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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
        Questions? Contact the office.
      </p>
      <p style="margin: 0; font-size: 14px; color: #111827;">
        <strong>${brand.phone}</strong> &bull;
        <a href="mailto:${brand.reply_to}" style="color: ${brand.primary_color}; text-decoration: none;">${brand.reply_to}</a>
      </p>
      <p style="margin: 16px 0 0 0; font-size: 12px; color: #6b7280;">
        ${brand.name} &bull; Compliance Notification
      </p>
    </div>

  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  medical_cert: 'Medical Certificate',
  license_front: 'Driver License',
  license_back: 'Driver License (Back)',
  mvr: 'Motor Vehicle Record',
  road_test: 'Road Test Certificate',
  background_check: 'Background Check',
  drug_test: 'Drug Test',
  application: 'Employment Application',
  annual_review: 'Annual Review',
  training_cert: 'Training Certificate',
  hazmat_cert: 'Hazmat Certificate',
  endorsement: 'Endorsement',
  previous_employer: 'Previous Employer Verification',
  employment_verification: 'Employment Verification',
};

function getDocumentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getUrgencyColor(daysUntilExpiry: number): { bg: string; border: string; text: string; label: string } {
  if (daysUntilExpiry <= 7) {
    return { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', label: 'Expires in ' + daysUntilExpiry + ' days' };
  }
  if (daysUntilExpiry <= 14) {
    return { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', label: 'Expires in ' + daysUntilExpiry + ' days' };
  }
  return { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', label: 'Expires in ' + daysUntilExpiry + ' days' };
}

// ---------------------------------------------------------------------------
// Driver Reminder Email
// ---------------------------------------------------------------------------

export interface DocumentReminderData {
  driver_name: string;
  documents: Array<{
    document_name: string;
    document_type: string;
    expiry_date: string;
    days_until_expiry: number;
  }>;
  brand_id?: number;
}

export function buildDocumentRenewalDriverEmail(data: DocumentReminderData): { subject: string; html: string; text: string } {
  const brand = getBrandEmailConfig(data.brand_id);
  const safeName = escapeHtml(data.driver_name);
  const firstName = safeName.split(' ')[0];

  const mostUrgent = Math.min(...data.documents.map(d => d.days_until_expiry));
  const urgencyWord = mostUrgent <= 7 ? 'Urgent: ' : mostUrgent <= 14 ? 'Reminder: ' : '';

  const docRows = data.documents.map(doc => {
    const urgency = getUrgencyColor(doc.days_until_expiry);
    const typeLabel = getDocumentTypeLabel(doc.document_type);
    const expiryFormatted = new Date(doc.expiry_date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return `<div style="background: ${urgency.bg}; border-left: 4px solid ${urgency.border}; padding: 16px; margin: 12px 0; border-radius: 0 8px 8px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #111827;">${escapeHtml(typeLabel)}</p>
            <p style="margin: 0; font-size: 13px; color: #6b7280;">${escapeHtml(doc.document_name)}</p>
          </div>
        </div>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: ${urgency.text}; font-weight: 600;">
          ${urgency.label} &mdash; ${expiryFormatted}
        </p>
      </div>`;
  }).join('\n');

  const bodyHtml = `
      <p style="font-size: 16px; color: #111827; margin: 0 0 20px 0;">
        Hi ${firstName},
      </p>

      <p style="font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.6;">
        ${data.documents.length === 1 ? 'One of your documents is' : 'Some of your documents are'} approaching ${data.documents.length === 1 ? 'its' : 'their'} expiration date. Please renew ${data.documents.length === 1 ? 'it' : 'them'} as soon as possible to remain in compliance.
      </p>

${docRows}

      <!-- Action -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #111827; font-weight: 600;">What to Do</h3>
        <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
          <li>Renew the document(s) before the expiration date.</li>
          <li>Upload the new document to the driver portal or send it to the office.</li>
          <li>Contact the office if you need help or have questions.</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0 0; line-height: 1.6; text-align: center;">
        Keeping documents current is required for FMCSA compliance. Operating with expired documents may result in out-of-service orders.
      </p>`;

  const html = emailShell(
    brand,
    'Document Renewal Reminder',
    `${data.documents.length} document${data.documents.length !== 1 ? 's' : ''} expiring soon`,
    bodyHtml
  );

  const textDocs = data.documents.map(doc => {
    const typeLabel = getDocumentTypeLabel(doc.document_type);
    return `- ${typeLabel}: ${doc.document_name} — expires ${doc.expiry_date} (${doc.days_until_expiry} days)`;
  }).join('\n');

  const text = `${urgencyWord}Document Renewal Reminder

Hi ${data.driver_name.split(' ')[0]},

${data.documents.length === 1 ? 'One of your documents is' : 'Some of your documents are'} approaching expiration:

${textDocs}

WHAT TO DO
----------
- Renew the document(s) before the expiration date
- Upload the new document to the driver portal or send it to the office
- Contact the office if you need help

---
${brand.phone} | ${brand.reply_to}
${brand.name} — Compliance Notification`;

  const docSummary = data.documents.length === 1
    ? getDocumentTypeLabel(data.documents[0].document_type)
    : `${data.documents.length} documents`;

  return {
    subject: `${urgencyWord}${docSummary} expiring soon`,
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// Admin Digest Email
// ---------------------------------------------------------------------------

export interface AdminDocumentDigestData {
  expiring_documents: Array<{
    driver_name: string;
    driver_email: string | null;
    document_name: string;
    document_type: string;
    expiry_date: string;
    days_until_expiry: number;
  }>;
  brand_id?: number;
}

export function buildDocumentRenewalAdminEmail(data: AdminDocumentDigestData): { subject: string; html: string; text: string } {
  const brand = getBrandEmailConfig(data.brand_id);

  const critical = data.expiring_documents.filter(d => d.days_until_expiry <= 7);
  const warning = data.expiring_documents.filter(d => d.days_until_expiry > 7 && d.days_until_expiry <= 14);
  const upcoming = data.expiring_documents.filter(d => d.days_until_expiry > 14);

  function renderSection(title: string, docs: typeof data.expiring_documents, urgency: ReturnType<typeof getUrgencyColor>): string {
    if (docs.length === 0) return '';
    const rows = docs.map(doc => `<tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #111827;">${escapeHtml(doc.driver_name)}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #111827;">${escapeHtml(getDocumentTypeLabel(doc.document_type))}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: ${urgency.text}; font-weight: 600;">${doc.days_until_expiry}d</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">${doc.expiry_date}</td>
            </tr>`).join('\n');

    return `<div style="margin: 20px 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; color: ${urgency.text}; font-weight: 600;">${title} (${docs.length})</h3>
        <table style="width: 100%; border-collapse: collapse; background: ${urgency.bg}; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Driver</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Document</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Days</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Expires</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>`;
  }

  const bodyHtml = `
      <p style="font-size: 15px; color: #374151; margin: 0 0 16px 0; line-height: 1.6;">
        The following driver documents are approaching expiration. Drivers have been notified.
      </p>

      <!-- Summary badges -->
      <div style="display: flex; gap: 12px; margin: 0 0 20px 0;">
        ${critical.length > 0 ? `<span style="background: #fef2f2; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">${critical.length} critical</span>` : ''}
        ${warning.length > 0 ? `<span style="background: #fffbeb; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">${warning.length} warning</span>` : ''}
        ${upcoming.length > 0 ? `<span style="background: #eff6ff; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">${upcoming.length} upcoming</span>` : ''}
      </div>

${renderSection('Critical — 7 days or less', critical, getUrgencyColor(5))}
${renderSection('Warning — 14 days or less', warning, getUrgencyColor(10))}
${renderSection('Upcoming — 30 days or less', upcoming, getUrgencyColor(20))}

      <p style="font-size: 13px; color: #6b7280; margin: 24px 0 0 0; text-align: center;">
        This is an automated compliance notification from ${brand.name}.
      </p>`;

  const html = emailShell(
    brand,
    'Document Expiration Report',
    `${data.expiring_documents.length} document${data.expiring_documents.length !== 1 ? 's' : ''} expiring within 30 days`,
    bodyHtml
  );

  const textDocs = data.expiring_documents.map(doc =>
    `  ${doc.driver_name} | ${getDocumentTypeLabel(doc.document_type)} | ${doc.expiry_date} (${doc.days_until_expiry}d)`
  ).join('\n');

  const text = `Document Expiration Report — ${data.expiring_documents.length} documents expiring

${critical.length > 0 ? `CRITICAL (${critical.length}): within 7 days\n` : ''}${warning.length > 0 ? `WARNING (${warning.length}): within 14 days\n` : ''}${upcoming.length > 0 ? `UPCOMING (${upcoming.length}): within 30 days\n` : ''}
${textDocs}

---
${brand.name} — Compliance Notification`;

  return {
    subject: `Document Expiration Report: ${critical.length > 0 ? `${critical.length} critical` : `${data.expiring_documents.length} expiring`}`,
    html,
    text,
  };
}
