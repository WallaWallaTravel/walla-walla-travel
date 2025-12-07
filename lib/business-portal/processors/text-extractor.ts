/**
 * Text Data Extractor
 * Uses GPT-4o to extract structured data from text responses
 */

import { query } from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ExtractedData {
  [key: string]: any;
}

/**
 * Extract structured data from text using GPT-4o
 */
export async function extractDataFromText(
  text: string,
  questionText: string,
  questionCategory: string,
  extractionPrompt?: string
): Promise<ExtractedData> {
  console.log('[Text Extractor] Extracting data from text...');

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  try {
    const systemPrompt = `You are a data extraction specialist for a wine country business directory. 
Extract structured, factual information from business owners' responses to questions.

Extract relevant data points such as:
- Years/dates (founding year, experience)
- Numbers (capacity, prices, duration)
- Lists (wine varieties, features, amenities)
- Categories (types, styles, best for)
- Policies (reservations, food, accessibility)
- Contact info (phone, email, booking methods)

Return ONLY valid JSON. If information is not present, omit the field.`;

    const userPrompt = `Question Category: ${questionCategory}
Question: ${questionText}
${extractionPrompt ? `\nExtraction Guide: ${extractionPrompt}` : ''}

Business Owner's Answer:
"${text}"

Extract all relevant factual data as JSON. Be precise and avoid assumptions.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Low temperature for factual extraction
      response_format: { type: 'json_object' }
    });

    const extractedJson = completion.choices[0].message.content;
    
    if (!extractedJson) {
      throw new Error('No extraction result from GPT-4o');
    }

    const extracted = JSON.parse(extractedJson);
    
    console.log('[Text Extractor] Extracted data:', Object.keys(extracted).length, 'fields');
    
    return extracted;

  } catch (error: any) {
    console.error('[Text Extractor] Error:', error);
    throw error;
  }
}

/**
 * Process a text entry from the database
 */
export async function processTextEntry(textEntryId: number): Promise<ExtractedData> {
  console.log('[Text Extractor] Processing text entry:', textEntryId);

  // Get the text entry and question info
  const result = await query(`
    SELECT 
      te.response_text,
      te.question_text,
      q.category,
      q.ai_extraction_prompt
    FROM business_text_entries te
    LEFT JOIN interview_questions q ON te.question_id = q.id
    WHERE te.id = $1
  `, [textEntryId]);

  if (result.rows.length === 0) {
    throw new Error(`Text entry ${textEntryId} not found`);
  }

  const entry = result.rows[0];

  // Extract data
  const extracted = await extractDataFromText(
    entry.response_text,
    entry.question_text,
    entry.category || 'general',
    entry.ai_extraction_prompt
  );

  // Update the text entry with extracted data
  await query(`
    UPDATE business_text_entries
    SET 
      extracted_data = $2,
      extraction_status = 'completed',
      extracted_at = NOW()
    WHERE id = $1
  `, [textEntryId, JSON.stringify(extracted)]);

  console.log('[Text Extractor] Updated text entry with extracted data');

  return extracted;
}

/**
 * Process a voice transcription (same logic as text)
 */
export async function processVoiceTranscription(voiceEntryId: number): Promise<ExtractedData> {
  console.log('[Text Extractor] Processing voice transcription:', voiceEntryId);

  // Get the voice entry and question info
  const result = await query(`
    SELECT 
      ve.transcription,
      ve.question_text,
      q.category,
      q.ai_extraction_prompt
    FROM business_voice_entries ve
    LEFT JOIN interview_questions q ON ve.question_id = q.id
    WHERE ve.id = $1
  `, [voiceEntryId]);

  if (result.rows.length === 0) {
    throw new Error(`Voice entry ${voiceEntryId} not found`);
  }

  const entry = result.rows[0];

  if (!entry.transcription) {
    throw new Error(`Voice entry ${voiceEntryId} has no transcription yet`);
  }

  // Extract data from transcription
  const extracted = await extractDataFromText(
    entry.transcription,
    entry.question_text,
    entry.category || 'general',
    entry.ai_extraction_prompt
  );

  // Update the voice entry with extracted data
  await query(`
    UPDATE business_voice_entries
    SET 
      extracted_data = $2,
      extraction_status = 'completed',
      extracted_at = NOW()
    WHERE id = $1
  `, [voiceEntryId, JSON.stringify(extracted)]);

  console.log('[Text Extractor] Updated voice entry with extracted data');

  return extracted;
}

/**
 * Estimate cost for extraction
 */
export function estimateExtractionCost(textLength: number): number {
  // GPT-4o pricing: ~$2.50 per 1M input tokens, ~$10 per 1M output tokens
  // Estimate ~1 token per 4 characters for input
  // System prompt ~200 tokens, output ~100-300 tokens
  const inputTokens = 200 + (textLength / 4);
  const outputTokens = 200; // Average
  
  const inputCost = (inputTokens / 1000000) * 2.50;
  const outputCost = (outputTokens / 1000000) * 10.00;
  
  return inputCost + outputCost;
}

