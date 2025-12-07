/**
 * Admin API: Update Pricing Tier
 * Update a specific pricing tier
 */

import { NextRequest, NextResponse } from 'next/server';
import { updatePricingTier } from '@/lib/pricing/pricing-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/pricing/tiers/[id]
 * Update a pricing tier
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
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
  } catch (error: any) {
    console.error('[Update Pricing Tier API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing tier', details: error.message },
      { status: 500 }
    );
  }
}

