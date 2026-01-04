import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

/**
 * GET /api/partner/profile
 * Get partner profile
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);
  
  // Note: 'partner' role check may fail if role is not in the type union - use string comparison
  if (!session || (session.user.role as string !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const profile = await partnerService.getProfileByUserId(session.user.id);

  // Also get user info
  const userInfo = {
    contact_name: session.user.name,
    contact_email: session.user.email,
  };

  return NextResponse.json({
    success: true,
    profile: profile ? {
      ...profile,
      ...userInfo,
      contact_phone: '', // TODO: Add phone to user table or partner_profiles
      address: '', // TODO: Get from linked winery/hotel/restaurant
      city: '',
      website: '',
    } : null,
    timestamp: new Date().toISOString(),
  });
});

/**
 * PUT /api/partner/profile
 * Update partner profile
 */
export const PUT = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  // Note: 'partner' role check may fail if role is not in the type union - use string comparison
  if (!session || (session.user.role as string !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const body = await request.json();

  const updatedProfile = await partnerService.updateProfile(session.user.id, body);

  return NextResponse.json({
    success: true,
    profile: updatedProfile,
    timestamp: new Date().toISOString(),
  });
})));

