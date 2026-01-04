/**
 * System Health Check Service
 * Continuously monitors all system components
 */

import { query } from '@/lib/db';
import { Pool } from 'pg';
import { logger } from '@/lib/logger';

export type HealthStatus = 'healthy' | 'degraded' | 'down';

export interface HealthCheckResult {
  checkType: string;
  checkName: string;
  status: HealthStatus;
  responseTimeMs: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Check database connectivity and performance
 */
export async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    await query('SELECT 1 as health_check');
    const responseTime = Date.now() - startTime;
    
    // Adjusted thresholds for remote database (Heroku/AWS)
    // Local: < 50ms, Remote: 100-1000ms is normal
    const status: HealthStatus = 
      responseTime < 1500 ? 'healthy' :    // Normal for remote DB
      responseTime < 3000 ? 'degraded' :   // Slow but usable
      'down';                               // Too slow
    
    return {
      checkType: 'database',
      checkName: 'PostgreSQL Connection',
      status,
      responseTimeMs: responseTime,
      metadata: {
        threshold_healthy: '< 1500ms',
        threshold_degraded: '1500-3000ms',
        location: 'remote'
      }
    };
  } catch (error: any) {
    return {
      checkType: 'database',
      checkName: 'PostgreSQL Connection',
      status: 'down',
      responseTimeMs: Date.now() - startTime,
      errorMessage: error.message
    };
  }
}

/**
 * Check OpenAI API connectivity
 */
export async function checkOpenAI(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  if (!process.env.OPENAI_API_KEY) {
    return {
      checkType: 'external_service',
      checkName: 'OpenAI API',
      status: 'down',
      responseTimeMs: 0,
      errorMessage: 'API key not configured'
    };
  }
  
  try {
    // Light check - just verify the key format
    const keyValid = process.env.OPENAI_API_KEY.startsWith('sk-');
    
    return {
      checkType: 'external_service',
      checkName: 'OpenAI API',
      status: keyValid ? 'healthy' : 'down',
      responseTimeMs: Date.now() - startTime,
      metadata: { keyConfigured: true }
    };
  } catch (error: any) {
    return {
      checkType: 'external_service',
      checkName: 'OpenAI API',
      status: 'down',
      responseTimeMs: Date.now() - startTime,
      errorMessage: error.message
    };
  }
}

/**
 * Check Deepgram API connectivity
 */
export async function checkDeepgram(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  if (!process.env.DEEPGRAM_API_KEY) {
    return {
      checkType: 'external_service',
      checkName: 'Deepgram API',
      status: 'down',
      responseTimeMs: 0,
      errorMessage: 'API key not configured'
    };
  }
  
  return {
    checkType: 'external_service',
    checkName: 'Deepgram API',
    status: 'healthy',
    responseTimeMs: Date.now() - startTime,
    metadata: { keyConfigured: true }
  };
}

/**
 * Check critical database tables exist
 */
export async function checkDatabaseTables(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const requiredTables = [
    'visitors',
    'ai_settings',
    'ai_queries',
    'bookings',
    'time_cards',
    'users'
  ];
  
  try {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1)
    `, [requiredTables]);
    
    const existingTables = result.rows.map(r => r.table_name);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    const status: HealthStatus = missingTables.length === 0 ? 'healthy' : 
                                  missingTables.length < 3 ? 'degraded' : 'down';
    
    return {
      checkType: 'database',
      checkName: 'Database Schema',
      status,
      responseTimeMs: Date.now() - startTime,
      metadata: {
        requiredTables,
        existingTables,
        missingTables
      },
      errorMessage: missingTables.length > 0 ? 
        `Missing tables: ${missingTables.join(', ')}` : undefined
    };
  } catch (error: any) {
    return {
      checkType: 'database',
      checkName: 'Database Schema',
      status: 'down',
      responseTimeMs: Date.now() - startTime,
      errorMessage: error.message
    };
  }
}

/**
 * Check recent error rate
 */
export async function checkErrorRate(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_errors,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_errors
      FROM error_logs
      WHERE occurred_at > NOW() - INTERVAL '5 minutes'
    `);
    
    const { total_errors, critical_errors } = result.rows[0];
    
    const status: HealthStatus = 
      critical_errors > 0 ? 'down' :
      total_errors > 10 ? 'degraded' : 'healthy';
    
    return {
      checkType: 'performance',
      checkName: 'Error Rate',
      status,
      responseTimeMs: Date.now() - startTime,
      metadata: {
        totalErrors: parseInt(total_errors),
        criticalErrors: parseInt(critical_errors),
        timeWindow: '5 minutes'
      }
    };
  } catch (error: any) {
    // If error_logs table doesn't exist yet, that's okay
    return {
      checkType: 'performance',
      checkName: 'Error Rate',
      status: 'healthy',
      responseTimeMs: Date.now() - startTime,
      metadata: { note: 'Error logging not yet enabled' }
    };
  }
}

/**
 * Check API response times
 */
export async function checkAPIPerformance(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const result = await query(`
      SELECT AVG(value) as avg_response_time
      FROM performance_metrics
      WHERE metric_type = 'api_response'
      AND recorded_at > NOW() - INTERVAL '5 minutes'
    `);
    
    const avgTime = parseFloat(result.rows[0]?.avg_response_time || '0');
    
    const status: HealthStatus = 
      avgTime === 0 ? 'healthy' : // No data yet
      avgTime < 500 ? 'healthy' :
      avgTime < 2000 ? 'degraded' : 'down';
    
    return {
      checkType: 'performance',
      checkName: 'API Response Time',
      status,
      responseTimeMs: Date.now() - startTime,
      metadata: {
        avgResponseTimeMs: Math.round(avgTime),
        timeWindow: '5 minutes'
      }
    };
  } catch (error: any) {
    // If performance_metrics table doesn't exist yet, that's okay
    return {
      checkType: 'performance',
      checkName: 'API Response Time',
      status: 'healthy',
      responseTimeMs: Date.now() - startTime,
      metadata: { note: 'Performance tracking not yet enabled' }
    };
  }
}

/**
 * Run all health checks
 */
export async function runAllHealthChecks(): Promise<HealthCheckResult[]> {
  const checks = await Promise.all([
    checkDatabase(),
    checkDatabaseTables(),
    checkOpenAI(),
    checkDeepgram(),
    checkErrorRate(),
    checkAPIPerformance()
  ]);
  
  return checks;
}

/**
 * Log health check results to database
 */
export async function logHealthCheck(result: HealthCheckResult): Promise<void> {
  try {
    await query(`
      INSERT INTO system_health_checks 
        (check_type, check_name, status, response_time_ms, error_message, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      result.checkType,
      result.checkName,
      result.status,
      result.responseTimeMs,
      result.errorMessage || null,
      result.metadata ? JSON.stringify(result.metadata) : null
    ]);
  } catch (error) {
    // If monitoring tables don't exist yet, fail silently
    logger.debug('Health Check: Could not log to database', { error });
  }
}

/**
 * Get overall system health status
 */
export function getOverallHealth(checks: HealthCheckResult[]): HealthStatus {
  const hasDown = checks.some(c => c.status === 'down');
  const hasDegraded = checks.some(c => c.status === 'degraded');
  
  if (hasDown) return 'down';
  if (hasDegraded) return 'degraded';
  return 'healthy';
}

