/**
 * Admin Trip Proposal Notes API Routes
 * GET  /api/admin/trip-proposals/[id]/notes - Get notes for the proposal
 * POST /api/admin/trip-proposals/[id]/notes - Create a new staff note
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { proposalNotesService } from '@/lib/services/proposal-notes.service';
import { StaffNoteSchema } from '@/lib/types/proposal-notes';
import type { NoteContextType } from '@/lib/types/proposal-notes';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/trip-proposals/[id]/notes
 * Returns all notes for the proposal. Marks client notes as read
 * (since staff is viewing). Accepts optional query filters.
 */
export const GET = withAdminAuth(async (request: NextRequest, session, context) => {
  const { id } = await (context as unknown as RouteParams).params;
  const proposalId = parseInt(id, 10);

  if (isNaN(proposalId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid proposal ID' },
      { status: 400 }
    );
  }

  // Parse optional query filters
  const url = new URL(request.url);
  const contextType = url.searchParams.get('context_type') as NoteContextType | null;
  const contextIdRaw = url.searchParams.get('context_id');
  const contextId = contextIdRaw ? parseInt(contextIdRaw, 10) : undefined;

  const notes = await proposalNotesService.getNotes({
    trip_proposal_id: proposalId,
    context_type: contextType || undefined,
    context_id: contextId,
  });

  // Mark client notes as read since staff is viewing
  await proposalNotesService.markAsRead(proposalId, 'client');

  // Get unread count of staff notes (notes from staff that client hasn't read)
  const unreadCount = await proposalNotesService.getUnreadCount(proposalId, 'staff');

  return NextResponse.json({
    success: true,
    data: {
      notes,
      unread_count: unreadCount,
    },
  });
});

/**
 * POST /api/admin/trip-proposals/[id]/notes
 * Create a new note from staff.
 */
export const POST = withAdminAuth(async (request: NextRequest, session, context) => {
  const { id } = await (context as unknown as RouteParams).params;
  const proposalId = parseInt(id, 10);

  if (isNaN(proposalId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid proposal ID' },
      { status: 400 }
    );
  }

  const body = await request.json();

  const parseResult = StaffNoteSchema.safeParse(body);
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

  const note = await proposalNotesService.createNote(proposalId, {
    ...parseResult.data,
    author_type: 'staff',
  });

  return NextResponse.json(
    {
      success: true,
      data: note,
      message: 'Note created successfully',
    },
    { status: 201 }
  );
});
