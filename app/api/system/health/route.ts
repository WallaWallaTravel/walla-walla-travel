import { NextResponse } from 'next/server';
import { 
  runAllHealthChecks, 
  logHealthCheck, 
  getOverallHealth,
  type HealthCheckResult 
} from '@/lib/monitoring/health-checks';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system/health
 * 
 * Comprehensive system health check
 * Runs all health checks and returns detailed status
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Run all health checks
    const checks = await runAllHealthChecks();
    
    // Log each check to database (for historical tracking)
    await Promise.all(checks.map(check => logHealthCheck(check)));
    
    // Determine overall health
    const overallStatus = getOverallHealth(checks);
    
    const duration = Date.now() - startTime;
    
    // Return appropriate HTTP status based on health
    const httpStatus = 
      overallStatus === 'healthy' ? 200 :
      overallStatus === 'degraded' ? 200 : 503;
    
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
    }, { status: httpStatus });
    
  } catch (error: any) {
    console.error('[Health Check] Critical error:', error);
    
    return NextResponse.json({
      status: 'down',
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      error: 'Health check system failure',
      details: error.message
    }, { status: 503 });
  }
}

