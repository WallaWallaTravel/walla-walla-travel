/**
 * POST /api/tips/[code]/create-payment-intent
 *
 * Create a Stripe payment intent for a tip payment
 * No authentication required - validates the tip code
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  NotFoundError,
  BadRequestError,
} from '@/lib/api/middleware/error-handler';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { validateBody } from '@/lib/api/middleware/validation';
import { tipService } from '@/lib/services/tip.service';
import {
  TipCodeSchema,
  CreateTipPaymentIntentSchema,
} from '@/lib/validation/schemas/tip.schemas';

export const POST = withRateLimit(rateLimiters.payment)(
  withErrorHandling(
    async (request: NextRequest, { params }: { params: Promise<{ code: string }> }) => {
      const resolvedParams = await params;
      const code = resolvedParams.code.toUpperCase();

      // Validate tip code format
      const codeResult = TipCodeSchema.safeParse(code);
      if (!codeResult.success) {
        throw new BadRequestError('Invalid tip code format');
      }

      // Validate request body
      const data = await validateBody(request, CreateTipPaymentIntentSchema);

      // Validate tip amount
      if (data.amount < 1) {
        throw new BadRequestError('Tip amount must be at least $1');
      }

      if (data.amount > 1000) {
        throw new BadRequestError('Tip amount cannot exceed $1,000');
      }

      // Verify the tip code is valid
      const pageData = await tipService.getTipPageData(code);
      if (!pageData) {
        throw new NotFoundError('Invalid or expired tip code');
      }

      if (!pageData.tips_enabled) {
        throw new BadRequestError('Tips are not enabled for this tour');
      }

      // Create payment intent
      const paymentResult = await tipService.createTipPaymentIntent(
        code,
        data.amount,
        data.guest_name
      );

      return NextResponse.json({
        success: true,
        data: {
          client_secret: paymentResult.client_secret,
          payment_intent_id: paymentResult.payment_intent_id,
          amount: paymentResult.amount,
        },
        timestamp: new Date().toISOString(),
      });
    }
  )
);
