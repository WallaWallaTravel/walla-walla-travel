/**
 * Photo Analyzer
 * Uses Gemini Vision to analyze and describe photos
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

export interface PhotoAnalysis {
  description: string;
  tags: string[];
  detectedElements: {
    venue?: string[];      // indoor, outdoor, tasting room, barrel room, patio
    wines?: string[];      // bottles, labels, glasses, barrels
    people?: boolean;      // guests, staff
    food?: string[];       // food items, dining
    ambiance?: string[];   // rustic, modern, elegant, casual
    features?: string[];   // views, fireplace, art, furniture
  };
  suggestedCategory: string; // venue_photos, wine_photos, menu, event, etc.
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  usableForDirectory: boolean;
}

/**
 * Analyze a photo using Gemini Vision
 */
export async function analyzePhoto(imageData: string): Promise<PhotoAnalysis> {
  logger.debug('Photo Analyzer: Analyzing photo');

  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `You are a professional photo analyst for a wine country business directory.
Analyze photos of wineries, restaurants, and venues to extract useful information.

Provide:
1. A detailed description (2-3 sentences)
2. Relevant tags (10-15 keywords)
3. Detected elements (categorized)
4. Suggested category for organization
5. Quality assessment
6. Whether it's suitable for public directory

Be objective and descriptive. Focus on what would help visitors understand the venue.

Analyze this photo from a Walla Walla Valley winery/restaurant.

Return JSON with this structure:
{
  "description": "detailed 2-3 sentence description",
  "tags": ["tag1", "tag2", ...],
  "detectedElements": {
    "venue": ["indoor", "outdoor", etc],
    "wines": ["bottles", "labels", etc],
    "people": true/false,
    "food": ["items if visible"],
    "ambiance": ["rustic", "modern", etc],
    "features": ["views", "fireplace", etc]
  },
  "suggestedCategory": "venue_photos | wine_photos | menu | event | staff | exterior | interior",
  "quality": "excellent | good | fair | poor",
  "usableForDirectory": true/false
}`;

    // Prepare image data for Gemini
    let base64Data: string;
    let mimeType: string;

    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      } else {
        mimeType = 'image/jpeg';
        base64Data = imageData;
      }
    } else {
      mimeType = 'image/jpeg';
      base64Data = imageData;
    }

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);

    const response = result.response;
    const resultJson = response.text();

    if (!resultJson) {
      throw new Error('No analysis result from Gemini Vision');
    }

    const analysis: PhotoAnalysis = JSON.parse(resultJson);

    logger.debug('Photo Analyzer: Analysis complete', { category: analysis.suggestedCategory, quality: analysis.quality });

    return analysis;

  } catch (error) {
    logger.error('Photo Analyzer: Error', { error });
    throw error;
  }
}

/**
 * Process a photo file from the database
 */
export async function processPhotoFile(fileId: number): Promise<PhotoAnalysis> {
  logger.debug('Photo Analyzer: Processing photo file', { fileId });

  // Get the file
  const result = await query(
    'SELECT storage_url, original_filename, file_type, mime_type FROM business_files WHERE id = $1',
    [fileId]
  );

  if (result.rows.length === 0) {
    throw new Error(`File ${fileId} not found`);
  }

  const file = result.rows[0];

  // Check if it's an image (file_type is "photo" or mime_type starts with "image/")
  const isImage = file.file_type === 'photo' || (file.mime_type && file.mime_type.startsWith('image/'));
  
  if (!isImage) {
    throw new Error(`File ${fileId} is not an image (type: ${file.file_type}, mime: ${file.mime_type})`);
  }

  if (!file.storage_url) {
    throw new Error(`File ${fileId} has no storage URL`);
  }

  // Analyze the photo
  const analysis = await analyzePhoto(file.storage_url);

  // Update the file with analysis
  await query(`
    UPDATE business_files
    SET 
      ai_description = $2,
      ai_tags = $3,
      category = $4,
      processing_status = 'completed',
      processed_at = NOW()
    WHERE id = $1
  `, [
    fileId,
    analysis.description,
    analysis.tags,
    analysis.suggestedCategory
  ]);

  logger.debug('Photo Analyzer: Updated file with analysis', { fileId });

  return analysis;
}

/**
 * Batch analyze multiple photos
 */
export async function batchAnalyzePhotos(fileIds: number[]): Promise<Map<number, PhotoAnalysis>> {
  logger.debug('Photo Analyzer: Batch analyzing photos', { count: fileIds.length });

  const results = new Map<number, PhotoAnalysis>();

  for (const fileId of fileIds) {
    try {
      const analysis = await processPhotoFile(fileId);
      results.set(fileId, analysis);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Photo Analyzer: Failed to analyze file', { fileId, error: message });
      // Continue with other files
    }
  }

  return results;
}

/**
 * Estimate cost for photo analysis
 */
export function estimatePhotoAnalysisCost(): number {
  // Gemini 1.5 Flash pricing: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
  // Images count as ~258 tokens per image
  // Average: ~500 input tokens, ~200 output tokens per image
  const inputCost = (500 / 1000000) * 0.075;
  const outputCost = (200 / 1000000) * 0.30;

  return inputCost + outputCost; // ~$0.0001 per image (much cheaper than GPT-4o)
}

