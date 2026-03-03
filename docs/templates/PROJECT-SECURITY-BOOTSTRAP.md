# Project Security Bootstrap Template

> **Purpose:** Codified lessons from 4 audit sessions on the Walla Walla Travel codebase. Apply to any new Next.js + Supabase + Vercel project to avoid repeating the same security gaps.
>
> **Stack assumption:** Next.js (App Router) + Supabase (PostgreSQL) + Vercel. Adapt if your stack differs.

---

## Section 1: Day-One Checklist

Do these **before writing any features**. Every item here was a real vulnerability found in production.

### Database

- [ ] **Enable RLS on all tables with deny-all default**
  ```sql
  DO $$
  DECLARE tbl RECORD;
  BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    END LOOP;
  END; $$;
  ```
  **Why:** Supabase exposes every table via PostgREST. The anon key is in your client bundle (required for Realtime). Without RLS, anyone can `curl` your Supabase URL and read/write every table — even if your app never calls PostgREST directly.

- [ ] **SECURITY INVOKER on all views**
  ```sql
  ALTER VIEW <name> SET (security_invoker = on);
  ```
  **Why:** SECURITY DEFINER views execute as the view *owner* (who has full access), bypassing RLS entirely. SECURITY INVOKER respects the caller's permissions.

- [ ] **SET search_path on all functions**
  ```sql
  CREATE OR REPLACE FUNCTION my_func()
  RETURNS void
  LANGUAGE plpgsql
  SET search_path = public, pg_temp
  AS $$ ... $$;
  ```
  **Why:** Without an explicit `search_path`, a malicious user could create a function in a schema that shadows your intended one, leading to privilege escalation.

### API Routes

- [ ] **Auth wrappers on ALL routes**
  Every route file must use one of: `withAuth`, `withAdminAuth`, `withOptionalAuth`, `withDriverAuth`, `withCronAuth`, or at minimum `withErrorHandling`.
  ```typescript
  // Pattern:
  export const GET = withAdminAuth(async (request, { session }) => { ... });
  export const POST = withCSRF(withAuth(async (request, { session }) => { ... }));
  ```

- [ ] **CSRF on all mutations**
  Every POST/PUT/PATCH/DELETE route wraps with `withCSRF`. This validates a token from the `x-csrf-token` header against the server-side session.

- [ ] **Rate limiting on auth and payment endpoints**
  ```typescript
  export const POST = withRateLimit(rateLimiters.auth)(handler);
  export const POST = withRateLimit(rateLimiters.payment)(handler);
  ```
  Auth endpoints and payment endpoints are prime targets for brute-force and abuse.

- [ ] **Zod validation on ALL route inputs**
  Every route that reads `request.json()` must validate with a Zod schema. Never trust client input.
  ```typescript
  const data = await validateBody(request, MySchema);
  ```

- [ ] **Error handling wrapper on all routes**
  `withErrorHandling` catches thrown errors and returns structured JSON responses. Without it, unhandled errors leak stack traces to clients.

### CI/CD

- [ ] **Branch protection requiring CI pass**
  Configure main branch to require at least Build Check and Lint Code status checks before merge.

- [ ] **`verify.sh` mirroring CI locally**
  Create a `scripts/verify.sh` that runs `tsc + lint + next build + jest` — the same checks CI runs. Developers run this before pushing.

---

## Section 2: Infrastructure Monitoring

Set up in the **first week**. These catch regressions automatically.

### Automated Checks

- [ ] **Supabase linter cron (daily)**
  Query `extensions.lint()` for SECURITY-category errors. Send admin email alert on ERRORs. Store results in `system_health_checks` for dashboard visibility.
  ```sql
  SELECT name, level, detail, metadata
  FROM extensions.lint()
  WHERE level IN ('ERROR', 'WARN')
    AND categories @> ARRAY['SECURITY'];
  ```
  Requires the `splinter` extension enabled in Supabase.

- [ ] **Health check on every push + 3x daily cron**
  CI workflow that checks: auth wrappers, Zod validation, CSRF, oversized files, dependency vulnerabilities, test coverage ratio, build pass. Creates GitHub Issues for failures.

### Error Tracking

- [ ] **Sentry with error boundaries**
  - Server-side: wrap route handlers
  - Client-side: React Error Boundary at layout level
  - Note: React error boundaries do NOT catch errors in event handlers — those need explicit try/catch

### Session Security

- [ ] **Session hardening (server-side sessions)**
  - `user_sessions` table with server-side session IDs
  - `sid` claim in JWT linked to session record
  - Session rotation on privilege changes (login, role change)
  - Idle timeout (configurable, default 30 min)
  - Revocation: delete session record to force re-auth
  - Never store session state in localStorage or cookies alone

---

## Section 3: Before Going Live

Pre-launch gate. Do not deploy to production without these.

### Compliance

- [ ] **CAN-SPAM compliance on marketing emails**
  All marketing/transactional emails must include a working unsubscribe link. Use a token-based unsubscribe system (`/unsubscribe/[token]` route). Track opt-out state in an `email_preferences` table.

### File Security

