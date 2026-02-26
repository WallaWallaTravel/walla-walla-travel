/**
 * Admin API: List Businesses
 * Get all businesses with their status
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/business-portal/businesses
 * List all businesses
 */
export const GET = withErrorHandling(async (
  _request: NextRequest
) => {
  const result = await query(`
    SELECT
      id,
      business_type,
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
  `);

  return NextResponse.json({
    success: true,
    businesses: result.rows
  });
});
