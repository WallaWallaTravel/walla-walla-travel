/**
 * Admin Analytics API
 *
 * Returns analytics data including:
 * - Booking funnel stats (from tracking data)
 * - Abandoned cart recovery stats
 * - Visitor analytics
 * - Revenue metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';

export const GET = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  // Verify admin access
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const type = searchParams.get('type') || 'all';

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    interface AnalyticsResult {
      period: string;
      startDate: string;
      endDate: string;
      funnel?: Record<string, unknown>;
      abandoned?: Record<string, unknown>;
      recentAbandoned?: unknown[];
      visitors?: Record<string, unknown>;
      topReferrers?: unknown[];
      deviceBreakdown?: unknown[];
      revenue?: Record<string, unknown>;
      dailyRevenue?: unknown[];
    }

    const result: AnalyticsResult = {
      period,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };

    // Booking Funnel Stats
    if (type === 'all' || type === 'funnel') {
      try {
        const funnelResult = await query(
          `SELECT
            COUNT(*) as total_attempts,
            COUNT(*) FILTER (WHERE step_reached IN ('contact_info', 'tour_details', 'wineries', 'payment', 'completed')) as reached_contact,
            COUNT(*) FILTER (WHERE step_reached IN ('tour_details', 'wineries', 'payment', 'completed')) as reached_details,
            COUNT(*) FILTER (WHERE step_reached IN ('payment', 'payment_pending', 'completed')) as reached_payment,
            COUNT(*) FILTER (WHERE step_reached = 'completed' OR converted_to_booking_id IS NOT NULL) as completed
           FROM booking_attempts
           WHERE created_at >= $1 AND created_at <= $2`,
          [startDateStr, endDateStr]
        );

        const funnel = funnelResult.rows[0];
        result.funnel = {
          total_started: parseInt(funnel.total_attempts) || 0,
          reached_contact: parseInt(funnel.reached_contact) || 0,
          reached_details: parseInt(funnel.reached_details) || 0,
          reached_payment: parseInt(funnel.reached_payment) || 0,
          completed: parseInt(funnel.completed) || 0,
          conversion_rate: funnel.total_attempts > 0
            ? ((funnel.completed / funnel.total_attempts) * 100).toFixed(1)
            : '0'
        };
      } catch (e) {
        result.funnel = { error: 'Funnel data not available' };
      }
    }

    // Abandoned Cart Stats
    if (type === 'all' || type === 'abandoned') {
      try {
        const abandonedResult = await query(
          `SELECT
            COUNT(*) as total_abandoned,
            COUNT(*) FILTER (WHERE email IS NOT NULL) as with_email,
            COUNT(*) FILTER (WHERE follow_up_sent_at IS NOT NULL) as emails_sent,
            COUNT(*) FILTER (WHERE converted_to_booking_id IS NOT NULL AND follow_up_sent_at IS NOT NULL) as recovered
           FROM booking_attempts
           WHERE created_at >= $1 AND created_at <= $2
           AND step_reached != 'completed'
           AND converted_to_booking_id IS NULL`,
          [startDateStr, endDateStr]
        );

        const abandoned = abandonedResult.rows[0];
        result.abandoned = {
          total: parseInt(abandoned.total_abandoned) || 0,
          with_email: parseInt(abandoned.with_email) || 0,
          emails_sent: parseInt(abandoned.emails_sent) || 0,
          recovered: parseInt(abandoned.recovered) || 0,
          recovery_rate: abandoned.emails_sent > 0
            ? ((abandoned.recovered / abandoned.emails_sent) * 100).toFixed(1)
            : '0'
        };

        // Recent abandoned carts (for dashboard list)
        const recentAbandoned = await query(
          `SELECT
            id,
            email,
            name,
            phone,
            tour_date,
            party_size,
            step_reached,
            last_activity_at,
            follow_up_sent_at
           FROM booking_attempts
           WHERE converted_to_booking_id IS NULL
           AND step_reached NOT IN ('started', 'completed')
           AND email IS NOT NULL
           AND last_activity_at < NOW() - INTERVAL '30 minutes'
           ORDER BY last_activity_at DESC
           LIMIT 20`
        );

        result.recentAbandoned = recentAbandoned.rows;
      } catch (e) {
        result.abandoned = { error: 'Abandoned cart data not available' };
        result.recentAbandoned = [];
      }
    }

    // Visitor Stats
    if (type === 'all' || type === 'visitors') {
      try {
        const visitorResult = await query(
          `SELECT
            COUNT(*) as total_sessions,
            COUNT(DISTINCT visitor_id) as unique_visitors,
            COUNT(*) FILTER (WHERE booking_started = true) as started_booking,
            AVG(page_views) as avg_page_views
           FROM visitor_sessions
           WHERE started_at >= $1 AND started_at <= $2`,
          [startDateStr, endDateStr]
        );

        const visitors = visitorResult.rows[0];
        result.visitors = {
          total_sessions: parseInt(visitors.total_sessions) || 0,
          unique_visitors: parseInt(visitors.unique_visitors) || 0,
          started_booking: parseInt(visitors.started_booking) || 0,
          avg_page_views: parseFloat(visitors.avg_page_views)?.toFixed(1) || '0',
          booking_start_rate: visitors.unique_visitors > 0
            ? ((visitors.started_booking / visitors.unique_visitors) * 100).toFixed(1)
            : '0'
        };

        // Top referrers
        const referrersResult = await query(
          `SELECT
            COALESCE(first_referrer, 'Direct') as referrer,
            COUNT(*) as count
           FROM visitor_sessions
           WHERE started_at >= $1 AND started_at <= $2
           GROUP BY first_referrer
           ORDER BY count DESC
           LIMIT 10`,
          [startDateStr, endDateStr]
        );

        result.topReferrers = referrersResult.rows;

        // Device breakdown
        const devicesResult = await query(
          `SELECT
            device_type,
            COUNT(*) as count
           FROM visitor_sessions
           WHERE started_at >= $1 AND started_at <= $2
           GROUP BY device_type
           ORDER BY count DESC`,
          [startDateStr, endDateStr]
        );

        result.deviceBreakdown = devicesResult.rows;
      } catch (e) {
        result.visitors = { error: 'Visitor data not available' };
      }
    }

    // Revenue Stats
    if (type === 'all' || type === 'revenue') {
      try {
        const revenueResult = await query(
          `SELECT
            COUNT(*) as total_bookings,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
            COALESCE(SUM(total_price), 0) as total_revenue,
            COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0) as completed_revenue,
            AVG(total_price) as avg_booking_value,
            AVG(party_size) as avg_party_size
           FROM bookings
           WHERE tour_date >= $1 AND tour_date <= $2`,
          [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
        );

        const revenue = revenueResult.rows[0];
        result.revenue = {
          total_bookings: parseInt(revenue.total_bookings) || 0,
          completed_bookings: parseInt(revenue.completed_bookings) || 0,
          total_revenue: parseFloat(revenue.total_revenue)?.toFixed(2) || '0.00',
          completed_revenue: parseFloat(revenue.completed_revenue)?.toFixed(2) || '0.00',
          avg_booking_value: parseFloat(revenue.avg_booking_value)?.toFixed(2) || '0.00',
          avg_party_size: parseFloat(revenue.avg_party_size)?.toFixed(1) || '0'
        };

        // Daily revenue trend
        const dailyRevenue = await query(
          `SELECT
            tour_date::date as date,
            COUNT(*) as bookings,
            COALESCE(SUM(total_price), 0) as revenue
           FROM bookings
           WHERE tour_date >= $1 AND tour_date <= $2
           GROUP BY tour_date::date
           ORDER BY tour_date::date`,
          [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
        );

        result.dailyRevenue = dailyRevenue.rows.map(r => ({
          date: r.date.toISOString().split('T')[0],
          bookings: parseInt(r.bookings),
          revenue: parseFloat(r.revenue)?.toFixed(2) || '0.00'
        }));
      } catch (e) {
        result.revenue = { error: 'Revenue data not available' };
      }
    }

  return NextResponse.json(result);
});
