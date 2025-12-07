/**
 * Events API
 * GET /api/wine-directory/events - List events
 * POST /api/wine-directory/events - Create an event
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { wineDirectoryService, CreateEventData } from '@/lib/services/wine-directory.service';
import { z } from 'zod';

// Schema for creating an event
const CreateEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  is_all_day: z.boolean().optional(),
  venue_name: z.string().max(255).optional(),
  address: z.string().max(500).optional(),
  winery_id: z.number().int().positive().optional(),
  business_id: z.number().int().positive().optional(),
  price_info: z.string().max(255).optional(),
  ticket_url: z.string().url().optional(),
  image_url: z.string().url().optional(),
});

/**
 * GET /api/wine-directory/events
 * List events with optional filtering
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const category = searchParams.get('category');
  const featured = searchParams.get('featured');
  const wineryId = searchParams.get('winery_id');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  let events;

  if (featured === 'true') {
    events = await wineDirectoryService.getFeaturedEvents(limit);
  } else if (startDate && endDate) {
    events = await wineDirectoryService.listEventsByDateRange(
      startDate,
      endDate,
      category || undefined
    );
  } else if (wineryId) {
    events = await wineDirectoryService.getWineryEvents(parseInt(wineryId, 10));
  } else {
    events = await wineDirectoryService.listUpcomingEvents(limit);
  }

  return NextResponse.json({
    success: true,
    data: events,
    count: events.length,
  });
});

/**
 * POST /api/wine-directory/events
 * Create a new event
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const data = await validateBody<CreateEventData>(request, CreateEventSchema);

  const event = await wineDirectoryService.createEvent(data);

  return NextResponse.json({
    success: true,
    data: event,
    message: `Event '${event.title}' created successfully`,
  }, { status: 201 });
});

