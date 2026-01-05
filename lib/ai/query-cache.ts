// Query Cache Service
// Caches AI responses to reduce API costs and improve response time

import { Pool } from 'pg'
import crypto from 'crypto'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export interface CachedQuery {
  id: number
  query_hash: string
  query_text: string
  model: string
  response_text: string
  response_data: unknown
  hit_count: number
  created_at: Date
  last_hit_at: Date
  expires_at: Date
}

/**
 * Generate a hash for a query + model combination
 */
export function generateQueryHash(query: string, model: string, systemPromptHash?: string): string {
  const content = `${query}|${model}|${systemPromptHash || ''}`
  return crypto.createHash('sha256').update(content.toLowerCase()).digest('hex')
}

/**
 * Generate a hash for system prompt
 */
export function generateSystemPromptHash(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex')
}

/**
 * Check if a query is cached
 */
export async function getCachedQuery(
  query: string,
  model: string,
  systemPromptHash?: string
): Promise<CachedQuery | null> {
  const queryHash = generateQueryHash(query, model, systemPromptHash)
  
  const result = await pool.query<CachedQuery>(
    `SELECT * FROM ai_query_cache 
     WHERE query_hash = $1 
     AND expires_at > NOW()
     LIMIT 1`,
    [queryHash]
  )

  if (result.rows.length === 0) {
    return null
  }

  // Update hit count and last_hit_at
  await pool.query(
    `UPDATE ai_query_cache 
     SET hit_count = hit_count + 1, last_hit_at = NOW()
     WHERE id = $1`,
    [result.rows[0].id]
  )

  return result.rows[0]
}

/**
 * Cache a query response
 */
export async function cacheQueryResponse(
  query: string,
  model: string,
  response: string,
  responseData: unknown = null,
  systemPromptHash?: string,
  ttlHours: number = 24
): Promise<void> {
  const queryHash = generateQueryHash(query, model, systemPromptHash)
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)

  await pool.query(
    `INSERT INTO ai_query_cache (
      query_hash, query_text, model, system_prompt_hash,
      response_text, response_data, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (query_hash) DO UPDATE SET
      response_text = $5,
      response_data = $6,
      expires_at = $7,
      last_hit_at = NOW()`,
    [
      queryHash,
      query,
      model,
      systemPromptHash,
      response,
      responseData ? JSON.stringify(responseData) : null,
      expiresAt
    ]
  )
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
  const result = await pool.query(
    'DELETE FROM ai_query_cache WHERE expires_at < NOW()'
  )
  return result.rowCount || 0
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number
  totalHits: number
  avgHitCount: number
  oldestEntry: Date | null
  newestEntry: Date | null
}> {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_entries,
      SUM(hit_count) as total_hits,
      AVG(hit_count) as avg_hit_count,
      MIN(created_at) as oldest_entry,
      MAX(created_at) as newest_entry
    FROM ai_query_cache
    WHERE expires_at > NOW()
  `)

  const row = result.rows[0]

  return {
    totalEntries: parseInt(row.total_entries) || 0,
    totalHits: parseInt(row.total_hits) || 0,
    avgHitCount: parseFloat(row.avg_hit_count) || 0,
    oldestEntry: row.oldest_entry,
    newestEntry: row.newest_entry
  }
}

/**
 * Clear entire cache (use with caution!)
 */
export async function clearAllCache(): Promise<number> {
  const result = await pool.query('DELETE FROM ai_query_cache')
  return result.rowCount || 0
}

