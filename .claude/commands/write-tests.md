# Write Tests Command

Generate test files for untested code based on TESTING_STRATEGY.md priorities.

## Instructions

### 1. Identify Untested Code

```bash
echo "=== Untested Services ==="
for service in lib/services/*.ts; do
  name=$(basename "$service" .ts)
  if ! find . -name "${name}.test.ts" 2>/dev/null | grep -q .; then
    echo "❌ Missing: $name"
  else
    echo "✅ Has tests: $name"
  fi
done

echo ""
echo "=== Untested API Routes ==="
find app/api -name "route.ts" | while read route; do
  dir=$(dirname "$route")
  if ! find __tests__ -path "*${dir#app}*" -name "*.test.ts" 2>/dev/null | grep -q .; then
    echo "❌ Missing: $route"
  fi
done | head -20

echo ""
echo "=== Untested Utilities ==="
for util in lib/utils/*.ts; do
  name=$(basename "$util" .ts)
  if ! find . -name "${name}.test.ts" 2>/dev/null | grep -q .; then
    echo "❌ Missing: $name"
  fi
done
```

### 2. Priority Test Queue

Based on TESTING_STRATEGY.md, write tests in this order:

**Week 1-2 Priority (Services):**
1. `booking.service.ts` → `__tests__/services/booking.service.test.ts`
2. `auth.service.ts` → `__tests__/services/auth.service.test.ts`
3. `user.service.ts` → `__tests__/services/user.service.test.ts`
4. `tour.service.ts` → `__tests__/services/tour.service.test.ts`
5. `winery.service.ts` → `__tests__/services/winery.service.test.ts`

**Week 3-4 Priority (API Routes):**
1. `app/api/bookings/route.ts`
2. `app/api/auth/login/route.ts`
3. `app/api/users/route.ts`
4. `app/api/tours/route.ts`

**Week 5-6 Priority (E2E):**
1. Login flow
2. Booking creation flow
3. Tour management flow

### 3. Service Test Template

When asked to write tests for a service, use this template:

```typescript
// __tests__/services/[name].service.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import { [ServiceName] } from '@/lib/services/[name].service';
import { NotFoundError, ValidationError } from '@/lib/api/middleware/error-handler';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    [model]: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('[ServiceName]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all items', async () => {
      const mockData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      (prisma.[model].findMany as jest.Mock).mockResolvedValue(mockData);

      const result = await [serviceName].getAll();

      expect(result).toEqual(mockData);
      expect(prisma.[model].findMany).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no items', async () => {
      (prisma.[model].findMany as jest.Mock).mockResolvedValue([]);

      const result = await [serviceName].getAll();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      (prisma.[model].findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect([serviceName].getAll()).rejects.toThrow('DB error');
    });
  });

  describe('getById', () => {
    it('should return item when found', async () => {
      const mockItem = { id: 1, name: 'Test Item' };
      (prisma.[model].findUnique as jest.Mock).mockResolvedValue(mockItem);

      const result = await [serviceName].getById(1);

      expect(result).toEqual(mockItem);
      expect(prisma.[model].findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundError when not found', async () => {
      (prisma.[model].findUnique as jest.Mock).mockResolvedValue(null);

      await expect([serviceName].getById(999)).rejects.toThrow(NotFoundError);
    });

    it('should throw for invalid id', async () => {
      await expect([serviceName].getById(-1)).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create item with valid data', async () => {
      const input = { name: 'New Item' };
      const created = { id: 1, ...input, createdAt: new Date() };
      (prisma.[model].create as jest.Mock).mockResolvedValue(created);

      const result = await [serviceName].create(input);

      expect(result).toEqual(created);
      expect(prisma.[model].create).toHaveBeenCalledWith({
        data: input,
      });
    });

    it('should throw ValidationError for empty name', async () => {
      await expect([serviceName].create({ name: '' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing required fields', async () => {
      await expect([serviceName].create({})).rejects.toThrow(ValidationError);
    });
  });

  describe('update', () => {
    it('should update existing item', async () => {
      const existing = { id: 1, name: 'Old Name' };
      const updated = { id: 1, name: 'New Name' };
      (prisma.[model].findUnique as jest.Mock).mockResolvedValue(existing);
      (prisma.[model].update as jest.Mock).mockResolvedValue(updated);

      const result = await [serviceName].update(1, { name: 'New Name' });

      expect(result).toEqual(updated);
    });

    it('should throw NotFoundError for non-existent item', async () => {
      (prisma.[model].findUnique as jest.Mock).mockResolvedValue(null);

      await expect([serviceName].update(999, { name: 'Test' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete existing item', async () => {
      const existing = { id: 1, name: 'To Delete' };
      (prisma.[model].findUnique as jest.Mock).mockResolvedValue(existing);
      (prisma.[model].delete as jest.Mock).mockResolvedValue(existing);

      await expect([serviceName].delete(1)).resolves.not.toThrow();
      expect(prisma.[model].delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundError for non-existent item', async () => {
      (prisma.[model].findUnique as jest.Mock).mockResolvedValue(null);

      await expect([serviceName].delete(999)).rejects.toThrow(NotFoundError);
    });
  });
});
```

### 4. API Route Test Template

```typescript
// __tests__/api/[endpoint]/route.test.ts
import { GET, POST, PUT, DELETE } from '@/app/api/[endpoint]/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma');

describe('API /api/[endpoint]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 200 with list of items', async () => {
      const mockItems = [{ id: 1, name: 'Test' }];
      (prisma.[model].findMany as jest.Mock).mockResolvedValue(mockItems);

      const request = new NextRequest('http://localhost/api/[endpoint]');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockItems);
    });

    it('should handle query parameters', async () => {
      const request = new NextRequest('http://localhost/api/[endpoint]?limit=10');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('POST', () => {
    it('should return 201 for valid creation', async () => {
      const input = { name: 'New Item' };
      const created = { id: 1, ...input };
      (prisma.[model].create as jest.Mock).mockResolvedValue(created);

      const request = new NextRequest('http://localhost/api/[endpoint]', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should return 400 for invalid data', async () => {
      const request = new NextRequest('http://localhost/api/[endpoint]', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
```

### 5. Generate Test for Specific File

When user specifies a file, analyze it and generate appropriate tests:

1. Read the source file
2. Identify all exported functions/methods
3. Generate test cases for each:
   - Happy path
   - Edge cases
   - Error cases
   - Boundary conditions

### 6. Running Generated Tests

```bash
# Run specific test file
npm test -- __tests__/services/[name].service.test.ts

# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

### 7. Progress Tracking

```markdown
## Test Writing Progress

| File | Tests Written | Passing | Coverage |
|------|---------------|---------|----------|
| booking.service | [X] | [X]/[X] | [X]% |
| auth.service | [X] | [X]/[X] | [X]% |
| ... | ... | ... | ... |
```
