import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { z } from 'zod';

// Schema for client feedback/suggestions
const feedbackSchema = z.object({
  feedback_type: z.enum(['general', 'winery_add', 'winery_remove', 'winery_change', 'timing', 'pricing', 'question']),
  message: z.string().min(1).max(2000),
  related_item_index: z.number().optional(), // Index of service item this relates to
  suggested_winery_id: z.number().optional(), // For winery_add suggestions
  suggested_winery_name: z.string().optional(), // For winery_add suggestions
});

/**
 * POST /api/proposals/[proposal_id]/feedback
 * Submit client feedback or suggestions on a proposal
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
): Promise<NextResponse> => {
  const { proposal_id } = await params;

  const body = await request.json();
  const validatedData = feedbackSchema.parse(body);

  // Get proposal by UUID (client-facing ID)
  const proposalResult = await query(
    `SELECT id, proposal_number, status, client_email, client_name
     FROM proposals
     WHERE uuid = $1 OR id::text = $1 OR proposal_number = $1`,
    [proposal_id]
  );

  if (proposalResult.rows.length === 0) {
    throw new NotFoundError('Proposal not found');
  }

  const proposal = proposalResult.rows[0];

  // Only allow feedback on sent/viewed proposals
  if (!['sent', 'viewed'].includes(proposal.status)) {
    throw new BadRequestError('Feedback can only be submitted on active proposals');
  }

  // Insert feedback into proposal_activity_log
  await query(
    `INSERT INTO proposal_activity_log (
      proposal_id,
      activity_type,
      description,
      metadata,
      created_at
    ) VALUES ($1, $2, $3, $4, NOW())`,
    [
      proposal.id,
      'client_feedback',
      `Client feedback: ${validatedData.feedback_type}`,
      JSON.stringify({
        feedback_type: validatedData.feedback_type,
        message: validatedData.message,
        related_item_index: validatedData.related_item_index,
        suggested_winery_id: validatedData.suggested_winery_id,
        suggested_winery_name: validatedData.suggested_winery_name,
        submitted_at: new Date().toISOString(),
        client_name: proposal.client_name,
      }),
    ]
  );

  // Update proposal to mark it has feedback pending review
  await query(
    `UPDATE proposals
     SET has_pending_feedback = true,
         updated_at = NOW()
     WHERE id = $1`,
    [proposal.id]
  );

  return NextResponse.json({
    success: true,
    message: 'Thank you for your feedback! Our team will review and respond shortly.',
  });
});

/**
 * GET /api/proposals/[proposal_id]/feedback
 * Get all feedback/notes for a proposal (visible to both admin and client)
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
): Promise<NextResponse> => {
  const { proposal_id } = await params;

  // Get proposal
  const proposalResult = await query(
    `SELECT id, proposal_number, status
     FROM proposals
     WHERE uuid = $1 OR id::text = $1 OR proposal_number = $1`,
    [proposal_id]
  );

  if (proposalResult.rows.length === 0) {
    throw new NotFoundError('Proposal not found');
  }

  const proposal = proposalResult.rows[0];

  // Get all feedback activity
  const feedbackResult = await query(
    `SELECT
      id,
      activity_type,
      description,
      metadata,
      created_at
     FROM proposal_activity_log
     WHERE proposal_id = $1
       AND activity_type IN ('client_feedback', 'admin_response', 'client_note', 'admin_note')
     ORDER BY created_at ASC`,
    [proposal.id]
  );

  // Format for display
  const feedbackItems = feedbackResult.rows.map(row => ({
    id: row.id,
    type: row.activity_type,
    description: row.description,
    message: row.metadata?.message || row.description,
    feedback_type: row.metadata?.feedback_type,
    sender: row.activity_type.startsWith('client_') ? 'client' : 'wwt',
    created_at: row.created_at,
    metadata: row.metadata,
  }));

  return NextResponse.json({
    success: true,
    data: feedbackItems,
  });
});
