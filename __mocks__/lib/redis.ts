/**
 * Mock Redis client for testing
 * Provides in-memory implementation without @upstash/redis dependency
 */

// In-memory store for testing
const store = new Map<string, { value: unknown; expiry?: number }>();

export function isRedisAvailable(): boolean {
  return true; // Always available in tests
}

export const redis = {
  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiry && entry.expiry < Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value as T;
  },

  async set<T = unknown>(key: string, value: T, options?: { ex?: number }): Promise<void> {
    store.set(key, {
      value,
      expiry: options?.ex ? Date.now() + options.ex * 1000 : undefined,
    });
  },

  async del(key: string): Promise<void> {
    store.delete(key);
  },

  async incr(key: string): Promise<number> {
    const entry = store.get(key);
    const current = (entry?.value as number) || 0;
    const newValue = current + 1;
    store.set(key, { value: newValue, expiry: entry?.expiry });
    return newValue;
  },

  async expire(key: string, seconds: number): Promise<void> {
    const entry = store.get(key);
    if (entry) {
      entry.expiry = Date.now() + seconds * 1000;
    }
  },

  async ttl(key: string): Promise<number> {
    const entry = store.get(key);
    if (!entry) return -2;
    if (!entry.expiry) return -1;
    const remaining = Math.ceil((entry.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  },

  async exists(key: string): Promise<boolean> {
    const entry = store.get(key);
    if (!entry) return false;
    if (entry.expiry && entry.expiry < Date.now()) {
      store.delete(key);
      return false;
    }
    return true;
  },

  async pipeline<T extends unknown[]>(
    commands: Array<{ cmd: 'get' | 'set' | 'incr' | 'expire' | 'del'; args: unknown[] }>
  ): Promise<T> {
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

  getStatus(): { available: boolean; mode: 'redis' | 'memory' } {
    return { available: true, mode: 'memory' };
  },

  // Helper for tests to clear the store
  _clear(): void {
    store.clear();
  },
};

export const rateLimit = {
  async check(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / 1000 / windowSeconds)}`;
    const resetAt = (Math.floor(now / 1000 / windowSeconds) + 1) * windowSeconds * 1000;

    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.expire(windowKey, windowSeconds);
    }

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    return { allowed, remaining, resetAt };
  },

  async reset(key: string): Promise<void> {
    const now = Date.now();
    const currentWindow = Math.floor(now / 1000 / 60);
    await Promise.all([
      redis.del(`${key}:${currentWindow}`),
      redis.del(`${key}:${currentWindow - 1}`),
    ]);
  },
};

export const circuitBreaker = {
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
    await redis.set(key, state, { ex: 3600 });
  },

  async recordFailure(
    serviceName: string,
    threshold: number = 5,
    _resetTimeoutMs: number = 30000
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
      state.halfOpenUntil = Date.now() + _resetTimeoutMs;
    }

    await circuitBreaker.setState(serviceName, state);
    return { isOpen: state.isOpen, failureCount: state.failureCount };
  },

  async recordSuccess(serviceName: string): Promise<void> {
    await circuitBreaker.setState(serviceName, {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      halfOpenUntil: null,
    });
  },

  async isOpen(serviceName: string): Promise<boolean> {
    const state = await circuitBreaker.getState(serviceName);
    if (!state || !state.isOpen) return false;

    if (state.halfOpenUntil && Date.now() >= state.halfOpenUntil) {
      return false;
    }

    return true;
  },
};

export default redis;
