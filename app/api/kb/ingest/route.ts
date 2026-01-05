/**
 * Knowledge Base Ingestion API
 *
 * POST /api/kb/ingest - Ingest content into the knowledge base
 *
 * Supports:
 * - Text content
 * - Documents (PDF, Word, etc.)
 * - Voice notes (with transcription)
 * - Video (with analysis)
 * - Images (with analysis)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { kbService } from '@/lib/services/kb.service';
import { geminiService } from '@/lib/services/gemini.service';

// ============================================================================
// Request Schema
// ============================================================================

const IngestRequestSchema = z.object({
  business_id: z.number().int().positive(),
  title: z.string().min(1, 'Title is required'),
  content_type: z.enum(['text', 'document', 'voice', 'video', 'image', 'url']),

  // For text content
  content_text: z.string().optional(),

  // For file uploads (base64 encoded)
  file_data: z.string().optional(),
  file_mime_type: z.string().optional(),
  original_filename: z.string().optional(),

  // For URL content
  url: z.string().url().optional(),

  // Metadata
  topics: z.array(z.string()).optional(),
  audience_type: z.enum(['first-time', 'wine-enthusiast', 'family', 'romantic', 'all']).optional(),
  is_evergreen: z.boolean().default(true),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),

  // Optional: Skip AI prescreening
  skip_prescreening: z.boolean().default(false),
});

type _IngestRequest = z.infer<typeof IngestRequestSchema>;

// ============================================================================
// POST Handler
// ============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const data = await validateBody(request, IngestRequestSchema);

  // Validate business exists
  const business = await kbService.getBusinessById(data.business_id);
  if (!business) {
    throw new BadRequestError(`Business with ID ${data.business_id} not found`);
  }

  // Process content based on type
  let processedContent: string | undefined;
  let processingStatus = 'pending';

  switch (data.content_type) {
    case 'text':
      if (!data.content_text) {
        throw new BadRequestError('content_text is required for text content type');
      }
      processedContent = data.content_text;
      processingStatus = 'in_review';
      break;

    case 'voice':
      if (!data.file_data || !data.file_mime_type) {
        throw new BadRequestError('file_data and file_mime_type are required for voice content');
      }
      // Transcribe audio
      const transcription = await geminiService.transcribeAudio(
        data.file_data,
        data.file_mime_type
      );
      processedContent = transcription.text;
      processingStatus = 'in_review';
      break;

    case 'video':
      if (!data.file_data || !data.file_mime_type) {
        throw new BadRequestError('file_data and file_mime_type are required for video content');
      }
      // Analyze video
      const videoAnalysis = await geminiService.analyzeVideo(data.file_data, data.file_mime_type);
      processedContent = videoAnalysis.text;
      processingStatus = 'in_review';
      break;

    case 'image':
      if (!data.file_data || !data.file_mime_type) {
        throw new BadRequestError('file_data and file_mime_type are required for image content');
      }
      // Analyze image
      const imageAnalysis = await geminiService.analyzeImage(data.file_data, data.file_mime_type);
      processedContent = `${imageAnalysis.description}\n\nExtracted Text: ${imageAnalysis.extractedText || 'None'}\n\nTopics: ${imageAnalysis.topics?.join(', ') || 'None'}`;
      processingStatus = 'in_review';

      // Add detected topics
      if (imageAnalysis.topics && !data.topics) {
        data.topics = imageAnalysis.topics;
      }
      break;

    case 'document':
      // For documents, we store the file reference and process later
      // In production, this would upload to Gemini Files API
      processedContent = data.content_text; // May include extracted text
      processingStatus = 'processing';
      break;

    case 'url':
      if (!data.url) {
        throw new BadRequestError('url is required for url content type');
      }
      // URL content would be fetched and processed
      // For now, mark as pending for manual review
      processedContent = `URL: ${data.url}`;
      processingStatus = 'pending';
      break;
  }

  // Create contribution record
  const contribution = await kbService.createContribution({
    business_id: data.business_id,
    title: data.title,
    content_type: data.content_type,
    content_text: processedContent,
    original_filename: data.original_filename,
    topics: data.topics,
    audience_type: data.audience_type,
    is_evergreen: data.is_evergreen,
    valid_from: data.valid_from,
    valid_until: data.valid_until,
  });

  // Run AI prescreening if not skipped and we have content
  let prescreeningResult = null;
  if (!data.skip_prescreening && processedContent) {
    try {
      prescreeningResult = await geminiService.prescreenContent(
        processedContent,
        business.name,
        data.content_type
      );

      // Update contribution with prescreening results
      await kbService.updateContribution(contribution.id, {
        ai_prescreening: prescreeningResult,
        status:
          prescreeningResult.recommendation === 'approve' && prescreeningResult.confidence > 0.8
            ? 'approved'
            : processingStatus,
        topics: prescreeningResult.suggestedTopics || data.topics,
      });
    } catch (error) {
      logger.error('Prescreening failed', { error });
      // Continue without prescreening
    }
  } else {
    // Update status without prescreening
    await kbService.updateContribution(contribution.id, {
      status: processingStatus,
    });
  }

  // Get updated contribution
  const updatedContribution = await kbService.getContributionById(contribution.id);

  return NextResponse.json({
    success: true,
    data: {
      contribution: updatedContribution,
      prescreening: prescreeningResult,
    },
    message: `Content ingested successfully. Status: ${updatedContribution?.status}`,
  });
});

// ============================================================================
// GET Handler - List contributions for a business
// ============================================================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  const businessId = searchParams.get('business_id');
  const status = searchParams.get('status');
  const contentType = searchParams.get('content_type');

  const contributions = await kbService.getContributions({
    business_id: businessId ? parseInt(businessId) : undefined,
    status: status || undefined,
    content_type: contentType || undefined,
  });

  return NextResponse.json({
    success: true,
    data: contributions,
    count: contributions.length,
  });
});

