/**
 * Trip Estimate Detail API Routes
 * GET /api/admin/trip-estimates/[id] - Get estimate details
 * PATCH /api/admin/trip-estimates/[id] - Update estimate
 * DELETE /api/admin/trip-estimates/[id] - Delete draft estimate
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripEstimateService } from '@/lib/services/trip-estimate.service';
import { UpdateTripEstimateSchema } from '@/lib/types/trip-estimate';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/trip-estimates/[id]
 * Get full estimate details
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session, context) => {
  const { id } = await (context as RouteContext).params;
  const estimateId = parseInt(id, 10);

  if (isNaN(estimateId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid estimate ID' },
      { status: 400 }
    );
  }

  const estimate = await tripEstimateService.getFullDetails(estimateId);

  if (!estimate) {
    return NextResponse.json(
      { success: false, error: 'Trip estimate not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: estimate,
  });
});

/**
 * PATCH /api/admin/trip-estimates/[id]
 * Update estimate
 */
export const PATCH = withAdminAuth(async (request: NextRequest, _session, context) => {
  const { id } = await (context as RouteContext).params;
  const estimateId = parseInt(id, 10);

  if (isNaN(estimateId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid estimate ID' },
      { status: 400 }
    );
  }

  const body = await request.json();

  const parseResult = UpdateTripEstimateSchema.safeParse(body);
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

  const updated = await tripEstimateService.updateEstimate(estimateId, parseResult.data);

  return NextResponse.json({
    success: true,
    data: updated,
    message: 'Trip estimate updated successfully',
  });
});

/**
 * DELETE /api/admin/trip-estimates/[id]
 * Delete a draft estimate
 */
export const DELETE = withAdminAuth(async (_request: NextRequest, _session, context) => {
  const { id } = await (context as RouteContext).params;
  const estimateId = parseInt(id, 10);

  if (isNaN(estimateId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid estimate ID' },
      { status: 400 }
    );
  }

  await tripEstimateService.deleteEstimate(estimateId);

  return NextResponse.json({
    success: true,
    message: 'Trip estimate deleted successfully',
  });
});
