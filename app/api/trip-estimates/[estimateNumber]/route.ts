/**
 * Client-Facing Trip Estimate API Route
 * GET /api/trip-estimates/[estimateNumber] - View estimate (public)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext } from '@/lib/api/middleware/error-handler';
import { tripEstimateService } from '@/lib/services/trip-estimate.service';

interface RouteParams {
  estimateNumber: string;
}

/**
 * GET /api/trip-estimates/[estimateNumber]
 * Public route for clients to view their estimate summary and deposit info.
 * Does NOT expose individual line items — only trip summary + deposit amount.
 */
export const GET = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { estimateNumber } = await context.params;

    if (!estimateNumber || !estimateNumber.startsWith('TE-')) {
      return NextResponse.json(
        { success: false, error: 'Invalid estimate number' },
        { status: 400 }
      );
    }

    const estimate = await tripEstimateService.getByNumber(estimateNumber);

    if (!estimate) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      );
    }

    // Only allow viewing of sent/viewed/deposit_paid estimates
    if (!['sent', 'viewed', 'deposit_paid'].includes(estimate.status)) {
      return NextResponse.json(
        { success: false, error: 'Estimate not available' },
        { status: 404 }
      );
    }

    // Mark as viewed if currently sent
    if (estimate.status === 'sent') {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown';

      await tripEstimateService.updateStatus(estimate.id, 'viewed', {
        ip_address: ip,
      });
    }

    // Return client-safe data (no individual line items, no internal data)
    return NextResponse.json({
      success: true,
      data: {
        estimate_number: estimate.estimate_number,
        status: estimate.status,
        customer_name: estimate.customer_name,
        trip_type: estimate.trip_type,
        trip_title: estimate.trip_title,
        trip_description: estimate.trip_description,
        start_date: estimate.start_date,
        end_date: estimate.end_date,
        party_size: estimate.party_size,
        deposit_amount: estimate.deposit_amount,
        deposit_reason: estimate.deposit_reason,
        deposit_paid: estimate.deposit_paid,
        deposit_paid_at: estimate.deposit_paid_at,
        valid_until: estimate.valid_until,
      },
    });
  }
);
