/**
 * Knowledge Base Chat API
 *
 * POST /api/kb/chat - Send a message and get AI response
 * GET /api/kb/chat?session_id=xxx - Get chat history
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, NotFoundError } from '@/lib/api/middleware/error-handler';
import { validateBody, validateQuery } from '@/lib/api/middleware/validation';
import { kbService } from '@/lib/services/kb.service';
import { geminiService, ChatMessage } from '@/lib/services/gemini.service';

// ============================================================================
// Request Schemas
// ============================================================================

const ChatRequestSchema = z.object({
  // Session management
  session_id: z.string().uuid().optional(),
  visitor_id: z.string().optional(),

  // Message
  message: z.string().min(1, 'Message is required'),

  // Optional context overrides
  include_trip_state: z.boolean().default(true),
});

const GetChatQuerySchema = z.object({
  session_id: z.string().uuid(),
});

// ============================================================================
// POST Handler - Send message
// ============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const data = await validateBody(request, ChatRequestSchema);

  // Get or create session
  let session;
  if (data.session_id) {
    session = await kbService.getChatSession(data.session_id);
    if (!session) {
      throw new NotFoundError(`Chat session ${data.session_id} not found`);
    }
  } else {
    session = await kbService.createChatSession(data.visitor_id);
  }

  // Get chat history
  const messages = await kbService.getChatMessages(session.id);
  const history: ChatMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Get trip state for context
  let tripState = null;
  if (data.include_trip_state) {
    tripState = await kbService.getOrCreateTripState(session.id);
  }

  // Search knowledge base for relevant content
  // In production, this would use Gemini File Search
  const relevantContent = await kbService.searchIndexedContent(data.message, 5);
  const kbContext = relevantContent.map((c) => `[${c.title}]: ${c.content_text}`).join('\n\n');

  // Build context for AI
  const context = {
    visitorProfile: session.visitor_profile || undefined,
    tripState: tripState
      ? {
          dates: {
            status: tripState.dates_status,
            startDate: tripState.start_date,
            endDate: tripState.end_date,
          },
          party: {
            size: tripState.party_size,
            type: tripState.party_type,
            specialOccasion: tripState.special_occasion,
          },
          selections: tripState.selections,
          preferences: tripState.preferences,
        }
      : undefined,
  };

  // Enhance message with KB context if available
  let enhancedMessage = data.message;
  if (kbContext) {
    enhancedMessage = `[Knowledge Base Context:\n${kbContext}]\n\nUser: ${data.message}`;
  }

  // Get AI response
  const response = await geminiService.chat(enhancedMessage, history, context);

  // Save user message
  await kbService.createChatMessage({
    session_id: session.id,
    role: 'user',
    content: data.message,
  });

  // Save assistant response
  const assistantMessage = await kbService.createChatMessage({
    session_id: session.id,
    role: 'assistant',
    content: response.text,
    sources_used: response.sources,
    grounding_metadata: response.groundingMetadata,
  });

  // Increment retrieval counts for used content
  for (const content of relevantContent) {
    await kbService.incrementRetrievalCount(content.id);
  }

  // Analyze response for trip state updates
  const stateUpdates = analyzeResponseForStateUpdates(data.message, response.text);
  if (stateUpdates && tripState) {
    await kbService.updateTripState(session.id, stateUpdates);
  }

  // Check for booking intent
  const bookingIntent = detectBookingIntent(data.message, response.text);

  return NextResponse.json({
    success: true,
    data: {
      session_id: session.id,
      message: {
        id: assistantMessage.id,
        role: 'assistant',
        content: response.text,
        sources: response.sources,
        created_at: assistantMessage.created_at,
      },
      trip_state: tripState
        ? {
            selections_count: tripState.selections?.length || 0,
            ready_for_itinerary: tripState.ready_for_itinerary,
            ready_for_deposit: tripState.ready_for_deposit,
          }
        : null,
      booking_intent: bookingIntent,
    },
  });
});

// ============================================================================
// GET Handler - Get chat history
// ============================================================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { session_id } = validateQuery(request, GetChatQuerySchema);

  const session = await kbService.getChatSession(session_id);
  if (!session) {
    throw new NotFoundError(`Chat session ${session_id} not found`);
  }

  const messages = await kbService.getChatMessages(session_id);
  const tripState = await kbService.getOrCreateTripState(session_id);

  return NextResponse.json({
    success: true,
    data: {
      session: {
        id: session.id,
        started_at: session.started_at,
        message_count: session.message_count,
        itinerary_generated: session.itinerary_generated,
      },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources_used,
        created_at: m.created_at,
      })),
      trip_state: {
        dates: {
          status: tripState.dates_status,
          start_date: tripState.start_date,
          end_date: tripState.end_date,
        },
        party: {
          size: tripState.party_size,
          type: tripState.party_type,
          special_occasion: tripState.special_occasion,
        },
        selections: tripState.selections,
        preferences: tripState.preferences,
        ready_for_itinerary: tripState.ready_for_itinerary,
        ready_for_deposit: tripState.ready_for_deposit,
      },
    },
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Analyze conversation for trip state updates
 */
