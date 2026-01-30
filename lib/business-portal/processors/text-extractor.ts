/**
 * Text Data Extractor
 * Uses Gemini to extract structured data from text responses
 */

import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new GoogleGenerativeAI(apiKey);
}

export interface ExtractedData {
  [key: string]: unknown;
}

/**
 * Extract structured data from text using Gemini
 */
export async function extractDataFromText(
  text: string,
  questionText: string,
  questionCategory: string,
  extractionPrompt?: string
): Promise<ExtractedData> {
  logger.debug('Text Extractor: Extracting data from text');

  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1, // Low temperature for factual extraction
        responseMimeType: 'application/json',
      },
    });

    const prompt = `You are a data extraction specialist for a wine country business directory.
Extract structured, factual information from business owners' responses to questions.

Extract relevant data points such as:
- Years/dates (founding year, experience)
- Numbers (capacity, prices, duration)
- Lists (wine varieties, features, amenities)
- Categories (types, styles, best for)
- Policies (reservations, food, accessibility)
- Contact info (phone, email, booking methods)

Return ONLY valid JSON. If information is not present, omit the field.

Question Category: ${questionCategory}
Question: ${questionText}
${extractionPrompt ? `\nExtraction Guide: ${extractionPrompt}` : ''}

Business Owner's Answer:
"${text}"

Extract all relevant factual data as JSON. Be precise and avoid assumptions.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const extractedJson = response.text();

    if (!extractedJson) {
      throw new Error('No extraction result from Gemini');
    }

    const extracted = JSON.parse(extractedJson);

    logger.debug('Text Extractor: Extracted data', { fieldCount: Object.keys(extracted).length });

    return extracted;

  } catch (error) {
    logger.error('Text Extractor: Error', { error });
    throw error;
  }
}

/**
 * Process a text entry from the database
 */
export async function processTextEntry(textEntryId: number): Promise<ExtractedData> {
  logger.debug('Text Extractor: Processing text entry', { textEntryId });

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

  logger.debug('Text Extractor: Updated text entry with extracted data', { textEntryId });

  return extracted;
}

/**
 * Process a voice transcription (same logic as text)
 */
export async function processVoiceTranscription(voiceEntryId: number): Promise<ExtractedData> {
  logger.debug('Text Extractor: Processing voice transcription', { voiceEntryId });

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

  logger.debug('Text Extractor: Updated voice entry with extracted data', { voiceEntryId });

  return extracted;
}

/**
 * Estimate cost for extraction
 */
export function estimateExtractionCost(textLength: number): number {
  // Gemini 1.5 Flash pricing: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
  // Estimate ~1 token per 4 characters for input
  // System prompt ~200 tokens, output ~100-300 tokens
  const inputTokens = 200 + (textLength / 4);
  const outputTokens = 200; // Average

  const inputCost = (inputTokens / 1000000) * 0.075;
  const outputCost = (outputTokens / 1000000) * 0.30;

  return inputCost + outputCost; // Much cheaper than GPT-4o
}

