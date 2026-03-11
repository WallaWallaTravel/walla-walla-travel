/**
 * Trip Proposal Stops API Routes
 * POST /api/admin/trip-proposals/[id]/days/[dayId]/stops - Add a stop
 * PUT /api/admin/trip-proposals/[id]/days/[dayId]/stops - Reorder stops
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { AddStopSchema } from '@/lib/types/trip-proposal';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string; dayId: string }>;
}

const ReorderSchema = z.object({
  stop_ids: z.array(z.number().int().positive()),
});

/**
 * POST /api/admin/trip-proposals/[id]/days/[dayId]/stops
 * Add a new stop to a day
 */
export const POST = withAdminAuth(async (request: NextRequest, session, context) => {
  const { dayId } = await (context as unknown as RouteParams).params;
  const dayIdNum = parseInt(dayId, 10);

  if (isNaN(dayIdNum)) {
    return NextResponse.json(
      { success: false, error: 'Invalid day ID' },
      { status: 400 }
    );
  }

  const body = await request.json();

  const parseResult = AddStopSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const stop = await tripProposalService.addStop(dayIdNum, parseResult.data);

  return NextResponse.json(
    {
      success: true,
      data: stop,
      message: 'Stop added successfully',
    },
    { status: 201 }
  );
});

/**
 * PUT /api/admin/trip-proposals/[id]/days/[dayId]/stops
 * Reorder stops within a day
 */
export const PUT = withAdminAuth(async (request: NextRequest, session, context) => {
  const { dayId } = await (context as unknown as RouteParams).params;
  const dayIdNum = parseInt(dayId, 10);

  if (isNaN(dayIdNum)) {
    return NextResponse.json(
      { success: false, error: 'Invalid day ID' },
      { status: 400 }
    );
  }

  const body = await request.json();

  const parseResult = ReorderSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  await tripProposalService.reorderStops(dayIdNum, parseResult.data.stop_ids);

  return NextResponse.json({
    success: true,
    message: 'Stops reordered successfully',
  });
});
