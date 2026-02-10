/**
 * Tests for Distributed Rate Limiting Middleware
 * @module lib/api/middleware/rate-limit
 *
 * Tests the RateLimiter class, withRateLimit HOF, checkRateLimit,
 * and pre-configured limiters.
 *
 * Note: @/lib/redis is mapped to __mocks__/lib/redis.ts via jest config.
 * The mock provides isRedisAvailable() returning true and a working
 * in-memory rateLimit.check/reset. We test the fallback path by making
 * rateLimit.check throw (simulating Redis failure).
 */

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import {
  rateLimiters,
  withRateLimit,
  checkRateLimit,
  getRateLimitStatus,
  RateLimiter,
} from '@/lib/api/middleware/rate-limit';
import { rateLimit as redisRateLimit } from '@/lib/redis';

function createMockRequest(ip = '192.168.1.1') {
  return {
    url: 'http://localhost/api/test',
    method: 'POST',
    headers: {
      get: jest.fn((name: string) => {
        if (name === 'x-forwarded-for') return ip;
        return null;
      }),
    },
    nextUrl: { pathname: '/api/test' },
  } as any;
}

describe('Distributed Rate Limiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // ===========================================================================
  // RateLimiter — check (goes through mock Redis since isRedisAvailable=true)
  // ===========================================================================

  describe('RateLimiter.check', () => {
    it('should allow requests within limit', async () => {
      const limiter = new RateLimiter({
        maxAttempts: 3,
        windowMs: 60000,
        identifier: 'test-allow',
      });

      const r1 = await limiter.check('user-a');
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);
    });

    it('should block requests exceeding limit', async () => {
      const limiter = new RateLimiter({
        maxAttempts: 2,
        windowMs: 60000,
        identifier: 'test-block',
      });

      await limiter.check('user-b');
      await limiter.check('user-b');
      const result = await limiter.check('user-b');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different identifiers separately', async () => {
      const limiter = new RateLimiter({
        maxAttempts: 1,
        windowMs: 60000,
        identifier: 'test-separate',
      });

      await limiter.check('user-c');
      const r1 = await limiter.check('user-c');
      expect(r1.allowed).toBe(false);

      const r2 = await limiter.check('user-d');
      expect(r2.allowed).toBe(true);
    });

    it('should provide reset time in the future', async () => {
      const limiter = new RateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
        identifier: 'test-reset-time',
      });

      const result = await limiter.check('user-e');
      expect(result.resetTime).toBeGreaterThan(Date.now() - 1000);
    });
  });

  // ===========================================================================
  // RateLimiter — fallback when Redis check fails
  // ===========================================================================

  describe('RateLimiter fallback', () => {
    it('should fall back to in-memory when Redis check throws', async () => {
      // Make the mock Redis throw to trigger in-memory fallback
      const originalCheck = redisRateLimit.check.bind(redisRateLimit);
      redisRateLimit.check = jest.fn().mockRejectedValueOnce(new Error('Redis error'));

      const limiter = new RateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
        identifier: 'test-fallback',
      });

      const result = await limiter.check('user-f');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // In-memory fallback

      // Restore
      redisRateLimit.check = originalCheck;
    });
  });

  // ===========================================================================
  // checkSync
  // ===========================================================================

  describe('checkSync', () => {
    it('should always use in-memory', () => {
      const limiter = new RateLimiter({
        maxAttempts: 3,
        windowMs: 60000,
        identifier: 'test-sync',
      });

      const result = limiter.checkSync('user-g');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should block after exceeding limit', () => {
      const limiter = new RateLimiter({
        maxAttempts: 2,
        windowMs: 60000,
        identifier: 'test-sync-block',
      });

      limiter.checkSync('user-h');
      limiter.checkSync('user-h');
      const result = limiter.checkSync('user-h');
      expect(result.allowed).toBe(false);
    });
  });

  // ===========================================================================
  // getMessage
  // ===========================================================================

  describe('getMessage', () => {
    it('should return configured message', () => {
      const limiter = new RateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
        message: 'Custom rate limit message',
        identifier: 'test',
      });

      expect(limiter.getMessage()).toBe('Custom rate limit message');
    });

    it('should use default when not configured', () => {
      const limiter = new RateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
        identifier: 'test',
      });

      expect(limiter.getMessage()).toContain('Too many requests');
    });
  });

  // ===========================================================================
  // reset
  // ===========================================================================

  describe('reset', () => {
    it('should reset in-memory state (via checkSync)', async () => {
      const limiter = new RateLimiter({
        maxAttempts: 2,
        windowMs: 60000,
        identifier: 'test-reset',
      });

      // Exhaust via sync (in-memory only)
      limiter.checkSync('user-j');
      limiter.checkSync('user-j');
      expect(limiter.checkSync('user-j').allowed).toBe(false);

      await limiter.reset('user-j');

      expect(limiter.checkSync('user-j').allowed).toBe(true);
    });

    it('should handle Redis reset failure gracefully', async () => {
      const originalReset = redisRateLimit.reset.bind(redisRateLimit);
      redisRateLimit.reset = jest.fn().mockRejectedValueOnce(new Error('Redis down'));

      const limiter = new RateLimiter({
        maxAttempts: 3,
        windowMs: 60000,
        identifier: 'test-reset-fail',
      });

      await expect(limiter.reset('user-k')).resolves.toBeUndefined();

      redisRateLimit.reset = originalReset;
    });
  });

  // ===========================================================================
  // withRateLimit HOF
  // ===========================================================================

  describe('withRateLimit', () => {
    it('should allow request and add rate limit headers', async () => {
      const { NextResponse } = require('next/server');
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ ok: true })
      );

      const limiter = new RateLimiter({
        maxAttempts: 10,
        windowMs: 60000,
        identifier: 'test-hof',
      });

      const wrapped = withRateLimit(limiter)(handler);
      const response = await wrapped(createMockRequest('20.0.0.1'));

      expect(handler).toHaveBeenCalled();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });

    it('should return 429 when rate limited', async () => {
      const { NextResponse } = require('next/server');
      const handler = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }));

      const limiter = new RateLimiter({
        maxAttempts: 1,
        windowMs: 60000,
        message: 'Too fast',
        identifier: 'test-hof-429',
      });

      const wrapped = withRateLimit(limiter)(handler);
      await wrapped(createMockRequest('30.0.0.1'));
      const response = await wrapped(createMockRequest('30.0.0.1'));

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.error).toBe('Too fast');
    });

    it('should track different IPs separately', async () => {
      const handler = jest.fn().mockResolvedValue(
        require('next/server').NextResponse.json({})
      );
      const limiter = new RateLimiter({
        maxAttempts: 1,
        windowMs: 60000,
        identifier: 'test-hof-ip',
      });

      const wrapped = withRateLimit(limiter)(handler);
      await wrapped(createMockRequest('40.0.0.1'));
      await wrapped(createMockRequest('40.0.0.2'));

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // checkRateLimit
  // ===========================================================================

  describe('checkRateLimit', () => {
    it('should return null when allowed', async () => {
      const limiter = new RateLimiter({
        maxAttempts: 10,
        windowMs: 60000,
        identifier: 'test-check-null',
      });

      const result = await checkRateLimit(createMockRequest('50.0.0.1'), limiter);
      expect(result).toBeNull();
    });

    it('should return 429 response when blocked', async () => {
      const limiter = new RateLimiter({
        maxAttempts: 1,
        windowMs: 60000,
        identifier: 'test-check-block',
      });

      await checkRateLimit(createMockRequest('60.0.0.1'), limiter);
      const result = await checkRateLimit(createMockRequest('60.0.0.1'), limiter);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(429);
    });
  });

  // ===========================================================================
  // getRateLimitStatus
  // ===========================================================================

  describe('getRateLimitStatus', () => {
    it('should report availability', () => {
      const status = getRateLimitStatus();
      // mode depends on whether the mock redis isRedisAvailable() returns true
      expect(['redis', 'memory']).toContain(status.mode);
      expect(status.available).toBe(true);
    });
  });

  // ===========================================================================
  // Pre-configured limiters
  // ===========================================================================

  describe('rateLimiters', () => {
    it('should have all expected limiters configured', () => {
      const expected = [
        'auth', 'api', 'payment', 'passwordReset', 'public',
        'booking', 'admin', 'sms', 'transcription', 'aiGeneration',
        'publicSubmit', 'maps', 'sharedTourTicket',
      ];

      expected.forEach(name => {
        expect(rateLimiters).toHaveProperty(name);
      });
    });

    it('auth limiter should have login-related message', () => {
      expect(rateLimiters.auth.getMessage()).toContain('login');
    });

    it('payment limiter should have payment-related message', () => {
      expect(rateLimiters.payment.getMessage()).toContain('payment');
    });
  });
});
