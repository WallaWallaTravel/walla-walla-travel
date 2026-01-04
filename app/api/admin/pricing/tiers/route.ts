/**
 * Admin API: Pricing Tiers
 * Get and manage pricing tiers
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
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
  } catch (error) {
    logger.error('Pricing Tiers API error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get pricing tiers', details: message },
      { status: 500 }
    );
  }
}

