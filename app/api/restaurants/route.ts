/**
 * Restaurants API
 * 
 * ✅ REFACTORED: Service layer handles data fetching
 */

import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { restaurantService } from '@/lib/services/restaurant.service';

/**
 * GET /api/restaurants
 * Get all active restaurants
 * 
 * ✅ REFACTORED: Reduced from 38 lines to 15 lines
 */
export const GET = withErrorHandling(async () => {
  const restaurants = await restaurantService.list();

  return NextResponse.json({
    success: true,
    data: restaurants,
    timestamp: new Date().toISOString(),
  });
});
