import { logger } from '@/lib/logger';
import { circuitBreaker as redisCircuitBreaker, isRedisAvailable, redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

/**
 * Service Health Monitoring with Redis Persistence
 *
 * @module lib/services/health.service
 * @description Provides health checks and graceful degradation for external services.
 * Uses Redis for distributed circuit breaker state across Vercel instances.
 *
 * @features
 * - Service health status tracking
 * - Graceful error responses when services are down
 * - Retry logic with exponential backoff
 * - Distributed circuit breaker pattern (Redis-backed)
 * - Fallback to in-memory when Redis unavailable
 */

interface ServiceStatus {
  name: string;
  healthy: boolean;
  lastCheck: Date;
  lastError?: string;
  consecutiveFailures: number;
}

interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date | null;
  halfOpenUntil: Date | null;
}

// Service status cache (local, refreshed on each check)
const serviceStatus: Map<string, ServiceStatus> = new Map();

// In-memory circuit breaker fallback
const localCircuitBreakers: Map<string, CircuitBreakerState> = new Map();

// Default circuit breaker config
const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_RESET_TIMEOUT = 30000; // 30 seconds

/**
 * Check if Stripe is configured and available
 */
export async function isStripeAvailable(): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY) {
    updateStatus('stripe', false, 'STRIPE_SECRET_KEY not configured');
    return false;
  }

  // Check circuit breaker
  if (await isCircuitOpen('stripe')) {
    logger.warn('Stripe circuit breaker is open');
    return false;
  }

  const status = serviceStatus.get('stripe');
  if (status && status.healthy && isRecent(status.lastCheck, 60000)) {
    return true; // Use cached status if recent
  }

  // Stripe is configured, assume available (actual check happens on API call)
  updateStatus('stripe', true);
  return true;
}

/**
 * Check if Supabase is configured and available
 */
export async function isSupabaseAvailable(): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    updateStatus('supabase', false, 'Supabase credentials not configured');
    return false;
  }

  // Check circuit breaker
  if (await isCircuitOpen('supabase')) {
    logger.warn('Supabase circuit breaker is open');
    return false;
  }

  const status = serviceStatus.get('supabase');
  if (status && status.healthy && isRecent(status.lastCheck, 60000)) {
    return true;
  }

  updateStatus('supabase', true);
  return true;
}

/**
 * Check if the database is available
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    updateStatus('database', false, 'DATABASE_URL not configured');
    return false;
  }

  if (await isCircuitOpen('database')) {
    logger.warn('Database circuit breaker is open');
    return false;
  }

  // For database, we rely on the connection pool
  updateStatus('database', true);
  return true;
}

/**
 * Check if email service (Postmark) is available
 */
export async function isEmailAvailable(): Promise<boolean> {
  if (!process.env.POSTMARK_API_KEY) {
    updateStatus('email', false, 'POSTMARK_API_KEY not configured');
    return false;
  }

  if (await isCircuitOpen('email')) {
    logger.warn('Email circuit breaker is open');
    return false;
  }

  updateStatus('email', true);
  return true;
}

/**
 * Check if Redis is available
 */
export function isRedisHealthy(): boolean {
  return isRedisAvailable();
}

/**
 * Record a service failure (for circuit breaker)
 * Persists state to Redis for distributed coordination
 */
export async function recordServiceFailure(serviceName: string, error?: Error): Promise<void> {
  // Try Redis first for distributed state
  if (isRedisAvailable()) {
    try {
      const result = await redisCircuitBreaker.recordFailure(
        serviceName,
        DEFAULT_FAILURE_THRESHOLD,
        DEFAULT_RESET_TIMEOUT
      );

      updateStatus(serviceName, false, error?.message || 'Unknown error');

      if (result.isOpen) {
        logger.error(`Circuit breaker OPENED for ${serviceName} after ${result.failureCount} failures (distributed)`);
      }
      return;
    } catch (redisError) {
      logger.error('Failed to record failure in Redis, using local fallback', { error: redisError });
    }
  }

  // Fallback to in-memory
  let breaker = localCircuitBreakers.get(serviceName);

  if (!breaker) {
    breaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      halfOpenUntil: null,
    };
    localCircuitBreakers.set(serviceName, breaker);
  }

  breaker.failureCount++;
  breaker.lastFailureTime = new Date();

  if (breaker.failureCount >= DEFAULT_FAILURE_THRESHOLD) {
    breaker.isOpen = true;
    breaker.halfOpenUntil = new Date(Date.now() + DEFAULT_RESET_TIMEOUT);
    logger.error(`Circuit breaker OPENED for ${serviceName} after ${breaker.failureCount} failures (local)`);
  }

  updateStatus(serviceName, false, error?.message || 'Unknown error');
}

