/**
 * Admin API: Update Pricing Tier
 * Update a specific pricing tier
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext } from '@/lib/api/middleware/error-handler';
import { updatePricingTier } from '@/lib/pricing/pricing-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/pricing/tiers/[id]
 * Update a pricing tier
 */
export const PATCH = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext<{ id: string }>
) => {
  const { id: idStr } = await context.params;
  const id = parseInt(idStr);
  const body = await request.json();
  const { changeReason, ...updates } = body;

  await updatePricingTier(
    id,
    updates,
    1, // TODO: Get actual user ID from session
    changeReason || 'Admin update'
  );

  return NextResponse.json({
    success: true,
    message: 'Pricing tier updated'
  });
});
