import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { geologyAIService } from '@/lib/services/geology-ai.service';
import { GeologyChatMessage } from '@/lib/types/geology';
import { z } from 'zod';
import crypto from 'crypto';

// ============================================================================
// Validation
// ============================================================================

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000),
  sessionId: z.string().min(1).max(64),
  history: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        timestamp: z.string(),
        context: z
          .object({
            topicId: z.number().optional(),
            topicTitle: z.string().optional(),
            siteId: z.number().optional(),
            siteName: z.string().optional(),
          })
          .optional(),
      })
    )
    .optional()
    .default([]),
  contextTopicId: z.number().optional(),
  contextSiteId: z.number().optional(),
});

// ============================================================================
// Helper: Hash IP for privacy
// ============================================================================

function hashIP(ip: string | null): string | undefined {
  if (!ip) return undefined;
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

// ============================================================================
// POST /api/geology/chat - Send a geology question
// ============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  // Validate request
  const validated = chatRequestSchema.parse(body);

  // Get IP hash for rate limiting (if needed later)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0] || request.headers.get('x-real-ip');
  const ipHash = hashIP(ip);

  // Call AI service
  const response = await geologyAIService.chat(
    validated.message,
    validated.history as GeologyChatMessage[],
    validated.contextTopicId
  );

  // Save chat messages to database (fire and forget - don't await)
  Promise.all([
    geologyAIService.saveChatMessage(
      validated.sessionId,
      'user',
      validated.message,
      validated.contextTopicId,
      validated.contextSiteId,
      ipHash
    ),
    geologyAIService.saveChatMessage(
      validated.sessionId,
      'assistant',
      response.message,
      validated.contextTopicId,
      validated.contextSiteId
    ),
  ]).catch(() => {
    // Silently ignore save errors - chat should still work
  });

  return NextResponse.json({
    success: true,
    data: {
      message: response.message,
      suggestedTopics: response.suggestedTopics,
      suggestedSites: response.suggestedSites,
      suggestedTours: response.suggestedTours,
    },
  });
});

// ============================================================================
// GET /api/geology/chat - Get conversation starters
// ============================================================================

export const GET = withErrorHandling(async () => {
  const starters = geologyAIService.getConversationStarters();
  const randomFact = await geologyAIService.getRandomFact();

  return NextResponse.json({
    success: true,
    data: {
      conversationStarters: starters,
      randomFact,
    },
  });
});
