/**
 * Session Store Service
 *
 * Server-side session tracking for JWT hardening.
 * Each login creates a row; the UUID is embedded as `sid` in the JWT.
 * API-layer middleware (`withAuth`) validates the session is not revoked
 * and enforces idle timeouts.
 *
 * NOTE: This service uses Node.js DB access and must NOT be imported
 * in Edge middleware (lib/auth/session.ts).
 */

import { BaseService } from './base.service';
import { redis } from '@/lib/redis';

/** Idle timeout: 30 minutes for admins, 24 hours for everyone else */
const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/** Only write a touch update if last_active_at is older than this */
const TOUCH_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

/** Redis cache TTL for validated sessions */
const SESSION_CACHE_TTL = 60; // seconds

function sessionCacheKey(sessionId: string): string {
  return `session:${sessionId}`;
}

interface SessionRecord {
  id: number;
  session_id: string;
  user_id: number;
  created_at: string;
  last_active_at: string;
  revoked_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export class SessionStoreService extends BaseService {
  protected get serviceName(): string {
    return 'SessionStoreService';
  }

  /**
   * Create a new session, revoking all previous sessions for the user.
   * Returns the UUID to embed in the JWT as `sid`.
   */
  async createSession(userId: number, ip?: string, userAgent?: string): Promise<string> {
    // Revoke all existing active sessions for this user (single-session enforcement)
    await this.revokeAllUserSessions(userId);

    // Insert new session
    const row = await this.queryOne<{ session_id: string }>(
      `INSERT INTO user_sessions (user_id, ip_address, user_agent)
       VALUES ($1, $2, $3)
       RETURNING session_id`,
      [userId, ip || null, userAgent ? userAgent.substring(0, 512) : null]
    );

    if (!row) {
      throw new Error('Failed to create session record');
    }

    this.log('Session created', { userId, sessionId: row.session_id });
    return row.session_id;
  }

  /**
   * Validate a session: not revoked and within idle timeout.
   * Returns the record if valid, null otherwise.
   *
   * Checks Redis cache first (60s TTL) to avoid a DB query on every request.
   * Cache is invalidated on revocation/logout/password change.
   */
  async validateSession(sessionId: string, role?: string): Promise<SessionRecord | null> {
    const cacheKey = sessionCacheKey(sessionId);

    // 1. Check Redis cache first
    let record: SessionRecord | null = null;
    try {
      record = await redis.get<SessionRecord>(cacheKey);
    } catch {
      // Redis failure — fall through to DB
    }

    // 2. Cache miss → query DB
    if (!record) {
      record = await this.queryOne<SessionRecord>(
        `SELECT id, session_id, user_id, created_at, last_active_at, revoked_at, ip_address, user_agent
         FROM user_sessions
         WHERE session_id = $1`,
        [sessionId]
      );

      if (!record) {
        this.log('Session not found', { sessionId });
        return null;
      }

      // Cache the record for subsequent requests
      try {
        await redis.set(cacheKey, record, { ex: SESSION_CACHE_TTL });
      } catch {
        // Redis failure — continue without caching
      }
    }

    // 3. Check revocation (defensive — cache is invalidated on revoke,
    //    but a race or Redis lag could leave a stale entry)
    if (record.revoked_at) {
      this.log('Session revoked', { sessionId });
      return null;
    }

    // 4. Check idle timeout
    const lastActive = new Date(record.last_active_at).getTime();
    const now = Date.now();
    const isAdmin = role === 'admin' || role === 'geology_admin';
    const timeout = isAdmin ? ADMIN_IDLE_TIMEOUT_MS : DEFAULT_IDLE_TIMEOUT_MS;

    if (now - lastActive > timeout) {
      this.log('Session idle timeout', { sessionId, role, idleMs: now - lastActive });
      // Auto-revoke timed-out sessions (also clears cache)
      await this.revokeSession(sessionId);
      return null;
    }

    return record;
  }

  /**
   * Touch a session to keep it alive.
   * Skips the DB write if last_active_at is less than 5 minutes old
   * (uses the record already fetched by validateSession).
   */
  async touchSession(sessionId: string, lastActiveAt: string): Promise<void> {
    const lastActive = new Date(lastActiveAt).getTime();
    const now = Date.now();

    if (now - lastActive < TOUCH_THROTTLE_MS) {
      return; // Skip — too recent
    }

    await this.query(
      `UPDATE user_sessions SET last_active_at = NOW() WHERE session_id = $1`,
      [sessionId]
    );
  }

  /**
   * Revoke a specific session.
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.query(
      `UPDATE user_sessions SET revoked_at = NOW() WHERE session_id = $1 AND revoked_at IS NULL`,
      [sessionId]
    );
    // Evict from Redis so the revocation is immediate
    try { await redis.del(sessionCacheKey(sessionId)); } catch { /* best effort */ }
    this.log('Session revoked', { sessionId });
  }

  /**
   * Revoke all active sessions for a user (e.g., on password change).
   */
  async revokeAllUserSessions(userId: number): Promise<void> {
    // Collect active session IDs before revoking so we can evict from Redis
    const rows = await this.queryMany<{ session_id: string }>(
      `SELECT session_id FROM user_sessions WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );

    const result = await this.query(
      `UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );

    // Evict all cached sessions for this user
    try {
      await Promise.all(rows.map(r => redis.del(sessionCacheKey(r.session_id))));
    } catch { /* best effort */ }

    this.log('All user sessions revoked', { userId, count: result.rowCount });
  }

  /**
   * Delete sessions older than 30 days (table hygiene, called by cron).
   */
  async cleanupOldSessions(): Promise<number> {
    const result = await this.query(
      `DELETE FROM user_sessions WHERE created_at < NOW() - INTERVAL '30 days'`
    );
    const count = result.rowCount || 0;
    this.log('Old sessions cleaned up', { deletedCount: count });
    return count;
  }
}

// Export singleton instance
export const sessionStoreService = new SessionStoreService();
