/**
 * Business Portal Questions
 * Get interview questions and progress for a business
 */

import { NextRequest, NextResponse } from 'next/server';
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
      
      return {
        ...q,
        answered: hasVoice || hasText,
        answer_type: hasVoice ? 'voice' : hasText ? 'text' : null,
        voice_entry: hasVoice ? progress.voiceAnswers.get(q.id) : null,
        text_entry: hasText ? progress.textAnswers.get(q.id) : null
      };
    });
    
    return NextResponse.json({
      success: true,
      questions: questionsWithStatus,
      stats,
      nextQuestion,
      allComplete: nextQuestion === null
    });
    
  } catch (error: any) {
    console.error('[Business Portal Questions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get questions', details: error.message },
      { status: 500 }
    );
  }
}

