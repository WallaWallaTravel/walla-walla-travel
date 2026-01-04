/**
 * Admin: List Businesses
 * Get all businesses with filtering
 *
 * ✅ REFACTORED: Structured logging + proper error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBusinesses } from '@/lib/business-portal/business-service';
import { logger } from '@/lib/logger';

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

  } catch (error) {
    logger.error('Admin List Businesses error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to list businesses', details: message },
      { status: 500 }
    );
  }
}

