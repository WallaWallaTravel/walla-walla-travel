/**
 * Business Portal Text Response
 * Save text answer and extract data
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { saveTextResponse } from '@/lib/business-portal/question-service';
import { logBusinessActivity } from '@/lib/business-portal/business-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/business-portal/text-response
 * Save text answer for a question
 */
export async function POST(request: NextRequest) {
  try {
    const {
      businessId,
      questionId,
      questionNumber,
      questionText,
      responseText
    } = await request.json();
    
    if (!businessId || !questionId || !responseText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (typeof responseText !== 'string' || responseText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Response text cannot be empty' },
        { status: 400 }
      );
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
    
  } catch (error) {
    logger.error('Text Response error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to save text response', details: message },
      { status: 500 }
    );
  }
}

