/**
 * Admin Lunch Orders for a Trip Proposal
 * GET /api/admin/trip-proposals/[id]/lunch
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext, NotFoundError } from '@/lib/api/middleware/error-handler';
import { lunchSupplierService } from '@/lib/services/lunch-supplier.service';

interface RouteParams {
  id: string;
}

export const GET = withErrorHandling<unknown, RouteParams>(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const { id } = await context.params;
    const proposalId = parseInt(id, 10);

    if (isNaN(proposalId)) {
      throw new NotFoundError('Invalid proposal ID');
    }

    const orders = await lunchSupplierService.getOrdersForProposal(proposalId);

    return NextResponse.json({
      success: true,
      data: { orders },
    });
  }
);
