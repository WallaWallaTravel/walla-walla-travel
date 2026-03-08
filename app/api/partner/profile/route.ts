import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { auth } from '@/auth';
import { getHotelSessionFromRequest } from '@/lib/auth/hotel-session';
import { partnerService } from '@/lib/services/partner.service';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { pool } from '@/lib/db';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

const BusinessBodySchema = z.object({
  business_name: z.string().min(1).max(255).optional(),
  notes: z.string().max(5000).optional(),
  contact_name: z.string().min(1).max(255).optional(),
  contact_phone: z.string().max(50).optional(),
  contact_email: z.string().email().max(255).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(255).optional(),
  website: z.string().max(500).optional(),
});

const HotelBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contact_name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});

/**
 * GET /api/partner/profile
 * Get partner profile with linked business data
 * Supports both JWT session (business partners) and hotel session cookie (hotel partners)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // 1. Try JWT session first (business partners)
  const session = await auth();

  if (session && (session.user.role === 'partner' || session.user.role === 'admin')) {
    const profile = await partnerService.getProfileByUserId(parseInt(session.user.id));

    const userInfo = {
      contact_name: session.user.name,
      contact_email: session.user.email,
    };

    let businessData = {
      contact_phone: '',
      address: '',
      city: '',
      website: '',
    };

    if (profile?.winery_id) {
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

    return NextResponse.json({
      success: true,
      partner_type: 'business',
      profile: profile ? {
        ...profile,
        ...userInfo,
        ...businessData,
      } : null,
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Try hotel session cookie (hotel partners)
  const hotelSession = await getHotelSessionFromRequest(request);

  if (!hotelSession?.hotelId) {
    throw new UnauthorizedError('Partner access required');
  }

  const hotel = await hotelPartnerService.getHotelById(hotelSession.hotelId);

  if (!hotel) {
    throw new UnauthorizedError('Hotel account not found');
  }

  return NextResponse.json({
    success: true,
    partner_type: 'hotel',
    profile: {
      id: hotel.id,
      name: hotel.name,
      contact_name: hotel.contact_name,
      contact_email: hotel.email,
      contact_phone: hotel.phone || '',
      address: hotel.address || '',
      is_active: hotel.is_active,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * PUT /api/partner/profile
 * Update partner profile
 * Supports both JWT session (business partners) and hotel session cookie (hotel partners)
 */
export const PUT = withCSRF(
  withRateLimit(rateLimiters.api)(
  withErrorHandling(async (request: NextRequest) => {
  // 1. Try JWT session first (business partners)
  const session = await auth();

  if (session && (session.user.role === 'partner' || session.user.role === 'admin')) {
    const body = BusinessBodySchema.parse(await request.json());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedProfile = await partnerService.updateProfile(parseInt(session.user.id), body as any);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Try hotel session cookie (hotel partners)
  const hotelSession = await getHotelSessionFromRequest(request);

  if (!hotelSession?.hotelId) {
    throw new UnauthorizedError('Partner access required');
  }

  const body = HotelBodySchema.parse(await request.json());

  const updatedHotel = await hotelPartnerService.updateHotel(hotelSession.hotelId, body);

  return NextResponse.json({
    success: true,
    profile: updatedHotel ? {
      id: updatedHotel.id,
      name: updatedHotel.name,
      contact_name: updatedHotel.contact_name,
      contact_email: updatedHotel.email,
      contact_phone: updatedHotel.phone || '',
      address: updatedHotel.address || '',
      is_active: updatedHotel.is_active,
    } : null,
    timestamp: new Date().toISOString(),
  });
}))
);
