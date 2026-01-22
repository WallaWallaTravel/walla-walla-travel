import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

/**
 * GET /api/brands
 * Get all active brands for selection in forms
 */
export const GET = withErrorHandling(async () => {
  const result = await query(`
    SELECT
      id,
      brand_code,
      brand_name,
      display_name,
      tagline,
      phone_display,
      email_support,
      website_url,
      primary_color,
      default_brand
    FROM brands
    WHERE active = true
    ORDER BY default_brand DESC, brand_name ASC
  `);

  return NextResponse.json({
    success: true,
    data: result.rows,
  });
});
