/**
 * File Upload Service
 * Handles document, photo, and video uploads for business portal
 */

import { query } from '@/lib/db';

export interface BusinessFile {
  id: number;
  business_id: number;
  file_type: 'document' | 'photo' | 'video' | 'menu' | 'wine_list' | 'brochure';
  original_filename: string;
  storage_url: string;
  file_size_bytes: number;
  mime_type: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_text?: string;
  ai_description?: string;
  ai_tags?: string[];
  thumbnail_url?: string;
  category?: string;
  approved: boolean;
}

/**
 * Save file metadata to database
 */
export async function createFileRecord(data: {
  businessId: number;
  fileType: string;
  originalFilename: string;
  storageUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  category?: string;
}): Promise<number> {
  const result = await query(`
    INSERT INTO business_files (
      business_id,
      file_type,
      original_filename,
      storage_url,
      file_size_bytes,
      mime_type,
      category,
      processing_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    RETURNING id
  `, [
    data.businessId,
    data.fileType,
    data.originalFilename,
    data.storageUrl,
    data.fileSizeBytes,
    data.mimeType,
    data.category || null
  ]);
  
  return result.rows[0].id;
}

/**
 * Update file processing status
 */
export async function updateFileStatus(
  fileId: number,
  status: 'processing' | 'completed' | 'failed'
): Promise<void> {
  await query(`
    UPDATE business_files
    SET processing_status = $2, processed_at = NOW()
    WHERE id = $1
  `, [fileId, status]);
}

/**
 * Update file with extracted text (for PDFs/documents)
 */
export async function updateFileExtractedText(
  fileId: number,
  extractedText: string
): Promise<void> {
  await query(`
    UPDATE business_files
    SET extracted_text = $2
    WHERE id = $1
  `, [fileId, extractedText]);
}

/**
 * Update file with AI description and tags (for photos/videos)
 */
export async function updateFileAIAnalysis(
  fileId: number,
  description: string,
  tags: string[]
): Promise<void> {
  await query(`
    UPDATE business_files
    SET ai_description = $2, ai_tags = $3
    WHERE id = $1
  `, [fileId, description, tags]);
}

/**
 * Update file with thumbnail URL
 */
export async function updateFileThumbnail(
  fileId: number,
  thumbnailUrl: string,
  width?: number,
  height?: number
): Promise<void> {
  await query(`
    UPDATE business_files
    SET thumbnail_url = $2, width = $3, height = $4
    WHERE id = $1
  `, [fileId, thumbnailUrl, width || null, height || null]);
}

/**
 * Update video metadata
 */
export async function updateVideoMetadata(
  fileId: number,
  durationSeconds: number,
  thumbnailUrl?: string,
  transcription?: string
): Promise<void> {
  await query(`
    UPDATE business_files
    SET 
      video_duration_seconds = $2,
      video_thumbnail_url = $3,
      video_transcription = $4
    WHERE id = $1
  `, [fileId, durationSeconds, thumbnailUrl || null, transcription || null]);
}

/**
 * Get all files for a business
 */
export async function getBusinessFiles(
  businessId: number,
  fileType?: string
): Promise<BusinessFile[]> {
  let sql = 'SELECT * FROM business_files WHERE business_id = $1';
  const params: (number | string)[] = [businessId];
  
  if (fileType) {
    sql += ' AND file_type = $2';
    params.push(fileType);
  }
  
  sql += ' ORDER BY uploaded_at DESC';
  
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get file by ID
 */
export async function getFileById(fileId: number): Promise<BusinessFile | null> {
  const result = await query(
    'SELECT * FROM business_files WHERE id = $1',
    [fileId]
  );
  
  return result.rows[0] || null;
}

/**
 * Delete file
 */
export async function deleteFile(fileId: number): Promise<void> {
  await query('DELETE FROM business_files WHERE id = $1', [fileId]);
}

/**
 * Get file counts by type
 */
export async function getFileCountsByType(businessId: number): Promise<{
  [key: string]: number;
}> {
  const result = await query(`
    SELECT file_type, COUNT(*) as count
    FROM business_files
    WHERE business_id = $1
    GROUP BY file_type
  `, [businessId]);
  
  const counts: { [key: string]: number } = {};
  result.rows.forEach(row => {
    counts[row.file_type] = parseInt(row.count);
  });
  
  return counts;
}

/**
 * Get pending files for processing
 */
export async function getPendingFiles(limit: number = 10): Promise<BusinessFile[]> {
  const result = await query(`
    SELECT * FROM business_files
    WHERE processing_status = 'pending'
    ORDER BY uploaded_at ASC
    LIMIT $1
  `, [limit]);
  
  return result.rows;
}

/**
 * Determine file type from MIME type
 */
export function categorizeFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'photo';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'document';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'document';
  return 'document';
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File): {
  valid: boolean;
  error?: string;
} {
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Videos
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];
  
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }
  
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed: ${file.type}`
    };
  }
  
  return { valid: true };
}

