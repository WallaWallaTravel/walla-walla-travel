/**
 * Upstash Redis Client with Graceful Fallback
 *
 * @module lib/redis
 * @description Provides distributed state management for rate limiting
 * and circuit breakers. Falls back to in-memory storage when Redis
 * is unavailable to prevent application failures.
 *
 * Required Environment Variables:
 * - UPSTASH_REDIS_REST_URL: Redis REST API URL from Upstash
 * - UPSTASH_REDIS_REST_TOKEN: Redis REST API token from Upstash
 */

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

// Singleton Redis client
let redisClient: Redis | null = null;
let redisAvailable = true;
let lastRedisCheck = 0;
const REDIS_CHECK_INTERVAL = 30000; // 30 seconds

// In-memory fallback storage
const inMemoryStore = new Map<string, { value: unknown; expiry?: number }>();

/**
 * Get or create Redis client
 * Returns null if Redis is not configured
 */
function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.warn('Redis not configured - using in-memory fallback', {
      hasUrl: !!url,
      hasToken: !!token,
    });
    redisAvailable = false;
    return null;
  }

  try {
    redisClient = new Redis({
      url,
      token,
    });
    redisAvailable = true;
    logger.info('Redis client initialized');
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis client', { error });
    redisAvailable = false;
    return null;
  }
}

/**
 * Check if Redis is currently available
 * Caches the result to avoid frequent checks
 */
export function isRedisAvailable(): boolean {
  const now = Date.now();
  if (now - lastRedisCheck > REDIS_CHECK_INTERVAL) {
    lastRedisCheck = now;
    getRedisClient(); // Will set redisAvailable
  }
  return redisAvailable;
}

/**
 * Cleanup expired entries from in-memory store
 */
function cleanupInMemory(): void {
  const now = Date.now();
  for (const [key, entry] of inMemoryStore.entries()) {
    if (entry.expiry && entry.expiry < now) {
      inMemoryStore.delete(key);
    }
  }
}

// Cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupInMemory, 60000);
}

/**
 * Redis-like operations with automatic fallback
 */
