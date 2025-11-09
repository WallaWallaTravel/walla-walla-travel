/**
 * Error Logging Service
 * Tracks and analyzes application errors
 */

import { query } from '@/lib/db';

export type ErrorSeverity = 'warning' | 'error' | 'critical';

export interface ErrorLogEntry {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  requestPath?: string;
  requestMethod?: string;
  userAgent?: string;
  ipAddress?: string;
  visitorId?: number;
  sessionId?: string;
  severity?: ErrorSeverity;
  metadata?: Record<string, any>;
}

/**
 * Log an error to the database
 */
export async function logError(entry: ErrorLogEntry): Promise<number | null> {
  try {
    const result = await query(`
      INSERT INTO error_logs (
        error_type,
        error_message,
        stack_trace,
        request_path,
        request_method,
        user_agent,
        ip_address,
        visitor_id,
        session_id,
        severity,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      entry.errorType,
      entry.errorMessage,
      entry.stackTrace || null,
      entry.requestPath || null,
      entry.requestMethod || null,
      entry.userAgent || null,
      entry.ipAddress || null,
      entry.visitorId || null,
      entry.sessionId || null,
      entry.severity || 'error',
      entry.metadata ? JSON.stringify(entry.metadata) : null
    ]);
    
    return result.rows[0]?.id;
  } catch (error) {
    // If error logging fails, log to console but don't throw
    console.error('[Error Logger] Failed to log error to database:', error);
    return null;
  }
}

/**
 * Get recent errors with optional filtering
 */
export async function getRecentErrors(options: {
  limit?: number;
  severity?: ErrorSeverity;
  errorType?: string;
  unresolved?: boolean;
} = {}): Promise<any[]> {
  const { limit = 100, severity, errorType, unresolved = false } = options;
  
  try {
    let sql = `
      SELECT 
        id,
        error_type,
        error_message,
        stack_trace,
        request_path,
        request_method,
        severity,
        resolved,
        occurred_at,
        metadata
      FROM error_logs
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;
    
    if (severity) {
      params.push(severity);
      sql += ` AND severity = $${++paramCount}`;
    }
    
    if (errorType) {
      params.push(errorType);
      sql += ` AND error_type = $${++paramCount}`;
    }
    
    if (unresolved) {
      sql += ` AND resolved = false`;
    }
    
    params.push(limit);
    sql += ` ORDER BY occurred_at DESC LIMIT $${++paramCount}`;
    
    const result = await query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('[Error Logger] Failed to fetch recent errors:', error);
    return [];
  }
}

/**
 * Get error statistics for a time period
 */
export async function getErrorStats(hoursBack: number = 24): Promise<{
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  resolved: number;
  unresolved: number;
}> {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE resolved = true) as resolved,
        COUNT(*) FILTER (WHERE resolved = false) as unresolved,
        json_object_agg(
          COALESCE(error_type, 'unknown'),
          count_by_type
        ) FILTER (WHERE error_type IS NOT NULL) as by_type,
        json_object_agg(
          severity,
          count_by_severity
        ) as by_severity
      FROM (
        SELECT 
          error_type,
          severity,
          resolved,
          COUNT(*) OVER (PARTITION BY error_type) as count_by_type,
          COUNT(*) OVER (PARTITION BY severity) as count_by_severity
        FROM error_logs
        WHERE occurred_at > NOW() - INTERVAL '${hoursBack} hours'
      ) subquery
      GROUP BY NULL
    `);
    
    const row = result.rows[0];
    
    return {
      total: parseInt(row?.total || '0'),
      byType: row?.by_type || {},
      bySeverity: row?.by_severity || {},
      resolved: parseInt(row?.resolved || '0'),
      unresolved: parseInt(row?.unresolved || '0')
    };
  } catch (error) {
    console.error('[Error Logger] Failed to get error stats:', error);
    return {
      total: 0,
      byType: {},
      bySeverity: {},
      resolved: 0,
      unresolved: 0
    };
  }
}

/**
 * Mark an error as resolved
 */
export async function resolveError(
  errorId: number, 
  resolutionNotes?: string
): Promise<boolean> {
  try {
    await query(`
      UPDATE error_logs
      SET 
        resolved = true,
        resolved_at = NOW(),
        resolution_notes = $2
      WHERE id = $1
    `, [errorId, resolutionNotes || null]);
    
    return true;
  } catch (error) {
    console.error('[Error Logger] Failed to resolve error:', error);
    return false;
  }
}

/**
 * Detect error patterns and anomalies
 */
export async function detectErrorPatterns(): Promise<{
  repeatingErrors: any[];
  errorSpikes: any[];
  newErrorTypes: any[];
}> {
  try {
    // Find errors that repeat frequently
    const repeatingErrors = await query(`
      SELECT 
        error_type,
        error_message,
        COUNT(*) as occurrences,
        MAX(occurred_at) as last_occurrence
      FROM error_logs
      WHERE occurred_at > NOW() - INTERVAL '24 hours'
      GROUP BY error_type, error_message
      HAVING COUNT(*) >= 5
      ORDER BY occurrences DESC
      LIMIT 10
    `);
    
    // Detect error spikes (hour with unusual error count)
    const errorSpikes = await query(`
      WITH hourly_counts AS (
        SELECT 
          DATE_TRUNC('hour', occurred_at) as hour,
          COUNT(*) as error_count
        FROM error_logs
        WHERE occurred_at > NOW() - INTERVAL '7 days'
        GROUP BY DATE_TRUNC('hour', occurred_at)
      ),
      avg_count AS (
        SELECT AVG(error_count) as avg, STDDEV(error_count) as stddev
        FROM hourly_counts
      )
      SELECT 
        h.hour,
        h.error_count,
        a.avg,
        (h.error_count - a.avg) / NULLIF(a.stddev, 0) as z_score
      FROM hourly_counts h, avg_count a
      WHERE h.hour > NOW() - INTERVAL '24 hours'
      AND (h.error_count - a.avg) / NULLIF(a.stddev, 0) > 2
      ORDER BY z_score DESC
    `);
    
    // Find new error types in last 24 hours
    const newErrorTypes = await query(`
      SELECT DISTINCT 
        error_type,
        MIN(occurred_at) as first_seen,
        COUNT(*) as occurrences
      FROM error_logs
      WHERE occurred_at > NOW() - INTERVAL '24 hours'
      AND error_type NOT IN (
        SELECT DISTINCT error_type
        FROM error_logs
        WHERE occurred_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '24 hours'
      )
      GROUP BY error_type
      ORDER BY occurrences DESC
    `);
    
    return {
      repeatingErrors: repeatingErrors.rows,
      errorSpikes: errorSpikes.rows,
      newErrorTypes: newErrorTypes.rows
    };
  } catch (error) {
    console.error('[Error Logger] Failed to detect patterns:', error);
    return {
      repeatingErrors: [],
      errorSpikes: [],
      newErrorTypes: []
    };
  }
}