function analyzeResponseForStateUpdates(
  userMessage: string,
  assistantResponse: string
): Record<string, unknown> | null {
  const updates: Record<string, unknown> = {};
  const combined = `${userMessage} ${assistantResponse}`.toLowerCase();

  // Detect date mentions
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/gi,
    /(\d+)\s+(days?|nights?)/gi,
  ];

  for (const pattern of datePatterns) {
    if (pattern.test(combined)) {
      updates.dates_status = 'tentative';
      break;
    }
  }

  // Detect party size
  const partyMatch = combined.match(/(\d+)\s*(people|guests|of us|person)/i);
  if (partyMatch) {
    updates.party_size = parseInt(partyMatch[1]);
  }

  // Detect party type
  if (/couple|wife|husband|partner|anniversary|romantic/i.test(combined)) {
    updates.party_type = 'couple';
  } else if (/family|kids|children/i.test(combined)) {
    updates.party_type = 'family';
  } else if (/friends|group|bachelor|bachelorette/i.test(combined)) {
    updates.party_type = 'friends';
  } else if (/corporate|business|team|company/i.test(combined)) {
    updates.party_type = 'corporate';
  } else if (/solo|alone|myself/i.test(combined)) {
    updates.party_type = 'solo';
  }

  // Detect special occasions
  if (/anniversary/i.test(combined)) {
    updates.special_occasion = 'Anniversary';
  } else if (/birthday/i.test(combined)) {
    updates.special_occasion = 'Birthday';
  } else if (/wedding|engaged|engagement/i.test(combined)) {
    updates.special_occasion = 'Wedding/Engagement';
  } else if (/honeymoon/i.test(combined)) {
    updates.special_occasion = 'Honeymoon';
  }

  // Detect preferences
  const preferences: Record<string, unknown> = {};

  // Wine preferences
  const wineTypes: string[] = [];
  if (/cabernet|cab\s/i.test(combined)) wineTypes.push('Cabernet Sauvignon');
  if (/merlot/i.test(combined)) wineTypes.push('Merlot');
  if (/syrah|shiraz/i.test(combined)) wineTypes.push('Syrah');
  if (/chardonnay/i.test(combined)) wineTypes.push('Chardonnay');
  if (/riesling/i.test(combined)) wineTypes.push('Riesling');
  if (/red wine|reds/i.test(combined)) wineTypes.push('Red wines');
  if (/white wine|whites/i.test(combined)) wineTypes.push('White wines');

  if (wineTypes.length > 0) {
    preferences.wineTypes = wineTypes;
  }

  // Pace preference
  if (/relaxed|leisurely|slow|easy/i.test(combined)) {
    preferences.pacePreference = 'relaxed';
  } else if (/packed|busy|lots|many/i.test(combined)) {
    preferences.pacePreference = 'packed';
  }

  if (Object.keys(preferences).length > 0) {
    updates.preferences = preferences;
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

/**
 * Detect booking intent from conversation
 */
function detectBookingIntent(
  userMessage: string,
  assistantResponse: string
): {
  detected: boolean;
  signals: string[];
  suggestBooking: boolean;
} {
  const combined = `${userMessage} ${assistantResponse}`.toLowerCase();
  const signals: string[] = [];

  // Strong booking signals
  const strongSignals = [
    { pattern: /book|reserve|secure|lock in/i, signal: 'booking_language' },
    { pattern: /how do i|what's next|next step/i, signal: 'next_steps_inquiry' },
    { pattern: /this looks perfect|sounds great|love it/i, signal: 'positive_confirmation' },
    { pattern: /deposit|payment|pay/i, signal: 'payment_discussion' },
  ];

  // Moderate signals
  const moderateSignals = [
    { pattern: /dates? (are|is) \w+ \d+/i, signal: 'specific_dates' },
    { pattern: /we('re| are) planning/i, signal: 'planning_language' },
    { pattern: /itinerary/i, signal: 'itinerary_interest' },
  ];

  for (const { pattern, signal } of strongSignals) {
    if (pattern.test(combined)) {
      signals.push(signal);
    }
  }

  for (const { pattern, signal } of moderateSignals) {
    if (pattern.test(combined)) {
      signals.push(signal);
    }
  }

  const hasStrongSignal = signals.some((s) =>
    ['booking_language', 'next_steps_inquiry', 'payment_discussion'].includes(s)
  );

  return {
    detected: signals.length >= 2 || hasStrongSignal,
    signals,
    suggestBooking: hasStrongSignal,
  };
}

