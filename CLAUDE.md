# CLAUDE.md — Walla Walla Travel

**Read MISSION.md first. It defines why we build and what matters most.**

## Stack
Next.js 15 · React 19 · TypeScript 5 · Prisma (PostgreSQL via Supabase) · Stripe · Resend · Upstash Redis · Tailwind CSS. Deployed on Vercel.

## Route Composition (every API route MUST follow this)
NOTE: Admin pages use Server Components + Server Actions (built-in CSRF from Next.js).
The withCSRF wrapper below applies to API routes only (partner portal, driver portal, public mutations).
Once ALL pages are converted to Server Components, withCSRF can be retired.
```typescript
// API route mutation — the canonical pattern
export const POST = withCSRF(                    // 4. CSRF outermost on mutations (API routes only)
  withRateLimit(rateLimiters.api)(               // 3. Rate limiting
    withAdminAuth(async (request, session) => {  // 2. Auth wrapper
      const parsed = Schema.parse(               // 5. Zod validation — always
        await request.json()
      );
      // business logic                          // 1. withErrorHandling (built into auth wrapper)
    })
  )
);
```
Wrappers: `withAdminAuth`, `withAuth`, `withOptionalAuth` — `lib/api/middleware/auth-wrapper`
Error handling: `withErrorHandling` — `lib/api/middleware/error-handler`
CSRF: `withCSRF` — `lib/api/middleware/csrf`
Rate limiting: `withRateLimit` + `rateLimiters` — `lib/api/middleware/rate-limit`
Exceptions: webhooks use signature verification (skip CSRF), crons use `withCronAuth`, public GETs skip auth.

## Session Properties
- `session.userId` (string), `session.email`, `session.role`, `session.sid`
- Numeric ID: `parseInt(session.userId)`
- **NEVER** `session.user.id` — does not exist

## File Organization
- Business logic → `lib/services/`
- Routes are thin wrappers: validate input → call service → return response
- Schemas inline in route files or `lib/validation/schemas/`
- Tests mirror app structure in `__tests__/`
- No file over 500 lines — decompose into modules

## Anti-Patterns (never do these)
- No inline auth checks — use wrapper functions
- No raw `request.json()` without Zod validation
- No `@/lib/db` or raw SQL pool imports — Prisma only
- No `getDay()` — use `getUTCDay()` for timezone safety
- No `console.log` — use structured logger from `lib/logger.ts`
- No in-memory state for throttling on Vercel — use DB timestamp comparison
- No `next/font/google` — self-hosted fonts only
- No client-side `fetch('/api/...')` in admin pages — use Server Components + direct Prisma
- No unpinned npx commands in CI
- No duplicate API paths — consolidate

## Pre-Commit Checks (run ALL before every commit)
```bash
echo "=== CHECK 1: No raw SQL pool imports ==="
grep -rn "import.*pool\|from.*lib/db\|\.query(" lib/ app/ --include="*.ts" --include="*.tsx" | grep -v node_modules || echo "PASS"

echo "=== CHECK 2: No client fetch to internal APIs in admin ==="
grep -rn "fetch.*['\"]\/api\/" app/admin/ --include="*.ts" --include="*.tsx" | grep -v node_modules || echo "PASS"

echo "=== CHECK 3: Build ==="
npx next build 2>&1 | tail -5
```
ALL must show PASS. If any fail, fix before committing.

