# Authentication Architecture

## Overview

The codebase has **three authentication-related modules** that evolved over time. Understanding their purposes and interactions is critical for maintenance.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 1. POST /api/auth/login
                                      │    { email, password }
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Route Handler                                  │
│                        app/api/auth/login/route.ts                          │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      AuthService.login()                             │   │
│   │                   lib/services/auth.service.ts                       │   │
│   │                                                                      │   │
│   │  1. Find user by email (PostgreSQL)                                  │   │
│   │  2. Verify password (bcrypt, 12 rounds)                              │   │
│   │  3. Create JWT session token                                         │   │
│   │  4. Log activity (async, non-blocking)                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      │ 2. Set-Cookie: session=<JWT>          │
│                                      ▼                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 3. Redirect to dashboard
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROTECTED ROUTE REQUEST                              │
│                                                                              │
│   Cookie: session=eyJhbGciOiJIUzI1NiIs...                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MIDDLEWARE                                      │
│                            middleware.ts                                     │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                   getSessionFromRequest()                            │   │
│   │                   lib/auth/session.ts                                │   │
│   │                                                                      │   │
│   │  1. Extract JWT from cookie                                          │   │
│   │  2. Verify signature (HS256 + SESSION_SECRET)                        │   │
│   │  3. Check expiration (7 days)                                        │   │
│   │  4. Return SessionPayload or null                                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│            ┌─────────────────────────┴─────────────────────────┐            │
│            │                                                   │            │
│            ▼                                                   ▼            │
│   ┌─────────────────┐                                 ┌─────────────────┐   │
│   │  Valid Session  │                                 │ Invalid/Missing │   │
│   │                 │                                 │                 │   │
│   │  Continue to    │                                 │  Redirect to    │   │
│   │  protected page │                                 │  /login         │   │
│   └─────────────────┘                                 └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

                              SESSION PAYLOAD
