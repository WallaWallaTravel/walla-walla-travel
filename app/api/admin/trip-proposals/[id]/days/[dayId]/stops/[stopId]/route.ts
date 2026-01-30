/**
 * Individual Trip Proposal Stop API Routes
 * PATCH /api/admin/trip-proposals/[id]/days/[dayId]/stops/[stopId] - Update stop
 * DELETE /api/admin/trip-proposals/[id]/days/[dayId]/stops/[stopId] - Delete stop
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { AddStopSchema } from '@/lib/types/trip-proposal';

interface RouteParams {
  params: Promise<{ id: string; dayId: string; stopId: string }>;
}

/**
 * PATCH /api/admin/trip-proposals/[id]/days/[dayId]/stops/[stopId]
 * Update a stop
 */
export const PATCH = withAdminAuth(async (request: NextRequest, session, context) => {
  const { stopId } = await (context as unknown as RouteParams).params;
  const stopIdNum = parseInt(stopId, 10);

  if (isNaN(stopIdNum)) {
    return NextResponse.json(
      { success: false, error: 'Invalid stop ID' },
      { status: 400 }
    );
  }

  const body = await request.json();

  const parseResult = AddStopSchema.partial().safeParse(body);
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

  const stop = await tripProposalService.updateStop(stopIdNum, parseResult.data);

  return NextResponse.json({
    success: true,
    data: stop,
    message: 'Stop updated successfully',
  });
});

/**
 * DELETE /api/admin/trip-proposals/[id]/days/[dayId]/stops/[stopId]
 * Delete a stop
 */
export const DELETE = withAdminAuth(async (request: NextRequest, session, context) => {
  const { stopId } = await (context as unknown as RouteParams).params;
  const stopIdNum = parseInt(stopId, 10);

  if (isNaN(stopIdNum)) {
    return NextResponse.json(
      { success: false, error: 'Invalid stop ID' },
      { status: 400 }
    );
  }

  await tripProposalService.deleteStop(stopIdNum);

  return NextResponse.json({
    success: true,
    message: 'Stop deleted successfully',
  });
});
