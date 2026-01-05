/**
 * Interview Question Service
 * Manages questions, voice/text responses, and AI extraction
 */

import { query } from '@/lib/db';

export interface InterviewQuestion {
  id: number;
  business_type: string;
  question_number: number;
  question_text: string;
  help_text?: string;
  expected_duration_seconds: number;
  required: boolean;
  category: string;
  ai_extraction_prompt?: string;
}

export interface VoiceEntry {
  id: number;
  business_id: number;
  question_id: number;
  question_number: number;
  audio_url?: string;
  transcription?: string;
  extracted_data?: Record<string, unknown>;
  approved: boolean;
}

export interface TextEntry {
  id: number;
  business_id: number;
  question_id: number;
  response_text: string;
  extracted_data?: Record<string, unknown>;
  approved: boolean;
}

/**
 * Get questions for a business type
 */
export async function getQuestionsForBusiness(
  businessType: string
): Promise<InterviewQuestion[]> {
  const result = await query(`
    SELECT * FROM interview_questions
    WHERE (business_type = $1 OR business_type = 'all')
    AND active = true
    ORDER BY question_number
  `, [businessType]);
  
  return result.rows;
}

/**
 * Get business progress on questions
 */
export async function getBusinessQuestionProgress(
  businessId: number
): Promise<{
  questions: InterviewQuestion[];
  voiceAnswers: Map<number, VoiceEntry>;
  textAnswers: Map<number, TextEntry>;
}> {
  // Get business type
  const bizResult = await query(
    'SELECT business_type FROM businesses WHERE id = $1',
    [businessId]
  );
  
  if (bizResult.rows.length === 0) {
    throw new Error('Business not found');
  }
  
  const businessType = bizResult.rows[0].business_type;
  
  // Get questions
  const questions = await getQuestionsForBusiness(businessType);
  
  // Get voice answers
  const voiceResult = await query(
    'SELECT * FROM business_voice_entries WHERE business_id = $1',
    [businessId]
  );
  const voiceAnswers = new Map<number, VoiceEntry>();
  voiceResult.rows.forEach(row => {
    voiceAnswers.set(row.question_id, row);
  });
  
  // Get text answers
  const textResult = await query(
    'SELECT * FROM business_text_entries WHERE business_id = $1',
    [businessId]
  );
  const textAnswers = new Map<number, TextEntry>();
  textResult.rows.forEach(row => {
    textAnswers.set(row.question_id, row);
  });
  
  return {
    questions,
    voiceAnswers,
    textAnswers
  };
}

/**
 * Save voice response
 */
export async function saveVoiceResponse(data: {
  businessId: number;
  questionId: number;
  questionNumber: number;
  questionText: string;
  audioUrl: string;
  audioDurationSeconds: number;
  audioSizeBytes: number;
}): Promise<number> {
  const result = await query(`
    INSERT INTO business_voice_entries (
      business_id,
      question_id,
      question_number,
      question_text,
      audio_url,
      audio_duration_seconds,
      audio_size_bytes,
      transcription_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    RETURNING id
  `, [
    data.businessId,
    data.questionId,
    data.questionNumber,
    data.questionText,
    data.audioUrl,
    data.audioDurationSeconds,
    data.audioSizeBytes
  ]);
  
  return result.rows[0].id;
}

/**
 * Update voice entry with transcription
 */
export async function updateVoiceTranscription(
  entryId: number,
  transcription: string,
  confidence: number
): Promise<void> {
  await query(`
    UPDATE business_voice_entries
    SET 
      transcription = $2,
      transcription_confidence = $3,
      transcribed_at = NOW(),
      extraction_status = 'pending'
    WHERE id = $1
  `, [entryId, transcription, confidence]);
}

/**
 * Update voice entry with extracted data
 */
export async function updateVoiceExtraction(
  entryId: number,
  extractedData: Record<string, unknown>
): Promise<void> {
  await query(`
    UPDATE business_voice_entries
    SET 
      extracted_data = $2,
      extraction_status = 'completed',
      extracted_at = NOW()
    WHERE id = $1
  `, [entryId, JSON.stringify(extractedData)]);
}

/**
 * Save text response
 */
export async function saveTextResponse(data: {
  businessId: number;
  questionId: number;
  questionNumber: number;
  questionText: string;
  responseText: string;
}): Promise<number> {
  const result = await query(`
    INSERT INTO business_text_entries (
      business_id,
      question_id,
      question_number,
      question_text,
      response_text,
      extraction_status
    )
    VALUES ($1, $2, $3, $4, $5, 'pending')
    RETURNING id
  `, [
    data.businessId,
    data.questionId,
    data.questionNumber,
    data.questionText,
    data.responseText
  ]);
  
  return result.rows[0].id;
}

/**
 * Update text entry with extracted data
 */
export async function updateTextExtraction(
  entryId: number,
  extractedData: Record<string, unknown>
): Promise<void> {
  await query(`
    UPDATE business_text_entries
    SET 
      extracted_data = $2,
      extraction_status = 'completed',
      extracted_at = NOW()
    WHERE id = $1
  `, [entryId, JSON.stringify(extractedData)]);
}

/**
 * Get next unanswered question for a business
 */
export async function getNextQuestion(
  businessId: number
): Promise<InterviewQuestion | null> {
  const { questions, voiceAnswers, textAnswers } = await getBusinessQuestionProgress(businessId);
  
  // Find first unanswered question
  for (const question of questions) {
    const hasVoice = voiceAnswers.has(question.id);
    const hasText = textAnswers.has(question.id);
    
    if (!hasVoice && !hasText) {
      return question;
    }
  }
  
  return null; // All questions answered
}

/**
 * Delete a response (allow re-recording)
 */
export async function deleteVoiceResponse(entryId: number): Promise<void> {
  await query('DELETE FROM business_voice_entries WHERE id = $1', [entryId]);
}

export async function deleteTextResponse(entryId: number): Promise<void> {
  await query('DELETE FROM business_text_entries WHERE id = $1', [entryId]);
}

/**
 * Get all responses for a business (for review)
 */
export async function getAllBusinessResponses(businessId: number): Promise<{
  voice: VoiceEntry[];
  text: TextEntry[];
}> {
  const voiceResult = await query(
    'SELECT * FROM business_voice_entries WHERE business_id = $1 ORDER BY question_number',
    [businessId]
  );
  
  const textResult = await query(
    'SELECT * FROM business_text_entries WHERE business_id = $1 ORDER BY question_number',
    [businessId]
  );
  
  return {
    voice: voiceResult.rows,
    text: textResult.rows
  };
}

