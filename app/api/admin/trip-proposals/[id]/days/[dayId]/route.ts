/**
 * Individual Trip Proposal Day API Routes
 * PATCH /api/admin/trip-proposals/[id]/days/[dayId] - Update day
 * DELETE /api/admin/trip-proposals/[id]/days/[dayId] - Delete day
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { AddDaySchema } from '@/lib/types/trip-proposal';

interface RouteParams {
  params: Promise<{ id: string; dayId: string }>;
}

/**
 * PATCH /api/admin/trip-proposals/[id]/days/[dayId]
 * Update a day
 */
export const PATCH = withAdminAuth(async (request: NextRequest, session, context) => {
  const { dayId } = await (context as unknown as RouteParams).params;
  const dayIdNum = parseInt(dayId, 10);

  if (isNaN(dayIdNum)) {
    return NextResponse.json(
      { success: false, error: 'Invalid day ID' },
      { status: 400 }
    );
  }

  const body = await request.json();

  const parseResult = AddDaySchema.partial().safeParse(body);
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

  const day = await tripProposalService.updateDay(dayIdNum, parseResult.data);

  return NextResponse.json({
    success: true,
    data: day,
    message: 'Day updated successfully',
  });
});

/**
 * DELETE /api/admin/trip-proposals/[id]/days/[dayId]
 * Delete a day and all its stops
 */
export const DELETE = withAdminAuth(async (request: NextRequest, session, context) => {
  const { dayId } = await (context as unknown as RouteParams).params;
  const dayIdNum = parseInt(dayId, 10);

  if (isNaN(dayIdNum)) {
    return NextResponse.json(
      { success: false, error: 'Invalid day ID' },
      { status: 400 }
    );
  }

  await tripProposalService.deleteDay(dayIdNum);

  return NextResponse.json({
    success: true,
    message: 'Day deleted successfully',
  });
});
