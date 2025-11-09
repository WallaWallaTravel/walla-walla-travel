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
    const formData = await request.formData();
    
    const businessId = parseInt(formData.get('businessId') as string);
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || undefined;
    
    if (!businessId || !file) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate file
    const validation = validateFileUpload(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Determine file type
    const fileType = categorizeFileType(file.type);
    
    // For MVP: Store file as base64 data URL
    // In production: Upload to S3/R2 and store URL
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64File = buffer.toString('base64');
    const fileDataUrl = `data:${file.type};base64,${base64File}`;
    
    // Save file record
    const fileId = await createFileRecord({
      businessId,
      fileType,
      originalFilename: file.name,
      storageUrl: fileDataUrl, // In production: S3 URL
      fileSizeBytes: file.size,
      mimeType: file.type,
      category
    });
    
    // Log activity
    await logBusinessActivity(
      businessId,
      'file_uploaded',
      `Uploaded ${fileType}: ${file.name}`,
      { file_id: fileId, file_type: fileType, file_size: file.size }
    );
    
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

