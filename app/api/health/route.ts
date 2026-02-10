import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/db';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { isStripeConfigured, probeStripeHealth } from '@/lib/stripe';
import { getRateLimitStatus } from '@/lib/api/middleware/rate-limit';
import { logger } from '@/lib/logger';

/**
 * GET /api/health
 * Comprehensive health check endpoint for monitoring and uptime checks.
 *
 * Returns status of:
 * - Database connectivity
 * - Stripe payment processing
 * - Rate limiting subsystem
 * - Overall application status
 */
export const GET = withErrorHandling(async () => {
  const startTime = Date.now();

  // Check all services in parallel
  const [dbHealthy, stripeHealth, rateLimitStatus] = await Promise.all([
    healthCheck().catch(() => false),
    isStripeConfigured() ? probeStripeHealth().catch(() => ({ available: false, latencyMs: 0, error: 'Probe failed' })) : Promise.resolve({ available: false, latencyMs: 0, error: 'Not configured' }),
    Promise.resolve(getRateLimitStatus()),
  ]);

  const checks = {
    database: {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      latencyMs: Date.now() - startTime,
    },
    stripe: {
      status: stripeHealth.available ? 'healthy' : 'degraded',
      latencyMs: stripeHealth.latencyMs,
      configured: isStripeConfigured(),
      ...(stripeHealth.error && !stripeHealth.available ? { error: stripeHealth.error } : {}),
    },
    rate_limiting: {
      status: 'healthy',
      mode: rateLimitStatus.mode,
    },
  };

  // Overall status: unhealthy if DB is down, degraded if Stripe is down
  const overallStatus = !dbHealthy ? 'unhealthy'
    : !stripeHealth.available ? 'degraded'
    : 'healthy';

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime ? Math.floor(process.uptime()) : undefined,
    checks,
    responseTimeMs: Date.now() - startTime,
  };

  if (overallStatus !== 'healthy') {
    logger.warn('[Health] System degraded or unhealthy', response);
  }

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
});
