import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

/**
 * GET /api/brands
 * Get all active brands for selection in forms
 */
export const GET = withErrorHandling(async () => {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
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
  `;

  return NextResponse.json({
    success: true,
    data: rows,
  });
});
