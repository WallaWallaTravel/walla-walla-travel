/**
 * Chat Session API
 *
 * GET /api/chat/session?visitor_id=xxx - Get or resume session
 * POST /api/chat/session - Create new session or add message
 * PUT /api/chat/session - Update trip state
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { chatSessionService } from '@/lib/services/chat-session.service';

// ============================================================================
// Request Schemas
// ============================================================================

// Schema available for future validation if needed
const _GetSessionSchema = z.object({
  visitor_id: z.string().min(1, 'Visitor ID is required'),
});

const AddMessageSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'Message content is required'),
  sources: z.array(z.string()).optional(),
});

const UpdateTripStateSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  partySize: z.number().optional(),
  dates: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  occasion: z.string().optional(),
  pace: z.string().optional(),
  winePreferences: z.array(z.string()).optional(),
});

// ============================================================================
// GET Handler - Get or resume session
// ============================================================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const visitorId = searchParams.get('visitor_id');

  if (!visitorId) {
    throw new BadRequestError('visitor_id query parameter is required');
  }

  // Get or create session
  const { session, messages, tripState } = await chatSessionService.getOrCreateSession(visitorId);

  // Check if returning visitor
  const returningInfo = await chatSessionService.isReturningVisitor(visitorId);

  return NextResponse.json({
    success: true,
    data: {
      session: {
        id: session.id,
        visitor_id: session.visitor_id,
        started_at: session.started_at,
        last_message_at: session.last_message_at,
        message_count: session.message_count,
      },
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      })),
      tripState: tripState ? {
        partySize: tripState.party_size,
        dates: tripState.date_flexibility || (tripState.start_date && tripState.end_date
          ? `${tripState.start_date} - ${tripState.end_date}`
          : null),
        occasion: tripState.special_occasion,
        pace: (tripState.preferences as Record<string, unknown>)?.pace as string | undefined,
        winePreferences: (tripState.preferences as Record<string, unknown>)?.winePreferences as string[] | undefined,
        selections: tripState.selections,
      } : null,
      isReturningVisitor: returningInfo.isReturning,
      previousContext: returningInfo.lastTripContext,
    },
  });
});

// ============================================================================
// POST Handler - Add message to session
// ============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  const parseResult = AddMessageSchema.safeParse(body);
  if (!parseResult.success) {
    throw new BadRequestError('Invalid request: ' + parseResult.error.issues.map(i => i.message).join(', '));
  }

  const { session_id, role, content, sources } = parseResult.data;

  // Verify session exists
  const session = await chatSessionService.getSessionById(session_id);
  if (!session) {
    throw new BadRequestError('Session not found');
  }

  // Add message
  const message = await chatSessionService.addMessage(
    session_id,
    role,
    content,
    sources
  );

  return NextResponse.json({
    success: true,
    data: {
      message: {
        id: message.id,
        role: message.role,
        content: message.content,
        created_at: message.created_at,
      },
    },
  });
});

// ============================================================================
// PUT Handler - Update trip state
// ============================================================================

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  const parseResult = UpdateTripStateSchema.safeParse(body);
  if (!parseResult.success) {
    throw new BadRequestError('Invalid request: ' + parseResult.error.issues.map(i => i.message).join(', '));
  }

  const { session_id, ...updates } = parseResult.data;

  // Verify session exists
  const session = await chatSessionService.getSessionById(session_id);
  if (!session) {
    throw new BadRequestError('Session not found');
  }

  // Update trip state
  const tripState = await chatSessionService.updateTripState(session_id, updates);

  return NextResponse.json({
    success: true,
    data: {
      tripState: tripState ? {
        partySize: tripState.party_size,
        occasion: tripState.special_occasion,
        pace: (tripState.preferences as Record<string, unknown>)?.pace as string | undefined,
      } : null,
    },
  });
});
