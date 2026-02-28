/**
 * Send Trip Proposal API
 * POST /api/admin/trip-proposals/[id]/send
 *
 * Validates the proposal is ready, updates status to 'sent',
 * and sends the branded email with optional custom message.
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { tripProposalEmailService } from '@/lib/services/trip-proposal-email.service';
import { draftReminderService } from '@/lib/services/draft-reminder.service';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SendProposalSchema = z.object({
  custom_message: z.string().max(2000).optional(),
});

export const POST = withAdminAuth(async (request: NextRequest, session, context) => {
  const { id } = await (context as unknown as RouteParams).params;
  const proposalId = parseInt(id, 10);

  if (isNaN(proposalId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid proposal ID' },
      { status: 400 }
    );
  }

  // Parse optional custom message
  let customMessage: string | undefined;
  try {
    const body = await request.json();
    const parsed = SendProposalSchema.safeParse(body);
    if (parsed.success) {
      customMessage = parsed.data.custom_message;
    }
  } catch {
    // Empty body is fine — custom_message is optional
  }

  // Fetch proposal
  const proposal = await tripProposalService.getById(proposalId);
  if (!proposal) {
    return NextResponse.json(
      { success: false, error: 'Proposal not found' },
      { status: 404 }
    );
  }

  // Validate: must have customer email
  if (!proposal.customer_email) {
    return NextResponse.json(
      { success: false, error: 'Cannot send: no customer email address on this proposal' },
      { status: 400 }
    );
  }

  // Validate: must have pricing calculated (total > 0)
  if (!proposal.total || Number(proposal.total) <= 0) {
    return NextResponse.json(
      { success: false, error: 'Cannot send: pricing has not been calculated yet. Please add service line items and recalculate pricing first.' },
      { status: 400 }
    );
  }

  // Validate: must be in draft status (or allow re-sending from viewed)
  if (!['draft', 'viewed'].includes(proposal.status)) {
    return NextResponse.json(
      { success: false, error: `Cannot send: proposal is currently "${proposal.status}". Only draft or viewed proposals can be sent.` },
      { status: 400 }
    );
  }

  // Update status to 'sent'
  const updated = await tripProposalService.updateStatus(proposalId, 'sent', {
    actor_type: 'staff',
    actor_user_id: session?.userId ? parseInt(session.userId, 10) : undefined,
  });

  // Disable draft reminders now that proposal is sent
  await draftReminderService.disableReminders(proposalId);

  // Send email (non-blocking)
  after(async () => {
    await tripProposalEmailService.sendProposalSentEmail(proposalId, customMessage);
  });

  return NextResponse.json({
    success: true,
    data: updated,
    message: `Proposal sent to ${proposal.customer_email}`,
    email_to: proposal.customer_email,
  });
});
