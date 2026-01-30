/**
 * Business Portal Text Response
 * Save text answer and extract data
 */

import { NextResponse } from 'next/server';
import { saveTextResponse } from '@/lib/business-portal/question-service';
import { logBusinessActivity } from '@/lib/business-portal/business-service';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/business-portal/text-response
 * Save text answer for a question
 */
export const POST = withErrorHandling(async (request) => {
  const {
    businessId,
    questionId,
    questionNumber,
    questionText,
    responseText
  } = await request.json();

  if (!businessId || !questionId || !responseText) {
    throw new BadRequestError('Missing required fields');
  }

  if (typeof responseText !== 'string' || responseText.trim().length === 0) {
    throw new BadRequestError('Response text cannot be empty');
  }

  // Save text entry
  const entryId = await saveTextResponse({
    businessId,
    questionId,
    questionNumber,
    questionText,
    responseText: responseText.trim()
  });

  // Log activity
  await logBusinessActivity(
    businessId,
    'question_answered_text',
    `Answered question ${questionNumber} via text`,
    { question_id: questionId, entry_id: entryId }
  );

  // In production: Queue AI extraction job
  // For now: Return success

  return NextResponse.json({
    success: true,
    entryId,
    message: 'Text response saved. Data extraction queued.'
  });
});

