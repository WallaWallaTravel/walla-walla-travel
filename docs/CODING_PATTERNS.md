# Coding Patterns & Standards

This document defines the architectural patterns and coding standards for the Walla Walla Travel codebase. All new code should follow these patterns for consistency and maintainability.

---

## API Route Patterns

### Database Connection

**DO NOT** create individual `Pool` connections in each route:
```typescript
// BAD - Creates connection leak risk
import { Pool } from 'pg';
const pool = new Pool();

export async function GET() {
  const client = await pool.connect();
  try {
    // ...
  } finally {
    client.release();  // Easy to forget
  }
}
```

**DO** use the shared query function from `lib/db.ts`:
```typescript
// GOOD - Uses shared pool with proper logging
import { query } from '@/lib/db';

export const GET = withErrorHandling(async (request) => {
  const result = await query('SELECT * FROM vehicles WHERE id = $1', [id]);
  return NextResponse.json(result.rows);
});
```

### Error Handling

**DO NOT** wrap routes in manual try-catch with manual error responses:
```typescript
// BAD - Inconsistent error handling
export async function POST(request) {
  try {
    // ...
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Something failed' }, { status: 500 });
  }
}
```

**DO** use `withErrorHandling` wrapper and throw typed errors:
```typescript
// GOOD - Consistent error handling with proper types
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';

export const POST = withErrorHandling(async (request) => {
  const { id } = await request.json();

  if (!id) {
    throw new BadRequestError('Missing required field: id');
  }

  const result = await query('SELECT * FROM items WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new NotFoundError('Item not found');
  }

  return NextResponse.json(result.rows[0]);
});
```

### Available Error Classes

| Error Class | HTTP Status | When to Use |
|-------------|-------------|-------------|
| `BadRequestError` | 400 | Invalid input, missing fields |
| `UnauthorizedError` | 401 | Not logged in |
| `ForbiddenError` | 403 | Logged in but not allowed |
| `NotFoundError` | 404 | Resource doesn't exist |
| `ConflictError` | 409 | Duplicate, scheduling conflict |
| `ValidationError` | 422 | Failed validation |

### Admin Route Authentication

All admin API routes must verify authentication:
```typescript
import { getSessionFromRequest } from '@/lib/auth/session';
import { UnauthorizedError } from '@/lib/api/middleware/error-handler';

// Helper pattern for admin routes
async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
  return session;
}

export const GET = withErrorHandling(async (request) => {
  await verifyAdmin(request);
  // ... rest of handler
});
```

---

## Complete Admin API Template

Use this as a starting point for new admin API routes:

```typescript
/**
 * Admin [Resource] Management API
 *
 * [Description of what this API does]
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  withErrorHandling,
  UnauthorizedError,
  BadRequestError,
  NotFoundError
} from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
  return session;
}

// GET - List resources
export const GET = withErrorHandling(async (request: NextRequest) => {
  await verifyAdmin(request);

  const { searchParams } = new URL(request.url);
  // Parse filters from searchParams...

  const result = await query('SELECT * FROM resources ORDER BY created_at DESC');

  return NextResponse.json({
    resources: result.rows
  });
});

// POST - Create resource
export const POST = withErrorHandling(async (request: NextRequest) => {
  await verifyAdmin(request);

  const body = await request.json();
  const { name, value } = body;

  if (!name || !value) {
    throw new BadRequestError('Missing required fields: name, value');
  }

  const result = await query(
    'INSERT INTO resources (name, value) VALUES ($1, $2) RETURNING *',
    [name, value]
  );

  return NextResponse.json({
    success: true,
    resource: result.rows[0]
  }, { status: 201 });
});

// PUT - Update resource
export const PUT = withErrorHandling(async (request: NextRequest) => {
  await verifyAdmin(request);

  const body = await request.json();
  const { id, name, value } = body;

  if (!id) {
    throw new BadRequestError('Missing required field: id');
  }

  const existing = await query('SELECT id FROM resources WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError('Resource not found');
  }

  const result = await query(
    'UPDATE resources SET name = COALESCE($2, name), value = COALESCE($3, value), updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, name, value]
  );

  return NextResponse.json({
    success: true,
    resource: result.rows[0]
  });
});

// DELETE - Remove resource
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  await verifyAdmin(request);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new BadRequestError('Missing required parameter: id');
  }

  const existing = await query('SELECT id FROM resources WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError('Resource not found');
  }

  await query('DELETE FROM resources WHERE id = $1', [id]);

  return NextResponse.json({ success: true });
});
```

---

## Database Query Patterns

### Parameterized Queries

Always use parameterized queries to prevent SQL injection:
```typescript
// GOOD
await query('SELECT * FROM users WHERE email = $1', [email]);

// BAD - SQL injection risk
await query(`SELECT * FROM users WHERE email = '${email}'`);
```

### Dynamic WHERE Clauses

When building dynamic queries with optional filters:
```typescript
let sql = 'SELECT * FROM bookings WHERE 1=1';
const params: (string | number)[] = [];
let paramIndex = 1;

if (startDate) {
  sql += ` AND tour_date >= $${paramIndex++}`;
  params.push(startDate);
}

if (status) {
  sql += ` AND status = $${paramIndex++}`;
  params.push(status);
}

const result = await query(sql, params);
```

### Date Formatting

When returning dates to the frontend, format consistently:
```typescript
return NextResponse.json({
  bookings: result.rows.map(row => ({
    ...row,
    tour_date: row.tour_date?.toISOString().split('T')[0]  // Returns "2025-01-15"
  }))
});
```

---

## Session & Authentication

### Session Structure

The session payload has this structure:
```typescript
interface SessionPayload {
  user: {
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'driver';
  };
  iat: number;  // Issued at
  exp: number;  // Expiration
}
```

### Accessing Session Data

```typescript
// From API routes
import { getSessionFromRequest } from '@/lib/auth/session';

const session = await getSessionFromRequest(request);
const userId = session.user.id;
const userRole = session.user.role;

// From Server Components
import { getSession } from '@/lib/auth/session';

const session = await getSession();
```

---

## File Organization

### API Routes
- Admin routes: `app/api/admin/[resource]/route.ts`
- Public routes: `app/api/[resource]/route.ts`
- Cron jobs: `app/api/cron/[job-name]/route.ts`

### Services
- Business logic: `lib/services/[domain].service.ts`
- Database queries should be in services, not routes

### Types
- Shared types: `lib/types/[domain].ts`
- API-specific types can be inline in route files

---

## Code Quality Checklist

Before merging any API route:

- [ ] Uses `query` from `@/lib/db` (not `new Pool()`)
- [ ] Wrapped with `withErrorHandling`
- [ ] Uses typed error classes (not manual `NextResponse.json` errors)
- [ ] Admin routes have authentication check
- [ ] All SQL queries are parameterized
- [ ] TypeScript compiles without errors
- [ ] No `client.release()` calls (handled by shared pool)
- [ ] No outer try-catch-finally blocks (handled by wrapper)

---

Last Updated: December 27, 2025
