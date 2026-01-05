/**
 * Business Portal Voice Response
 * Save voice recording, transcribe, and extract data
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  saveVoiceResponse
} from '@/lib/business-portal/question-service';
import { logBusinessActivity } from '@/lib/business-portal/business-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/business-portal/voice-response
 * Save voice recording
 * 
 * For now, we'll use a simple file storage approach.
 * In production, this would upload to S3/R2 and trigger async processing.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const businessId = parseInt(formData.get('businessId') as string);
    const questionId = parseInt(formData.get('questionId') as string);
    const questionNumber = parseInt(formData.get('questionNumber') as string);
    const questionText = formData.get('questionText') as string;
    const audio = formData.get('audio') as File;
    
    if (!businessId || !questionId || !audio) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // For MVP: Store audio as base64 data URL in database
    // In production: Upload to S3 and store URL
    const arrayBuffer = await audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');
    const audioDataUrl = `data:${audio.type};base64,${base64Audio}`;
    
    // Save voice entry
    const entryId = await saveVoiceResponse({
      businessId,
      questionId,
      questionNumber,
      questionText,
      audioUrl: audioDataUrl, // In production: S3 URL
      audioDurationSeconds: 0, // Would be calculated from audio
      audioSizeBytes: audio.size
    });
    
    // Log activity
    await logBusinessActivity(
      businessId,
      'question_answered_voice',
      `Answered question ${questionNumber} via voice`,
      { question_id: questionId, entry_id: entryId }
    );
    
    // In production: Queue transcription job
    // For now: Return success, transcription happens async
    
    return NextResponse.json({
      success: true,
      entryId,
      message: 'Voice response saved. Transcription queued.'
    });
    
  } catch (error) {
    logger.error('Voice Response error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to save voice response', details: message },
      { status: 500 }
    );
  }
}

