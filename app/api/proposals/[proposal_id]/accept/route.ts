import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

/**
 * POST /api/proposals/[proposal_id]/accept
 * Accept a proposal and create a booking
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
): Promise<NextResponse> => {
  const { proposal_id } = await params;
  const body = await request.json();
  const {
    name,
    email,
    phone,
    gratuity_amount,
    terms_accepted,
    cancellation_policy_accepted,
    signature,
    signature_date,
  } = body;

  // Validation
  if (!name || !email || !phone) {
    throw new BadRequestError('Contact information is required');
  }

  if (!terms_accepted || !cancellation_policy_accepted) {
    throw new BadRequestError('You must accept the terms and conditions');
  }

  if (!signature) {
    throw new BadRequestError('Signature is required');
  }

  // Get proposal
  const proposalResult = await query(
    `SELECT * FROM proposals
     WHERE proposal_number = $1 OR id::text = $1`,
    [proposal_id]
  );

  if (proposalResult.rows.length === 0) {
    throw new NotFoundError('Proposal not found');
  }

  const proposal = proposalResult.rows[0];

  // Check if proposal can be accepted
  if (proposal.status !== 'sent') {
    throw new BadRequestError('This proposal cannot be accepted');
  }

  const validUntil = new Date(proposal.valid_until);
  if (validUntil < new Date()) {
    throw new BadRequestError('This proposal has expired');
  }

  // Calculate final total with gratuity
  const finalTotal = proposal.total + (gratuity_amount || 0);
  const depositAmount = finalTotal * 0.5;

  // Update proposal status
  await query(
    `UPDATE proposals
     SET
       status = 'accepted',
       accepted_at = NOW(),
       accepted_by_name = $1,
       accepted_by_email = $2,
       accepted_by_phone = $3,
       gratuity_amount = $4,
       final_total = $5,
       signature = $6,
       signature_date = $7,
       updated_at = NOW()
     WHERE id = $8`,
    [
      name,
      email,
      phone,
      gratuity_amount || 0,
      finalTotal,
      signature,
      signature_date,
      proposal.id
    ]
  );

  // Log activity
  await query(
    `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
     VALUES ($1, $2, $3, $4)`,
    [
      proposal.id,
      'accepted',
      `Proposal accepted by ${name}`,
      JSON.stringify({
        accepted_by: name,
        email,
        phone,
        gratuity_amount: gratuity_amount || 0,
        final_total: finalTotal,
        timestamp: new Date().toISOString()
      })
    ]
  );

  // TODO: Send confirmation email
  // TODO: Create Stripe payment intent for deposit
  // TODO: Create booking record

  return NextResponse.json({
    success: true,
    data: {
      proposal_id: proposal.id,
      proposal_number: proposal.proposal_number,
      final_total: finalTotal,
      deposit_amount: depositAmount,
      message: 'Proposal accepted successfully'
    }
  });
})));
