// Query Cache Service
// Caches AI responses to reduce API costs and improve response time

import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

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
  
  const rows = await prisma.$queryRaw<CachedQuery[]>`
    SELECT * FROM ai_query_cache
     WHERE query_hash = ${queryHash}
     AND expires_at > NOW()
     LIMIT 1
  `

  if (rows.length === 0) {
    return null
  }

  // Update hit count and last_hit_at
  await prisma.$executeRaw`
    UPDATE ai_query_cache
     SET hit_count = hit_count + 1, last_hit_at = NOW()
     WHERE id = ${rows[0].id}
  `

  return rows[0]
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

  const responseDataJson = responseData ? JSON.stringify(responseData) : null

  await prisma.$executeRaw`
    INSERT INTO ai_query_cache (
      query_hash, query_text, model, system_prompt_hash,
      response_text, response_data, expires_at
    ) VALUES (${queryHash}, ${query}, ${model}, ${systemPromptHash ?? null}, ${response}, ${responseDataJson}::jsonb, ${expiresAt})
    ON CONFLICT (query_hash) DO UPDATE SET
      response_text = ${response},
      response_data = ${responseDataJson}::jsonb,
      expires_at = ${expiresAt},
      last_hit_at = NOW()
  `
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
  return await prisma.$executeRaw`DELETE FROM ai_query_cache WHERE expires_at < NOW()`
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
  const rows = await prisma.$queryRaw<Array<{ total_entries: string; total_hits: string; avg_hit_count: string; oldest_entry: Date | null; newest_entry: Date | null }>>`
    SELECT
      COUNT(*) as total_entries,
      SUM(hit_count) as total_hits,
      AVG(hit_count) as avg_hit_count,
      MIN(created_at) as oldest_entry,
      MAX(created_at) as newest_entry
    FROM ai_query_cache
    WHERE expires_at > NOW()
  `

  const row = rows[0]

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
  return await prisma.$executeRaw`DELETE FROM ai_query_cache`
}

