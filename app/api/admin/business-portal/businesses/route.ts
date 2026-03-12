/**
 * Admin API: List Businesses
 * Get all businesses with their status
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/business-portal/businesses
 * List all businesses
 */
export const GET = withAdminAuth(async (
  _request: NextRequest, _session
) => {
  const result = await prisma.$queryRaw`
    SELECT
      id,
      business_type,
      business_types,
      name,
      email,
      phone,
      invite_token,
      status,
      website,
      short_description,
      address,
      city,
      invited_at,
      invitation_email_sent,
      claimed_at,
      created_at,
      updated_at
    FROM businesses
    ORDER BY updated_at DESC NULLS LAST, invited_at DESC
  ` as Record<string, any>[];

  return NextResponse.json({
    success: true,
    businesses: result
  });
});