- [ ] **EXIF stripping on image uploads**
  User-uploaded images contain GPS coordinates, device info, and other PII in EXIF metadata. Strip it before storage using `sharp`:
  ```typescript
  const stripped = await sharp(buffer).rotate().toBuffer();
  ```
  `sharp.rotate()` with no args auto-rotates based on EXIF orientation, then discards all metadata.

### Performance

- [ ] **Connection pool sized for serverless (max: 5)**
  On Vercel, each serverless function gets its own Node process. With 50 concurrent functions each opening 5 connections, that's 250 connections to your DB. Supabase Pro allows 200 direct + pooler. Keep `max` at 5 per function.

- [ ] **ISR on public pages (not `force-dynamic`)**
  `export const dynamic = 'force-dynamic'` means every visitor hits the database. For public pages (wineries, restaurants, blog posts), use ISR with `revalidate` instead:
  ```typescript
  export const revalidate = 3600; // Regenerate hourly
  ```

### Cron Jobs

- [ ] **Advisory locks on all cron jobs**
  Vercel can invoke cron functions multiple times simultaneously. Use PostgreSQL advisory locks (`pg_try_advisory_lock`) to ensure only one instance runs at a time.

- [ ] **`maxDuration` set on all cron routes**
  ```typescript
  export const maxDuration = 60; // seconds
  ```
  Prevents runaway cron jobs from consuming resources.

### Webhooks

- [ ] **Signature verification on all webhook endpoints**
  Stripe, Twilio, Resend, etc. all sign their payloads. Verify the signature before processing.

### Deployment

- [ ] **Staging environment exists**
  A `staging` branch with automatic Vercel preview deployments. Test changes there before merging to `main`. Use Stripe test mode, shared DB with test data.

---

## Section 4: Lessons Learned

Anti-patterns discovered the hard way. These are not hypothetical — each one caused a real issue.

### Build & Type Safety

> **Never trust `tsc --noEmit` alone — always verify with `next build`.**
>
> TypeScript type-checking passes, but the Next.js build includes additional checks (unused exports in server components, import resolution, route segment config validation). A green `tsc` does not mean the app will deploy.

### Database Security

> **Supabase anon key in client bundle = direct DB access if RLS is off.**
>
> The anon key is not a secret — it's in your JavaScript bundle. It's designed to be public, but only safe when RLS policies restrict what it can access. With RLS disabled (the Supabase default for new tables), anyone can read and write every row.

### Serverless Gotchas

> **Connection pooling: max per function x concurrent functions must stay under DB limit.**
>
> A pool with `max: 20` works fine locally (one process). On Vercel with 50 concurrent function invocations, that's 1,000 connection attempts. Supabase Pro allows ~200 direct connections. Set `max: 5` and use the Supabase connection pooler (port 6543) for high-traffic routes.

### Developer Experience

> **Pre-commit hooks can bundle unrelated files — verify commit messages.**
>
> Aggressive pre-commit hooks that auto-stage and commit can silently include dirty files from other work. Always check `git log --oneline -1` after commits to verify the message and diff match your intent.

### React

> **React error boundaries don't catch event handler errors.**
>
> Error boundaries only catch errors during rendering, lifecycle methods, and constructors. A `throw` inside an `onClick` handler bypasses the boundary entirely. Use explicit try/catch in event handlers and report to Sentry manually.

### Performance

> **`force-dynamic` on public pages means every visitor hits the database.**
>
> For pages that change infrequently (business listings, blog posts, static content), use ISR (`revalidate`) instead. A page with 1,000 daily visitors on `force-dynamic` = 1,000 DB queries. With `revalidate: 3600`, it's ~24 queries.

### Email Compliance

> **Marketing emails require a legal unsubscribe mechanism.**
>
> CAN-SPAM (US), CASL (Canada), and GDPR (EU) all require a working unsubscribe link in marketing emails. This isn't optional — it's a legal requirement with penalties up to $50,000 per violation (CAN-SPAM). Build the unsubscribe system before sending the first marketing email, not after.

---

## Quick Reference: File Locations (WWT patterns)

These are the reference implementations in the Walla Walla Travel codebase:

| Pattern | File |
|---------|------|
| Auth middleware | `lib/api/middleware/auth.ts` |
| CSRF middleware | `lib/api/middleware/csrf.ts` |
| Rate limiting | `lib/api/middleware/rate-limit.ts` |
| Error handling | `lib/api/middleware/error-handler.ts` |
| Cron auth + lock | `lib/api/middleware/cron-auth.ts`, `cron-lock.ts` |
| Zod validation | `lib/api/middleware/validation.ts` |
| Session hardening | `lib/auth/session.ts` |
| EXIF stripping | `lib/uploads/strip-exif.ts` |
| Email unsubscribe | `lib/email/unsubscribe.ts` |
| DB connection pool | `lib/db.ts`, `lib/config/database.ts` |
| Health check (local) | `scripts/daily-health.sh` |
| Health check (CI) | `.github/workflows/daily-health-check.yml` |
| Supabase linter cron | `app/api/cron/supabase-lint/route.ts` |
| RLS migration | `migrations/108-enable-rls-all-tables.sql` |
| Verify script | `scripts/verify.sh` |
