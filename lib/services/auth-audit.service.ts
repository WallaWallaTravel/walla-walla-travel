/**
 * Auth Audit Service
 *
 * Logs authentication events for the partner portal (hotel and business partners).
 * All logging is fire-and-forget — failures are swallowed so auth flows are never blocked.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';

export type AuthEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'password_reset_request'
  | 'password_reset_complete';

export type PartnerType = 'hotel' | 'business';

interface LogAuthEventData {
  eventType: AuthEventType;
  partnerType: PartnerType;
  partnerId: number;
  email?: string;
  request: NextRequest;
  details?: Record<string, unknown>;
}

/**
 * Extract client IP from request headers.
 */
function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Log a partner authentication event.
 *
 * Fire-and-forget: the returned promise is intentionally not awaited by callers.
 * A logging failure must never break an auth flow.
 */
export function logAuthEvent(data: LogAuthEventData): void {
  const ipAddress = getIp(data.request);
  const userAgent = data.request.headers.get('user-agent')?.substring(0, 500) || null;

  prisma.$queryRawUnsafe(
    `INSERT INTO auth_events (event_type, partner_type, partner_id, email, ip_address, user_agent, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    data.eventType,
    data.partnerType,
    data.partnerId,
    data.email || null,
    ipAddress,
    userAgent,
    data.details ? JSON.stringify(data.details) : null,
  ).catch((error) => {
    logger.error('[AuthAudit] Failed to log auth event', {
      eventType: data.eventType,
      partnerType: data.partnerType,
      partnerId: data.partnerId,
      error,
    });
  });
}
