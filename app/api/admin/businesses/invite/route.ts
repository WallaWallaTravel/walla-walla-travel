/**
 * Admin: Invite Business
 * Create a new business and generate unique code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBusiness } from '@/lib/business-portal/business-service';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { auditService } from '@/lib/services/audit.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/businesses/invite
 * Invite a new business to the portal
 */
const BodySchema = z.object({
  business_type: z.enum(['winery', 'restaurant', 'hotel', 'boutique', 'gallery', 'activity', 'catering', 'service', 'other']),
  name: z.string().min(1).max(255),
  contact_email: z.string().email().max(255),
  contact_phone: z.string().max(50).optional(),
  website: z.string().max(500).optional(),
});

export const POST = withCSRF(
  withAdminAuth(async (request: NextRequest, session) => {
  const {
    business_type,
    name,
    contact_email,
    contact_phone,
    website
  } = BodySchema.parse(await request.json());

  // Validation
  if (!business_type || !name || !contact_email) {
    throw new BadRequestError('business_type, name, and contact_email are required');
  }

  if (!['winery', 'restaurant', 'hotel', 'boutique', 'gallery', 'activity', 'catering', 'service', 'other'].includes(business_type)) {
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
    invited_by: parseInt(session.userId)
  });

  // In production: Send invitation email with invite token

  await auditService.logFromRequest(request, parseInt(session.userId), 'resource_created', {
    entityType: 'business_invite',
    entityId: business.id,
    businessName: name,
    businessType: business_type,
    contactEmail: contact_email,
  });

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
})
);
