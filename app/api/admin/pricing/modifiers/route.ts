/**
 * Admin API: Pricing Modifiers
 * Get and manage pricing modifiers (discounts, surcharges)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllPricingModifiers } from '@/lib/pricing/pricing-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/pricing/modifiers
 * Get all pricing modifiers
 */
export async function GET(request: NextRequest) {
  try {
    const modifiers = await getAllPricingModifiers();
    
    return NextResponse.json({
      success: true,
      modifiers,
      count: modifiers.length
    });
  } catch (error: any) {
    console.error('[Pricing Modifiers API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get pricing modifiers', details: error.message },
      { status: 500 }
    );
  }
}

