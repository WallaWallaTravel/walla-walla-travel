/**
 * Payment Options API
 * Returns available payment methods with calculated fees
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { calculatePaymentOptions } from '@/lib/payment/payment-calculator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/payment/options?amount=1000
 * Get payment options for a given amount
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const amountParam = searchParams.get('amount');
    
    if (!amountParam) {
      return NextResponse.json(
        { error: 'amount parameter is required' },
        { status: 400 }
      );
    }
    
    const amount = parseFloat(amountParam);
    
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number' },
        { status: 400 }
      );
    }
    
    const options = await calculatePaymentOptions(amount);
    
    return NextResponse.json({
      success: true,
      amount,
      options
    });
    
  } catch (error) {
    logger.error('Payment Options API error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to calculate payment options', details: message },
      { status: 500 }
    );
  }
}

