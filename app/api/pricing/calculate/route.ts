/**
 * Pricing Calculation API
 * Calculate prices using dynamic pricing system
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import {
  calculateWineTourPrice,
  calculateTransferPrice,
  calculateWaitTimePrice
} from '@/lib/pricing/pricing-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/pricing/calculate
 * Calculate price for a service
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { serviceType, ...params } = body;

  let result;

  switch (serviceType) {
    case 'wine_tour':
      result = await calculateWineTourPrice({
        partySize: params.partySize,
        durationHours: params.durationHours,
        date: new Date(params.date),
        applyModifiers: params.applyModifiers ?? false,
        advanceDays: params.advanceDays ?? 0
      });
      break;

    case 'airport_transfer':
    case 'transfer':
      result = await calculateTransferPrice({
        transferType: params.transferType,
        partySize: params.partySize,
        date: new Date(params.date),
        applyModifiers: params.applyModifiers ?? false
      });
      break;

    case 'wait_time':
      result = await calculateWaitTimePrice({
        hours: params.hours,
        partySize: params.partySize,
        date: new Date(params.date)
      });
      break;

    default:
      throw new BadRequestError(`Unknown service type: ${serviceType}`);
  }

  return NextResponse.json({
    success: true,
    ...result
  });
});

