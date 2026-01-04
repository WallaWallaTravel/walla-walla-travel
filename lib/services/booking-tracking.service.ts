import { logger } from '@/lib/logger';
/**
 * Booking Tracking Service
 *
 * Tracks visitor behavior, abandoned bookings, and provides data for:
 * - Abandoned cart recovery emails
 * - Conversion optimization
 * - Understanding where users drop off
 */

import { BaseService } from './base.service';

// ============================================================================
// Types
// ============================================================================

export interface BookingAttempt {
  id: number;
  session_id: string;
  visitor_id: string | null;
  email: string | null;
  name: string | null;
  phone: string | null;
  tour_date: string | null;
  start_time: string | null;
  duration_hours: number | null;
  party_size: number | null;
  pickup_location: string | null;
  selected_wineries: number[];
  step_reached: string;
  form_data: Record<string, unknown>;
  converted_to_booking_id: number | null;
  brand_id: number | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface TrackingData {
  sessionId: string;
  visitorId?: string;
  email?: string;
  name?: string;
  phone?: string;
  tourDate?: string;
  startTime?: string;
  durationHours?: number;
  partySize?: number;
  pickupLocation?: string;
  selectedWineries?: number[];
  stepReached?: string;
  formData?: Record<string, unknown>;
  brandId?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  landingPage?: string;
  userAgent?: string;
}

export interface VisitorSession {
  id: number;
  visitor_id: string;
  session_id: string;
  page_views: number;
  booking_started: boolean;
  started_at: string;
  last_activity_at: string;
}

// ============================================================================
// Service
// ============================================================================

export class BookingTrackingService extends BaseService {
  protected get serviceName(): string {
    return 'BookingTrackingService';
  }

