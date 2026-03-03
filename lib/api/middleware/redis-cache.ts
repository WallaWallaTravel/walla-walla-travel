/**
 * Redis Response Cache Middleware
 *
 * Caches JSON API response data in Redis with configurable TTLs.
 * Falls back gracefully when Redis is unavailable (in-memory via lib/redis).
 *
 * Separate from the HTTP cache header middleware in cache.ts — this caches
 * actual response payloads, while cache.ts sets Cache-Control headers.
 *
 * Usage:
 *   const data = await withRedisCache('wineries:list', 300, async () => {
 *     return { success: true, data: await wineryService.getAll() };
 *   });
 *   return NextResponse.json(data);
 */

import { redis } from '@/lib/redis';

/**
 * Cache a JSON-serializable response payload in Redis.
 *
 * On cache hit: returns cached data directly (skips fn).
 * On cache miss: calls fn(), caches the result with TTL, returns it.
 *
 * @param key  Cache key suffix (automatically prefixed with "cache:")
 * @param ttlSeconds  Time-to-live in seconds
 * @param fn  Function that produces the data to cache
 */
export async function withRedisCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cacheKey = `cache:${key}`;

  // Try cache first
  try {
    const cached = await redis.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
  } catch {
    // Cache read failed — proceed to handler
  }

  // Cache miss — execute handler
  const data = await fn();

  // Cache the result (fire-and-forget, don't block response)
  redis.set(cacheKey, data, { ex: ttlSeconds }).catch(() => {});

  return data;
}

/**
 * Invalidate specific cache keys.
 *
 * Each key is automatically prepended with "cache:".
 * Parameterized list caches (e.g., with different query params)
 * expire naturally within their short TTLs (60-300s).
 *
 * @example
 *   await invalidateCache('wineries:list:');
 *   await invalidateCache('events:list:', 'events:categories');
 */
export async function invalidateCache(...keys: string[]): Promise<void> {
  for (const key of keys) {
    try {
      await redis.del(`cache:${key}`);
    } catch {
      // Best-effort invalidation
    }
  }
}
