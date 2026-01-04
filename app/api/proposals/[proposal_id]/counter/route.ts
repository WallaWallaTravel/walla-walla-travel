import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError, NotFoundError, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { Pool } from 'pg';
import { getDbConfig } from '@/lib/config/database';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

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

      // TODO: Actually send the email here
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
