/**
 * Supabase Storage Client
 *
 * Centralized storage operations for media uploads.
 * Uses the service role key to bypass RLS for uploads.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { generateSecureString } from '@/lib/utils';

// Storage bucket name - created in Supabase dashboard
export const MEDIA_BUCKET = 'media';

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

export const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// Max file sizes (in bytes)
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

interface UploadOptions {
  category: string;
  subcategory?: string;
  fileName?: string;
}

interface UploadResult {
  path: string;
  publicUrl: string;
  fileType: 'image' | 'video';
}

/**
 * Generate a unique file path for storage
 */
function generateStoragePath(
  originalName: string,
  category: string,
  subcategory?: string
): string {
  const timestamp = Date.now();
  const randomString = generateSecureString(7);
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const safeName = `${timestamp}-${randomString}.${ext}`;

  const pathParts = [category];
  if (subcategory) {
    pathParts.push(subcategory);
  }
  pathParts.push(safeName);

  return pathParts.join('/');
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File | Buffer,
  mimeType: string,
  options: UploadOptions
): Promise<UploadResult> {
  const { category, subcategory, fileName } = options;

  // Validate MIME type
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw new Error(
      `Invalid file type: ${mimeType}. Allowed: JPG, PNG, WebP, GIF, MP4, WebM`
    );
  }

  // Determine file type
  const fileType = ALLOWED_IMAGE_TYPES.includes(mimeType) ? 'image' : 'video';

  // Check file size
  const fileSize = file instanceof File ? file.size : file.byteLength;
  const maxSize = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (fileSize > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    throw new Error(`File too large. Maximum size for ${fileType}s is ${maxMB}MB`);
  }

  // Generate storage path
  const originalName = fileName || (file instanceof File ? file.name : 'upload');
  const storagePath = generateStoragePath(originalName, category, subcategory);

  // Convert File to ArrayBuffer if needed
  const fileData = file instanceof File ? await file.arrayBuffer() : file;

  // Upload to Supabase Storage
  const { data, error } = await supabaseAdmin.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, fileData, {
      contentType: mimeType,
      cacheControl: '3600', // 1 hour cache
      upsert: false, // Don't overwrite existing files
    });

  if (error) {
    logger.error('Supabase Storage upload failed', { error, storagePath });
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(data.path);

  logger.info('File uploaded to Supabase Storage', {
    path: data.path,
    publicUrl,
    fileType,
    size: fileSize,
  });

  return {
    path: data.path,
    publicUrl,
    fileType,
  };
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(MEDIA_BUCKET)
    .remove([path]);

  if (error) {
    logger.error('Supabase Storage delete failed', { error, path });
    throw new Error(`Delete failed: ${error.message}`);
  }

  logger.info('File deleted from Supabase Storage', { path });
}

/**
 * Get a signed URL for private files (if needed in future)
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    logger.error('Failed to create signed URL', { error, path });
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * List files in a storage path
 */
export async function listFiles(
  path: string,
  options?: { limit?: number; offset?: number }
): Promise<{ name: string; id: string; created_at: string }[]> {
  const { data, error } = await supabaseAdmin.storage
    .from(MEDIA_BUCKET)
    .list(path, {
      limit: options?.limit || 100,
      offset: options?.offset || 0,
    });

  if (error) {
    logger.error('Failed to list files', { error, path });
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return data || [];
}

/**
 * Ensure the media bucket exists (call during app initialization)
 */
export async function ensureMediaBucket(): Promise<void> {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();

  const exists = buckets?.some((b) => b.name === MEDIA_BUCKET);

  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket(MEDIA_BUCKET, {
      public: true, // Allow public access to files
      // Note: fileSizeLimit and allowedMimeTypes can cause issues on some Supabase plans
      // We handle validation in the application layer instead
    });

    if (error) {
      // Bucket might already exist (race condition)
      if (!error.message.includes('already exists')) {
        logger.error('Failed to create media bucket', { error });
        throw error;
      }
    } else {
      logger.info('Created media storage bucket', { bucket: MEDIA_BUCKET });
    }
  }
}