/**
 * Record a service success (resets circuit breaker)
 * Persists state to Redis for distributed coordination
 */
export async function recordServiceSuccess(serviceName: string): Promise<void> {
  // Try Redis first
  if (isRedisAvailable()) {
    try {
      await redisCircuitBreaker.recordSuccess(serviceName);
      updateStatus(serviceName, true);
      return;
    } catch (redisError) {
      logger.error('Failed to record success in Redis, using local fallback', { error: redisError });
    }
  }

  // Fallback to in-memory
  const breaker = localCircuitBreakers.get(serviceName);

  if (breaker) {
    breaker.failureCount = 0;
    breaker.isOpen = false;
    breaker.halfOpenUntil = null;
  }

  updateStatus(serviceName, true);
}

/**
 * Check if circuit breaker is open (blocking requests)
 * Checks Redis first, falls back to local state
 */
async function isCircuitOpen(serviceName: string): Promise<boolean> {
  // Try Redis first
  if (isRedisAvailable()) {
    try {
      return await redisCircuitBreaker.isOpen(serviceName);
    } catch (redisError) {
      logger.error('Failed to check circuit in Redis, using local fallback', { error: redisError });
    }
  }

  // Fallback to in-memory
  const breaker = localCircuitBreakers.get(serviceName);

  if (!breaker || !breaker.isOpen) {
    return false;
  }

  // Check if reset timeout has passed (half-open state)
  if (breaker.halfOpenUntil) {
    const now = new Date();
    if (now >= breaker.halfOpenUntil) {
      // Allow a probe request
      logger.info(`Circuit breaker HALF-OPEN for ${serviceName}, allowing probe (local)`);
      return false;
    }
  }

  return true;
}

/**
 * Update service status
 */
function updateStatus(serviceName: string, healthy: boolean, error?: string): void {
  const existing = serviceStatus.get(serviceName);

  serviceStatus.set(serviceName, {
    name: serviceName,
    healthy,
    lastCheck: new Date(),
    lastError: error,
    consecutiveFailures: healthy ? 0 : (existing?.consecutiveFailures || 0) + 1,
  });
}

/**
 * Check if a timestamp is recent (within threshold)
 */
function isRecent(timestamp: Date, thresholdMs: number): boolean {
  return Date.now() - timestamp.getTime() < thresholdMs;
}

/**
 * Get health status for all services
 */
export function getServiceHealth(): Record<string, ServiceStatus> {
  const result: Record<string, ServiceStatus> = {};
  serviceStatus.forEach((status, name) => {
    result[name] = { ...status };
  });
  return result;
}

/**
 * Get circuit breaker states for all services
 * Fetches from Redis when available
 */
export async function getCircuitBreakerStates(): Promise<
  Record<string, { isOpen: boolean; failureCount: number; mode: 'redis' | 'memory' }>
> {
  const services = ['stripe', 'supabase', 'database', 'email'];
  const result: Record<string, { isOpen: boolean; failureCount: number; mode: 'redis' | 'memory' }> = {};

  for (const service of services) {
    // Try Redis first
    if (isRedisAvailable()) {
      try {
        const state = await redisCircuitBreaker.getState(service);
        result[service] = {
          isOpen: state?.isOpen ?? false,
          failureCount: state?.failureCount ?? 0,
          mode: 'redis',
        };
        continue;
      } catch {
        // Fall through to local
      }
    }

    // Fallback to local
    const local = localCircuitBreakers.get(service);
    result[service] = {
      isOpen: local?.isOpen ?? false,
      failureCount: local?.failureCount ?? 0,
      mode: 'memory',
    };
  }

  return result;
}

/**
 * Manually reset circuit breaker for a service
 * Useful for admin operations
 */
export async function resetCircuitBreaker(serviceName: string): Promise<void> {
  // Reset in Redis
  if (isRedisAvailable()) {
    try {
      await redisCircuitBreaker.recordSuccess(serviceName);
    } catch (error) {
      logger.error(`Failed to reset circuit breaker in Redis for ${serviceName}`, { error });
    }
  }

  // Reset local
  localCircuitBreakers.delete(serviceName);
  updateStatus(serviceName, true);

  logger.info(`Circuit breaker manually reset for ${serviceName}`);
}

/**
 * Wrapper for operations that might fail due to external service issues
 * Provides automatic retry with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  serviceName: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      await recordServiceSuccess(serviceName);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
        logger.warn(`${serviceName} attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: lastError.message,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  await recordServiceFailure(serviceName, lastError!);
  throw lastError;
}

/**
 * Standard error response for service unavailability
 */
