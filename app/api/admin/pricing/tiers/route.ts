/**
 * Admin API: Pricing Tiers
 * Get and manage pricing tiers
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { getAllPricingTiers } from '@/lib/pricing/pricing-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/pricing/tiers
 * Get all pricing tiers
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const serviceType = searchParams.get('serviceType') || undefined;

  const tiers = await getAllPricingTiers(serviceType);

  return NextResponse.json({
    success: true,
    tiers,
    count: tiers.length
  });
});
