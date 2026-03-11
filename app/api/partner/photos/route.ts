/**
 * Partner Photos API
 * Upload and manage winery photos
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, NotFoundError, ValidationError } from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { stripExif } from '@/lib/utils/image-processing';

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
  const session = await getSession();

  if (!session || (session.user.role !== 'partner' && session.user.role !== 'admin')) {
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
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT
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
     WHERE wm.winery_id = ${profile.winery_id}
       AND ml.file_type = 'image'
       AND ml.is_active = true
     ORDER BY wm.section, wm.display_order`;

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

  for (const row of rows) {
    const category = (row.category as string) || 'gallery';
    if (!photosByCategory[category]) {
      photosByCategory[category] = [];
    }
    photosByCategory[category].push({
      id: row.id as number,
      media_id: row.media_id as number,
      url: row.url as string,
      alt_text: row.alt_text as string | null,
      display_order: (row.display_order as number) || 0,
      is_primary: (row.is_primary as boolean) || false,
      created_at: row.created_at as string,
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
export const POST =
  withRateLimit(rateLimiters.api)(
  withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();

  if (!session || (session.user.role !== 'partner' && session.user.role !== 'admin')) {
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
  const countRows = await prisma.$queryRaw<Array<{ count: string }>>`
    SELECT COUNT(*) as count
     FROM winery_media wm
     JOIN media_library ml ON wm.media_id = ml.id
     WHERE wm.winery_id = ${profile.winery_id}
       AND wm.section = ${category}
       AND ml.is_active = true`;

  const currentCount = parseInt(countRows[0]?.count || '0', 10);
  const maxAllowed = MAX_PHOTOS[category] || 5;

  if (currentCount >= maxAllowed) {
    throw new ValidationError(`Maximum ${maxAllowed} photo(s) allowed for ${category}`);
  }

  // Generate unique filename
  const timestamp = Date.now();
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `winery-${profile.winery_id}/${category}/${timestamp}.${ext}`;

  logger.info('[PHOTO UPLOAD] Starting upload', { winery_id: profile.winery_id, category, fileName });
  logger.debug('[PHOTO UPLOAD] SUPABASE_SERVICE_KEY exists', { exists: !!process.env.SUPABASE_SERVICE_KEY });

  // Read file content and strip EXIF metadata (privacy: removes GPS coordinates etc.)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = await stripExif(Buffer.from(arrayBuffer), file.type);

  let publicUrl: string;

  // Try Supabase Storage first, fallback to base64 data URL
  const supabaseAdmin = await getSupabaseAdmin();
  logger.debug('[PHOTO UPLOAD] supabaseAdmin loaded', { loaded: !!supabaseAdmin });

  if (supabaseAdmin) {
    try {
      logger.debug('[PHOTO UPLOAD] Attempting Supabase Storage upload');
      const { error: uploadError } = await supabaseAdmin.storage
        .from('winery-photos')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        logger.warn('[PHOTO UPLOAD] Storage upload failed', { error: uploadError.message });
        // Fallback to base64
        const base64 = buffer.toString('base64');
        publicUrl = `data:${file.type};base64,${base64}`;
      } else {
        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('winery-photos')
          .getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
        logger.info('[PHOTO UPLOAD] Storage upload SUCCESS', { publicUrl });
      }
    } catch (storageError) {
      logger.error('[PHOTO UPLOAD] Storage exception', { error: storageError });
      const base64 = buffer.toString('base64');
      publicUrl = `data:${file.type};base64,${base64}`;
    }
  } else {
    // No service key configured, use base64 data URL
    logger.debug('[PHOTO UPLOAD] No supabaseAdmin, using base64 fallback');
    const base64 = buffer.toString('base64');
    publicUrl = `data:${file.type};base64,${base64}`;
  }

  logger.debug('[PHOTO UPLOAD] Final URL type', { type: publicUrl.startsWith('data:') ? 'base64' : 'storage' });

  // Get next display order
  const orderRows = await prisma.$queryRaw<Array<{ next_order: number }>>`
    SELECT COALESCE(MAX(wm.display_order), -1) + 1 as next_order
     FROM winery_media wm
     WHERE wm.winery_id = ${profile.winery_id} AND wm.section = ${category}`;
  const displayOrder = orderRows[0]?.next_order || 0;

  // Create media_library record
  const mediaRows = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO media_library (
      file_name, file_path, file_type, file_size, mime_type,
      category, alt_text, is_hero, display_order, is_active,
      created_at, updated_at
    ) VALUES (${file.name}, ${publicUrl}, 'image', ${file.size}, ${file.type}, ${category}, ${altText}, ${category === 'hero'}, ${displayOrder}, true, NOW(), NOW())
    RETURNING id`;

  const mediaId = mediaRows[0].id;
  logger.info('[PHOTO UPLOAD] media_library record created', { mediaId });

  // Create winery_media link
  const wmRows = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO winery_media (winery_id, media_id, section, display_order, is_primary, created_at)
     VALUES (${profile.winery_id}, ${mediaId}, ${category}, ${displayOrder}, ${category === 'hero' && currentCount === 0}, NOW())
     RETURNING id`;
  logger.info('[PHOTO UPLOAD] winery_media link created', { id: wmRows[0].id });

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
      id: wmRows[0].id,
      media_id: mediaId,
      url: publicUrl,
      category,
      alt_text: altText,
      display_order: displayOrder,
    },
    message: 'Photo uploaded successfully',
    timestamp: new Date().toISOString(),
  });
}));

/**
 * DELETE /api/partner/photos
 * Delete a photo
 */
export const DELETE =
  withRateLimit(rateLimiters.api)(
  withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();

  if (!session || (session.user.role !== 'partner' && session.user.role !== 'admin')) {
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
  const photoRows = await prisma.$queryRaw<Array<{ id: number; media_id: number; file_path: string }>>`
    SELECT wm.id, wm.media_id, ml.file_path
     FROM winery_media wm
     JOIN media_library ml ON wm.media_id = ml.id
     WHERE wm.id = ${parseInt(photoId)} AND wm.winery_id = ${profile.winery_id}`;

  if (photoRows.length === 0) {
    throw new NotFoundError('Photo not found');
  }

  const photo = photoRows[0];

  // Soft delete in media_library
  await prisma.$executeRaw`
    UPDATE media_library SET is_active = false, updated_at = NOW() WHERE id = ${photo.media_id}`;

  // Delete winery_media link
  await prisma.$executeRaw`DELETE FROM winery_media WHERE id = ${parseInt(photoId)}`;

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
}));
