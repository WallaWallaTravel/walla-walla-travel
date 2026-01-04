/**
 * Business Portal Questions
 * Get interview questions and progress for a business
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  getBusinessQuestionProgress,
  getNextQuestion
} from '@/lib/business-portal/question-service';
import { getBusinessStats } from '@/lib/business-portal/business-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/business-portal/questions?businessId=123
 * Get questions and progress for a business
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }
    
    const bizId = parseInt(businessId);
    
    // Get questions and existing answers
    const progress = await getBusinessQuestionProgress(bizId);
    
    // Get stats
    const stats = await getBusinessStats(bizId);
    
    // Get next unanswered question
    const nextQuestion = await getNextQuestion(bizId);
    
    // Format response
    const questionsWithStatus = progress.questions.map(q => {
      const hasVoice = progress.voiceAnswers.has(q.id);
      const hasText = progress.textAnswers.has(q.id);
      const voiceEntry = hasVoice ? progress.voiceAnswers.get(q.id) : null;
      const textEntry = hasText ? progress.textAnswers.get(q.id) : null;
      
      return {
        ...q,
        answered: hasVoice || hasText,
        answer_type: hasVoice ? 'voice' : hasText ? 'text' : null,
        answer_text: textEntry?.response_text || voiceEntry?.transcription || null,
        voice_entry: voiceEntry,
        text_entry: textEntry
      };
    });
    
    return NextResponse.json({
      success: true,
      questions: questionsWithStatus,
      stats,
      nextQuestion,
      allComplete: nextQuestion === null
    });
    
  } catch (error) {
    logger.error('Business Portal Questions error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get questions', details: message },
      { status: 500 }
    );
  }
}

