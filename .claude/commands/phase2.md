# Phase 2: High Priority Implementation

Execute Phase 2 high priority tasks from COMMERCIAL_READINESS_ROADMAP.md

## Phase 2 Objective
Implement observability, upgrade infrastructure, and establish testing foundation.

**Timeline:** Week 2-3
**Priority:** 🟡 HIGH
**Prerequisites:** Phase 1 complete

## Pre-Phase Verification

```bash
# Verify Phase 1 completion
echo "=== Phase 1 Verification ==="
[ -z "$(find app -type d -name 'test*' 2>/dev/null)" ] && echo "✅ Test routes removed" || echo "❌ BLOCKER: Test routes exist"
[ -f "lib/config/env.ts" ] && echo "✅ Env validation exists" || echo "❌ BLOCKER: Env validation missing"
[ -f "lib/logging/logger.ts" ] && echo "✅ Logger exists" || echo "❌ BLOCKER: Logger missing"
```

## Tasks to Execute

### 2.1 Implement Sentry Error Monitoring

**Install Sentry:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configure `sentry.client.config.ts`:**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

**Configure `sentry.server.config.ts`:**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

### 2.2 Upgrade to Redis Rate Limiting

**Install Upstash:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Create `lib/rate-limit/redis-limiter.ts`:**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different limiters for different use cases
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
  prefix: 'ratelimit:auth',
});

export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  prefix: 'ratelimit:api',
});

export const strictLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 requests per hour (password reset, etc.)
  prefix: 'ratelimit:strict',
});

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
```

### 2.3 Replace Console Statements with Logger

```bash
# Find all console statements in API routes
grep -rn "console\." --include="*.ts" app/api/ lib/ 2>/dev/null | grep -v node_modules | head -50
```

**Action:** Replace each `console.error`, `console.log`, `console.warn` with the appropriate logger method:
- `console.error(...)` → `logger.error('message', error, { context })`
- `console.log(...)` → `logger.info('message', { context })` or `logger.debug(...)`
- `console.warn(...)` → `logger.warn('message', { context })`

### 2.4 Establish Testing Foundation

**Create test setup file `jest.setup.ts`:**
```typescript
import '@testing-library/jest-dom';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SESSION_SECRET = 'test-secret-at-least-32-characters-long';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-32-chars-min';

// Global test utilities
global.mockRequest = (overrides = {}) => ({
  json: jest.fn().mockResolvedValue({}),
  headers: new Headers(),
  ...overrides,
});
```

**Create first 25 critical tests as specified in TESTING_STRATEGY.md Phase 1:**

Priority order:
1. `lib/services/booking.service.test.ts` - 5 tests
2. `lib/services/auth.service.test.ts` - 5 tests
3. `lib/services/user.service.test.ts` - 5 tests
4. `lib/utils/date-utils.test.ts` - 5 tests
5. `lib/validation/schemas/booking.test.ts` - 5 tests

### 2.5 Implement Health Check Endpoint

**Create `app/api/health/route.ts`:**
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'unknown',
      memory: 'unknown',
    },
  };

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'degraded';
    logger.error('Health check: database unhealthy', error as Error);
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  health.checks.memory = memUsedMB < 500 ? 'healthy' : 'warning';

  const statusCode = health.status === 'healthy' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
```

## Verification Checklist

```bash
echo "=== Phase 2 Verification ==="

# Sentry configured
[ -f "sentry.client.config.ts" ] && echo "✅ Sentry client configured" || echo "❌ Sentry client missing"
[ -f "sentry.server.config.ts" ] && echo "✅ Sentry server configured" || echo "❌ Sentry server missing"

# Redis rate limiter
[ -f "lib/rate-limit/redis-limiter.ts" ] && echo "✅ Redis rate limiter exists" || echo "❌ Redis rate limiter missing"

# Health endpoint
[ -f "app/api/health/route.ts" ] && echo "✅ Health endpoint exists" || echo "❌ Health endpoint missing"

# Test count
TEST_COUNT=$(find . -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | grep -v node_modules | wc -l)
echo "Tests: $TEST_COUNT (Target: 40+)"

# Console statements remaining
CONSOLE_COUNT=$(grep -r "console\." --include="*.ts" app/api/ lib/ 2>/dev/null | grep -v node_modules | wc -l)
echo "Console statements: $CONSOLE_COUNT (Target: 0 in production code)"
```

## Completion Report

```markdown
## ✅ PHASE 2 COMPLETION REPORT

**Completed:** [Date]
**Duration:** [X] days

### Tasks Completed
- [x] Sentry error monitoring configured
- [x] Redis rate limiting implemented
- [x] Console statements replaced with logger
- [x] 25+ critical tests written
- [x] Health check endpoint added
- [x] Test infrastructure established

### Metrics After Phase 2
- Test Count: [X] (was 15)
- Console Statements: [X] (was 50+)
- Error Monitoring: Active
- Rate Limiting: Redis-backed

### Environment Variables Added
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_DSN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Ready for Phase 3
[Yes/No - with blockers if No]
```
