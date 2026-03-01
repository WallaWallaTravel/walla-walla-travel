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
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

const BodySchema = z.object({
  serviceType: z.enum(['wine_tour', 'airport_transfer', 'transfer', 'wait_time']),
  partySize: z.number().int().positive(),
  durationHours: z.number().positive().optional(),
  date: z.string().min(1),
  applyModifiers: z.boolean().optional(),
  advanceDays: z.number().int().nonnegative().optional(),
  transferType: z.string().optional(),
  hours: z.number().positive().optional(),
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/pricing/calculate
 * Calculate price for a service
 */
export const POST = withCSRF(
  withErrorHandling(async (request: NextRequest) => {
  const body = BodySchema.parse(await request.json());
  const { serviceType, ...params } = body;

  let result;

  switch (serviceType) {
    case 'wine_tour':
      result = await calculateWineTourPrice({
        partySize: params.partySize,
        durationHours: params.durationHours!,
        date: new Date(params.date),
        applyModifiers: params.applyModifiers ?? false,
        advanceDays: params.advanceDays ?? 0
      });
      break;

    case 'airport_transfer':
    case 'transfer':
      result = await calculateTransferPrice({
        transferType: params.transferType!,
        partySize: params.partySize,
        date: new Date(params.date),
        applyModifiers: params.applyModifiers ?? false
      });
      break;

    case 'wait_time':
      result = await calculateWaitTimePrice({
        hours: params.hours!,
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
})
);

