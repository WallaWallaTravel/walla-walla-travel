import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { query, queryOne } from '@/lib/db-helpers';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { crmSyncService } from '@/lib/services/crm-sync.service';
import { crmTaskAutomationService } from '@/lib/services/crm-task-automation.service';
import { sendEmail } from '@/lib/email';
import { COMPANY_INFO } from '@/lib/config/company';

// ============================================================================
// Validation Schema
// ============================================================================

const ContactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  dates: z.string().optional(),
  groupSize: z.string().optional(),
  message: z.string().min(1, 'Message is required').max(5000),
  service: z.string().optional(), // 'full-planning' or undefined
});

// ============================================================================
// API Endpoint
// ============================================================================

/**
 * POST /api/contact
 * Handle contact form submissions and create CRM leads
 */
export const POST = withRateLimit(rateLimiters.api)(
  withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
    const body = await request.json();

    // Validate input
    const validationResult = ContactFormSchema.safeParse(body);
    if (!validationResult.success) {
      throw new BadRequestError(validationResult.error.issues[0].message);
    }

    const data = validationResult.data;
    const isFullPlanning = data.service === 'full-planning';

    logger.info('[Contact] New inquiry received', {
      email: data.email,
      name: data.name,
      isFullPlanning,
    });

    // 1. Create or update CRM contact
    let contact = await queryOne<{ id: number; email: string; name: string }>(
      `SELECT id, email, name FROM crm_contacts WHERE LOWER(email) = LOWER($1)`,
      [data.email]
    );

    if (!contact) {
      // Create new CRM contact as a lead
      contact = await queryOne<{ id: number; email: string; name: string }>(
        `INSERT INTO crm_contacts (
          email, name, phone, contact_type, lifecycle_stage,
          lead_temperature, source, source_detail,
          notes, brand_id, created_at, updated_at
        ) VALUES ($1, $2, $3, 'individual', 'lead', 'warm', 'website_contact', $4, $5, 1, NOW(), NOW())
        RETURNING id, email, name`,
        [
          data.email,
          data.name,
          data.phone || null,
          isFullPlanning ? 'full_planning_inquiry' : 'contact_form',
          data.message,
        ]
      );

      logger.info('[Contact] Created new CRM contact', { contactId: contact?.id });
    } else {
      // Update existing contact with new inquiry info
      await query(
        `UPDATE crm_contacts
         SET
           name = COALESCE(NULLIF($1, ''), name),
           phone = COALESCE($2, phone),
           notes = COALESCE(notes || E'\\n\\n---\\n', '') || $3,
           last_contacted_at = NOW(),
           updated_at = NOW()
         WHERE id = $4`,
        [data.name, data.phone || null, `[Contact Form ${new Date().toISOString()}]\n${data.message}`, contact.id]
      );

      logger.info('[Contact] Updated existing CRM contact', { contactId: contact.id });
    }

    if (!contact) {
      throw new Error('Failed to create/find CRM contact');
    }

    // 2. Log the inquiry as a CRM activity
    await crmSyncService.logActivity({
      contactId: contact.id,
      activityType: 'note',
      subject: isFullPlanning ? 'Full Planning Inquiry' : 'Contact Form Submission',
      body: formatInquiryDetails(data),
    });

    // 3. Create a follow-up task for the new lead
    await crmTaskAutomationService.onNewLead({
      contactId: contact.id,
      customerName: data.name,
      source: 'website_contact',
    });

    // 4. Store the inquiry in a dedicated table for tracking
    await query(
      `INSERT INTO contact_inquiries (
        crm_contact_id, name, email, phone, dates, group_size, message,
        inquiry_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        contact.id,
        data.name,
        data.email,
        data.phone || null,
        data.dates || null,
        data.groupSize || null,
        data.message,
        isFullPlanning ? 'full_planning' : 'general',
      ]
    );

    // 5. Send internal notification email (async, don't block)
    sendInternalNotification(data, contact.id, isFullPlanning).catch(err => {
      logger.error('[Contact] Failed to send internal notification', { error: err });
    });

    // 6. Send confirmation email to customer (async, don't block)
    sendConfirmationEmail(data).catch(err => {
      logger.error('[Contact] Failed to send confirmation email', { error: err });
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for your inquiry! We will be in touch within 24 hours.',
    });
  })
);

// ============================================================================
// Helper Functions
// ============================================================================

function formatInquiryDetails(data: z.infer<typeof ContactFormSchema>): string {
  const lines = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
  ];

  if (data.phone) lines.push(`Phone: ${data.phone}`);
  if (data.dates) lines.push(`Dates: ${data.dates}`);
  if (data.groupSize) lines.push(`Group Size: ${data.groupSize}`);
  if (data.service) lines.push(`Service: ${data.service}`);

  lines.push('', 'Message:', data.message);

  return lines.join('\n');
}

async function sendInternalNotification(
  data: z.infer<typeof ContactFormSchema>,
  contactId: number,
  isFullPlanning: boolean
): Promise<void> {
  const subject = isFullPlanning
    ? `New Full Planning Inquiry from ${data.name}`
    : `New Contact Form Submission from ${data.name}`;

  const html = `
    <h2>${isFullPlanning ? 'Full Planning Inquiry' : 'Contact Form Submission'}</h2>
    <p><strong>From:</strong> ${data.name} (${data.email})</p>
    ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
    ${data.dates ? `<p><strong>Dates:</strong> ${data.dates}</p>` : ''}
    ${data.groupSize ? `<p><strong>Group Size:</strong> ${data.groupSize}</p>` : ''}
    <p><strong>Message:</strong></p>
    <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #8B1538;">
      ${data.message.replace(/\n/g, '<br>')}
    </blockquote>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/crm/contacts/${contactId}">View in CRM</a></p>
  `;

  await sendEmail({
    to: COMPANY_INFO.email.general,
    subject,
    html,
    text: formatInquiryDetails(data),
  });
}

async function sendConfirmationEmail(data: z.infer<typeof ContactFormSchema>): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8B1538 0%, #722F37 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0;">Thank You!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">We've Received Your Inquiry</p>
      </div>

      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
        <p>Hi ${data.name},</p>

        <p>Thank you for reaching out to Walla Walla Travel! We've received your inquiry and a member of our team will be in touch within 24 hours.</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B1538;">
          <h3 style="margin-top: 0; color: #1f2937;">Your Inquiry Summary</h3>
          ${data.dates ? `<p><strong>Dates:</strong> ${data.dates}</p>` : ''}
          ${data.groupSize ? `<p><strong>Group Size:</strong> ${data.groupSize}</p>` : ''}
          <p><strong>Message:</strong> ${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}</p>
        </div>

        <p>In the meantime, feel free to explore our resources:</p>
        <ul>
          <li><a href="https://wallawalla.travel/wineries" style="color: #8B1538;">Browse our winery directory</a></li>
          <li><a href="https://wallawalla.travel/experiences" style="color: #8B1538;">Explore wine country experiences</a></li>
        </ul>

        <p>If you have any urgent questions, don't hesitate to call us at <a href="tel:+15092008000" style="color: #8B1538;">(509) 200-8000</a>.</p>

        <p>Cheers!<br>The Walla Walla Travel Team</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: data.email,
    subject: "We've Received Your Inquiry - Walla Walla Travel",
    html,
    text: `Hi ${data.name},\n\nThank you for reaching out to Walla Walla Travel! We've received your inquiry and will be in touch within 24 hours.\n\nCheers!\nThe Walla Walla Travel Team`,
  });
}