┌─────────────────────────────────────────────────────────────────────────────┐
│  {                                                                           │
│    "user": {                                                                 │
│      "id": 123,                                                              │
│      "email": "admin@wallawalla.travel",                                     │
│      "name": "Admin User",                                                   │
│      "role": "admin"                                                         │
│    },                                                                        │
│    "iat": 1706648400,    // Issued at                                        │
│    "exp": 1707253200     // Expires (7 days)                                 │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘

                               ROLE HIERARCHY
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   admin ─────────────────► Full system access                               │
│     │                      /admin/*, all API endpoints                      │
│     │                                                                        │
│   geology_admin ─────────► Geology content management                       │
│     │                      /admin/geology/*                                  │
│     │                                                                        │
│   partner ───────────────► Partner portal access                            │
│     │                      /partner-portal/*                                 │
│     │                                                                        │
│   driver ────────────────► Driver operations                                │
│                            /driver-portal/*, /workflow/*,                   │
│                            /inspections/*, /time-clock/*                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## The Three Modules

### 1. `lib/auth/session.ts` - Primary Session System (CANONICAL)

**Purpose**: JWT-based session management for API routes and middleware.

```typescript
// Session payload format
interface SessionPayload {
  user: {
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'geology_admin' | 'driver' | 'partner';
  };
  iat: number;
  exp: number;
}
```

**Used by**:
- `middleware.ts` - Route protection
- `lib/api/middleware/auth-wrapper.ts` - API route authentication
- `lib/services/auth.service.ts` - Login flow

**Cookie**: `session` (JWT signed with HS256)

### 2. `lib/session.ts` - Legacy Session System

**Purpose**: Alternative session format, used by some older components.

```typescript
// Session data format
interface SessionData {
  userId: string;
  email: string;
  role: string;
  isLoggedIn: boolean;
}
```

**Used by**:
- Some driver workflow components
- Fallback in auth-wrapper.ts

**Cookie**: `session` (JWT signed with HS256, different payload structure)

### 3. `lib/auth.ts` - Client Auth Helper

**Purpose**: Client-side login/logout functions and server-side session helpers.

**FIXED (January 2026)**: This module now properly delegates to `lib/auth/session.ts`:
```typescript
// getServerSession delegates to canonical session system
export async function getServerSession() {
  const { getSession } = await import('@/lib/auth/session');
  const session = await getSession();
  if (!session?.user) return null;
  return {
    userId: String(session.user.id),
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}
```

The `login()` function now relies on the API's `Set-Cookie` header (which uses proper JWT via `setSessionCookie()`) instead of setting its own plain JSON cookie.

## Current State (January 2026)

**CONSOLIDATED**: `lib/auth.ts` now delegates to `lib/auth/session.ts` for JWT verification.

The auth-wrapper fallback logic in `lib/api/middleware/auth-wrapper.ts` is still present for safety but should rarely be needed since all auth paths now use the canonical JWT system.

## Remaining Work

### Short-term
- ✅ `lib/auth.ts` now uses JWT verification via `lib/auth/session.ts`
- All new code should continue using `lib/auth/session.ts` exclusively

### Long-term (Optional Cleanup)
1. **Deprecate `lib/session.ts`** entirely (unused legacy module)
2. **Remove auth-wrapper fallback logic** once confident all sessions are JWT-based
3. **Consider merging** `lib/auth.ts` into `lib/auth/session.ts` to reduce module count

## Usage Guidelines

### For API Routes
```typescript
// CORRECT - Use auth-wrapper
import { withAuth, withAdminAuth } from '@/lib/api/middleware/auth-wrapper';

export const GET = withAuth(async (request, session) => {
  // session.userId, session.email, session.role available
});
```

### For Server Components
```typescript
// CORRECT - Use lib/auth/session.ts
import { getSession, requireAuth } from '@/lib/auth/session';

export default async function Page() {
  const session = await getSession();
  // or
  const session = await requireAuth(['admin', 'driver']);
}
```

### For Client Actions
```typescript
// CORRECT - Use lib/auth.ts for login/logout
import { login, logout } from '@/lib/auth';

// But be aware this creates plain JSON cookies
// which are handled by auth-wrapper fallback
```

## Security Notes

- All session modules require `SESSION_SECRET` in production
- Cookies are httpOnly, secure (in production), sameSite: lax
- Session duration: 7 days
- Roles: admin, geology_admin, driver, partner

## Related Files

| File | Purpose |
|------|---------|
| `lib/auth/session.ts` | Primary JWT session (canonical) |
| `lib/session.ts` | Legacy session format |
| `lib/auth.ts` | Client login/logout helpers |
| `lib/auth/passwords.ts` | Password hashing with bcrypt |
| `lib/services/auth.service.ts` | Login business logic |
| `lib/api/middleware/auth-wrapper.ts` | API route authentication |
| `lib/admin-auth.ts` | Admin-specific auth checks |

---

---

## Architectural Decisions

### Decision 1: JWT-Based Sessions

**Choice**: JWT tokens stored in HTTP-only cookies vs. database-backed sessions.

**Rationale**:
- **Stateless**: No need for session table queries on every request
- **Scalable**: Works across multiple server instances without shared state
- **Self-contained**: Token includes all needed user info (id, email, role)
- **7-day expiration**: Balanced between security (short sessions) and UX (don't log out too often)

**Trade-offs considered**:
- Can't invalidate individual sessions (mitigated by short expiration)
- Token size increases cookie size (acceptable for our payload size)

### Decision 2: Role-Based Access Control (RBAC)

**Choice**: Simple role enum (`admin`, `geology_admin`, `driver`, `partner`) vs. granular permissions.

**Rationale**:
- **Simplicity**: Current user base doesn't need fine-grained permissions
- **Maintainability**: Easier to reason about 4 roles than dozens of permissions
- **Sufficient**: Covers all current access patterns (admin vs. field staff vs. partners)

**Future consideration**: If needed, add a `permissions` array to roles for more granular control.

### Decision 3: Password Hashing (bcrypt, 12 rounds)

**Choice**: bcrypt with 12 salt rounds.

**Rationale**:
- **Industry standard**: Well-audited, widely deployed
- **12 rounds**: ~200ms verification time, good balance of security vs. performance
- **Timing-attack resistant**: Constant-time comparison built-in

**Why not argon2**: bcryptjs has zero native dependencies, simpler deployment.

### Decision 4: Single Cookie Strategy

**Choice**: Single `session` cookie for all auth vs. separate tokens for different purposes.

**Rationale**:
- **Simplicity**: One cookie to manage, clear mental model
- **Cookie domain**: Works across subdomains when needed
- **Size limit**: Our payload (~500 bytes) is well under 4KB cookie limit

### Decision 5: API-First Authentication

**Choice**: Login through `/api/auth/login` endpoint vs. server actions.

**Rationale**:
- **Decoupled**: API can be used by mobile apps, third-party integrations
- **Testable**: Easy to test auth flows with HTTP clients
- **Cookie handling**: API response sets `Set-Cookie` header properly

### Decision 6: Environment Variable for Secret

**Choice**: `SESSION_SECRET` env var vs. key management service.

**Rationale**:
- **Simplicity**: Vercel/Supabase handle env vars securely
- **Rotation**: Can rotate by deploying with new secret (all sessions invalidated)
- **Dev experience**: Easy to set up locally

**Production requirement**: Must be at least 32 characters, randomly generated.

### Decision 7: No Refresh Token Flow

**Choice**: Single token with 7-day expiration vs. access/refresh token pattern.

**Rationale**:
- **Simpler**: No token refresh logic needed
- **Acceptable risk**: 7 days is short enough; internal users, not banking app
- **Recovery**: Users can simply log in again if session expires

---

**Last Updated**: January 30, 2026
**Status**: Consolidated - `lib/auth.ts` now uses JWT via `lib/auth/session.ts`
