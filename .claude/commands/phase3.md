# Phase 3: Comprehensive Coverage

Execute Phase 3 comprehensive tasks from COMMERCIAL_READINESS_ROADMAP.md

## Phase 3 Objective
Achieve 60%+ test coverage, complete API testing, and add E2E tests.

**Timeline:** Week 4-6
**Priority:** 🟢 COMPREHENSIVE
**Prerequisites:** Phase 1 & 2 complete

## Pre-Phase Verification

```bash
echo "=== Phase 1 & 2 Verification ==="
[ -f "lib/config/env.ts" ] && echo "✅ Env validation" || echo "❌ BLOCKER"
[ -f "lib/logging/logger.ts" ] && echo "✅ Logger" || echo "❌ BLOCKER"
[ -f "sentry.client.config.ts" ] && echo "✅ Sentry" || echo "❌ BLOCKER"
[ -f "lib/rate-limit/redis-limiter.ts" ] && echo "✅ Redis rate limit" || echo "❌ BLOCKER"

TEST_COUNT=$(find . -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | grep -v node_modules | wc -l)
[ $TEST_COUNT -ge 40 ] && echo "✅ Tests: $TEST_COUNT" || echo "⚠️ Tests: $TEST_COUNT (need 40+)"
```

## Tasks to Execute

### 3.1 Service Layer Tests (50+ tests)

**Target: 80% coverage on all services**

Create tests for each service in `lib/services/`:

```bash
# List all services needing tests
for service in lib/services/*.ts; do
  echo "Service: $service"
done
```

**Test template for each service:**
```typescript
// __tests__/services/[service-name].test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { [ServiceName] } from '@/lib/services/[service-name]';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    [model]: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('[ServiceName]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all items', async () => {
      // Arrange
      const mockData = [{ id: 1, name: 'Test' }];
      (prisma.[model].findMany as jest.Mock).mockResolvedValue(mockData);

      // Act
      const result = await [serviceName].getAll();

      // Assert
      expect(result).toEqual(mockData);
      expect(prisma.[model].findMany).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      (prisma.[model].findMany as jest.Mock).mockResolvedValue([]);
      const result = await [serviceName].getAll();
      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return item when found', async () => {
      const mockItem = { id: 1, name: 'Test' };
      (prisma.[model].findUnique as jest.Mock).mockResolvedValue(mockItem);

      const result = await [serviceName].getById(1);
      expect(result).toEqual(mockItem);
    });

    it('should throw NotFoundError when not found', async () => {
      (prisma.[model].findUnique as jest.Mock).mockResolvedValue(null);

      await expect([serviceName].getById(999))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create with valid data', async () => {
      const input = { name: 'New Item' };
      const created = { id: 1, ...input };
      (prisma.[model].create as jest.Mock).mockResolvedValue(created);

      const result = await [serviceName].create(input);
      expect(result).toEqual(created);
    });

    it('should throw ValidationError for invalid data', async () => {
      await expect([serviceName].create({}))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('update', () => {
    it('should update existing item', async () => {
      const existing = { id: 1, name: 'Old' };
      const updated = { id: 1, name: 'New' };
      (prisma.[model].findUnique as jest.Mock).mockResolvedValue(existing);
      (prisma.[model].update as jest.Mock).mockResolvedValue(updated);

      const result = await [serviceName].update(1, { name: 'New' });
      expect(result.name).toBe('New');
    });
  });

  describe('delete', () => {
    it('should delete existing item', async () => {
      const existing = { id: 1, name: 'Test' };
      (prisma.[model].findUnique as jest.Mock).mockResolvedValue(existing);
      (prisma.[model].delete as jest.Mock).mockResolvedValue(existing);

      await expect([serviceName].delete(1)).resolves.not.toThrow();
    });
  });
});
```

### 3.2 API Route Tests (30+ tests)

**Target: All CRUD endpoints tested**

```bash
# List all API routes
find app/api -name "route.ts" | head -30
```

