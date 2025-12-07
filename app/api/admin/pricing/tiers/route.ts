/**
 * Admin API: Pricing Tiers
 * Get and manage pricing tiers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllPricingTiers } from '@/lib/pricing/pricing-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/pricing/tiers
 * Get all pricing tiers
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get('serviceType') || undefined;
    
    const tiers = await getAllPricingTiers(serviceType);
    
    return NextResponse.json({
      success: true,
      tiers,
      count: tiers.length
    });
  } catch (error: any) {
    console.error('[Pricing Tiers API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get pricing tiers', details: error.message },
      { status: 500 }
    );
  }
}

