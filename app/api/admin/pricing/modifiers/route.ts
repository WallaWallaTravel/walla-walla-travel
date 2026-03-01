/**
 * Admin API: Pricing Modifiers
 * Get and manage pricing modifiers (discounts, surcharges)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { getAllPricingModifiers } from '@/lib/pricing/pricing-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/pricing/modifiers
 * Get all pricing modifiers
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session) => {
  const modifiers = await getAllPricingModifiers();

  return NextResponse.json({
    success: true,
    modifiers,
    count: modifiers.length
  });
});
