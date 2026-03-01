import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { pool } from '@/lib/db';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

const BodySchema = z.object({
  business_name: z.string().min(1).max(255).optional(),
  notes: z.string().max(5000).optional(),
  contact_name: z.string().min(1).max(255).optional(),
  contact_phone: z.string().max(50).optional(),
  contact_email: z.string().email().max(255).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(255).optional(),
  website: z.string().max(500).optional(),
});

/**
 * GET /api/partner/profile
 * Get partner profile with linked business data
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  // Note: 'partner' role check may fail if role is not in the type union - use string comparison
  if (!session || (session.user.role as string !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const profile = await partnerService.getProfileByUserId(session.user.id);

  // Get user info
  const userInfo = {
    contact_name: session.user.name,
    contact_email: session.user.email,
  };

  // Fetch linked business data if profile exists
  let businessData = {
    contact_phone: '',
    address: '',
    city: '',
    website: '',
  };

  if (profile?.winery_id) {
    // Get winery details
    const wineryResult = await pool.query(
      `SELECT address, city, website, phone FROM wineries WHERE id = $1`,
      [profile.winery_id]
    );
    if (wineryResult.rows[0]) {
      const winery = wineryResult.rows[0];
      businessData = {
        contact_phone: winery.phone || '',
        address: winery.address || '',
        city: winery.city || '',
        website: winery.website || '',
      };
    }
  }
  // Future: Add hotel_id and restaurant_id lookups here

  return NextResponse.json({
    success: true,
    profile: profile ? {
      ...profile,
      ...userInfo,
      ...businessData,
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

  const body = BodySchema.parse(await request.json());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatedProfile = await partnerService.updateProfile(session.user.id, body as any);

  return NextResponse.json({
    success: true,
    profile: updatedProfile,
    timestamp: new Date().toISOString(),
  });
}))
);

