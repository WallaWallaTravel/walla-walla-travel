/**
 * Client-Facing Notes API Routes
 * GET  /api/my-trip/[token]/notes - Get notes for the proposal
 * POST /api/my-trip/[token]/notes - Create a new client note
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext, NotFoundError } from '@/lib/api/middleware/error-handler';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { proposalNotesService } from '@/lib/services/proposal-notes.service';
import { ClientNoteSchema } from '@/lib/types/proposal-notes';
import type { NoteContextType } from '@/lib/types/proposal-notes';
import { sendEmail } from '@/lib/email';

interface RouteParams {
  token: string;
}

/**
 * GET /api/my-trip/[token]/notes
 * Returns all notes for the proposal. Accepts optional query params
 * `context_type` and `context_id` to filter contextual notes.
 * Also marks staff notes as read (since the client is viewing).
 */
export const GET = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { token } = await context.params;

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) {
      throw new NotFoundError('Trip not found');
    }

    // Parse optional query filters
    const url = new URL(request.url);
    const contextType = url.searchParams.get('context_type') as NoteContextType | null;
    const contextIdRaw = url.searchParams.get('context_id');
    const contextId = contextIdRaw ? parseInt(contextIdRaw, 10) : undefined;

    const notes = await proposalNotesService.getNotes({
      trip_proposal_id: proposal.id,
      context_type: contextType || undefined,
      context_id: contextId,
    });

    // Mark staff notes as read since the client is viewing
    await proposalNotesService.markAsRead(proposal.id, 'staff');

    // Get unread count of client notes (notes from client that staff hasn't read)
    const unreadCount = await proposalNotesService.getUnreadCount(proposal.id, 'client');

    return NextResponse.json({
      success: true,
      data: {
        notes,
        unread_count: unreadCount,
      },
    });
  }
);

/**
 * POST /api/my-trip/[token]/notes
 * Create a new note from the client. Sends email notification to staff.
 */
export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { token } = await context.params;

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) {
      throw new NotFoundError('Trip not found');
    }

    const body = await request.json();

    const parseResult = ClientNoteSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const note = await proposalNotesService.createNote(proposal.id, {
      ...parseResult.data,
      author_type: 'client',
    });

    // Send email notification to staff (fire and forget)
    const staffEmail = process.env.STAFF_NOTIFICATION_EMAIL || 'info@wallawalla.travel';
    sendEmail({
      to: staffEmail,
      subject: `New note on trip proposal ${proposal.proposal_number}`,
      html: `
        <h2>New Client Note</h2>
        <p><strong>Proposal:</strong> ${proposal.proposal_number}</p>
        <p><strong>From:</strong> ${parseResult.data.author_name}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="border-left: 3px solid #6366f1; padding-left: 12px; color: #374151;">
          ${parseResult.data.content}
        </blockquote>
        <p style="color: #6b7280; font-size: 14px;">
          Log in to the admin dashboard to respond.
        </p>
      `,
      text: `New note on proposal ${proposal.proposal_number} from ${parseResult.data.author_name}: ${parseResult.data.content}`,
    }).catch(() => {
      // Email failure should not fail the API request
    });

    return NextResponse.json(
      {
        success: true,
        data: note,
        message: 'Note created successfully',
      },
      { status: 201 }
    );
  }
);
