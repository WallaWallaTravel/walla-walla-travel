/**
 * Event Detail API
 * GET /api/wine-directory/events/[event_id] - Get event details
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { wineDirectoryService } from '@/lib/services/wine-directory.service';

interface RouteParams {
  params: Promise<{ event_id: string }>;
}

/**
 * GET /api/wine-directory/events/[event_id]
 * Get event details
 */
export const GET = withErrorHandling(async (
  _request: NextRequest,
  { params }: RouteParams
) => {
  const { event_id } = await params;
  const eventId = parseInt(event_id, 10);

  const event = await wineDirectoryService.getEventById(eventId);

  return NextResponse.json({
    success: true,
    data: event,
  });
});

