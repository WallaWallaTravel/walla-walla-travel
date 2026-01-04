/**
 * Partner Photos API
 * Upload and manage winery photos
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, NotFoundError, ValidationError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

// Lazy import supabase admin to avoid initialization errors when key is missing
async function getSupabaseAdmin() {
  if (!process.env.SUPABASE_SERVICE_KEY) {
    return null;
  }
  const { supabaseAdmin } = await import('@/lib/supabase/admin');
  return supabaseAdmin;
}

// Valid photo categories matching the frontend
const VALID_CATEGORIES = ['hero', 'tasting_room', 'vineyard', 'wine', 'team', 'experience'];

// Max photos per category
const MAX_PHOTOS: Record<string, number> = {
  hero: 1,
  tasting_room: 5,
  vineyard: 5,
  wine: 5,
  team: 5,
  experience: 5,
};

/**
 * GET /api/partner/photos
 * Get all photos for the partner's winery
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || (session.user.role as string !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const profile = await partnerService.getProfileByUserId(session.user.id);

  if (!profile) {
    throw new NotFoundError('Partner profile not found');
  }

  if (!profile.winery_id) {
    return NextResponse.json({
      success: true,
      photos: {},
      winery_id: 0,
      timestamp: new Date().toISOString(),
    });
  }

  // Get photos with media library info, grouped by section/category
  const result = await query(
    `SELECT
      wm.id,
      wm.section as category,
      wm.display_order,
      wm.is_primary,
      wm.created_at,
      ml.id as media_id,
      ml.file_path as url,
      ml.alt_text,
      ml.title,
      ml.file_name
     FROM winery_media wm
     JOIN media_library ml ON wm.media_id = ml.id
     WHERE wm.winery_id = $1
       AND ml.file_type = 'image'
       AND ml.is_active = true
     ORDER BY wm.section, wm.display_order`,
    [profile.winery_id]
  );

  // Group photos by category
  const photosByCategory: Record<string, Array<{
    id: number;
    media_id: number;
    url: string;
    alt_text: string | null;
    display_order: number;
    is_primary: boolean;
    created_at: string;
  }>> = {};

  for (const row of result.rows) {
    const category = row.category || 'gallery';
    if (!photosByCategory[category]) {
      photosByCategory[category] = [];
    }
    photosByCategory[category].push({
      id: row.id,
      media_id: row.media_id,
      url: row.url,
      alt_text: row.alt_text,
      display_order: row.display_order || 0,
      is_primary: row.is_primary || false,
      created_at: row.created_at,
    });
  }

  return NextResponse.json({
    success: true,
    photos: photosByCategory,
    winery_id: profile.winery_id,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/partner/photos
 * Upload a new photo
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || (session.user.role as string !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const profile = await partnerService.getProfileByUserId(session.user.id);

  if (!profile) {
    throw new NotFoundError('Partner profile not found');
  }

  if (!profile.winery_id) {
    throw new ValidationError('No winery linked to this partner profile');
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const category = formData.get('category') as string;
  const altText = formData.get('alt_text') as string || '';

  // Validate inputs
  if (!file) {
    throw new ValidationError('No file provided');
  }

  if (!category || !VALID_CATEGORIES.includes(category)) {
    throw new ValidationError(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new ValidationError('Only JPG, PNG, and WebP images are allowed');
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new ValidationError('File size must be under 5MB');
  }

  // Check current photo count for this category
  const countResult = await query(
    `SELECT COUNT(*) as count
     FROM winery_media wm
     JOIN media_library ml ON wm.media_id = ml.id
     WHERE wm.winery_id = $1
       AND wm.section = $2
       AND ml.is_active = true`,
    [profile.winery_id, category]
  );

  const currentCount = parseInt(countResult.rows[0]?.count || '0', 10);
  const maxAllowed = MAX_PHOTOS[category] || 5;

  if (currentCount >= maxAllowed) {
    throw new ValidationError(`Maximum ${maxAllowed} photo(s) allowed for ${category}`);
  }

  // Generate unique filename
  const timestamp = Date.now();
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `winery-${profile.winery_id}/${category}/${timestamp}.${ext}`;

  console.log('[PHOTO UPLOAD] Starting upload', { winery_id: profile.winery_id, category, fileName });
  console.log('[PHOTO UPLOAD] SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);

  // Read file content
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let publicUrl: string;

  // Try Supabase Storage first, fallback to base64 data URL
  const supabaseAdmin = await getSupabaseAdmin();
  console.log('[PHOTO UPLOAD] supabaseAdmin loaded:', !!supabaseAdmin);

  if (supabaseAdmin) {
    try {
      console.log('[PHOTO UPLOAD] Attempting Supabase Storage upload...');
      const { error: uploadError } = await supabaseAdmin.storage
        .from('winery-photos')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.log('[PHOTO UPLOAD] Storage upload failed:', uploadError.message);
        // Fallback to base64
        const base64 = buffer.toString('base64');
        publicUrl = `data:${file.type};base64,${base64}`;
      } else {
        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('winery-photos')
          .getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
        console.log('[PHOTO UPLOAD] Storage upload SUCCESS, URL:', publicUrl);
      }
    } catch (storageError) {
      console.log('[PHOTO UPLOAD] Storage exception:', storageError);
      const base64 = buffer.toString('base64');
      publicUrl = `data:${file.type};base64,${base64}`;
    }
  } else {
    // No service key configured, use base64 data URL
    console.log('[PHOTO UPLOAD] No supabaseAdmin, using base64 fallback');
    const base64 = buffer.toString('base64');
    publicUrl = `data:${file.type};base64,${base64}`;
  }

  console.log('[PHOTO UPLOAD] Final URL type:', publicUrl.startsWith('data:') ? 'base64' : 'storage');

  // Get next display order
  const orderResult = await query(
    `SELECT COALESCE(MAX(wm.display_order), -1) + 1 as next_order
     FROM winery_media wm
     WHERE wm.winery_id = $1 AND wm.section = $2`,
    [profile.winery_id, category]
  );
  const displayOrder = orderResult.rows[0]?.next_order || 0;

  // Create media_library record
  const mediaResult = await query(
    `INSERT INTO media_library (
      file_name, file_path, file_type, file_size, mime_type,
      category, alt_text, is_hero, display_order, is_active,
      created_at, updated_at
    ) VALUES ($1, $2, 'image', $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
    RETURNING id`,
    [
      file.name,
      publicUrl,
      file.size,
      file.type,
      category,
      altText,
      category === 'hero',
      displayOrder,
    ]
  );

  const mediaId = mediaResult.rows[0].id;
  console.log('[PHOTO UPLOAD] media_library record created, id:', mediaId);

  // Create winery_media link
  const wmResult = await query(
    `INSERT INTO winery_media (winery_id, media_id, section, display_order, is_primary, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id`,
    [
      profile.winery_id,
      mediaId,
      category,
      displayOrder,
      category === 'hero' && currentCount === 0,
    ]
  );
  console.log('[PHOTO UPLOAD] winery_media link created, id:', wmResult.rows[0].id);

  // Log activity
  await partnerService.logActivity(
    profile.id,
    'photo_uploaded',
    { media_id: mediaId, category, file_name: file.name },
    request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  );

  logger.info('Photo uploaded successfully', {
    winery_id: profile.winery_id,
    media_id: mediaId,
    category
  });

  return NextResponse.json({
    success: true,
    photo: {
      id: wmResult.rows[0].id,
      media_id: mediaId,
      url: publicUrl,
      category,
      alt_text: altText,
      display_order: displayOrder,
    },
    message: 'Photo uploaded successfully',
    timestamp: new Date().toISOString(),
  });
})));

/**
 * DELETE /api/partner/photos
 * Delete a photo
 */
