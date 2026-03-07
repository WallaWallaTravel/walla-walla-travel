# WWT Architecture Rebuild Plan

## Goal

Rebuild the WWT application layer on proper foundations. The database, Supabase, Vercel, Stripe, Resend, Redis, Sentry, and all business logic stay exactly as they are. Only the plumbing between the UI and the database gets rebuilt.

| Old | New |
|-----|-----|
| Raw SQL (pg pool) | Prisma ORM |
| Custom JWT (jose) | Auth.js v5 |
| Manual fetch + CSRF | Server Actions |
| Ad-hoc validation | React Hook Form + Zod |

---

## Phase 1: Foundation

### 1A. Prisma Setup

- Run `npx prisma db pull` to introspect the existing production database and auto-generate the schema
- Review and refine the auto-generated schema: add `@relation` annotations, clean up model names if needed, ensure all tables are represented
- Run `npx prisma generate` to create the typed client
- Create `lib/prisma.ts` — singleton pattern for serverless environments (prevents connection pool exhaustion on Vercel):

```ts
import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- Write a verification test: query one booking via Prisma, log the result, confirm the typed response matches the existing data
- **Commit:** `feat: prisma setup — schema introspected from production DB`

### 1B. Auth.js v5 Setup

- Install `next-auth@5 @auth/prisma-adapter bcryptjs @types/bcryptjs`
- Create `auth.config.ts` (Edge-compatible, no Prisma import) with:
  - Route protection rules by role
  - Pages configuration (custom login pages for admin, driver, partner, organizer)
- Create `auth.ts` at project root with:
  - Credentials provider: accepts email + password, verifies with bcrypt against the existing users table, returns user object with id, email, name, role
  - Email provider: for guest magic links (replaces custom magic link implementation)
  - PrismaAdapter for user/session/account storage
  - JWT strategy with callbacks:
    - `jwt({ token, user })` — adds role and userId to token
    - `session({ session, token })` — exposes role and userId on `session.user`
- Create `app/api/auth/[...nextauth]/route.ts` with the Auth.js route handler
- Update `middleware.ts` to use Auth.js for route protection — replace all custom JWT verification with `auth()` calls
- Map existing roles: admin, geology_admin, driver, partner, organizer, guest
- Keep the existing login page UI — just change what happens when the form submits (call `signIn('credentials', { email, password })` instead of custom JWT endpoint)
- Do NOT delete the old auth code yet — both systems coexist during migration
- Test: verify you can log in as admin, that the session contains the role, and that protected routes still redirect unauthenticated users
- **Commit:** `feat: auth.js v5 setup — credentials + magic link providers, prisma adapter`

### 1C. Server Actions + Forms Pattern

- Install `react-hook-form @hookform/resolvers`
- Create `lib/schemas/booking.ts` — Zod schema for booking creation
- Create `lib/actions/bookings.ts` — the first Server Action:
  - Uses `'use server'` directive
  - Checks auth via `auth()`
  - Validates with Zod schema
  - Creates booking via Prisma
  - Returns `{ success, booking }` or `{ error }`
- Build the Quick Create Booking page at `/admin/bookings/quick-create`:
  - Uses React Hook Form with `zodResolver(CreateBookingSchema)` for client-side validation
  - On submit: calls the `createBooking` Server Action directly — no fetch, no API route, no CSRF token
  - Shows validation errors inline on each field
  - Shows server errors at the top of the form
  - On success: redirects to the booking detail page or calendar
  - Fields: customer first name, last name, email, phone, trip date, tour type (dropdown), estimated duration, group size, pickup location, deposit amount, driver assignment (dropdown populated from drivers query), notes
  - Add "Quick Create" button to the bookings list page and calendar page
- This form is the **TEMPLATE**. Every other form in the rebuild follows this exact pattern.
- **Commit:** `feat: server actions + react hook form — quick create booking as template`

### 1D. Shared API Client

- Create `lib/api/client.ts`:
  - Generic `request<T>()` function with method, url, data
  - Automatic CSRF token inclusion via `getCSRFToken()`
  - Automatic JSON headers
  - Error extraction from response body
  - Exported as `adminApi` object with `.get()`, `.post()`, `.put()`, `.patch()`, `.delete()` methods
- This is for remaining GET calls and any mutations that can't use Server Actions (webhooks, cron, public API endpoints)
- **Commit:** `feat: shared admin API client with automatic CSRF, auth, and error handling`

---

## Rules

- The existing app MUST continue working alongside the new foundation — do not break anything that currently works
- Both old auth and new Auth.js coexist during migration
- Both old raw SQL routes and new Prisma routes coexist
- Run `npx next build` before EVERY commit
- Commit each sub-phase (1A, 1B, 1C, 1D) separately
- Report what was done for each sub-phase with file counts and verification results

---

## Phase 2: Migration (Future)

- Migrate existing pages/routes from old patterns to new patterns one by one
- Each migration: replace raw SQL with Prisma, replace fetch+CSRF with Server Action, add React Hook Form
- Delete old API routes as their callers are migrated
- Delete old auth code once all routes use Auth.js

## Phase 3: Cleanup (Future)

- Remove old `lib/db.ts` raw SQL pool
- Remove old `lib/auth/session.ts` custom JWT
- Remove old CSRF middleware (Server Actions handle it natively)
- Remove old `fetch-utils.ts` (replaced by Server Actions + adminApi)
- Final audit and testing