**API test template:**
```typescript
// __tests__/api/[endpoint]/route.test.ts
import { GET, POST, PUT, DELETE } from '@/app/api/[endpoint]/route';
import { NextRequest } from 'next/server';

describe('API /api/[endpoint]', () => {
  describe('GET', () => {
    it('should return 200 with data', async () => {
      const request = new NextRequest('http://localhost/api/[endpoint]');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
    });

    it('should return 401 without auth', async () => {
      // Test auth requirement
    });
  });

  describe('POST', () => {
    it('should create with valid data', async () => {
      const request = new NextRequest('http://localhost/api/[endpoint]', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });
      const response = await POST(request);
      
      expect(response.status).toBe(201);
    });

    it('should return 400 with invalid data', async () => {
      const request = new NextRequest('http://localhost/api/[endpoint]', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });
});
```

### 3.3 E2E Tests with Playwright (20+ tests)

**Install Playwright:**
```bash
npm install -D @playwright/test
npx playwright install
```

**Create `playwright.config.ts`:**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Critical E2E tests to create:**
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });
});

// e2e/booking.spec.ts
test.describe('Booking Flow', () => {
  test('should create a new booking', async ({ page }) => {
    // Login first
    await page.goto('/login');
    // ... login steps
    
    // Navigate to booking
    await page.goto('/bookings/new');
    await page.fill('[name="customer_name"]', 'Test Customer');
    // ... fill form
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

### 3.4 Security Tests (15+ tests)

**Create security test suite:**
```typescript
// __tests__/security/auth-security.test.ts
describe('Authentication Security', () => {
  it('should reject SQL injection in login', async () => {
    const maliciousEmail = "admin'--";
    // Test that this doesn't bypass auth
  });

  it('should rate limit login attempts', async () => {
    // Make 6 rapid requests
    // 6th should be rate limited
  });

  it('should not leak user existence in error messages', async () => {
    // Error for wrong email should be same as wrong password
  });
});

// __tests__/security/api-security.test.ts
describe('API Security', () => {
  it('should require authentication on protected routes', async () => {
    const protectedRoutes = [
      '/api/bookings',
      '/api/users',
      '/api/reports',
    ];
    
    for (const route of protectedRoutes) {
      const response = await fetch(route);
      expect(response.status).toBe(401);
    }
  });

  it('should validate and sanitize all inputs', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    // Test that XSS is sanitized
  });
});
```

### 3.5 Performance Tests

```typescript
// __tests__/performance/api-performance.test.ts
describe('API Performance', () => {
  it('should respond within 200ms for list endpoints', async () => {
    const start = Date.now();
    await fetch('/api/bookings');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('should handle concurrent requests', async () => {
    const requests = Array(10).fill(null).map(() => 
      fetch('/api/bookings')
    );
    const responses = await Promise.all(requests);
    responses.forEach(r => expect(r.status).toBe(200));
  });
});
```

## Verification Checklist

```bash
echo "=== Phase 3 Verification ==="

# Run full test suite
npm test -- --coverage

# Check coverage threshold
# Target: 60% overall

# E2E tests
npx playwright test

# Count tests
UNIT_TESTS=$(find __tests__ -name "*.test.ts" | wc -l)
E2E_TESTS=$(find e2e -name "*.spec.ts" 2>/dev/null | wc -l)
echo "Unit/Integration tests: $UNIT_TESTS (Target: 80+)"
echo "E2E tests: $E2E_TESTS (Target: 20+)"
```

## Completion Report

```markdown
## ✅ PHASE 3 COMPLETION REPORT

**Completed:** [Date]
**Duration:** [X] weeks

### Test Coverage Achieved
- Overall: [X]% (Target: 60%)
- Services: [X]%
- API Routes: [X]%
- Utilities: [X]%

### Tests by Category
- Unit Tests: [X]
- Integration Tests: [X]
- E2E Tests: [X]
- Security Tests: [X]
- Performance Tests: [X]

### Key Metrics
- All critical paths tested
- Zero failing tests
- E2E covering main user flows

### Ready for Phase 4
[Yes/No - with blockers if No]
```