## Do NOT (universal guardrails — every session)
- **Do NOT refactor code you weren't asked to touch.** If you see something improvable in a file you're editing, note it in your report — don't fix it.
- **Do NOT add abstractions, utilities, or helper functions** unless the prompt specifically asks for them. Simpler is better.
- **Do NOT change the signature or behavior of existing functions** unless that's the explicit task. Other code depends on them.
- **Do NOT install new packages** without asking first. The dependency list is intentional.
- **Do NOT create new API routes.** The direction is Server Components + direct Prisma, not more API routes.
- **Do NOT "improve" working patterns** (rename variables for "clarity", restructure files for "consistency", add types that aren't needed). Working code stays working.
- **Do NOT make changes outside the scope of the current prompt.** If the prompt says "rebuild the schedule page", only touch the schedule page and its direct dependencies.
- **Do NOT add comments explaining obvious code.** Comments are for "why", not "what".
- **Do NOT convert things to Server Actions** unless the prompt explicitly says to. Some client-side patterns are intentional.
- **If something seems wrong but the prompt doesn't mention it:** report it in your final output, don't fix it silently.

## Execution Rules
1. One page per prompt. Build, verify, then next.
2. Use sub-agents for batch work (3+ parallel pages).
3. Do not improvise. Follow the patterns above. If something doesn't fit: **ASK**.
4. Report check results before every commit.
5. After pushing: verify with Chrome MCP tools (navigate → read_network_requests → get_page_text).
6. When in doubt: **ASK.** Do not guess.

## Production Safety Rules (NON-NEGOTIABLE)

**The #1 rule: NEVER make the site worse than it currently is.**

### NEVER do these without EXPLICIT permission from Ryan:
- Never remove, delete, or redeploy a production deployment
- Never modify Vercel environment variables
- Never modify DNS, domains, or routing
- Never modify the database schema in production without explicit approval
- Never modify Stripe keys, webhook secrets, or payment configuration
- Never modify cron job schedules in vercel.json without explicit approval

### ALWAYS do these:
- Diagnose FIRST, fix SECOND. Get the actual error before proposing a fix.
- Show the evidence before acting.
- When debugging production errors: reproduce locally first.
- If a fix requires infrastructure changes: DESCRIBE and ASK. Do not execute.
- If you're unsure whether something will affect the live site: it will. ASK.

### The escalation ladder:
1. **Code-only changes** (app/, lib/, components/) — freely within prompt scope.
2. **Git push** — required after every commit. Triggers a deploy.
3. **Config changes** (vercel.json, next.config.ts, prisma/schema.prisma) — explain before pushing.
4. **Infrastructure changes** (Vercel env vars, deployment commands, DNS) — **STOP. Describe. Wait for approval.**
5. **Destructive actions** (removing deployments, deleting env vars, dropping tables) — **NEVER. Tell Ryan.**

## Business Context
- **Ryan** is the sole operator. No dev team. Everything maintainable by Ryan + Claude.
- Tax rate: 9.1% (Walla Walla)
- Stripe dual brand: WWT + NW Touring (`lib/stripe-brands.ts`)
- Email: Resend (transactional + inbound via `in.wallawalla.travel`)
- Crons: 24+ registered in `vercel.json`
- The test: "Can Ryan create a booking while on the phone at 7am?"

## Open Brain (cross-session knowledge)
When you discover something important during a task — a non-obvious root cause, an architectural insight, a pattern that will matter later — log it to Open Brain using the `add_thought` MCP tool. This builds a persistent, searchable knowledge base that survives across sessions and tools.
- Log: architectural decisions, debugging root causes, "gotchas" discovered, performance findings
- Don't log: routine commits, obvious changes, things already in CLAUDE.md or skills files
- Before complex debugging: search Open Brain with `search_thoughts` for prior insights on the area
- Tag thoughts with relevant categories: `architecture`, `debugging`, `stripe`, `prisma`, `performance`, `security`

## Model Selection (specified in every prompt header)
- **Sonnet/low**: simple file changes, styling, templates, single-file tests
- **Sonnet/medium**: page rebuilds, CRUD, migrations, batch changes (~70% of work)
- **Opus/medium**: multi-file refactors, complex debugging, config restructuring
- **Opus/high**: architecture decisions, Stripe payment flows, security work, novel feature design, deep codebase reasoning, smart pricing engine, AI features
- **Haiku/low**: sub-agent file exploration only
Opus is the right tool when the task requires genuine reasoning across multiple interacting systems or when getting it wrong has real consequences. Use it confidently for those tasks.
