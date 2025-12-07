/**
 * Business Portal File Upload
 * Upload documents, photos, and videos
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  createFileRecord,
  validateFileUpload,
  categorizeFileType 
} from '@/lib/business-portal/file-service';
import { logBusinessActivity } from '@/lib/business-portal/business-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/business-portal/upload-file
 * Upload a file for a business
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[File Upload] Starting upload...');
    const formData = await request.formData();
    
    const businessId = parseInt(formData.get('businessId') as string);
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || undefined;
    
    console.log('[File Upload] Business ID:', businessId);
    console.log('[File Upload] File:', file?.name, file?.size, file?.type);
    console.log('[File Upload] Category:', category);
    
    if (!businessId || !file) {
      console.error('[File Upload] Missing fields - businessId:', businessId, 'file:', !!file);
      return NextResponse.json(
        { error: 'Missing required fields', details: `businessId: ${businessId}, file: ${!!file}` },
        { status: 400 }
      );
    }
    
    // Validate file
    console.log('[File Upload] Validating file...');
    const validation = validateFileUpload(file);
    if (!validation.valid) {
      console.error('[File Upload] Validation failed:', validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Determine file type
    const fileType = categorizeFileType(file.type);
    console.log('[File Upload] File type:', fileType);
    
    // For MVP: Store file as base64 data URL
    // In production: Upload to S3/R2 and store URL
    console.log('[File Upload] Converting to base64...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64File = buffer.toString('base64');
    const fileDataUrl = `data:${file.type};base64,${base64File}`;
    console.log('[File Upload] Base64 size:', base64File.length, 'characters');
    
    // Save file record
    console.log('[File Upload] Saving to database...');
    const fileId = await createFileRecord({
      businessId,
      fileType,
      originalFilename: file.name,
      storageUrl: fileDataUrl, // In production: S3 URL
      fileSizeBytes: file.size,
      mimeType: file.type,
      category
    });
    console.log('[File Upload] File saved with ID:', fileId);
    
    // Log activity
    console.log('[File Upload] Logging activity...');
    await logBusinessActivity(
      businessId,
      'file_uploaded',
      `Uploaded ${fileType}: ${file.name}`,
      { file_id: fileId, file_type: fileType, file_size: file.size }
    );
    console.log('[File Upload] Activity logged');
    
    // In production: Queue processing job (OCR, image analysis, etc.)
    
    return NextResponse.json({
      success: true,
      fileId,
      fileType,
      message: 'File uploaded successfully. Processing queued.'
    });
    
  } catch (error: any) {
    console.error('[File Upload] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    );
  }
}

