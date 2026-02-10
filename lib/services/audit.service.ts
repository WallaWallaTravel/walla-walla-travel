import { logger } from '@/lib/logger';
/**
 * Audit Service
 *
 * @module lib/services/audit.service
 * @description Comprehensive activity logging for security auditing and compliance.
 * Records all significant user actions with context for forensic analysis.
 *
 * @security
 * - Immutable audit log (append-only)
 * - IP address and user agent tracking
 * - Request ID correlation for traceability
 * - Retention policy compliant
 *
 * @features
 * - Authentication events (login, logout, failed attempts)
 * - Data modification tracking
 * - Admin action logging
 * - Payment transaction auditing
 * - Configurable event types
 */

import { BaseService } from './base.service';
import { NextRequest } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export type AuditAction =
  // Authentication
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_changed'
  | 'password_reset_requested'
  // Bookings
  | 'booking_created'
  | 'booking_updated'
  | 'booking_cancelled'
  | 'booking_assigned'
  | 'booking_deleted'
  | 'booking_status_changed'
  // Proposals
  | 'proposal_created'
  | 'proposal_sent'
  | 'proposal_accepted'
  | 'proposal_rejected'
  // Payments
  | 'payment_processed'
  | 'payment_confirmed'
  | 'payment_intent_created'
  | 'payment_refunded'
  | 'payment_failed'
  | 'payment_webhook_received'
  // Admin actions
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'user_role_changed'
  | 'settings_updated'
  | 'rate_updated'
  // Business portal
  | 'business_approved'
  | 'business_rejected'
  // Driver actions
  | 'inspection_completed'
  | 'time_clock_in'
  | 'time_clock_out'
  // Integrations
  | 'calendar_sync_triggered'
  // Generic
  | 'resource_created'
  | 'resource_updated'
  | 'resource_deleted'
  | 'export_requested'
  | 'bulk_action';

export interface AuditLogEntry {
  id: number;
  user_id: number;
  action: AuditAction;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface CreateAuditLogData {
  userId: number;
  action: AuditAction;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

// ============================================================================
// Audit Service
// ============================================================================

class AuditService extends BaseService {
  protected get serviceName(): string {
    return 'AuditService';
  }

  /**
   * Log an activity (non-blocking, won't throw on error)
   * Named 'logActivity' to avoid conflict with BaseService.log
   */
  async logActivity(data: CreateAuditLogData): Promise<void> {
    try {
      await this.query(
        `INSERT INTO user_activity_logs (user_id, action, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          data.userId,
          data.action,
          JSON.stringify(data.details || {}),
          data.ipAddress || null,
        ]
      );
      
      // Logged successfully (silent in production)
    } catch (error) {
      // Don't throw - audit logging should never break the main flow
      logger.error('[AuditService] Failed to log activity', { error });
    }
  }

  /**
   * Extract IP address from request (Next.js 15 removed request.ip)
   */
  getIpFromRequest(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           request.headers.get('x-real-ip') ||
           'unknown';
  }

  /**
   * Log with request context
   */
  async logFromRequest(
    request: NextRequest,
    userId: number,
    action: AuditAction,
    details?: Record<string, unknown>
  ): Promise<void> {
    const ipAddress = this.getIpFromRequest(request);
    
    // Add request context to details
    const enrichedDetails = {
      ...details,
      userAgent: request.headers.get('user-agent')?.substring(0, 200),
      path: request.nextUrl.pathname,
      method: request.method,
    };

    await this.logActivity({
      userId,
      action,
      details: enrichedDetails,
      ipAddress,
    });
  }

  /**
   * Get audit logs for a user
   */
  async getLogsForUser(
    userId: number,
    options?: { limit?: number; offset?: number; action?: AuditAction }
  ): Promise<AuditLogEntry[]> {
    const conditions = ['user_id = $1'];
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (options?.action) {
      conditions.push(`action = $${paramIndex}`);
      params.push(options.action);
      paramIndex++;
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const result = await this.query<AuditLogEntry>(
      `SELECT * FROM user_activity_logs
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get recent admin activities
   */
  async getRecentAdminActivities(limit: number = 50): Promise<AuditLogEntry[]> {
    const adminActions: AuditAction[] = [
      'user_created',
      'user_updated',
      'user_deactivated',
      'user_role_changed',
      'settings_updated',
      'rate_updated',
      'business_approved',
      'business_rejected',
      'booking_cancelled',
      'payment_refunded',
      'export_requested',
      'bulk_action',
    ];

    const result = await this.query<AuditLogEntry>(
      `SELECT al.*, u.name as user_name, u.email as user_email
       FROM user_activity_logs al
       JOIN users u ON al.user_id = u.id
       WHERE al.action = ANY($1)
       ORDER BY al.created_at DESC
       LIMIT $2`,
      [adminActions, limit]
    );

    return result.rows;
  }

  /**
   * Get activities within a time range
   */
  async getActivitiesInRange(
    startDate: Date,
    endDate: Date,
    options?: { userId?: number; action?: AuditAction }
  ): Promise<AuditLogEntry[]> {
    const conditions = ['created_at >= $1', 'created_at <= $2'];
    const params: unknown[] = [startDate, endDate];
    let paramIndex = 3;

    if (options?.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      params.push(options.userId);
      paramIndex++;
    }

    if (options?.action) {
      conditions.push(`action = $${paramIndex}`);
      params.push(options.action);
      paramIndex++;
    }

    const result = await this.query<AuditLogEntry>(
      `SELECT * FROM user_activity_logs
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC`,
      params
    );

    return result.rows;
  }

  /**
   * Check for suspicious activity (multiple failed logins, etc.)
   */
  async checkSuspiciousActivity(
    ipAddress: string,
    windowMinutes: number = 15,
    maxAttempts: number = 5
  ): Promise<{ suspicious: boolean; attempts: number }> {
    const result = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM user_activity_logs
       WHERE ip_address = $1
       AND action = 'login_failed'
       AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
      [ipAddress]
    );

    const attempts = parseInt(result.rows[0]?.count || '0', 10);

    return {
      suspicious: attempts >= maxAttempts,
      attempts,
    };
  }
}

// Export singleton instance
export const auditService = new AuditService();