  /**
   * Track or update a booking attempt
   * Called as user progresses through booking flow
   */
  async trackBookingAttempt(data: TrackingData): Promise<BookingAttempt> {
    this.log('Tracking booking attempt', { sessionId: data.sessionId, step: data.stepReached });

    // Check if attempt already exists for this session
    const existing = await this.queryOne<BookingAttempt>(
      'SELECT * FROM booking_attempts WHERE session_id = $1 AND converted_to_booking_id IS NULL ORDER BY created_at DESC LIMIT 1',
      [data.sessionId]
    );

    if (existing) {
      // Update existing attempt
      const updates: string[] = ['last_activity_at = NOW()', 'updated_at = NOW()'];
      const params: unknown[] = [];
      let paramCount = 0;

      if (data.email) {
        paramCount++;
        updates.push(`email = $${paramCount}`);
        params.push(data.email);
      }
      if (data.name) {
        paramCount++;
        updates.push(`name = $${paramCount}`);
        params.push(data.name);
      }
      if (data.phone) {
        paramCount++;
        updates.push(`phone = $${paramCount}`);
        params.push(data.phone);
      }
      if (data.tourDate) {
        paramCount++;
        updates.push(`tour_date = $${paramCount}`);
        params.push(data.tourDate);
      }
      if (data.startTime) {
        paramCount++;
        updates.push(`start_time = $${paramCount}`);
        params.push(data.startTime);
      }
      if (data.durationHours) {
        paramCount++;
        updates.push(`duration_hours = $${paramCount}`);
        params.push(data.durationHours);
      }
      if (data.partySize) {
        paramCount++;
        updates.push(`party_size = $${paramCount}`);
        params.push(data.partySize);
      }
      if (data.pickupLocation) {
        paramCount++;
        updates.push(`pickup_location = $${paramCount}`);
        params.push(data.pickupLocation);
      }
      if (data.selectedWineries) {
        paramCount++;
        updates.push(`selected_wineries = $${paramCount}`);
        params.push(JSON.stringify(data.selectedWineries));
      }
      if (data.stepReached) {
        paramCount++;
        updates.push(`step_reached = $${paramCount}`);
        params.push(data.stepReached);
      }
      if (data.formData) {
        paramCount++;
        updates.push(`form_data = $${paramCount}`);
        params.push(JSON.stringify(data.formData));
      }

      paramCount++;
      params.push(existing.id);

      const result = await this.query<BookingAttempt>(
        `UPDATE booking_attempts SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        params
      );

      return result.rows[0];
    }

    // Create new attempt
    const deviceType = this.detectDeviceType(data.userAgent || '');

    const result = await this.query<BookingAttempt>(
      `INSERT INTO booking_attempts (
        session_id, visitor_id, email, name, phone,
        tour_date, start_time, duration_hours, party_size, pickup_location,
        selected_wineries, step_reached, form_data, brand_id,
        utm_source, utm_medium, utm_campaign, referrer, landing_page,
        user_agent, device_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        data.sessionId,
        data.visitorId || null,
        data.email || null,
        data.name || null,
        data.phone || null,
        data.tourDate || null,
        data.startTime || null,
        data.durationHours || null,
        data.partySize || null,
        data.pickupLocation || null,
        JSON.stringify(data.selectedWineries || []),
        data.stepReached || 'started',
        JSON.stringify(data.formData || {}),
        data.brandId || null,
        data.utmSource || null,
        data.utmMedium || null,
        data.utmCampaign || null,
        data.referrer || null,
        data.landingPage || null,
        data.userAgent || null,
        deviceType
      ]
    );

    return result.rows[0];
  }

  /**
   * Mark a booking attempt as converted
   */
  async markConverted(sessionId: string, bookingId: number): Promise<void> {
    await this.query(
      `UPDATE booking_attempts
       SET converted_to_booking_id = $1, converted_at = NOW(), step_reached = 'completed'
       WHERE session_id = $2 AND converted_to_booking_id IS NULL`,
      [bookingId, sessionId]
    );

    // Also update visitor session
    await this.query(
      `UPDATE visitor_sessions
       SET converted_to_booking_id = $1
       WHERE session_id = $2`,
      [bookingId, sessionId]
    );
  }

  /**
   * Get abandoned booking attempts for follow-up
   * Returns attempts with email, not converted, no follow-up sent yet
   */
  async getAbandonedForFollowUp(options: {
    minAgeMinutes?: number;  // Wait at least this long before following up
    maxAgeHours?: number;    // Don't follow up on very old attempts
    limit?: number;
  } = {}): Promise<BookingAttempt[]> {
    const minAge = options.minAgeMinutes || 30;  // Default: wait 30 min
    const maxAge = options.maxAgeHours || 48;    // Default: within 48 hours
    const limit = options.limit || 50;

    return this.queryMany<BookingAttempt>(
      `SELECT * FROM booking_attempts
       WHERE converted_to_booking_id IS NULL
       AND email IS NOT NULL
       AND follow_up_sent_at IS NULL
       AND unsubscribed = FALSE
       AND step_reached NOT IN ('started', 'completed')
       AND last_activity_at < NOW() - INTERVAL '${minAge} minutes'
       AND last_activity_at > NOW() - INTERVAL '${maxAge} hours'
       ORDER BY last_activity_at DESC
       LIMIT $1`,
      [limit]
    );
  }

  /**
   * Mark follow-up email as sent
   */
  async markFollowUpSent(attemptId: number, emailId: string): Promise<void> {
    await this.query(
      `UPDATE booking_attempts
       SET follow_up_sent_at = NOW(), follow_up_email_id = $2
       WHERE id = $1`,
      [attemptId, emailId]
    );
  }

  /**
   * Get booking funnel analytics
   */
  async getFunnelStats(startDate: string, endDate: string): Promise<{
    total_started: number;
    reached_contact: number;
    reached_date: number;
    reached_wineries: number;
    reached_payment: number;
    completed: number;
    conversion_rate: number;
  }> {
    interface FunnelRow {
      total_started: string;
      reached_contact: string;
      reached_date: string;
      reached_wineries: string;
      reached_payment: string;
      completed: string;
    }
    const result = await this.queryOne<FunnelRow>(
      `SELECT
        COUNT(*) as total_started,
        COUNT(*) FILTER (WHERE step_reached IN ('contact_info', 'date_selection', 'wineries', 'payment', 'completed')) as reached_contact,
        COUNT(*) FILTER (WHERE step_reached IN ('date_selection', 'wineries', 'payment', 'completed')) as reached_date,
        COUNT(*) FILTER (WHERE step_reached IN ('wineries', 'payment', 'completed')) as reached_wineries,
        COUNT(*) FILTER (WHERE step_reached IN ('payment', 'completed')) as reached_payment,
        COUNT(*) FILTER (WHERE step_reached = 'completed' OR converted_to_booking_id IS NOT NULL) as completed
       FROM booking_attempts
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    );

    const total = parseInt(result?.total_started || '0') || 0;
    const completed = parseInt(result?.completed || '0') || 0;

    return {
      total_started: total,
      reached_contact: parseInt(result?.reached_contact || '0') || 0,
      reached_date: parseInt(result?.reached_date || '0') || 0,
      reached_wineries: parseInt(result?.reached_wineries || '0') || 0,
      reached_payment: parseInt(result?.reached_payment || '0') || 0,
      completed,
      conversion_rate: total > 0 ? (completed / total) * 100 : 0
    };
  }

  // =========================================================================
  // Visitor Tracking
  // =========================================================================

  /**
   * Track or update visitor session
   */
  async trackVisitorSession(data: {
    visitorId: string;
    sessionId: string;
    referrer?: string;
    landingPage?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    userAgent?: string;
  }): Promise<VisitorSession> {
    // Check for existing session
    const existing = await this.queryOne<VisitorSession>(
      'SELECT * FROM visitor_sessions WHERE session_id = $1',
      [data.sessionId]
    );

    if (existing) {
      // Update last activity
      const result = await this.query<VisitorSession>(
        `UPDATE visitor_sessions
         SET last_activity_at = NOW(), page_views = page_views + 1
         WHERE session_id = $1
         RETURNING *`,
        [data.sessionId]
      );
      return result.rows[0];
    }

    // Create new session
    const deviceType = this.detectDeviceType(data.userAgent || '');

    const result = await this.query<VisitorSession>(
      `INSERT INTO visitor_sessions (
        visitor_id, session_id,
        first_referrer, first_landing_page,
        first_utm_source, first_utm_medium, first_utm_campaign,
        user_agent, device_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.visitorId,
        data.sessionId,
        data.referrer || null,
        data.landingPage || null,
        data.utmSource || null,
        data.utmMedium || null,
        data.utmCampaign || null,
        data.userAgent || null,
        deviceType
      ]
    );

    return result.rows[0];
  }

  /**
   * Mark that a visitor started booking
   */
  async markBookingStarted(sessionId: string): Promise<void> {
    await this.query(
      'UPDATE visitor_sessions SET booking_started = TRUE WHERE session_id = $1',
      [sessionId]
    );
  }

  /**
   * Track page view
   */
  async trackPageView(data: {
    sessionId: string;
    visitorId?: string;
    pagePath: string;
    pageTitle?: string;
    referrer?: string;
  }): Promise<void> {
    await this.query(
      `INSERT INTO page_views (session_id, visitor_id, page_path, page_title, referrer)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.sessionId, data.visitorId || null, data.pagePath, data.pageTitle || null, data.referrer || null]
    );
  }

  /**
   * Get visitor analytics
   */
  async getVisitorStats(startDate: string, endDate: string): Promise<{
    total_sessions: number;
    unique_visitors: number;
    booking_started: number;
    avg_page_views: number;
    top_landing_pages: Array<{ page: string; count: number }>;
    top_referrers: Array<{ referrer: string; count: number }>;
    device_breakdown: Array<{ device: string; count: number }>;
  }> {
    interface SessionStats {
      total_sessions: string;
      unique_visitors: string;
      booking_started: string;
      avg_page_views: string;
    }
    const [sessions, landingPages, referrers, devices] = await Promise.all([
      this.queryOne<SessionStats>(
        `SELECT
          COUNT(*) as total_sessions,
          COUNT(DISTINCT visitor_id) as unique_visitors,
          COUNT(*) FILTER (WHERE booking_started = TRUE) as booking_started,
          AVG(page_views) as avg_page_views
         FROM visitor_sessions
         WHERE started_at >= $1 AND started_at <= $2`,
        [startDate, endDate]
      ),
      this.queryMany<{ page: string; count: number }>(
        `SELECT first_landing_page as page, COUNT(*) as count
         FROM visitor_sessions
         WHERE started_at >= $1 AND started_at <= $2 AND first_landing_page IS NOT NULL
         GROUP BY first_landing_page
         ORDER BY count DESC
         LIMIT 10`,
        [startDate, endDate]
      ),
      this.queryMany<{ referrer: string; count: number }>(
        `SELECT first_referrer as referrer, COUNT(*) as count
         FROM visitor_sessions
         WHERE started_at >= $1 AND started_at <= $2 AND first_referrer IS NOT NULL
         GROUP BY first_referrer
         ORDER BY count DESC
         LIMIT 10`,
        [startDate, endDate]
      ),
      this.queryMany<{ device: string; count: number }>(
        `SELECT device_type as device, COUNT(*) as count
         FROM visitor_sessions
         WHERE started_at >= $1 AND started_at <= $2
         GROUP BY device_type
         ORDER BY count DESC`,
        [startDate, endDate]
      )
    ]);

    return {
      total_sessions: parseInt(sessions?.total_sessions || '0') || 0,
      unique_visitors: parseInt(sessions?.unique_visitors || '0') || 0,
      booking_started: parseInt(sessions?.booking_started || '0') || 0,
      avg_page_views: parseFloat(sessions?.avg_page_views || '0') || 0,
      top_landing_pages: landingPages,
      top_referrers: referrers,
      device_breakdown: devices
    };
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private detectDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
      if (/ipad|tablet/i.test(ua)) {
        return 'tablet';
      }
      return 'mobile';
    }
    return 'desktop';
  }
}

// Export singleton
export const bookingTrackingService = new BookingTrackingService();