export function serviceUnavailableResponse(serviceName: string): {
  success: false;
  error: string;
  code: string;
  retryAfter?: number;
} {
  return {
    success: false,
    error: `${serviceName} is temporarily unavailable. Please try again in a few moments.`,
    code: 'SERVICE_UNAVAILABLE',
    retryAfter: 30,
  };
}

/**
 * Get comprehensive health check data
 * Used by admin health dashboard
 */
export async function getComprehensiveHealth(): Promise<{
  services: Record<string, ServiceStatus>;
  circuitBreakers: Record<string, { isOpen: boolean; failureCount: number; mode: 'redis' | 'memory' }>;
  redis: { available: boolean; mode: 'redis' | 'memory' };
  timestamp: string;
}> {
  return {
    services: getServiceHealth(),
    circuitBreakers: await getCircuitBreakerStates(),
    redis: redis.getStatus(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Probe database with actual query
 */
export async function probeDatabaseHealth(): Promise<{
  available: boolean;
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();

  if (!process.env.DATABASE_URL) {
    return { available: false, latencyMs: 0, error: 'DATABASE_URL not configured' };
  }

  try {
    // Execute a lightweight query
    await prisma.$queryRaw`SELECT 1 as health_check`;
    const latencyMs = Date.now() - startTime;
    await recordServiceSuccess('database');
    return { available: true, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    await recordServiceFailure('database', error instanceof Error ? error : undefined);
    return { available: false, latencyMs, error: errorMessage };
  }
}

/**
 * Probe email service (Postmark) with API call
 */
export async function probeEmailHealth(): Promise<{
  available: boolean;
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();

  if (!process.env.POSTMARK_API_KEY) {
    return { available: false, latencyMs: 0, error: 'POSTMARK_API_KEY not configured' };
  }

  try {
    // Check Postmark server status via their API
    const response = await fetch('https://api.postmarkapp.com/server', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Postmark-Server-Token': process.env.POSTMARK_API_KEY,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      await recordServiceSuccess('email');
      return { available: true, latencyMs };
    }

    const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    await recordServiceFailure('email', new Error(errorMessage));
    return { available: false, latencyMs, error: errorMessage };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    await recordServiceFailure('email', error instanceof Error ? error : undefined);
    return { available: false, latencyMs, error: errorMessage };
  }
}

/**
 * Run all service probes and return detailed health status
 */
export async function runHealthProbes(): Promise<{
  database: { available: boolean; latencyMs: number; error?: string };
  email: { available: boolean; latencyMs: number; error?: string };
  stripe: { available: boolean; latencyMs: number; error?: string };
  redis: { available: boolean; mode: 'redis' | 'memory' };
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
}> {
  // Run probes in parallel for efficiency
  const [databaseProbe, emailProbe] = await Promise.all([
    probeDatabaseHealth(),
    probeEmailHealth(),
  ]);

  // Import stripe probe dynamically to avoid circular dependency
  let stripeProbe: { available: boolean; latencyMs: number; error?: string } = {
    available: false,
    latencyMs: 0,
    error: 'Not probed',
  };
  try {
    const { probeStripeHealth } = await import('@/lib/stripe');
    stripeProbe = await probeStripeHealth();
    if (stripeProbe.available) {
      await recordServiceSuccess('stripe');
    } else if (stripeProbe.error) {
      await recordServiceFailure('stripe', new Error(stripeProbe.error));
    }
  } catch (error) {
    stripeProbe = {
      available: false,
      latencyMs: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const redisStatus = redis.getStatus();

  // Calculate overall health
  const criticalServices = [databaseProbe.available];
  const importantServices = [stripeProbe.available, emailProbe.available];

  let overall: 'healthy' | 'degraded' | 'unhealthy';
  if (!criticalServices.every(Boolean)) {
    overall = 'unhealthy';
  } else if (!importantServices.every(Boolean)) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  return {
    database: databaseProbe,
    email: emailProbe,
    stripe: stripeProbe,
    redis: redisStatus,
    overall,
    timestamp: new Date().toISOString(),
  };
}

export const healthService = {
  isStripeAvailable,
  isSupabaseAvailable,
  isDatabaseAvailable,
  isEmailAvailable,
  isRedisHealthy,
  recordServiceFailure,
  recordServiceSuccess,
  resetCircuitBreaker,
  getServiceHealth,
  getCircuitBreakerStates,
  getComprehensiveHealth,
  probeDatabaseHealth,
  probeEmailHealth,
  runHealthProbes,
  withRetry,
  serviceUnavailableResponse,
};
