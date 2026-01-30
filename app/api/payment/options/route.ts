/**
 * Payment Options API
 * Returns available payment methods with calculated fees
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { calculatePaymentOptions } from '@/lib/payment/payment-calculator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/payment/options?amount=1000
 * Get payment options for a given amount
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const amountParam = searchParams.get('amount');

  if (!amountParam) {
    throw new BadRequestError('amount parameter is required');
  }

  const amount = parseFloat(amountParam);

  if (isNaN(amount) || amount <= 0) {
    throw new BadRequestError('amount must be a positive number');
  }

  const options = await calculatePaymentOptions(amount);

  return NextResponse.json({
    success: true,
    amount,
    options
  });
});

