/**
 * AI Extractor
 *
 * Sends parsed file content to Claude for structured data extraction.
 * Returns a SmartImportResult with proposal, days, guests, and inclusions.
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import type { ParsedFile, SmartImportResult } from './types';
import {
  TRIP_TYPES,
  STOP_TYPES,
  INCLUSION_TYPES,
  PRICING_TYPES,
} from '@/lib/types/trip-proposal';

const MODEL = process.env.SMART_IMPORT_MODEL ?? 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

// ============================================================================
// Zod schema for validating AI response
// ============================================================================

const StopSchema = z.object({
  stop_type: z.string().default('custom'),
  venue_name: z.string().optional(),
  custom_name: z.string().optional(),
  custom_address: z.string().optional(),
  scheduled_time: z.string().optional(),
  duration_minutes: z.number().optional(),
  client_notes: z.string().optional(),
  cost_note: z.string().optional(),
}).passthrough();

const DaySchema = z.object({
  date: z.string().optional(),
  title: z.string().optional(),
  stops: z.array(StopSchema).default([]),
}).passthrough();

const GuestSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  dietary_restrictions: z.string().optional(),
  is_primary: z.boolean().optional(),
}).passthrough();

const InclusionSchema = z.object({
  inclusion_type: z.string().default('custom'),
  description: z.string(),
  pricing_type: z.string().optional(),
  unit_price: z.number().optional(),
  quantity: z.number().optional(),
}).passthrough();

const SmartImportResponseSchema = z.object({
  confidence: z.number().default(0),
  proposal: z.object({
    customer_name: z.string().optional(),
    customer_email: z.string().optional(),
    customer_phone: z.string().optional(),
    customer_company: z.string().optional(),
    trip_type: z.string().optional(),
    party_size: z.number().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    introduction: z.string().optional(),
    internal_notes: z.string().optional(),
  }).default({}),
  days: z.array(DaySchema).default([]),
  guests: z.array(GuestSchema).default([]),
  inclusions: z.array(InclusionSchema).default([]),
  extraction_notes: z.string().default(''),
}).passthrough();

// ============================================================================
// Prompt builders
// ============================================================================

function buildSystemPrompt(venueNames: string[]): string {
  return `You are a data extraction assistant for a Walla Walla wine country travel planning company. Your job is to extract structured trip proposal data from uploaded documents.

## EXTRACTION RULES
- Extract ONLY what is explicitly stated in the documents. Never hallucinate or infer data that isn't present.
- If a field is not mentioned, omit it (don't set it to null or empty).
- For dates, output in YYYY-MM-DD format.
- For times, output in HH:MM 24-hour format.
- For phone numbers, include as-is from the document.
- Set confidence to a number 0-1 reflecting how complete and clear the extracted data is.

## VALID ENUM VALUES
- trip_type: ${JSON.stringify(TRIP_TYPES)}
- stop_type: ${JSON.stringify(STOP_TYPES)}
- inclusion_type: ${JSON.stringify(INCLUSION_TYPES)}
- pricing_type: ${JSON.stringify(PRICING_TYPES)}

## KNOWN VENUES
These venue names exist in our database. Use exact names when you see a match:
${venueNames.length > 0 ? venueNames.map(n => `- ${n}`).join('\n') : '(No venues loaded)'}

## BUSINESS CONTEXT
- This is a Walla Walla, WA wine tour company
- Typical tours visit 2-3 wineries per day
- Common stops: pickup, winery, restaurant, hotel_checkin, hotel_checkout, dropoff, activity, custom
- Service line items (inclusions) cover transportation, chauffeur, planning fees, arranged tastings
- Tasting fees at wineries are typically NOT included in tour pricing

## OUTPUT FORMAT
Return ONLY a valid JSON object matching this schema (no markdown, no explanation):

{
  "confidence": 0.85,
  "proposal": {
    "customer_name": "string",
    "customer_email": "string",
    "customer_phone": "string",
    "customer_company": "string",
    "trip_type": "wine_tour",
    "party_size": 6,
    "start_date": "2026-06-15",
    "end_date": "2026-06-17",
    "introduction": "string",
    "internal_notes": "string"
  },
  "days": [
    {
      "date": "2026-06-15",
      "title": "Day 1 - Wine Tour",
      "stops": [
        {
          "stop_type": "winery",
          "venue_name": "Leonetti Cellar",
          "custom_name": "string (for custom/activity/pickup/dropoff)",
          "custom_address": "string",
          "scheduled_time": "10:00",
          "duration_minutes": 60,
          "client_notes": "string",
          "cost_note": "string (e.g. Tasting fee ~$25/pp)"
        }
      ]
    }
  ],
  "guests": [
    {
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "509-555-0123",
      "dietary_restrictions": "vegetarian",
      "is_primary": true
    }
  ],
  "inclusions": [
    {
      "inclusion_type": "transportation",
      "description": "Wine Country Tour",
      "pricing_type": "per_day",
      "unit_price": 800,
      "quantity": 3
    }
  ],
  "extraction_notes": "Any ambiguities, assumptions, or things the admin should verify"
}`;
}

function buildUserContent(
  parsedFiles: ParsedFile[]
): Anthropic.MessageParam['content'] {
  const contentBlocks: Anthropic.ContentBlockParam[] = [];

  for (const file of parsedFiles) {
    if (file.status === 'error') continue;

    // Add text content
    if (file.textContent) {
      contentBlocks.push({
        type: 'text',
        text: `=== File: ${file.filename} ===\n${file.textContent}`,
      });
    }

    // Add image content for Claude Vision
    if (file.imageContent) {
      for (const img of file.imageContent) {
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType,
            data: img.base64,
          },
        });
      }
    }
  }

  if (contentBlocks.length === 0) {
    contentBlocks.push({
      type: 'text',
      text: 'No content could be extracted from the uploaded files.',
    });
  }

  // Final instruction
  contentBlocks.push({
    type: 'text',
    text: '\nExtract all trip proposal data from the above documents. Return only valid JSON.',
  });

  return contentBlocks;
}

// ============================================================================
// Helpers
// ============================================================================

/** Clamp a number to [0, 1] range */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Extract and validate JSON from an AI response string */
function parseAiJson(text: string): SmartImportResult {
  const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
  const raw = JSON.parse(cleanJson);
  const validated = SmartImportResponseSchema.parse(raw);

  // Clamp confidence values
  validated.confidence = clamp01(validated.confidence);

  return validated as unknown as SmartImportResult;
}

