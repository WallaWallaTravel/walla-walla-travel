import { NextResponse } from 'next/server';
import { withErrorHandling, ServiceUnavailableError } from '@/lib/api/middleware/error-handler';
import {
  runAllHealthChecks,
  logHealthCheck,
  getOverallHealth
} from '@/lib/monitoring/health-checks';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system/health
 *
 * Comprehensive system health check
 * Runs all health checks and returns detailed status
 */
export const GET = withErrorHandling(async () => {
  const startTime = Date.now();

  // Run all health checks
  const checks = await runAllHealthChecks();

  // Log each check to database (for historical tracking)
  await Promise.all(checks.map(check => logHealthCheck(check)));

  // Determine overall health
  const overallStatus = getOverallHealth(checks);

  const duration = Date.now() - startTime;

  // For down status, throw ServiceUnavailableError
  if (overallStatus === 'down') {
    throw new ServiceUnavailableError('System health check failed');
  }

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    duration,
    checks: checks.map(check => ({
      type: check.checkType,
      name: check.checkName,
      status: check.status,
      responseTime: check.responseTimeMs,
      error: check.errorMessage,
      metadata: check.metadata
    }))
  });
});

