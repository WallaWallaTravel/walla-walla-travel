import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

/**
 * GET /api/brands
 * Get all active brands for selection in forms
 */
export const GET = withErrorHandling(async () => {
  const result = await prisma.$queryRaw`
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
  ` as Record<string, any>[];

  return NextResponse.json({
    success: true,
    data: result,
  });
});
