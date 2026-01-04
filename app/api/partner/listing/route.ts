import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';
import { query } from '@/lib/db';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

// Get client IP from request headers (Next.js 15 removed request.ip)
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0].trim() || realIp || 'unknown';
}

/**
 * GET /api/partner/listing
 * Get partner's directory listing data
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);
  
  // Note: 'partner' role check may fail if role is not in the type union - use string comparison
  if (!session || (session.user.role as string !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const profile = await partnerService.getProfileByUserId(session.user.id);
  
  if (!profile) {
    throw new NotFoundError('Partner profile not found');
  }

  // Get listing data from the linked entity (winery, hotel, restaurant)
  let listing = null;

  if (profile.winery_id) {
    const result = await query(
      `SELECT
        name, description, short_description, address, city, phone, website,
        tasting_fee, reservation_required, hours_of_operation as hours,
        specialties, amenities as features,
        experience_tags, min_group_size, max_group_size,
        booking_advance_days_min, booking_advance_days_max,
        cancellation_policy, pet_policy
       FROM wineries WHERE id = $1`,
      [profile.winery_id]
    );
    if (result.rows[0]) {
      const row = result.rows[0];
      listing = {
        ...row,
        short_description: row.short_description || row.description?.substring(0, 150) || '',
        specialties: row.specialties || [],
        features: row.features || [],
        experience_tags: row.experience_tags || [],
        min_group_size: row.min_group_size,
        max_group_size: row.max_group_size,
        booking_advance_days_min: row.booking_advance_days_min,
        booking_advance_days_max: row.booking_advance_days_max,
        cancellation_policy: row.cancellation_policy || '',
        pet_policy: row.pet_policy || '',
        ai_notes: '',
      };
    }
  }
  // TODO: Add hotel and restaurant cases

  return NextResponse.json({
    success: true,
    listing,
    timestamp: new Date().toISOString(),
  });
});

/**
 * PUT /api/partner/listing
 * Update partner's directory listing
 */
export const PUT = withCSRF(
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

  const body = await request.json();

  // Update the linked entity
  if (profile.winery_id) {
    await query(
      `UPDATE wineries SET
        description = COALESCE($1, description),
        short_description = COALESCE($2, short_description),
        tasting_fee = COALESCE($3, tasting_fee),
        reservation_required = COALESCE($4, reservation_required),
        hours_of_operation = COALESCE($5, hours_of_operation),
        specialties = COALESCE($6, specialties),
        amenities = COALESCE($7, amenities),
        experience_tags = COALESCE($8, experience_tags),
        min_group_size = $9,
        max_group_size = $10,
        booking_advance_days_min = $11,
        booking_advance_days_max = $12,
        cancellation_policy = $13,
        pet_policy = $14,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $15`,
      [
        body.description,
        body.short_description,
        body.tasting_fee,
        body.reservation_required,
        body.hours ? JSON.stringify(body.hours) : null,
        body.specialties || null,
        body.features || null,
        body.experience_tags || null,
        body.min_group_size ?? null,
        body.max_group_size ?? null,
        body.booking_advance_days_min ?? null,
        body.booking_advance_days_max ?? null,
        body.cancellation_policy || null,
        body.pet_policy || null,
        profile.winery_id,
      ]
    );
  }
  // TODO: Add hotel and restaurant cases

  // Log the activity
  await partnerService.logActivity(
    profile.id,
    'listing_updated',
    { fields: Object.keys(body) },
    getClientIp(request)
  );

  return NextResponse.json({
    success: true,
    message: 'Listing updated successfully',
    timestamp: new Date().toISOString(),
  });
})));

