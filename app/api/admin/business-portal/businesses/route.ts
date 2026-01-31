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
      slug,
      contact_name,
      contact_email,
      contact_phone,
      unique_code,
      status,
      completion_percentage,
      website,
      invited_at,
      first_access_at,
      last_activity_at,
      submitted_at,
      approved_at
    FROM businesses
    ORDER BY last_activity_at DESC NULLS LAST, invited_at DESC
  `);

  return NextResponse.json({
    success: true,
    businesses: result.rows
  });
});
