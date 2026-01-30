/**
 * Simple Chat API
 *
 * POST /api/chat - Send a message and get AI response
 *
 * This is a lightweight endpoint for testing the AI personality
 * without requiring session persistence.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { anthropicChatService, ChatMessage, TripTags } from '@/lib/services/anthropic-chat.service';
import { partnerContextService } from '@/lib/services/partner-context.service';

// ============================================================================
// Request Schema
// ============================================================================

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
  // Trip context from input chips - helps AI make smart recommendations
  tripContext: z.object({
    partySize: z.number().optional(),
    dates: z.string().optional(),
    occasion: z.string().optional(),
    pace: z.string().optional(),
    winePreferences: z.array(z.string()).optional(),
  }).optional(),
});

// ============================================================================
// POST Handler
// ============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  // Validate request
  const parseResult = ChatRequestSchema.safeParse(body);
  if (!parseResult.success) {
    throw new BadRequestError('Invalid request: ' + parseResult.error.issues.map(i => i.message).join(', '));
  }

  const { message, conversationHistory, tripContext } = parseResult.data;

  // Fetch real partner data from database, filtered by trip context
  // This gives the AI access to actual partner hours, capacity, insider tips, etc.
  const partnerContext = await partnerContextService.getRelevantPartners(tripContext);

  // Get AI response with trip context AND real partner data
  const response = await anthropicChatService.chat(
    message,
    conversationHistory as ChatMessage[],
    {
      tripState: tripContext,
      partnerContext, // NEW: Real data from database
    }
  );

  // Build full conversation including new messages for tag extraction
  const fullConversation: ChatMessage[] = [
    ...conversationHistory as ChatMessage[],
    { role: 'user' as const, content: message },
    { role: 'assistant' as const, content: response.text },
  ];

  // Extract trip tags from conversation (runs in parallel but we await it)
  let tags: TripTags = {};
  if (fullConversation.length >= 2) {
    // Only extract tags after at least one exchange
    tags = await anthropicChatService.extractTags(fullConversation);
  }

  return NextResponse.json({
    success: true,
    data: {
      message: response.text,
      sources: response.sources,
      tags,
    },
  });
});
