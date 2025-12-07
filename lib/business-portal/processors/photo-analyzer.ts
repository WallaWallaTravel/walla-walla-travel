/**
 * Photo Analyzer
 * Uses GPT-4o Vision to analyze and describe photos
 */

import { query } from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
 * Analyze a photo using GPT-4o Vision
 */
export async function analyzePhoto(imageData: string): Promise<PhotoAnalysis> {
  console.log('[Photo Analyzer] Analyzing photo...');

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  try {
    const systemPrompt = `You are a professional photo analyst for a wine country business directory.
Analyze photos of wineries, restaurants, and venues to extract useful information.

Provide:
1. A detailed description (2-3 sentences)
2. Relevant tags (10-15 keywords)
3. Detected elements (categorized)
4. Suggested category for organization
5. Quality assessment
6. Whether it's suitable for public directory

Be objective and descriptive. Focus on what would help visitors understand the venue.`;

    const userPrompt = `Analyze this photo from a Walla Walla Valley winery/restaurant.

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            {
              type: 'image_url',
              image_url: {
                url: imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`
              }
            }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const resultJson = completion.choices[0].message.content;
    
    if (!resultJson) {
      throw new Error('No analysis result from GPT-4o Vision');
    }

    const analysis: PhotoAnalysis = JSON.parse(resultJson);
    
    console.log('[Photo Analyzer] Analysis complete:', analysis.suggestedCategory, '-', analysis.quality);
    
    return analysis;

  } catch (error: any) {
    console.error('[Photo Analyzer] Error:', error);
    throw error;
  }
}

/**
 * Process a photo file from the database
 */
export async function processPhotoFile(fileId: number): Promise<PhotoAnalysis> {
  console.log('[Photo Analyzer] Processing photo file:', fileId);

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

  console.log('[Photo Analyzer] Updated file with analysis');

  return analysis;
}

/**
 * Batch analyze multiple photos
 */
export async function batchAnalyzePhotos(fileIds: number[]): Promise<Map<number, PhotoAnalysis>> {
  console.log('[Photo Analyzer] Batch analyzing', fileIds.length, 'photos');

  const results = new Map<number, PhotoAnalysis>();

  for (const fileId of fileIds) {
    try {
      const analysis = await processPhotoFile(fileId);
      results.set(fileId, analysis);
    } catch (error: any) {
      console.error(`[Photo Analyzer] Failed to analyze file ${fileId}:`, error.message);
      // Continue with other files
    }
  }

  return results;
}

/**
 * Estimate cost for photo analysis
 */
export function estimatePhotoAnalysisCost(): number {
  // GPT-4o Vision pricing: ~$2.50 per 1M input tokens (images count as ~85 tokens)
  // Plus text tokens for prompt/response
  // Average: ~300 input tokens, ~200 output tokens per image
  const inputCost = (300 / 1000000) * 2.50;
  const outputCost = (200 / 1000000) * 10.00;
  
  return inputCost + outputCost; // ~$0.002 per image
}

