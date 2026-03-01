import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';

/**
 * GET /api/admin/hotel-partners
 * List all hotel partners (admin only)
 */
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get('active_only') === 'true';

  const hotels = await hotelPartnerService.listHotels(activeOnly);

  return NextResponse.json({
    success: true,
    data: hotels,
    count: hotels.length,
  });
});

/**
 * POST /api/admin/hotel-partners
 * Create a new hotel partner (admin only)
 */
export const POST = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();

  // Validate required fields
  if (!body.name) {
    throw new BadRequestError('Hotel name is required');
  }
  if (!body.email) {
    throw new BadRequestError('Email is required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    throw new BadRequestError('Invalid email format');
  }

  // Check if email already exists
  const existing = await hotelPartnerService.getHotelByEmail(body.email);
  if (existing) {
    throw new BadRequestError('A hotel partner with this email already exists');
  }

  const hotel = await hotelPartnerService.createHotel({
    name: body.name,
    email: body.email,
    contact_name: body.contact_name,
    phone: body.phone,
    address: body.address,
    notes: body.notes,
  });

  return NextResponse.json({
    success: true,
    data: hotel,
    message: 'Hotel partner created. Send invitation to complete registration.',
  }, { status: 201 });
});
