/**
 * Wineries API
 * 
 * ✅ REFACTORED: Service layer handles business logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { wineryService } from '@/lib/services/winery.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/wineries
 * Get all wineries for itinerary building
 * 
 * ✅ REFACTORED: Service layer with caching
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const wineries = await wineryService.list();

  return NextResponse.json({
    success: true,
    data: wineries,
    message: 'Wineries retrieved successfully',
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      // Cache for 5 minutes (static data)
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
});

/**
 * POST /api/wineries
 * Create a new winery
 * 
 * ✅ REFACTORED: Service layer handles validation
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  const winery = await wineryService.create(body);

  return NextResponse.json({
    success: true,
    data: winery,
    message: 'Winery created successfully',
    timestamp: new Date().toISOString(),
  }, { status: 201 });
});
