import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { getRequestId } from '@/lib/api/middleware/request-context';
import {
  getComprehensiveHealth,
  runHealthProbes,
  getCircuitBreakerStates,
  resetCircuitBreaker,
} from '@/lib/services/health.service';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/health
 * Returns comprehensive system health status including:
 * - Service health probes (database, email, stripe)
 * - Circuit breaker states
 * - Redis connection status
 * - Database pool statistics
 * - Response time metrics
 */
export const GET = withErrorHandling(async (_request: Request) => {
  const requestId = getRequestId();
  const startTime = Date.now();

  try {
    // Run health probes in parallel
    const [healthProbes, circuitBreakers, comprehensiveHealth] = await Promise.all([
      runHealthProbes(),
      getCircuitBreakerStates(),
      getComprehensiveHealth(),
    ]);

    // Get database pool statistics (if available)
    let dbPoolStats = null;
    try {
      // Prisma doesn't expose pool metrics directly, but we can check connection
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStart;
      dbPoolStats = {
        connected: true,
        latencyMs: dbLatency,
      };
    } catch (error) {
      dbPoolStats = {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Get Redis statistics
    const redisStatus = redis.getStatus();
    let redisLatency = null;
    if (redisStatus.available) {
      try {
        const redisStart = Date.now();
        await redis.set('health_check_ping', Date.now(), { ex: 10 });
        await redis.get('health_check_ping');
        redisLatency = Date.now() - redisStart;
      } catch {
        redisLatency = -1; // Error
      }
    }

    // Calculate response time percentiles from recent probes
    const responseTimeMetrics = {
      database: {
        current: healthProbes.database.latencyMs,
        status: healthProbes.database.latencyMs < 100 ? 'fast' :
                healthProbes.database.latencyMs < 500 ? 'normal' : 'slow',
      },
      email: {
        current: healthProbes.email.latencyMs,
        status: healthProbes.email.latencyMs < 200 ? 'fast' :
                healthProbes.email.latencyMs < 1000 ? 'normal' : 'slow',
      },
      stripe: {
        current: healthProbes.stripe.latencyMs,
        status: healthProbes.stripe.latencyMs < 200 ? 'fast' :
                healthProbes.stripe.latencyMs < 1000 ? 'normal' : 'slow',
      },
    };

    // Build overall status
    const criticalServices = {
      database: healthProbes.database.available,
      redis: redisStatus.available,
    };

    const importantServices = {
      stripe: healthProbes.stripe.available,
      email: healthProbes.email.available,
    };

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const issues: string[] = [];

    // Check critical services
    if (!criticalServices.database) {
      overallStatus = 'unhealthy';
      issues.push('Database unavailable');
    }
    if (!criticalServices.redis) {
      if (overallStatus !== 'unhealthy') overallStatus = 'degraded';
      issues.push('Redis unavailable - using in-memory fallback');
    }

    // Check important services
    if (!importantServices.stripe) {
      if (overallStatus !== 'unhealthy') overallStatus = 'degraded';
      issues.push('Stripe unavailable - payments affected');
    }
    if (!importantServices.email) {
      if (overallStatus !== 'unhealthy') overallStatus = 'degraded';
      issues.push('Email service unavailable');
    }

    // Check circuit breakers
    const openCircuits = Object.entries(circuitBreakers)
      .filter(([, state]) => state.isOpen)
      .map(([service]) => service);

    if (openCircuits.length > 0) {
      if (overallStatus !== 'unhealthy') overallStatus = 'degraded';
      issues.push(`Circuit breakers open: ${openCircuits.join(', ')}`);
    }

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      requestId,
      checkDurationMs: Date.now() - startTime,

      services: {
        database: {
          available: healthProbes.database.available,
          latencyMs: healthProbes.database.latencyMs,
          error: healthProbes.database.error,
        },
        stripe: {
          available: healthProbes.stripe.available,
          latencyMs: healthProbes.stripe.latencyMs,
          error: healthProbes.stripe.error,
        },
        email: {
          available: healthProbes.email.available,
          latencyMs: healthProbes.email.latencyMs,
          error: healthProbes.email.error,
        },
        redis: {
          available: redisStatus.available,
          mode: redisStatus.mode,
          latencyMs: redisLatency,
        },
      },

      circuitBreakers,

      metrics: {
        responseTimes: responseTimeMetrics,
        dbPool: dbPoolStats,
      },

      issues,

      // Include service health history from the service
      serviceHealth: comprehensiveHealth.services,
    };

    logger.info('Health check completed', {
      requestId,
      status: overallStatus,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Health check failed', { requestId, error });
    throw error;
  }
});

/**
 * POST /api/admin/health
 * Admin actions for health management
 * - Reset circuit breakers
 */
export const POST = withErrorHandling(async (request: Request) => {
  const requestId = getRequestId();
  const body = await request.json();

  if (body.action === 'reset_circuit_breaker' && body.service) {
    await resetCircuitBreaker(body.service);
    logger.info('Circuit breaker reset', {
      requestId,
      service: body.service,
    });
    return NextResponse.json({
      success: true,
      message: `Circuit breaker reset for ${body.service}`,
    });
  }

  return NextResponse.json({
    success: false,
    message: 'Invalid action',
  }, { status: 400 });
});
