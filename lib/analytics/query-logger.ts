// Query Logger
// Logs all AI queries for analytics and review

import { pool } from '@/lib/db'

export interface LogQueryParams {
  sessionId: string
  userId?: number | null
  queryText: string
  queryIntent?: string | null
  queryHash?: string | null
  provider: string
  model: string
  modelVersion?: string | null
  systemPromptHash?: string | null
  responseText: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  responseTimeMs: number
  apiCost: number
  abTestGroup?: 'A' | 'B' | null
}

export interface QueryLog {
  id: number
  session_id: string
  query_text: string
  response_text: string
  model: string
  provider: string
  api_cost: number
  created_at: Date
}

/**
 * Log an AI query to the database
 */
export async function logQuery(params: LogQueryParams): Promise<number> {
  const result = await pool.query(
    `INSERT INTO ai_queries (
      session_id, user_id, query_text, query_intent, query_hash,
      provider, model, model_version, system_prompt_hash,
      response_text, input_tokens, output_tokens, total_tokens,
      response_time_ms, api_cost, ab_test_group
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id`,
    [
      params.sessionId,
      params.userId || null,
      params.queryText,
      params.queryIntent || null,
      params.queryHash || null,
      params.provider,
      params.model,
      params.modelVersion || null,
      params.systemPromptHash || null,
      params.responseText,
      params.inputTokens,
      params.outputTokens,
      params.totalTokens,
      params.responseTimeMs,
      params.apiCost,
      params.abTestGroup || null
    ]
  )

  return result.rows[0].id
}

/**
 * Update user rating for a query
 */
export async function updateQueryRating(
  queryId: number,
  rating: number,
  feedbackText?: string | null
): Promise<void> {
  await pool.query(
    `UPDATE ai_queries 
     SET user_rating = $1, user_feedback_text = $2
     WHERE id = $3`,
    [rating, feedbackText || null, queryId]
  )
}

/**
 * Mark that user clicked a result
 */
export async function trackResultClick(
  queryId: number,
  itemId: number,
  itemType: 'winery' | 'tour'
): Promise<void> {
  await pool.query(
    `UPDATE ai_queries 
     SET user_clicked_result = true,
         clicked_item_id = $1,
         clicked_item_type = $2
     WHERE id = $3`,
    [itemId, itemType, queryId]
  )
}

/**
 * Link query to booking (for conversion tracking)
 */
export async function linkQueryToBooking(
  sessionId: string,
  bookingId: number,
  bookingValue: number
): Promise<void> {
  // Update all queries in this session
  await pool.query(
    `UPDATE ai_queries 
     SET resulted_in_booking = true,
         booking_id = $1,
         booking_value = $2
     WHERE session_id = $3`,
    [bookingId, bookingValue, sessionId]
  )
}

/**
 * Get recent queries for a session
 */
export async function getSessionQueries(
  sessionId: string,
  limit: number = 10
): Promise<QueryLog[]> {
  const result = await pool.query<QueryLog>(
    `SELECT id, session_id, query_text, response_text, model, provider, api_cost, created_at
     FROM ai_queries
     WHERE session_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [sessionId, limit]
  )

  return result.rows
}

/**
 * Get query statistics
 */
export async function getQueryStats(days: number = 30): Promise<{
  totalQueries: number
  totalCost: number
  avgCost: number
  avgResponseTime: number
  uniqueSessions: number
  conversions: number
  conversionRate: number
}> {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_queries,
      SUM(api_cost) as total_cost,
      AVG(api_cost) as avg_cost,
      AVG(response_time_ms) as avg_response_time,
      COUNT(DISTINCT session_id) as unique_sessions,
      COUNT(DISTINCT CASE WHEN resulted_in_booking THEN session_id END) as conversions
    FROM ai_queries
    WHERE created_at > NOW() - INTERVAL '${days} days'
  `)

  const row = result.rows[0]
  const totalQueries = parseInt(row.total_queries) || 0
  const conversions = parseInt(row.conversions) || 0

  return {
    totalQueries,
    totalCost: parseFloat(row.total_cost) || 0,
    avgCost: parseFloat(row.avg_cost) || 0,
    avgResponseTime: parseFloat(row.avg_response_time) || 0,
    uniqueSessions: parseInt(row.unique_sessions) || 0,
    conversions,
    conversionRate: totalQueries > 0 ? (conversions / totalQueries) * 100 : 0
  }
}

/**
 * Classify query intent (simple version - can be enhanced with ML)
 */
export function classifyQueryIntent(query: string): string {
  const lowerQuery = query.toLowerCase()

  if (lowerQuery.includes('winery') || lowerQuery.includes('wineries')) {
    return 'winery_search'
  }
  if (lowerQuery.includes('tour') || lowerQuery.includes('tours')) {
    return 'tour_search'
  }
  if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('$')) {
    return 'pricing'
  }
  if (lowerQuery.includes('pickup') || lowerQuery.includes('transportation') || lowerQuery.includes('hotel')) {
    return 'logistics'
  }
  if (lowerQuery.includes('group') || lowerQuery.includes('people') || lowerQuery.includes('guests')) {
    return 'capacity'
  }
  if (lowerQuery.includes('available') || lowerQuery.includes('book') || lowerQuery.includes('reserve')) {
    return 'availability'
  }

  return 'general'
}

