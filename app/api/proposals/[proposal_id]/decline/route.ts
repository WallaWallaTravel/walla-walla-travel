import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { sendProposalDeclineNotification } from '@/lib/email';

/**
 * POST /api/proposals/[proposal_id]/decline
 * Client declines a proposal with feedback
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
): Promise<NextResponse> => {
  const { proposal_id } = await params;
  const body = await request.json();
  const {
    reason,           // Main reason for declining
    category,         // Category: 'price', 'dates', 'services', 'timing', 'other'
    desired_changes,  // What would make them accept
    contact_name,     // Optional: who is declining
    contact_email,    // Optional: their email
    open_to_counter,  // Boolean: are they open to a counter-proposal?
  } = body;

  // Validation
  if (!reason || reason.trim().length < 10) {
    throw new BadRequestError('Please provide a reason for declining (at least 10 characters)');
  }

  // Get proposal
  const proposalResult = await query(
    `SELECT * FROM proposals
     WHERE proposal_number = $1 OR id::text = $1 OR uuid::text = $1`,
    [proposal_id]
  );

  if (proposalResult.rows.length === 0) {
    throw new NotFoundError('Proposal not found');
  }

  const proposal = proposalResult.rows[0];

  // Check if proposal can be declined
  if (!['sent', 'viewed'].includes(proposal.status)) {
    throw new BadRequestError(`Cannot decline a proposal with status: ${proposal.status}`);
  }

  // Update proposal with decline info
  await query(
    `UPDATE proposals SET
      status = 'declined',
      declined_at = NOW(),
      declined_reason = $1,
      client_feedback = $1,
      client_feedback_category = $2,
      client_desired_changes = $3,
      updated_at = NOW()
     WHERE id = $4`,
    [
      reason,
      category || 'other',
      desired_changes || null,
      proposal.id
    ]
  );

  // Log activity with full details
  await query(
    `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
     VALUES ($1, $2, $3, $4)`,
    [
      proposal.id,
      'declined',
      `Proposal declined by client: ${category || 'other'}`,
      JSON.stringify({
        reason,
        category: category || 'other',
        desired_changes: desired_changes || null,
        contact_name: contact_name || null,
        contact_email: contact_email || null,
        open_to_counter: open_to_counter !== false, // Default true
        declined_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || null
      })
    ]
  );

  // Send notification email to admin (async, don't block response)
  sendProposalDeclineNotification({
    proposal_number: proposal.proposal_number,
    customer_name: proposal.customer_name || contact_name || 'Unknown',
    reason,
    category: category || 'other',
    desired_changes: desired_changes || undefined,
    open_to_counter: open_to_counter !== false,
  }).catch(err => {
    console.error('[Proposal Decline] Failed to send admin notification:', err);
  });

  return NextResponse.json({
    success: true,
    data: {
      proposal_id: proposal.id,
      proposal_number: proposal.proposal_number,
      status: 'declined',
      message: open_to_counter !== false
        ? 'Thank you for your feedback. Our team will review and may reach out with an updated proposal.'
        : 'Thank you for letting us know. We appreciate your consideration.',
      open_to_counter: open_to_counter !== false
    }
  });
});