export const redis = {
  /**
   * Get a value by key
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const client = getRedisClient();

    if (client && redisAvailable) {
      try {
        const result = await client.get<T>(key);
        return result;
      } catch (error) {
        logger.error('Redis GET failed, falling back to memory', { error });
        redisAvailable = false;
      }
    }

    // Fallback to in-memory
    const entry = inMemoryStore.get(key);
    if (entry) {
      if (entry.expiry && entry.expiry < Date.now()) {
        inMemoryStore.delete(key);
        return null;
      }
      return entry.value as T;
    }
    return null;
  },

  /**
   * Set a value with optional expiry (in seconds)
   */
  async set<T = unknown>(key: string, value: T, options?: { ex?: number }): Promise<void> {
    const client = getRedisClient();

    if (client && redisAvailable) {
      try {
        if (options?.ex) {
          await client.set(key, value, { ex: options.ex });
        } else {
          await client.set(key, value);
        }
        return;
      } catch (error) {
        logger.error('Redis SET failed, falling back to memory', { error });
        redisAvailable = false;
      }
    }

    // Fallback to in-memory
    inMemoryStore.set(key, {
      value,
      expiry: options?.ex ? Date.now() + options.ex * 1000 : undefined,
    });
  },

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    const client = getRedisClient();

    if (client && redisAvailable) {
      try {
        await client.del(key);
        return;
      } catch (error) {
        logger.error('Redis DEL failed, falling back to memory', { error });
        redisAvailable = false;
      }
    }

    // Fallback to in-memory
    inMemoryStore.delete(key);
  },

  /**
   * Increment a value (atomic in Redis)
   * Returns the new value
   */
  async incr(key: string): Promise<number> {
    const client = getRedisClient();

    if (client && redisAvailable) {
      try {
        return await client.incr(key);
      } catch (error) {
        logger.error('Redis INCR failed, falling back to memory', { error });
        redisAvailable = false;
      }
    }

    // Fallback to in-memory
    const entry = inMemoryStore.get(key);
    const current = (entry?.value as number) || 0;
    const newValue = current + 1;
    inMemoryStore.set(key, { value: newValue, expiry: entry?.expiry });
    return newValue;
  },

  /**
   * Set expiry on existing key (in seconds)
   */
  async expire(key: string, seconds: number): Promise<void> {
    const client = getRedisClient();

    if (client && redisAvailable) {
      try {
        await client.expire(key, seconds);
        return;
      } catch (error) {
        logger.error('Redis EXPIRE failed, falling back to memory', { error });
        redisAvailable = false;
      }
    }

    // Fallback to in-memory
    const entry = inMemoryStore.get(key);
    if (entry) {
      entry.expiry = Date.now() + seconds * 1000;
    }
  },

  /**
   * Get TTL of a key in seconds
   * Returns -2 if key doesn't exist, -1 if no expiry
   */
  async ttl(key: string): Promise<number> {
    const client = getRedisClient();

    if (client && redisAvailable) {
      try {
        return await client.ttl(key);
      } catch (error) {
        logger.error('Redis TTL failed, falling back to memory', { error });
        redisAvailable = false;
      }
    }

    // Fallback to in-memory
    const entry = inMemoryStore.get(key);
    if (!entry) return -2;
    if (!entry.expiry) return -1;
    const remaining = Math.ceil((entry.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();

    if (client && redisAvailable) {
      try {
        const count = await client.exists(key);
        return count > 0;
      } catch (error) {
        logger.error('Redis EXISTS failed, falling back to memory', { error });
        redisAvailable = false;
      }
    }

    // Fallback to in-memory
    const entry = inMemoryStore.get(key);
    if (!entry) return false;
    if (entry.expiry && entry.expiry < Date.now()) {
      inMemoryStore.delete(key);
      return false;
    }
    return true;
  },

  /**
   * Execute multiple commands atomically using pipeline
   * Falls back to sequential execution in memory mode
   */
  async pipeline<T extends unknown[]>(
    commands: Array<{ cmd: 'get' | 'set' | 'incr' | 'expire' | 'del'; args: unknown[] }>
  ): Promise<T> {
    const client = getRedisClient();

    if (client && redisAvailable) {
      try {
        const pipe = client.pipeline();
        for (const { cmd, args } of commands) {
          // @ts-expect-error - dynamic command execution
          pipe[cmd](...args);
        }
        const results = await pipe.exec();
        return results as T;
      } catch (error) {
        logger.error('Redis pipeline failed, falling back to memory', { error });
        redisAvailable = false;
      }
    }

    // Fallback: execute sequentially in memory
    const results: unknown[] = [];
    for (const { cmd, args } of commands) {
      switch (cmd) {
        case 'get':
          results.push(await redis.get(args[0] as string));
          break;
        case 'set':
          await redis.set(args[0] as string, args[1], args[2] as { ex?: number });
          results.push('OK');
          break;
        case 'incr':
          results.push(await redis.incr(args[0] as string));
          break;
        case 'expire':
          await redis.expire(args[0] as string, args[1] as number);
          results.push(1);
          break;
        case 'del':
          await redis.del(args[0] as string);
          results.push(1);
          break;
      }
    }
    return results as T;
  },

  /**
   * Get Redis status info
   */
  getStatus(): { available: boolean; mode: 'redis' | 'memory' } {
    return {
      available: redisAvailable && !!getRedisClient(),
      mode: redisAvailable && getRedisClient() ? 'redis' : 'memory',
    };
  },
};

// Rate limiting specific helpers
export const rateLimit = {
  /**
   * Check and increment rate limit counter
   * Uses sliding window algorithm with Redis
   *
   * @param key - Unique identifier (e.g., "rate:auth:192.168.1.1")
   * @param limit - Maximum requests allowed
   * @param windowSeconds - Time window in seconds
   * @returns Object with allowed status and remaining count
   */
  async check(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / 1000 / windowSeconds)}`;
    const resetAt = (Math.floor(now / 1000 / windowSeconds) + 1) * windowSeconds * 1000;

    try {
      const count = await redis.incr(windowKey);

      // Set expiry only on first increment
      if (count === 1) {
        await redis.expire(windowKey, windowSeconds);
      }

      const allowed = count <= limit;
      const remaining = Math.max(0, limit - count);

      return { allowed, remaining, resetAt };
    } catch (error) {
      logger.error('Rate limit check failed', { error });
      // Fail open - allow request but log error
      return { allowed: true, remaining: limit, resetAt };
    }
  },

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    const now = Date.now();
    // Delete current and previous window keys
    const currentWindow = Math.floor(now / 1000 / 60);
    await Promise.all([
      redis.del(`${key}:${currentWindow}`),
      redis.del(`${key}:${currentWindow - 1}`),
    ]);
  },
};

// Circuit breaker specific helpers
export const circuitBreaker = {
  /**
   * Get circuit breaker state from Redis
   */
  async getState(
    serviceName: string
  ): Promise<{
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: number | null;
    halfOpenUntil: number | null;
  } | null> {
    const key = `circuit:${serviceName}`;
    return redis.get(key);
  },

  /**
   * Save circuit breaker state to Redis
   */
  async setState(
    serviceName: string,
    state: {
      isOpen: boolean;
      failureCount: number;
      lastFailureTime: number | null;
      halfOpenUntil: number | null;
    }
  ): Promise<void> {
    const key = `circuit:${serviceName}`;
    // Circuit breaker state expires after 1 hour if not updated
    await redis.set(key, state, { ex: 3600 });
  },

  /**
   * Record a failure for a service
   */
  async recordFailure(
    serviceName: string,
    threshold: number = 5,
    resetTimeoutMs: number = 30000
  ): Promise<{ isOpen: boolean; failureCount: number }> {
    const state = (await circuitBreaker.getState(serviceName)) || {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      halfOpenUntil: null,
    };

    state.failureCount++;
    state.lastFailureTime = Date.now();

    if (state.failureCount >= threshold) {
      state.isOpen = true;
      state.halfOpenUntil = Date.now() + resetTimeoutMs;
      logger.error(`Circuit breaker OPENED for ${serviceName}`, {
        failureCount: state.failureCount,
        resetAt: new Date(state.halfOpenUntil).toISOString(),
      });
    }

    await circuitBreaker.setState(serviceName, state);
    return { isOpen: state.isOpen, failureCount: state.failureCount };
  },

  /**
   * Record a success for a service (resets circuit)
   */
  async recordSuccess(serviceName: string): Promise<void> {
    await circuitBreaker.setState(serviceName, {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      halfOpenUntil: null,
    });
  },

  /**
   * Check if circuit is open (blocking requests)
   */
  async isOpen(serviceName: string): Promise<boolean> {
    const state = await circuitBreaker.getState(serviceName);
    if (!state || !state.isOpen) return false;

    // Check if half-open period has passed
    if (state.halfOpenUntil && Date.now() >= state.halfOpenUntil) {
      logger.info(`Circuit breaker HALF-OPEN for ${serviceName}, allowing probe`);
      return false; // Allow probe request
    }

    return true;
  },
};

export default redis;
