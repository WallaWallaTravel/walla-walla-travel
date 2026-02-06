/**
 * POST /api/driver/tours/[id]/complete
 *
 * Complete a tour and generate tip payment link/QR code
 * Only accessible by the driver assigned to the tour
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  BadRequestError,
  ForbiddenError,
} from '@/lib/api/middleware/error-handler';
import { requireAuth, requireDriver } from '@/lib/api/middleware/auth';
import { validateBody } from '@/lib/api/middleware/validation';
import { tipService } from '@/lib/services/tip.service';
import { CompleteTourSchema } from '@/lib/validation/schemas/tip.schemas';

export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    // Authenticate and authorize
    const session = await requireAuth(request);
    await requireDriver(session);

    const resolvedParams = await params;
    const bookingId = parseInt(resolvedParams.id);

    if (isNaN(bookingId)) {
      throw new BadRequestError('Invalid booking ID');
    }

    // Validate request body
    const data = await validateBody(request, CompleteTourSchema);

    // Check if driver is assigned to this tour
    const isAssigned = await tipService.isDriverAssignedToBooking(session.user.id, bookingId);
    if (!isAssigned) {
      throw new ForbiddenError('You are not assigned to this tour');
    }

    // Check if tour can be completed
    const { canComplete, reason } = await tipService.canCompleteTour(bookingId);
    if (!canComplete) {
      throw new BadRequestError(reason || 'Cannot complete this tour');
    }

    // Check if already completed
    const existingCompletion = await tipService.getTourCompletion(bookingId);
    if (existingCompletion) {
      // Return existing completion data
      return NextResponse.json({
        success: true,
        message: 'Tour already completed',
        completion: existingCompletion,
        timestamp: new Date().toISOString(),
      });
    }

    // Complete the tour
    const completion = await tipService.completeTour({
      booking_id: bookingId,
      driver_id: session.user.id,
      lunch_cost_total: data.lunch_cost_total ?? undefined,
      driver_notes: data.driver_notes ?? undefined,
      tips_enabled: data.tips_enabled,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Tour completed successfully',
        completion,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  }
);
