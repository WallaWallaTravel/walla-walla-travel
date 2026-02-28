import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError, NotFoundError, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { Pool } from 'pg';
import { getDbConfig } from '@/lib/config/database';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { sendEmail } from '@/lib/email';
import { getBrandEmailConfig } from '@/lib/email-brands';
import { logger } from '@/lib/logger';

/**
 * POST /api/proposals/[proposal_id]/counter
 * Create a counter-proposal based on a declined proposal
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
): Promise<NextResponse> => {
  const { proposal_id } = await params;

  // Check authentication
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Unauthorized');
  }

  const body = await request.json();
  const {
    counter_notes,      // Admin explanation of changes made
    service_items,      // Updated service items (optional - keep original if not provided)
    discount_percentage, // New discount (optional)
    discount_amount,    // New discount amount (optional)
    discount_reason,    // Reason for discount
    valid_days,         // Days until expiration (default 14)
    send_immediately,   // Whether to send right away
  } = body;

  // Get original proposal
  const proposalResult = await query(
    `SELECT * FROM proposals
     WHERE id = $1 OR proposal_number = $1`,
    [proposal_id]
  );

  if (proposalResult.rows.length === 0) {
    throw new NotFoundError('Original proposal not found');
  }

  const original = proposalResult.rows[0];

  // Get brand configuration (inherit from original proposal)
  const brand = getBrandEmailConfig(original.brand_id);

  // Only allow counter on declined proposals
  if (original.status !== 'declined') {
    throw new BadRequestError(`Cannot create counter for proposal with status: ${original.status}. Only declined proposals can be countered.`);
  }

  // Get the next version number in this negotiation chain
  const versionResult = await query(
    `SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
     FROM proposals
     WHERE id = $1 OR parent_proposal_id = $1 OR parent_proposal_id = (
       SELECT COALESCE(parent_proposal_id, id) FROM proposals WHERE id = $1
     )`,
    [original.id]
  );
  const nextVersion = versionResult.rows[0]?.next_version || 2;

  // Generate new proposal number
  const year = new Date().getFullYear();
  const seqResult = await query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(proposal_number FROM 10) AS INTEGER)), 0) + 1 as next_seq
     FROM proposals
     WHERE proposal_number LIKE $1`,
    [`PRO-${year}-%`]
  );
  const nextSeq = seqResult.rows[0]?.next_seq || 1;
  const proposalNumber = `PRO-${year}-${nextSeq.toString().padStart(4, '0')}`;

  // Generate UUID for client link
  const uuid = crypto.randomUUID();

  // Calculate new pricing if service_items provided
  interface ServiceItem {
    price?: number | string;
  }
  const newServiceItems = service_items || original.service_items;
  let newSubtotal = 0;

  if (Array.isArray(newServiceItems)) {
    newSubtotal = (newServiceItems as ServiceItem[]).reduce((sum: number, item) => sum + (parseFloat(String(item.price ?? 0)) || 0), 0);
  } else {
    newSubtotal = parseFloat(original.subtotal) || 0;
  }

  // Calculate discounts
  const newDiscountPercentage = discount_percentage ?? original.discount_percentage ?? 0;
  const newDiscountAmount = discount_amount ?? (newSubtotal * newDiscountPercentage / 100);
  const newTotal = newSubtotal - newDiscountAmount;

  // Calculate valid_until date
  const validDays = valid_days || 14;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);

  // Use transaction for counter-proposal creation
  const pool = new Pool(getDbConfig());
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create counter-proposal
    const insertResult = await client.query(
      `INSERT INTO proposals (
        proposal_number,
        uuid,
        client_name,
        client_email,
        client_phone,
        client_company,
        title,
        service_items,
        subtotal,
        discount_percentage,
        discount_amount,
        discount_reason,
        total,
        gratuity_enabled,
        gratuity_suggested_percentage,
        gratuity_optional,
        notes,
        terms_and_conditions,
        internal_notes,
        valid_until,
        status,
        created_by,
        parent_proposal_id,
        version_number,
        is_counter_proposal,
        counter_notes,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW(), NOW()
      ) RETURNING *`,
      [
        proposalNumber,
        uuid,
        original.client_name,
        original.client_email,
        original.client_phone,
        original.client_company,
        original.title || `Counter Proposal for ${original.client_name}`,
        JSON.stringify(newServiceItems),
        newSubtotal,
        newDiscountPercentage,
        newDiscountAmount,
        discount_reason || original.discount_reason,
        newTotal,
        original.gratuity_enabled,
        original.gratuity_suggested_percentage,
        original.gratuity_optional,
        original.notes,
        original.terms_and_conditions,
        `Counter-proposal for ${original.proposal_number}. ${counter_notes || ''}`.trim(),
        validUntil.toISOString().split('T')[0],
        send_immediately ? 'sent' : 'draft',
        session.user.id,
        original.parent_proposal_id || original.id, // Link to root proposal
        nextVersion,
        true,
        counter_notes || null
      ]
    );

    const counterProposal = insertResult.rows[0];

    // Log activity on original proposal
    await client.query(
      `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        original.id,
        'counter_created',
        `Counter-proposal ${proposalNumber} created`,
        JSON.stringify({
          counter_proposal_id: counterProposal.id,
          counter_proposal_number: proposalNumber,
          version: nextVersion,
          created_by: session.user.name,
          created_by_id: session.user.id,
          changes_made: counter_notes,
          discount_change: discount_percentage ? `${discount_percentage}%` : null,
          timestamp: new Date().toISOString()
        })
      ]
    );

    // Log activity on new counter-proposal
    await client.query(
      `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        counterProposal.id,
        'created',
        `Counter-proposal created in response to ${original.proposal_number}`,
        JSON.stringify({
          original_proposal_id: original.id,
          original_proposal_number: original.proposal_number,
          client_feedback: original.client_feedback,
          client_desired_changes: original.client_desired_changes,
          version: nextVersion,
          created_by: session.user.name
        })
      ]
    );

    // If send_immediately, also log the send and update sent_at
    if (send_immediately) {
      await client.query(
        `UPDATE proposals SET sent_at = NOW() WHERE id = $1`,
        [counterProposal.id]
      );

      await client.query(
        `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
         VALUES ($1, $2, $3, $4)`,
        [
          counterProposal.id,
          'sent',
          `Counter-proposal sent to ${original.client_email}`,
          JSON.stringify({
            sent_to: original.client_email,
            sent_by: session.user.name,
            timestamp: new Date().toISOString()
          })
        ]
      );

      // Send the counter-proposal email
      const counterUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/proposals/${uuid}`;
      const newServiceItemsList = Array.isArray(newServiceItems) ? newServiceItems : [];

      const counterEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Updated Proposal from ${brand.name}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${brand.primary_color} 0%, ${brand.secondary_color} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">${brand.name}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Updated Proposal</p>
          </div>

          <!-- Content -->
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: ${brand.primary_color}; margin-top: 0;">We've Updated Your Proposal</h2>

            <p>Hi ${original.client_name},</p>

            <p>Based on your feedback, we've prepared an updated proposal for your review.</p>

            ${counter_notes ? `
            <div style="background: ${brand.primary_color}10; padding: 15px; border-left: 4px solid ${brand.primary_color}; border-radius: 4px; margin: 20px 0;">
              <strong>What's Changed:</strong>
              <p style="margin: 10px 0 0 0;">${counter_notes}</p>
            </div>
            ` : ''}

            <!-- Proposal Summary -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Proposal ${proposalNumber}</h3>
              <p style="margin: 10px 0;"><strong>Services:</strong> ${newServiceItemsList.length} service${newServiceItemsList.length !== 1 ? 's' : ''}</p>
              ${newDiscountPercentage > 0 ? `<p style="margin: 10px 0;"><strong>Discount:</strong> ${newDiscountPercentage}% off</p>` : ''}
              <p style="margin: 10px 0;"><strong>New Total:</strong> <span style="font-size: 24px; color: ${brand.primary_color}; font-weight: bold;">$${newTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
              <p style="margin: 10px 0;"><strong>Valid Until:</strong> ${validUntil.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${counterUrl}" style="display: inline-block; background: ${brand.primary_color}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Review Updated Proposal</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">This proposal is valid until ${validUntil.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. We'd love to make this work for you!</p>

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
        to: original.client_email,
        subject: `Updated Proposal from ${brand.name} - ${proposalNumber}`,
        html: counterEmailHtml,
        text: `Hi ${original.client_name},\n\nBased on your feedback, we've prepared an updated proposal for your review.\n\n${counter_notes ? `What's Changed: ${counter_notes}\n\n` : ''}Proposal ${proposalNumber}\nNew Total: $${newTotal.toFixed(2)}\nValid Until: ${validUntil.toLocaleDateString()}\n\nView your updated proposal: ${counterUrl}\n\nBest regards,\n${brand.name}\n${brand.phone}`
      });

      logger.info('Counter-proposal email sent', {
        proposalNumber,
        sentTo: original.client_email,
        originalProposalNumber: original.proposal_number,
      });
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: {
        counter_proposal_id: counterProposal.id,
        counter_proposal_number: proposalNumber,
        uuid: uuid,
        version: nextVersion,
        original_proposal_id: original.id,
        original_proposal_number: original.proposal_number,
        status: counterProposal.status,
        client_link: `/proposals/${uuid}`,
        message: send_immediately
          ? 'Counter-proposal created and sent to client'
          : 'Counter-proposal created as draft. Review and send when ready.'
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
})));

/**
 * GET /api/proposals/[proposal_id]/counter
 * Get negotiation history for a proposal
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
): Promise<NextResponse> => {
  const { proposal_id } = await params;

  // Check authentication
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Unauthorized');
  }

  // Get the proposal
  const proposalResult = await query(
    `SELECT * FROM proposals WHERE id = $1 OR proposal_number = $1`,
    [proposal_id]
  );

  if (proposalResult.rows.length === 0) {
    throw new NotFoundError('Proposal not found');
  }

  const proposal = proposalResult.rows[0];

  // Find the root proposal ID
  const rootId = proposal.parent_proposal_id || proposal.id;

  // Get all proposals in this negotiation chain
  const chainResult = await query(
    `SELECT
      p.*,
      u.name as created_by_name
     FROM proposals p
     LEFT JOIN users u ON p.created_by = u.id
     WHERE p.id = $1 OR p.parent_proposal_id = $1
     ORDER BY p.version_number ASC, p.created_at ASC`,
    [rootId]
  );

  // Get activity log for all proposals in chain
  const proposalIds = chainResult.rows.map(p => p.id);
  const activityResult = await query(
    `SELECT * FROM proposal_activity_log
     WHERE proposal_id = ANY($1)
     ORDER BY created_at DESC`,
    [proposalIds]
  );

  return NextResponse.json({
    success: true,
    data: {
      current_proposal: proposal,
      negotiation_chain: chainResult.rows,
      activity_log: activityResult.rows,
      total_versions: chainResult.rows.length
    }
  });
});
