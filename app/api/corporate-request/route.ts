/**
 * Corporate Request API
 * Handles corporate/group event quote requests with file uploads
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseItineraryFile } from '@/lib/corporate/itinerary-parser';
import { sendCorporateRequestNotification } from '@/lib/email';
import { logger } from '@/lib/logger';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { generateSecureString } from '@/lib/utils';
import { crmSyncService } from '@/lib/services/crm-sync.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/corporate-request
 * Submit a new corporate quote request
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const formData = await request.formData();

  const companyName = formData.get('companyName') as string;
  const contactName = formData.get('contactName') as string;
  const contactEmail = formData.get('contactEmail') as string;
  const contactPhone = formData.get('contactPhone') as string || null;
  const partySize = parseInt(formData.get('partySize') as string);
  const eventType = formData.get('eventType') as string;
  const description = formData.get('description') as string;
  const specialRequirements = formData.get('specialRequirements') as string || null;
  const budgetRange = formData.get('budgetRange') as string || null;
  const preferredDates = formData.get('preferredDates') as string;

  // Generate request number
  const requestNumber = `CR-${Date.now()}-${generateSecureString(4, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}`;

  // Handle file uploads
  interface UploadedFile {
    filename: string;
    mimeType: string;
    size: number;
    dataUrl: string;
  }
  const uploadedFiles: UploadedFile[] = [];
  let aiExtractedData: Record<string, unknown> | null = null;
  let aiConfidenceScore = 0;

  const files = formData.getAll('files');
  for (const file of files) {
    if (file instanceof File) {
      try {
        // Convert to base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64File = buffer.toString('base64');
        const fileDataUrl = `data:${file.type};base64,${base64File}`;

        // Parse itinerary if it's the first file
        if (uploadedFiles.length === 0) {
          logger.info('Parsing corporate itinerary', { filename: file.name });
          const parsed = await parseItineraryFile(fileDataUrl, file.type, file.name);
          aiExtractedData = parsed as unknown as Record<string, unknown>;
          aiConfidenceScore = (parsed as { confidence: number }).confidence;
          logger.info('AI extraction complete', { confidence: aiConfidenceScore });
        }

        uploadedFiles.push({
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          dataUrl: fileDataUrl
        });
      } catch (error) {
        logger.error('Corporate request file processing error', { error, filename: file.name });
      }
    }
  }

  // Parse preferred dates
  let parsedDates: string[] = [];
  try {
    parsedDates = JSON.parse(preferredDates || '[]') as string[];
  } catch {
    parsedDates = preferredDates ? [preferredDates] : [];
  }

  // Insert into database
  const result = await query(`
    INSERT INTO corporate_requests (
      request_number, company_name, contact_name, contact_email, contact_phone,
      party_size, event_type, description, special_requirements, budget_range,
      preferred_dates, uploaded_files, ai_extracted_data, ai_confidence_score,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id, request_number
  `, [
    requestNumber,
    companyName,
    contactName,
    contactEmail,
    contactPhone,
    partySize,
    eventType,
    description,
    specialRequirements,
    budgetRange,
    JSON.stringify(parsedDates),
    JSON.stringify(uploadedFiles),
    aiExtractedData ? JSON.stringify(aiExtractedData) : null,
    aiConfidenceScore,
    'pending'
  ]);

  const corporateRequest = result.rows[0];

  // Send email notification to admin (async, don't block response)
  sendCorporateRequestNotification({
    request_number: corporateRequest.request_number,
    company_name: companyName,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone || undefined,
    event_type: eventType,
    description: description || undefined,
    budget_range: budgetRange || undefined,
    estimated_attendees: partySize,
  }).catch(err => {
    logger.error('Failed to send corporate request admin notification', { error: err });
  });

  // Sync to CRM (create contact + deal)
  crmSyncService.syncCorporateRequest({
    requestId: corporateRequest.id,
    companyName,
    contactName,
    contactEmail,
    contactPhone,
    eventType,
    partySize,
    preferredDates: parsedDates,
    budgetRange,
    brand: 'walla_walla_travel',
  }).catch(err => {
    logger.error('Failed to sync corporate request to CRM', { error: err, requestId: corporateRequest.id });
  });

  return NextResponse.json({
    success: true,
    requestNumber: corporateRequest.request_number,
    id: corporateRequest.id,
    aiExtracted: aiExtractedData ? true : false,
    confidence: aiConfidenceScore,
    message: 'Corporate request submitted successfully. We\'ll respond within 48 hours.'
  });
});

/**
 * GET /api/corporate-request
 * Get all corporate requests (admin only)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let sql = 'SELECT * FROM corporate_requests';
  const params: string[] = [];

  if (status) {
    sql += ' WHERE status = $1';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';

  const result = await query(sql, params);

  return NextResponse.json({
    success: true,
    requests: result.rows,
    count: result.rows.length
  });
});
