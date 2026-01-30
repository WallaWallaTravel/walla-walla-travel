/**
 * Admin API: Pricing Modifiers
 * Get and manage pricing modifiers (discounts, surcharges)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { getAllPricingModifiers } from '@/lib/pricing/pricing-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/pricing/modifiers
 * Get all pricing modifiers
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const modifiers = await getAllPricingModifiers();

  return NextResponse.json({
    success: true,
    modifiers,
    count: modifiers.length
  });
});
