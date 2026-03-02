/**
 * Stripe Error Handler
 *
 * Provides consistent error responses across all Stripe payment routes.
 * Discriminates between Stripe error types to return appropriate HTTP
 * status codes and user-safe messages.
 */

import Stripe from 'stripe';
import { logger } from '@/lib/logger';

interface StripeErrorResponse {
  status: number;
  message: string;
  code: string;
  retryable: boolean;
}

/**
 * Classify a Stripe error into an HTTP response.
 *
 * - Card errors     → 402 (user can fix: declined, expired, etc.)
 * - Rate limit      → 429 (transient, retry)
 * - Invalid request → 400 (bad params — bug or stale data)
 * - Auth error      → 503 (server config problem — don't leak details)
 * - API error       → 503 (Stripe outage — retry later)
 * - Unknown         → 503 (generic fallback)
 */
export function handleStripeError(
  error: unknown,
  context?: Record<string, unknown>
): StripeErrorResponse {
  if (error instanceof Stripe.errors.StripeCardError) {
    logger.warn('Stripe card error', { code: error.code, decline_code: error.decline_code, ...context });
    return {
      status: 402,
      message: error.message || 'Your card was declined. Please try a different payment method.',
      code: 'card_error',
      retryable: false,
    };
  }

  if (error instanceof Stripe.errors.StripeRateLimitError) {
    logger.warn('Stripe rate limit', context);
    return {
      status: 429,
      message: 'Please try again in a moment.',
      code: 'rate_limit',
      retryable: true,
    };
  }

  if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    logger.error('Stripe invalid request', { message: error.message, param: error.param, ...context });
    return {
      status: 400,
      message: 'There was an issue processing your payment. Please try again or contact support.',
      code: 'invalid_request',
      retryable: false,
    };
  }

  if (error instanceof Stripe.errors.StripeAuthenticationError) {
    logger.error('Stripe authentication error — check API keys', context);
    return {
      status: 503,
      message: 'Payment service configuration error. Please contact support.',
      code: 'auth_error',
      retryable: false,
    };
  }

  if (error instanceof Stripe.errors.StripeAPIError) {
    logger.error('Stripe API error', { message: (error as Error).message, ...context });
    return {
      status: 503,
      message: 'Payment service temporarily unavailable. Please try again shortly.',
      code: 'api_error',
      retryable: true,
    };
  }

  // Unknown / non-Stripe error
  logger.error('Unexpected payment error', {
    error: error instanceof Error ? error.message : String(error),
    ...context,
  });
  return {
    status: 503,
    message: 'Payment service temporarily unavailable. Please try again shortly.',
    code: 'unknown_error',
    retryable: true,
  };
}
