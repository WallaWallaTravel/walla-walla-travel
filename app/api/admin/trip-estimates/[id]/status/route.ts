/**
 * Trip Estimate Status API Route
 * POST /api/admin/trip-estimates/[id]/status - Update estimate status
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripEstimateService } from '@/lib/services/trip-estimate.service';
import { TRIP_ESTIMATE_STATUS } from '@/lib/types/trip-estimate';
import { z } from 'zod';

const StatusUpdateSchema = z.object({
  status: z.enum(TRIP_ESTIMATE_STATUS),
  payment_intent_id: z.string().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/trip-estimates/[id]/status
 * Update estimate status
 */
export const POST = withAdminAuth(async (request: NextRequest, _session, context) => {
  const { id } = await (context as RouteContext).params;
  const estimateId = parseInt(id, 10);

  if (isNaN(estimateId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid estimate ID' },
      { status: 400 }
    );
  }

  const body = await request.json();

  const parseResult = StatusUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid status',
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const metadata: Record<string, unknown> = {};
  if (parseResult.data.payment_intent_id) {
    metadata.payment_intent_id = parseResult.data.payment_intent_id;
  }

  const updated = await tripEstimateService.updateStatus(
    estimateId,
    parseResult.data.status,
    Object.keys(metadata).length > 0 ? metadata : undefined
  );

  return NextResponse.json({
    success: true,
    data: updated,
    message: `Status updated to '${parseResult.data.status}'`,
  });
});
