import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';
import { withErrorHandling, NotFoundError } from '@/lib/api/middleware/error-handler';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';
import { COMPANY_INFO } from '@/lib/config/company';
import { getBrandEmailConfig } from '@/lib/email-brands';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

/**
 * POST /api/proposals/[proposal_id]/send
 * Send proposal to client via email and/or SMS
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
): Promise<NextResponse> => {
  const { proposal_id } = await params;
  const body = await request.json();
  const { method = 'email', customMessage } = body; // 'email', 'sms', or 'both'

  // Fetch proposal
  const result = await query(
    `SELECT
      id,
      proposal_number,
      uuid,
      client_name,
      client_email,
      client_phone,
      proposal_title,
      total,
      valid_until,
      status,
      service_items,
      brand_id
     FROM proposals
     WHERE proposal_number = $1 OR id::text = $1`,
    [proposal_id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Proposal not found');
  }

  const proposal = result.rows[0];

  // Get brand configuration (defaults to Walla Walla Travel if no brand_id)
  const brand = getBrandEmailConfig(proposal.brand_id);

  // Check if already sent
  if (proposal.status !== 'draft') {
    // Allow resending
    logger.info('Resending proposal', { proposalNumber: proposal.proposal_number });
  }

  // Generate proposal URL
  const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/proposals/${proposal.uuid}`;

  // Send Email
  if (method === 'email' || method === 'both') {
    const serviceItems = typeof proposal.service_items === 'string'
      ? JSON.parse(proposal.service_items)
      : proposal.service_items;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your ${brand.name} Proposal</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${brand.primary_color} 0%, ${brand.secondary_color} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">${brand.name}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${brand.tagline}</p>
        </div>

        <!-- Content -->
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: ${brand.primary_color}; margin-top: 0;">Your Custom Wine Country Experience Awaits!</h2>

          <p>Hi ${proposal.client_name},</p>

          ${customMessage ? `<p style="background: ${brand.primary_color}10; padding: 15px; border-left: 4px solid ${brand.primary_color}; border-radius: 4px;">${customMessage}</p>` : ''}

          <p>We've prepared a personalized proposal for your Walla Walla wine country experience.</p>

          <!-- Proposal Summary -->
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">${proposal.proposal_title}</h3>
            <p style="margin: 10px 0;"><strong>Services:</strong> ${serviceItems.length} service${serviceItems.length !== 1 ? 's' : ''}</p>
            <p style="margin: 10px 0;"><strong>Total Investment:</strong> <span style="font-size: 24px; color: ${brand.primary_color}; font-weight: bold;">$${parseFloat(proposal.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
            <p style="margin: 10px 0;"><strong>Valid Until:</strong> ${new Date(proposal.valid_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${proposalUrl}" style="display: inline-block; background: ${brand.primary_color}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">View Your Proposal</a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">This proposal is valid until ${new Date(proposal.valid_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Please review and accept at your earliest convenience.</p>

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            <p><strong>${brand.name}</strong></p>
            <p>${brand.website}</p>
            <p>
              <a href="tel:${brand.phone.replace(/[^+\d]/g, '')}" style="color: ${brand.primary_color}; text-decoration: none;">${brand.phone}</a> •
              <a href="mailto:${brand.reply_to}" style="color: ${brand.primary_color}; text-decoration: none;">${brand.reply_to}</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: proposal.client_email,
      subject: `Your ${brand.name} Proposal - ${proposal.proposal_title}`,
      html: emailHtml,
      text: `Hi ${proposal.client_name},\n\nWe've prepared a personalized proposal for your Walla Walla wine country experience.\n\nView your proposal: ${proposalUrl}\n\nThis proposal is valid until ${new Date(proposal.valid_until).toLocaleDateString()}.\n\nBest regards,\n${brand.name}\n${brand.phone}`
    });
  }

  // Send SMS via Twilio
  if (method === 'sms' || method === 'both') {
    if (proposal.client_phone) {
      const smsResult = await sendSMS({
        to: proposal.client_phone,
        message: `Hi ${proposal.client_name}! Your ${brand.name} proposal is ready. View it here: ${proposalUrl} - Valid until ${new Date(proposal.valid_until).toLocaleDateString()}`
      });

      if (smsResult.success) {
        logger.info('Proposal SMS sent', { phone: proposal.client_phone, messageId: smsResult.messageId });
      } else {
        logger.warn('Failed to send proposal SMS', { phone: proposal.client_phone, error: smsResult.error });
      }
    } else {
      logger.warn('No phone number for SMS', { proposalNumber: proposal.proposal_number });
    }
  }

  // Update proposal status
  const now = new Date().toISOString();
  await query(
    `UPDATE proposals
     SET status = 'sent', sent_at = $1, updated_at = $1
     WHERE id = $2`,
    [now, proposal.id]
  );

  // Log activity
  await query(
    `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
     VALUES ($1, $2, $3, $4)`,
    [
      proposal.id,
      'sent',
      `Proposal sent via ${method}`,
      JSON.stringify({
        method,
        sent_at: now,
        sent_to_email: proposal.client_email,
        sent_to_phone: proposal.client_phone,
        custom_message: customMessage || null
      })
    ]
  );

  return NextResponse.json({
    success: true,
    message: `Proposal sent successfully via ${method}`,
    data: {
      proposal_number: proposal.proposal_number,
      sent_at: now,
      method
    }
  });
})));
