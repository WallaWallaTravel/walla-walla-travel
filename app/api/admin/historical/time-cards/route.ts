/**
 * Historical Time Cards API
 *
 * POST /api/admin/historical/time-cards - Create historical time card entry
 * GET /api/admin/historical/time-cards - List historical time cards
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, UnauthorizedError, RouteContext } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { getSessionFromRequest } from '@/lib/auth/session';
import { timeCardService } from '@/lib/services/timecard.service';

// =============================================================================
// Validation Schemas
// =============================================================================

const CreateHistoricalTimeCardSchema = z.object({
  driverId: z.number().int().positive(),
  vehicleId: z.number().int().positive().optional(),
  originalDocumentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  clockInTime: z.string().datetime({ message: 'Clock in time must be ISO datetime' }),
  clockOutTime: z.string().datetime({ message: 'Clock out time must be ISO datetime' }),
  workReportingLocation: z.string().max(500).optional(),
  drivingHours: z.number().nonnegative().max(24).optional(),
  onDutyHours: z.number().nonnegative().max(24).optional(),
  bookingId: z.number().int().positive().optional(),
  historicalSource: z.string().min(1).max(100),
  entryNotes: z.string().max(2000).optional(),
}).refine(
  (data) => new Date(data.clockOutTime) > new Date(data.clockInTime),
  { message: 'Clock out time must be after clock in time' }
);

const ListHistoricalTimeCardsSchema = z.object({
  driverId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  source: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// =============================================================================
// POST - Create historical time card
// =============================================================================

export const POST = withErrorHandling(async (request: NextRequest, _context: RouteContext) => {
  // Verify admin authentication
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  // Validate request body
  const body = await validateBody(request, CreateHistoricalTimeCardSchema);

  // Create the historical time card
  const timeCard = await timeCardService.createHistoricalTimeCard({
    driverId: body.driverId,
    vehicleId: body.vehicleId,
    originalDocumentDate: body.originalDocumentDate,
    clockInTime: body.clockInTime,
    clockOutTime: body.clockOutTime,
    workReportingLocation: body.workReportingLocation,
    drivingHours: body.drivingHours,
    onDutyHours: body.onDutyHours,
    bookingId: body.bookingId,
    enteredBy: session.user.id,
    historicalSource: body.historicalSource,
    entryNotes: body.entryNotes,
  });

  return NextResponse.json(
    {
      success: true,
      data: timeCard,
      message: 'Historical time card created successfully',
    },
    { status: 201 }
  );
});

// =============================================================================
// GET - List historical time cards
// =============================================================================

export const GET = withErrorHandling(async (request: NextRequest, _context: RouteContext) => {
  // Verify admin authentication
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());
  const filters = ListHistoricalTimeCardsSchema.parse(queryParams);

  // Get historical time cards
  const result = await timeCardService.getHistoricalTimeCards({
    driverId: filters.driverId,
    vehicleId: filters.vehicleId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    source: filters.source,
    limit: filters.limit || 50,
    offset: filters.offset || 0,
  });

  return NextResponse.json({
    success: true,
    data: result.data,
    pagination: {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    },
  });
});
