/**
 * Trip Estimate Conversion API Route
 * POST /api/admin/trip-estimates/[id]/convert - Convert to trip proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripEstimateService } from '@/lib/services/trip-estimate.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/trip-estimates/[id]/convert
 * Convert a deposit-paid estimate to a trip proposal
 */
export const POST = withAdminAuth(async (_request: NextRequest, session, context) => {
  const { id } = await (context as RouteContext).params;
  const estimateId = parseInt(id, 10);

  if (isNaN(estimateId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid estimate ID' },
      { status: 400 }
    );
  }

  const result = await tripEstimateService.convertToProposal(
    estimateId,
    session?.userId ? parseInt(session.userId, 10) : undefined
  );

  return NextResponse.json({
    success: true,
    data: result,
    message: 'Trip estimate converted to proposal successfully',
  });
});
