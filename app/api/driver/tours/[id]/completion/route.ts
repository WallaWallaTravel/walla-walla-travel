/**
 * GET /api/driver/tours/[id]/completion
 *
 * Get tour completion status and tip payment link/QR code
 * Only accessible by the driver assigned to the tour
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '@/lib/api/middleware/error-handler';
import { requireAuth, requireDriver } from '@/lib/api/middleware/auth';
import { tipService } from '@/lib/services/tip.service';

export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    // Authenticate and authorize
    const session = await requireAuth(request);
    await requireDriver(session);

    const resolvedParams = await params;
    const bookingId = parseInt(resolvedParams.id);

    if (isNaN(bookingId)) {
      throw new BadRequestError('Invalid booking ID');
    }

    // Check if driver is assigned to this tour
    const isAssigned = await tipService.isDriverAssignedToBooking(session.user.id, bookingId);
    if (!isAssigned) {
      throw new ForbiddenError('You are not assigned to this tour');
    }

    // Get tour completion
    const completion = await tipService.getTourCompletion(bookingId);
    if (!completion) {
      throw new NotFoundError('Tour has not been completed yet');
    }

    // Get tips for this booking
    const tips = await tipService.getBookingTips(bookingId);
    const tipTotal = await tipService.getBookingTipTotal(bookingId);

    // Get expenses for this booking
    const expenses = await tipService.getBookingExpenses(bookingId);
    const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return NextResponse.json({
      success: true,
      completion,
      tips: {
        count: tips.length,
        total: tipTotal,
        items: tips,
      },
      expenses: {
        count: expenses.length,
        total: expenseTotal,
        items: expenses,
      },
      timestamp: new Date().toISOString(),
    });
  }
);
