/**
 * API v1 - Event Categories
 * GET /api/v1/events/categories - Get all active event categories
 */

import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { eventsService } from '@/lib/services/events.service';

export const GET = withErrorHandling(async () => {
  const categories = await eventsService.getCategories();

  return NextResponse.json({
    success: true,
    data: categories,
  });
});
