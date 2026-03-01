/**
 * Admin Lunch Orders for a Trip Proposal
 * GET /api/admin/trip-proposals/[id]/lunch
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { NotFoundError } from '@/lib/api/middleware/error-handler';
import { lunchSupplierService } from '@/lib/services/lunch-supplier.service';

export const GET = withAdminAuth(
  async (_request: NextRequest, _session: AuthSession, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await context!.params;
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
