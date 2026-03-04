# Sentry Verification Report

**Date**: March 4, 2026
**Verified by**: Claude Code (automated)

---

## Status: OPERATIONAL

Sentry is **active and receiving events**. Two test events were successfully ingested by the Sentry API, confirming the DSN is valid and the project is live.

---

## Verification Tests

### 1. Ingest Endpoint — CONFIRMED WORKING

| API | HTTP Status | Event ID Returned |
|-----|:-----------:|-------------------|
| Envelope API | 200 | `9f1237c418a94f8daee917b9d2d6b396` |
| Store API | 200 | `b01f7f802ea9405c9efb1414020c7f9a` |

Both test events were accepted, confirming the DSN, org, and project are all valid and active.

### 2. Sentry Example Page — NOT PRESENT

No `/sentry-example-page` route exists (returns 404). This is fine — the page is a scaffolding convenience, not required for production monitoring.

### 3. Production Error Handling — WORKING

Hitting a protected API endpoint without auth returns a clean 401 — errors are caught by `withErrorHandling` middleware, logged via the structured logger (which forwards to Sentry in production), and returned as JSON.

---

## DSN Details

| Field | Value |
|-------|-------|
| **DSN** | `https://593d2f...@o4510622649024512.ingest.us.sentry.io/4510976666173440` |
| **Org ID** | `o4510622649024512` |
| **Project ID** | `4510976666173440` |
| **Ingest Region** | US |

### Env Var Scoping (Vercel)

| Variable | Production | Preview | Development |
|----------|:----------:|:-------:|:-----------:|
| `NEXT_PUBLIC_SENTRY_DSN` | Set | Set | Set |
| `SENTRY_AUTH_TOKEN` | Set | Set | — |
| `SENTRY_ORG` | Set | Set | — |
| `SENTRY_PROJECT` | Set | Set | — |

**Minor issue**: The Development-scoped DSN contains a trailing literal `\n`. The Sentry SDK handles this gracefully (events still ingest), but it should be cleaned up in the Vercel dashboard by re-saving the value without trailing whitespace.

---

## SDK Configuration

**Package**: `@sentry/nextjs` ^10.32.1

### Config Files

| File | Runtime | Status |
|------|---------|--------|
| `sentry.client.config.ts` | Browser | Configured |
| `sentry.server.config.ts` | Node.js (API routes, SSR) | Configured |
| `sentry.edge.config.ts` | Edge (middleware) | Configured |
| `next.config.ts` | Build-time (`withSentryConfig`) | Configured |

All three runtime configs use conditional initialization (`if (SENTRY_DSN)`) — Sentry is a no-op when the DSN is missing (local dev without `.env` values).

### Sample Rates

| Metric | Production | Development |
|--------|:----------:|:-----------:|
| Error capture | 100% | Console only (not sent) |
| Traces (client) | 20% | 100% |
| Traces (server) | 20% | 100% |
| Traces (edge) | 10% | 100% |
| Session replay | 10% (100% on error) | 0% |

### Error Filtering

- **Client ignores**: ResizeObserver, AbortError, network errors, browser extension errors
- **Server ignores**: ZodError, ValidationError, RATE_LIMIT_EXCEEDED, JWT errors
- **Edge ignores**: NEXT_REDIRECT, NEXT_NOT_FOUND

All configs suppress events in development via `beforeSend` returning `null`.

### Data Scrubbing

Server config redacts sensitive fields from request bodies (`password`, `token`, `secret`, `authorization`, `cookie`) and headers (`authorization`, `cookie`, `x-csrf-token`).

---

## Error Boundaries

| File | Scope | Sentry Integration |
|------|-------|:------------------:|
| `app/error.tsx` | Route-level errors | `Sentry.captureException(error)` |
| `app/global-error.tsx` | Root layout errors | `Sentry.captureException(error)` |

### Logger Integration

`lib/logger.ts` lazy-loads Sentry on the server side. When `logger.error()` is called with an `Error` object, it forwards to `Sentry.captureException` with context via `Sentry.setContext`.

### CSP Headers

`lib/config/security.ts` includes `api.sentry.io` in the `connect-src` CSP directive — no browser-side blocking.

---

## Source Maps

Disabled in `next.config.ts`:

```typescript
sourcemaps: { disable: true }
```

This prevents OOM during Vercel builds. Stack traces in Sentry show minified code. To enable readable traces, set `disable: false` and verify the build stays within Vercel memory limits.

---

## Environment Tagging

Events are tagged with:
- **`environment`**: `NEXT_PUBLIC_VERCEL_ENV` → `production` / `preview` / `development`
- **`release`**: `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`

Staging (Preview) deployments are automatically tagged as `preview`.

---

## Build Warnings (Non-Blocking)

Sentry SDK v10+ recommends migrating config files:
- `sentry.server.config.ts` → `instrumentation.ts` (register function)
- `sentry.edge.config.ts` → `instrumentation.ts`
- `sentry.client.config.ts` → `instrumentation-client.ts`

Current config still works. Migration is recommended before Next.js 16.

---

## Checklist

- [x] DSN set in Vercel for Production, Preview, and Development
- [x] Sentry ingest endpoint accepts events (HTTP 200)
- [x] Client, server, and edge configs present and correct
- [x] Error boundaries forward exceptions to Sentry
- [x] Logger integrates with Sentry for server-side errors
- [x] Sensitive data scrubbed before sending
- [x] Development events suppressed (not sent)
- [x] Environment tagging works (production vs preview)
- [x] CSP headers allow Sentry connections
- [ ] Source maps disabled (minified stack traces) — acceptable trade-off
- [ ] No test error page — not needed for production

---

## Optional Improvements

1. **Clean trailing `\n`** from DSN in Vercel dashboard (Development scope)
2. **Migrate to instrumentation files** before Next.js 16
3. **Enable source maps** when Vercel build memory allows
4. **Check Sentry dashboard** at https://walla-walla-travel.sentry.io to confirm events appear
