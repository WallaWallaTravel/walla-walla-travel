/**
 * Admin: Invite Business
 * Create a new business and generate unique code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBusiness } from '@/lib/business-portal/business-service';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/businesses/invite
 * Invite a new business to the portal
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const {
    business_type,
    name,
    contact_email,
    contact_phone,
    website
  } = await request.json();

  // Validation
  if (!business_type || !name || !contact_email) {
    throw new BadRequestError('business_type, name, and contact_email are required');
  }

  if (!['winery', 'restaurant', 'hotel', 'boutique', 'gallery', 'activity', 'other'].includes(business_type)) {
    throw new BadRequestError('Invalid business_type');
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contact_email)) {
    throw new BadRequestError('Invalid email address');
  }

  // Create business
  const business = await createBusiness({
    business_type,
    name,
    contact_email,
    contact_phone,
    website,
    invited_by: 1 // TODO: Get from auth session
  });

  // In production: Send invitation email with invite token

  return NextResponse.json({
    success: true,
    business: {
      id: business.id,
      name: business.name,
      invite_token: business.invite_token,
      email: business.email,
      portal_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/contribute/${business.invite_token}`
    },
    message: 'Business invited successfully!'
  });
});
