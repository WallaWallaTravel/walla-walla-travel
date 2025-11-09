/**
 * Admin: List Businesses
 * Get all businesses with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBusinesses } from '@/lib/business-portal/business-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/businesses?type=winery&status=invited
 * List all businesses with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      business_type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    };
    
    const result = await getBusinesses(filters);
    
    return NextResponse.json({
      success: true,
      businesses: result.businesses,
      total: result.total,
      limit: filters.limit,
      offset: filters.offset
    });
    
  } catch (error: any) {
    console.error('[Admin List Businesses] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list businesses', details: error.message },
      { status: 500 }
    );
  }
}