// ============================================================================
// Main extraction function
// ============================================================================

export async function extractProposalData(
  parsedFiles: ParsedFile[],
  venueNames: string[]
): Promise<SmartImportResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = buildSystemPrompt(venueNames);
  const userContent = buildUserContent(parsedFiles);

  logger.info('Smart Import: calling Claude for extraction', {
    fileCount: parsedFiles.filter(f => f.status === 'success').length,
    venueCount: venueNames.length,
  });

  const response = await client.messages.create({
    model: MODEL,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
    max_tokens: MAX_TOKENS,
  });

  const responseText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  let result: SmartImportResult;

  try {
    result = parseAiJson(responseText);
  } catch {
    // Retry with stricter prompt
    logger.warn('Smart Import: first extraction returned invalid JSON, retrying');

    try {
      const retryResponse = await client.messages.create({
        model: MODEL,
        system: systemPrompt + '\n\nCRITICAL: Return ONLY a raw JSON object. No markdown. No explanation. No code fences.',
        messages: [
          { role: 'user', content: userContent },
          {
            role: 'user',
            content: 'The previous attempt did not produce valid JSON. Please return ONLY the JSON object, nothing else.',
          },
        ],
        max_tokens: MAX_TOKENS,
      });

      const retryText = retryResponse.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      result = parseAiJson(retryText);
    } catch {
      throw new Error('AI returned unstructured response after two attempts. Try uploading clearer documents.');
    }
  }

  // Add source file info
  result.source_files = parsedFiles.map(f => ({
    filename: f.filename,
    type: f.mimeType,
    status: f.status === 'success' ? 'parsed' as const : 'error' as const,
    error: f.error,
  }));

  logger.info('Smart Import: extraction complete', {
    confidence: result.confidence,
    daysFound: result.days.length,
    guestsFound: result.guests.length,
    inclusionsFound: result.inclusions.length,
  });

  return result;
}
