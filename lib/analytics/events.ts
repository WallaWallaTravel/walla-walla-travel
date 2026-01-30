// Analytics Event Tracking
// Generic event tracking system for all user interactions

import { pool } from '@/lib/db'
import { logger } from '@/lib/logger'

export type EventType =
  | 'travel_guide_visit'
  | 'ai_query'
  | 'ai_result_click'
  | 'booking_started'
  | 'booking_completed'
  | 'voice_recording_started'
  | 'voice_transcription_completed'

export interface TrackEventParams {
  sessionId: string
  userId?: number | null
  eventType: EventType
  eventData?: Record<string, unknown>
  metadata?: Record<string, unknown>
  apiCost?: number | null
  bookingId?: number | null
  revenueAttributed?: number | null
}

/**
 * Track an analytics event
 * 
 * Note: This uses ai_queries table for now
 * In production, you might want a separate analytics_events table
 */
export async function trackEvent(params: TrackEventParams): Promise<void> {
  // For now, we're using the ai_queries table which covers most events
  // You could create a separate analytics_events table for more flexibility
  
  logger.info(`[Event] ${params.eventType} - Session: ${params.sessionId}`, { eventData: params.eventData })
  
  // If this is a booking event, link it to AI queries
  if (params.eventType === 'booking_completed' && params.bookingId && params.revenueAttributed) {
    await pool.query(
      `UPDATE ai_queries 
       SET resulted_in_booking = true,
           booking_id = $1,
           booking_value = $2
       WHERE session_id = $3
       AND resulted_in_booking = false`,
      [params.bookingId, params.revenueAttributed, params.sessionId]
    )
  }
}

/**
 * Track AI Directory page visit
 */
export async function trackAIDirectoryVisit(
  sessionId: string,
  referrer?: string | null
): Promise<void> {
  await trackEvent({
    sessionId,
    eventType: 'travel_guide_visit',
    eventData: { referrer }
  })
}

/**
 * Track booking completion for attribution
 */
export async function trackBookingCompletion(
  sessionId: string,
  bookingId: number,
  bookingValue: number,
  userId?: number | null
): Promise<void> {
  await trackEvent({
    sessionId,
    userId,
    eventType: 'booking_completed',
    bookingId,
    revenueAttributed: bookingValue
  })
}

/**
 * Get conversion funnel data
 */
export async function getConversionFunnel(days: number = 30): Promise<{
  visits: number
  queries: number
  clicks: number
  bookings: number
}> {
  // This is a simplified version
  // You'd want more sophisticated tracking in production
  
  const queriesResult = await pool.query(`
    SELECT 
      COUNT(DISTINCT session_id) as sessions_with_queries,
      COUNT(DISTINCT CASE WHEN user_clicked_result THEN session_id END) as sessions_with_clicks,
      COUNT(DISTINCT CASE WHEN resulted_in_booking THEN session_id END) as sessions_with_bookings
    FROM ai_queries
    WHERE created_at > NOW() - INTERVAL '${days} days'
  `)

  const row = queriesResult.rows[0]

  return {
    visits: parseInt(row.sessions_with_queries) || 0,
    queries: parseInt(row.sessions_with_queries) || 0,
    clicks: parseInt(row.sessions_with_clicks) || 0,
    bookings: parseInt(row.sessions_with_bookings) || 0
  }
}

