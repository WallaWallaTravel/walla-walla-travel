import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import type { RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { lodgingService } from '@/lib/services/lodging.service';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DateRangeSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
});

const AvailabilityEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  status: z.enum(['available', 'booked', 'blocked']),
  nightly_rate: z.number().min(0).optional(),
  min_stay: z.number().int().min(1).optional(),
  notes: z.string().optional(),
});

const SetAvailabilitySchema = z.object({
  entries: z.array(AvailabilityEntrySchema).min(1, 'At least one entry is required'),
});

/**
 * GET /api/admin/lodging/[id]/availability
 * Get availability for a property within a date range
 */
export const GET = withAdminAuth(async (request: NextRequest, _session, context) => {
  const { id } = await (context as RouteContext<{ id: string }>).params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid property ID',
    }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const rawDates = {
    start_date: searchParams.get('start_date') || '',
    end_date: searchParams.get('end_date') || '',
  };

  const parseResult = DateRangeSchema.safeParse(rawDates);
  if (!parseResult.success) {
    return NextResponse.json({
      success: false,
      error: 'Invalid date range. Both start_date and end_date are required in YYYY-MM-DD format.',
      details: parseResult.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  const { start_date, end_date } = parseResult.data;

  const availability = await lodgingService.getAvailability(numId, start_date, end_date);

  return NextResponse.json({
    success: true,
    data: {
      property_id: numId,
      start_date,
      end_date,
      availability,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * PUT /api/admin/lodging/[id]/availability
 * Set availability entries for a property
 */
export const PUT = withAdminAuth(async (request: NextRequest, _session, context) => {
  const { id } = await (context as RouteContext<{ id: string }>).params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid property ID',
    }, { status: 400 });
  }

  const body = await request.json();

  const parseResult = SetAvailabilitySchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten().fieldErrors,
    }, { status: 422 });
  }

  const availability = await lodgingService.setAvailability(numId, parseResult.data.entries);

  return NextResponse.json({
    success: true,
    data: {
      property_id: numId,
      availability,
    },
    timestamp: new Date().toISOString(),
  });
});
