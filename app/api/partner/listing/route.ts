import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';
import { query } from '@/lib/db';

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
        name, description, address, city, phone, website,
        tasting_fee, reservation_required, hours, 
        specialties, features
       FROM wineries WHERE id = $1`,
      [profile.winery_id]
    );
    if (result.rows[0]) {
      listing = {
        ...result.rows[0],
        short_description: result.rows[0].description?.substring(0, 150) || '',
        specialties: result.rows[0].specialties || [],
        features: result.rows[0].features || [],
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
export const PUT = withErrorHandling(async (request: NextRequest) => {
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
        tasting_fee = COALESCE($2, tasting_fee),
        reservation_required = COALESCE($3, reservation_required),
        hours = COALESCE($4, hours),
        specialties = COALESCE($5, specialties),
        features = COALESCE($6, features),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        body.description,
        body.tasting_fee,
        body.reservation_required,
        body.hours ? JSON.stringify(body.hours) : null,
        body.specialties ? JSON.stringify(body.specialties) : null,
        body.features ? JSON.stringify(body.features) : null,
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
});

