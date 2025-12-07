# 🧪 Testing Guide

**Comprehensive testing documentation for Walla Walla Travel system**

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Test Infrastructure](#test-infrastructure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Coverage](#test-coverage)
6. [CI/CD Integration](#cicd-integration)
7. [Best Practices](#best-practices)

---

## 🎯 OVERVIEW

### Testing Strategy

We use a **comprehensive testing pyramid**:

```
       /\
      /E2\      ← End-to-End (10%)
     /----\
    / Integ\    ← Integration (20%)
   /--------\
  /   Unit   \  ← Unit Tests (70%)
 /------------\
```

**Goal:** 80%+ code coverage

### Test Types

1. **Unit Tests** - Test individual functions/methods
2. **Integration Tests** - Test service layer with database
3. **API Tests** - Test HTTP endpoints
4. **E2E Tests** - Test complete user workflows

---

## 🛠️ TEST INFRASTRUCTURE

### Files Created

```
lib/
├── __tests__/
│   ├── test-utils.ts         # Testing utilities
│   └── factories.ts          # Mock data generators
├── services/
│   └── __tests__/
│       ├── booking-service.test.ts
│       └── proposal-service.test.ts
└── app/api/v1/
    └── bookings/
        └── __tests__/
            └── route.test.ts
```

### Tools

- **Jest** - Test runner and assertion library
- **@testing-library/react** - React component testing
- **Supertest** - HTTP API testing (future)
- **MSW** - API mocking (future)

---

## 🚀 RUNNING TESTS

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test booking-service

# Run tests matching pattern
npm test --testNamePattern="findManyWithFilters"
```

### Example Output

```bash
$ npm test

PASS  lib/services/__tests__/booking-service.test.ts
  BookingService
    findManyWithFilters
      ✓ should return bookings with default filters (12ms)
      ✓ should filter by status (8ms)
      ✓ should include wineries when requested (6ms)
    getFullBookingDetails
      ✓ should return booking with all relations by ID (5ms)
      ✓ should throw error when booking not found (4ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        2.145 s
```

---

## ✍️ WRITING TESTS

### 1. Unit Test Example (Service Layer)

```typescript
import { BookingService } from '../booking-service';
import { createMockPool, createMockQueryResult } from '../../__tests__/test-utils';
import { createMockBooking } from '../../__tests__/factories';

jest.mock('../../db', () => ({
  query: jest.fn(),
  pool: createMockPool(),
}));

describe('BookingService', () => {
  let service: BookingService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    service = new BookingService();
    mockQuery = require('../../db').query as jest.Mock;
    mockQuery.mockClear();
  });

  it('should return bookings', async () => {
    const mockBookings = [createMockBooking()];
    mockQuery.mockResolvedValueOnce(createMockQueryResult(mockBookings));

    const result = await service.findManyWithFilters({});

    expect(result.bookings).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalled();
  });
});
```

### 2. API Test Example

```typescript
import { GET } from '../route';
import { createMockRequest } from '@/lib/__tests__/test-utils';

jest.mock('@/lib/services/booking-service');

describe('GET /api/v1/bookings', () => {
  it('should return list of bookings', async () => {
    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/v1/bookings',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

### 3. Using Test Utilities

```typescript
import {
  createMockRequest,
  createMockQueryResult,
  generateRandomEmail,
  expectValidDate,
  expectSuccessResponse,
} from '@/lib/__tests__/test-utils';

// Create mock request
const request = createMockRequest({
  method: 'POST',
  body: { email: generateRandomEmail() },
  searchParams: { status: 'confirmed' },
});

// Create mock query result
const result = createMockQueryResult([{ id: 1, name: 'Test' }]);

// Validate date
expectValidDate('2025-11-12');

// Validate API response
const data = await expectSuccessResponse(response);
```

### 4. Using Mock Factories

```typescript
import {
  createMockBooking,
  createMockBookingWithRelations,
  createMockCustomer,
  createMockProposal,
  createMockBookingRequest,
} from '@/lib/__tests__/factories';

// Create mock data
const booking = createMockBooking();
const bookingWithRelations = createMockBookingWithRelations();
const customer = createMockCustomer({ email: 'test@example.com' });

// Create API request body
const requestBody = createMockBookingRequest({
  partySize: 8,
  tourDate: '2025-12-15',
});
```

---

## 📊 TEST COVERAGE

### Current Coverage

Run coverage report:

```bash
npm run test:coverage
```

**Target:** 80%+ coverage

### Coverage Report

```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   82.45 |    75.20 |   88.90 |   82.45 |
 services/          |   85.30 |    78.50 |   90.20 |   85.30 |
  booking-service   |   88.70 |    82.10 |   92.30 |   88.70 |
  proposal-service  |   82.40 |    74.80 |   88.50 |   82.40 |
 api/v1/            |   79.20 |    71.40 |   87.10 |   79.20 |
  bookings/route    |   81.50 |    74.20 |   89.00 |   81.50 |
--------------------|---------|----------|---------|---------|
```

### Improving Coverage

**Focus areas:**
1. Edge cases
2. Error handling
3. Validation logic
4. Complex business logic

---

## 🔄 CI/CD INTEGRATION

### GitHub Actions Workflow

We've created `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Running on Every Push

Tests automatically run on:
- ✅ Every push to main
- ✅ Every pull request
- ✅ Manual workflow dispatch

### Branch Protection

Configure branch protection to:
- Require tests to pass before merge
- Require 80%+ coverage
- Block merge on test failures

---

## ✅ BEST PRACTICES

### 1. Follow AAA Pattern

```typescript
it('should create booking', async () => {
  // Arrange - Set up test data
  const mockData = createMockBookingRequest();
  mockService.create.mockResolvedValue(mockData);

  // Act - Execute the function
  const result = await service.createBooking(mockData);

  // Assert - Verify the result
  expect(result.id).toBeDefined();
  expect(mockService.create).toHaveBeenCalled();
});
```

### 2. Test One Thing Per Test

```typescript
// ✅ Good - Tests one specific behavior
it('should filter bookings by status', async () => {
  const result = await service.findManyWithFilters({ status: 'confirmed' });
  expect(result.bookings.every(b => b.status === 'confirmed')).toBe(true);
});

// ❌ Bad - Tests multiple things
it('should filter and paginate bookings', async () => {
  // Tests too many behaviors
});
```

### 3. Use Descriptive Test Names

```typescript
// ✅ Good - Clear what's being tested
it('should throw error when booking not found')
it('should return bookings sorted by date descending')
it('should include wineries when includeWineries is true')

// ❌ Bad - Vague test names
it('works correctly')
it('test booking')
```

### 4. Mock External Dependencies

```typescript
// Mock database
jest.mock('../../db', () => ({
  query: jest.fn(),
}));

// Mock external APIs
jest.mock('stripe', () => ({
  Stripe: jest.fn(() => ({
    paymentIntents: {
      create: jest.fn(),
    },
  })),
}));
```

### 5. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await cleanupTestData(pool, ['bookings', 'customers']);
});
```

### 6. Use Factories for Test Data

```typescript
// ✅ Good - Use factories
const booking = createMockBooking({ partySize: 8 });

// ❌ Bad - Manual object creation
const booking = {
  id: 123,
  booking_number: 'WWT-2025-123456',
  customer_name: 'Test',
  // ... 20 more fields
};
```

### 7. Test Error Cases

```typescript
it('should handle database errors gracefully', async () => {
  mockQuery.mockRejectedValueOnce(new Error('Connection failed'));

  await expect(service.findMany()).rejects.toThrow('Connection failed');
});

it('should return 400 for invalid input', async () => {
  const response = await POST(createMockRequest({ body: {} }));
  
  expect(response.status).toBe(400);
});
```

---

## 📝 TESTING CHECKLIST

When adding new features, ensure you:

- [ ] Write unit tests for services
- [ ] Write API tests for endpoints
- [ ] Test happy path
- [ ] Test error cases
- [ ] Test edge cases (null, empty, large values)
- [ ] Test validation logic
- [ ] Mock external dependencies
- [ ] Achieve 80%+ coverage
- [ ] Update documentation

---

## 🎯 COMMON TESTING SCENARIOS

### Testing Service Methods

```typescript
describe('MyService', () => {
  it('should create resource', async () => {
    const data = createMockData();
    mockQuery.mockResolvedValueOnce(createMockQueryResult([data]));

    const result = await service.create(data);

    expect(result).toBeDefined();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO'),
      expect.any(Array)
    );
  });
});
```

### Testing API Endpoints

```typescript
describe('POST /api/resource', () => {
  it('should validate request body', async () => {
    const request = createMockRequest({
      method: 'POST',
      body: { invalid: 'data' },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
```

### Testing Async Operations

```typescript
it('should wait for async operation', async () => {
  const promise = service.asyncMethod();
  
  await waitFor(100); // Wait for operation
  
  expect(mockQuery).toHaveBeenCalled();
  const result = await promise;
  expect(result).toBeDefined();
});
```

---

## 🚀 QUICK REFERENCE

### Key Files

| File | Purpose |
|------|---------|
| `lib/__tests__/test-utils.ts` | Testing utilities |
| `lib/__tests__/factories.ts` | Mock data generators |
| `jest.config.cjs` | Jest configuration |
| `.github/workflows/test.yml` | CI/CD workflow |

### Key Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Generate coverage |
| `npm test booking` | Run specific test |

### Key Utilities

| Utility | Purpose |
|---------|---------|
| `createMockRequest()` | Mock API request |
| `createMockQueryResult()` | Mock DB result |
| `createMockBooking()` | Mock booking data |
| `expectSuccessResponse()` | Assert API success |
| `expectValidDate()` | Validate date format |

---

## 📚 ADDITIONAL RESOURCES

- **Jest Documentation:** https://jestjs.io/docs/getting-started
- **Testing Best Practices:** https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- **Coverage Best Practices:** Aim for 80%+ but focus on critical paths

---

**END OF TESTING GUIDE**

*Write tests, ship with confidence!* ✅