export const DELETE = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || (session.user.role as string !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const profile = await partnerService.getProfileByUserId(session.user.id);

  if (!profile) {
    throw new NotFoundError('Partner profile not found');
  }

  if (!profile.winery_id) {
    throw new ValidationError('No winery linked to this partner profile');
  }

  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get('id');

  if (!photoId) {
    throw new ValidationError('Photo ID is required');
  }

  // Verify photo belongs to this winery
  const photoResult = await query(
    `SELECT wm.id, wm.media_id, ml.file_path
     FROM winery_media wm
     JOIN media_library ml ON wm.media_id = ml.id
     WHERE wm.id = $1 AND wm.winery_id = $2`,
    [photoId, profile.winery_id]
  );

  if (photoResult.rows.length === 0) {
    throw new NotFoundError('Photo not found');
  }

  const photo = photoResult.rows[0];

  // Soft delete in media_library
  await query(
    `UPDATE media_library SET is_active = false, updated_at = NOW() WHERE id = $1`,
    [photo.media_id]
  );

  // Delete winery_media link
  await query(
    `DELETE FROM winery_media WHERE id = $1`,
    [photoId]
  );

  // Optionally delete from storage (keeping for now for recovery)
  // const filePath = photo.file_path.split('/winery-photos/')[1];
  // await supabaseAdmin.storage.from('winery-photos').remove([filePath]);

  // Log activity
  await partnerService.logActivity(
    profile.id,
    'photo_deleted',
    { photo_id: photoId, media_id: photo.media_id },
    request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  );

  return NextResponse.json({
    success: true,
    message: 'Photo deleted successfully',
    timestamp: new Date().toISOString(),
  });
})));
