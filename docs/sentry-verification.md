# Sentry Verification Report

**Date:** 2026-03-03
**Verified by:** Claude Code (automated)

---

## Status: PARTIALLY WORKING — Action Required

Sentry is **configured and deployed** but has two issues that may prevent reliable event capture.

---

## Verification Results

### 1. Sentry Example Page — MISSING

No `/sentry-example-page` route exists in the codebase. Production returns 404:

```
curl -sI https://wallawalla.travel/sentry-example-page → HTTP/2 404
```

No route file exists at `app/(public)/sentry-example-page/` or `app/sentry-example-page/`.

**Action:** Create a test error page to manually verify end-to-end error capture.

### 2. Sentry DSN — Set in Vercel, Empty Locally

| Environment | `NEXT_PUBLIC_SENTRY_DSN` | Status |
|-------------|--------------------------|--------|
| `.env` | _(empty)_ | Expected — no monitoring in local dev |
| `.env.local` | _(empty)_ | Expected |
| Vercel Production | Set (encrypted) | Deployed |
| Vercel Preview | Set (encrypted) | Deployed |
| Vercel Development | Set (encrypted) | Deployed |

The DSN resolves to Sentry org `o4510622649024512` (walla-walla-travel), project `4510976666173440`.

### 3. Sentry Ingest Endpoint — REACHABLE

```
curl → https://o4510622649024512.ingest.us.sentry.io/api/4510976666173440/store/ → HTTP 400
```

HTTP 400 confirms the project exists and the key is accepted (an invalid key or project would return 401/404).

### 4. Trailing Newline in DSN — POTENTIAL ISSUE

The Vercel env var for `NEXT_PUBLIC_SENTRY_DSN` contains a trailing `\n` character:

```
"https://593d...@o4510622649024512.ingest.us.sentry.io/4510976666173440\n"
```

`SENTRY_ORG` and `SENTRY_PROJECT` also have trailing `\n`. This may cause:
- Sentry SDK initialization failure (malformed URL)
- Source map upload failures (wrong org/project name)

**Action:** In the Vercel dashboard, re-save these three env vars without trailing whitespace/newlines:
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

Then redeploy.

### 5. CSP Headers — CORRECTLY CONFIGURED

The production CSP header includes `connect-src https://api.sentry.io`, allowing the Sentry SDK to send events. No CSP-related blocking expected.

### 6. Production Page Source — NO SDK VISIBLE

The production homepage HTML contains no inline Sentry references. This is expected — the SDK is bundled into JS chunks via `withSentryConfig()` and loads asynchronously. However, combined with the trailing-newline DSN issue, this means the SDK may be silently failing to initialize.

---

## Codebase Configuration Audit

### SDK & Integration

| Component | File | Status |
|-----------|------|--------|
| Package | `@sentry/nextjs` ^10.32.1 | Installed |
| Client config | `sentry.client.config.ts` | Complete — error filtering, replay, browser tracing |
| Server config | `sentry.server.config.ts` | Complete — data scrubbing, ZodError filtering |
| Edge config | `sentry.edge.config.ts` | Complete — NEXT_REDIRECT filtering |
| Next.js wrapper | `next.config.ts` → `withSentryConfig()` | Active — source maps disabled (OOM prevention) |
| Error boundary | `app/error.tsx` | Calls `Sentry.captureException()` |
| Global error boundary | `app/global-error.tsx` | Calls `Sentry.captureException()` |
| Logger integration | `lib/logger.ts` | Auto-captures errors to Sentry in production |
| Client error handler | `lib/error-logger.ts` | Global window.onerror + unhandledrejection |

### Vercel Environment Variables

| Variable | Production | Preview | Notes |
|----------|-----------|---------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | Set | Set | Has trailing `\n` — needs fix |
| `SENTRY_AUTH_TOKEN` | Set | Set | For source map uploads (currently disabled) |
| `SENTRY_ORG` | Set | Set | `walla-walla-travel` + trailing `\n` |
| `SENTRY_PROJECT` | Set | Set | `walla-walla-travel` + trailing `\n` |

### Sample Rates

| Context | Error Rate | Performance Rate | Session Replay |
|---------|-----------|-----------------|----------------|
| Client (prod) | 100% | 20% | 10% sessions, 100% on error |
| Server (prod) | 100% | 20% | N/A |
| Edge (prod) | 100% | 10% | N/A |
| All (dev) | 0% (blocked by beforeSend) | 100% | 0% |

### Filtered Errors (not sent to Sentry)

- **Client:** ResizeObserver, AbortError, Failed to fetch, NetworkError, browser extensions
- **Server:** ZodError, ValidationError, RATE_LIMIT_EXCEEDED, JWT errors
- **Edge:** NEXT_REDIRECT, NEXT_NOT_FOUND

### Source Maps

Disabled (`sourcemaps: { disable: true }`) to prevent OOM on Vercel free tier. Stack traces in Sentry will be minified until the Vercel plan is upgraded.

---

## Build Warnings (Sentry SDK Deprecations)

The `npx next build` output shows 4 Sentry-related warnings:

1. **`sentry.server.config.ts` is deprecated** — Move content into a `register()` function in `instrumentation.ts`
2. **Missing `instrumentation.ts` file** — Required for server-side SDK initialization in Next.js 15+
3. **`sentry.edge.config.ts` is deprecated** — Move content into `instrumentation.ts` as well
4. **`sentry.client.config.ts` rename recommended** — Move content to `instrumentation-client.ts` (required for Turbopack)

These are warnings, not errors — the current config still works. But Sentry SDK v10+ expects the instrumentation file pattern and future Next.js versions may break the current approach.

---

## Recommended Actions

1. **Fix trailing newlines** — Re-save `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` in the Vercel dashboard without trailing whitespace, then redeploy
2. **Migrate to instrumentation files** — Move `sentry.server.config.ts` and `sentry.edge.config.ts` content into `instrumentation.ts`, rename `sentry.client.config.ts` to `instrumentation-client.ts`
3. **Create test error page** — Add `app/(public)/sentry-example-page/page.tsx` with a button that throws to verify end-to-end capture
4. **Verify in Sentry dashboard** — After fixing the DSN, check https://walla-walla-travel.sentry.io for incoming events
5. **Consider enabling source maps** — When budget allows upgrading the Vercel plan, re-enable for readable stack traces
