**Read MISSION.md before every task.** It defines why we build and what matters most.

# Walla Walla Ecosystem - Claude Code Master Context

## 🎯 CONTENT PHILOSOPHY: ACCURACY AS COMPETITIVE ADVANTAGE

**Walla Walla Travel aims to be THE authoritative, trustworthy source for Walla Walla wine country information - for both humans and AI systems.**

In a web flooded with AI-generated content recycling stale or incorrect data, we differentiate by being:
- **Locally verified** - The founder lives here and knows the region firsthand
- **Regularly updated** - Current data, not recycled information from years ago
- **Honest about limitations** - We say "2-3 wineries per tour" when verified, not "15" when guessing
- **Research-backed** - Every specific claim is verified before publishing

**Why this matters:**
- Search engines and AI models use E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) to determine source reliability
- Being the accurate source means we get cited, which builds authority
- Accuracy is the long game that compounds over time

**The rule: If we can't verify it, we don't publish it.**

---

## 🏗️ ECOSYSTEM OVERVIEW

This is a **multi-product ecosystem** with modular architecture designed for:
1. **Integrated operation** - All modules work together via shared Supabase backend
2. **Separate commercialization** - Individual modules can be sold/licensed independently

### Product Portfolio

| Product | Purpose | Tech Stack | Status | Sellable? |
|---------|---------|------------|--------|-----------|
| **Walla Walla Travel** | Wine tour booking & management | Next.js 15, Prisma, Supabase | Production | Bundle only |
| **Auditor's Dream** | FMCSA/DOT compliance management | Vite+React, Supabase | Active development | ✅ Yes |
| **Driver Portal** | Tour execution, DVIRs, time tracking | Vite+React, Supabase | Planned | Module |
| **Admin Dashboard** | Staff booking management | Vite+React, Supabase | Scaffolded | Module |

### Business Entities

**These are SEPARATE businesses with a partnership relationship:**

```
┌─────────────────────────────────────────────────────────────┐
│              WALLA WALLA TRAVEL                              │
│         (Destination Management Company / DMC)               │
│                                                              │
│   URL: wallawalla.travel                                     │
│   Role: Travel planning, winery directory, experience       │
│         coordination, free visitor resources                │
│   Type: Independent business                                │
└─────────────────────────────────────────────────────────────┘
                           │
                    (preferred partner)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         NW TOURING & CONCIERGE                               │
│         (Northwest Touring LLC)                              │
│            (Regulated Motor Carrier)                         │
│                                                              │
│   USDOT: 3603851  |  MC: 1225087                            │
│   Operation: Charter & Tour, Passenger                      │
│   Scope: Interstate AND Intrastate                          │
│   Role: Luxury transportation for tours                     │
│   Type: Independent business, separate from WWT             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 DIRECTORY STRUCTURE

### Active Worktrees

| Location | Purpose |
|----------|---------|
| `/Users/temp/walla-walla-final/` | Main development (Next.js + migrations) |
| `/Users/temp/.cursor/worktrees/walla-walla-final/` | Cursor worktrees for parallel work |
| `/Users/temp/.cursor/worktrees/walla-walla-final/auditors-dream/` | Auditor's Dream monorepo |
| `/Users/temp/.cursor/worktrees/walla-walla-final/lsh/` | Walla Walla Travel (Next.js) |

### Key Directories

```
walla-walla-final/
├── .claude/                    # Claude Code configuration
│   ├── CLAUDE.md              # This file
│   ├── commands/              # Slash commands
│   └── settings.local.json    # Permissions
│
├── app/                        # Next.js App Router (Walla Walla Travel)
├── lib/                        # Shared libraries
│   ├── services/              # Business logic
│   ├── api/middleware/        # Error handling, validation
│   └── types/                 # TypeScript types
│
├── auditors-dream/            # Auditor's Dream Monorepo
│   ├── apps/
│   │   ├── operator/          # Operator Portal (Vite+React) ← ACTIVE
│   │   └── regulator/         # Regulator Portal (scaffolded)
│   ├── packages/
│   │   └── database/
│   │       └── migrations/    # SQL migrations
│   └── docs/
│
└── docs/                       # Documentation
    ├── COMMERCIAL_READINESS_ROADMAP.md
    ├── SECURITY_HARDENING_CHECKLIST.md
    ├── TESTING_STRATEGY.md
    └── DOCUMENTATION_CLEANUP_PLAN.md
```

---

## 🔧 TECHNOLOGY STACK

### Walla Walla Travel
| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (`eabqmcvmpkbpyhhpbcij`) |
| ORM | Prisma |
| Auth | JWT (custom, session-hardened) |
| Validation | Zod |
| Styling | Tailwind CSS |

### Auditor's Dream (Current Focus)
| Layer | Technology |
|-------|------------|
| Framework | Vite + React 18 |
| State | Zustand |
| Data Fetching | TanStack Query |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS |
| Monorepo | Turborepo |

---

## 🗄️ DATABASE ARCHITECTURE

### Supabase Projects
| Product | Project ID | URL |
|---------|------------|-----|
| Walla Walla Travel | `eabqmcvmpkbpyhhpbcij` | https://eabqmcvmpkbpyhhpbcij.supabase.co |
| Auditor's Dream | `gymsdluogchurhdvhqao` | https://gymsdluogchurhdvhqao.supabase.co |

See `/Users/temp/INFRASTRUCTURE.md` for complete infrastructure registry.

### Core Tables
| Table | Purpose | Used By |
|-------|---------|---------|
| `profiles` | User profiles with roles | All apps |
| `operators` | Motor carrier companies | Both products |
| `drivers` | Driver info & DQ file tracking | Both products |
| `vehicles` | Fleet with inspection tracking | Both products |
| `driver_inspections` | Pre/post-trip DVIRs | Driver Portal → Auditor's |
| `requirements` | FMCSA/UTC compliance requirements | Auditor's Dream |
| `operator_compliance_status` | Aggregated compliance scores | Auditor's Dream |

### Cross-Product Links
```sql
-- drivers table links to Walla Walla Travel
walla_walla_driver_id INTEGER  -- Links to lsh.drivers.id

-- vehicles table links to Walla Walla Travel
walla_walla_vehicle_id INTEGER  -- Links to lsh.vehicles.id

-- driver_inspections links to bookings
walla_walla_booking_id INTEGER  -- Links to lsh.bookings.id
```

---

## 🚨 CURRENT STATUS

### ✅ Completed (2025-12-29)
- WWT migrated from Heroku to Supabase
- Auditor's Dream connected to real Supabase data
- Infrastructure consolidated (4 Supabase projects total)
- Test credentials:
  - **Admin** (WWT, Auditor's Dream): info@wallawalla.travel / wwtRynMdsn03
  - **Driver** (Driver Portal testing): madsry@gmail.com / wwtRynMdsn03

### Running the Apps
```bash
# Walla Walla Travel
cd /Users/temp/walla-walla-final
npm run dev  # http://localhost:3000

# Auditor's Dream
cd /Users/temp/walla-walla-final/auditors-dream/apps/operator
npm run dev  # http://localhost:5173
```

### Next Steps
See `/Users/temp/INFRASTRUCTURE.md` for infrastructure overview.

---

## 📋 SLASH COMMANDS

### Design
| Command | Purpose |
|---------|---------|
| `/design` | Run BEFORE coding any UI — studies references, creates design brief with concrete values, gets approval |
| `/design-review` | Run AFTER coding UI — 10-step audit producing A-F grade, auto-fixes contrast violations |

### Status & Planning
| Command | Purpose |
|---------|---------|
| `/status` | Overall commercial readiness progress |
| `/standup` | Daily planning and focus |
| `/help` | Quick reference for all commands |

### Quality & Security
| Command | Purpose |
|---------|---------|
| `/security-check` | Security audit |
| `/test-status` | Test coverage analysis |
| `/quality-check` | Code quality analysis |

### Phase Execution
| Command | Purpose |
|---------|---------|
| `/phase1` | Critical fixes (Week 1) |
| `/phase2` | High priority (Week 2-3) |
| `/phase3` | Comprehensive coverage (Week 4-6) |
| `/phase4` | Production polish (Week 7-8) |

### Utilities
| Command | Purpose |
|---------|---------|
| `/fix-console` | Replace console.* with logger |
| `/write-tests` | Generate tests for untested code |

---

## 🔌 MODULE SEPARATION STRATEGY

### Design Principle: "Shared Database, Independent Apps"

Each module:
1. **Has its own Vite+React app** - Independent deployment
2. **Shares Supabase backend** - Single source of truth
3. **Uses RLS for data isolation** - Operators only see their data
4. **Can communicate via Supabase Realtime** - Live updates across apps

### Commercialization Options

| Option | What's Included | Target Market |
|--------|-----------------|---------------|
| **Auditor's Dream Standalone** | Operator + Regulator portals | Any motor carrier |
| **Driver Management Module** | Driver Portal + DVIR | Fleet operators |
| **Full Suite** | All products integrated | Tour/charter companies |

### Integration Points

```
Walla Walla Travel                 Auditor's Dream
       │                                  │
       │ ←── driver_id ──────────────────→│
       │ ←── vehicle_id ─────────────────→│
       │ ←── booking_id (for DVIRs) ─────→│
       │                                  │
       └────────── Supabase ──────────────┘
                     │
              (Realtime sync)
```

---

## 🎯 CODE PATTERNS

### Supabase Query (Auditor's Dream)
```typescript
import { supabase } from '../lib/supabase';

const { data, error } = await supabase
  .from('drivers')
  .select('*')
  .eq('operator_id', operatorId)
  .eq('is_active', true);
```

### Zustand Store
```typescript
import { create } from 'zustand';

interface State {
  value: string;
  setValue: (v: string) => void;
}

export const useStore = create<State>((set) => ({
  value: '',
  setValue: (v) => set({ value: v }),
}));
```

### TanStack Query Hook
```typescript
import { useQuery } from '@tanstack/react-query';

export function useDrivers(operatorId: string) {
  return useQuery({
    queryKey: ['drivers', operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('operator_id', operatorId);
      if (error) throw error;
      return data;
    },
  });
}
```

### Next.js API Route (Walla Walla Travel)
```typescript
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';

export const POST = withErrorHandling(async (request) => {
  const data = await validateBody(request, Schema);
  // handler code
});
```

---

## ⚠️ CRITICAL REMINDERS

1. **Don't delete legacy code** in `lsh/` until new system tested
2. **Auth uses custom JWT + server-side sessions** (`lib/auth/session.ts`) — not Supabase Auth, not localStorage
3. **Default to Charter & Tour** carrier type
4. **RLS is enabled** - queries filter by operator_id
5. **User prefers robust, long-term solutions** over quick fixes
6. **NW Touring & Concierge** (Northwest Touring LLC, USDOT 3603851) is a **separate business** and preferred transportation partner - NOT the same company as Walla Walla Travel
7. **Public pages MUST be in `app/(public)/`** route group to get the shared navigation header (PublicHeader). Pages outside this group will have NO navigation!
8. **NEVER estimate or guess specific data** - All numbers, stats, counts, and factual claims (e.g., number of wineries, distances, dates, prices) MUST be researched and verified. Use WebSearch to confirm before adding. Accuracy is essential for credibility.
9. **When making changes, search the ENTIRE codebase** for all occurrences. Never assume there's only one place where something is defined. Use Grep to find all instances before and after making changes.

---

## 💰 PAYMENT & CANCELLATION POLICIES (CRITICAL BUSINESS RULES)

**These rules apply to NW Touring & Concierge. Always use these exact terms.**

### Payment Terms
- **Deposit**: 50% required at booking
- **Balance Due**: 48 hours **AFTER** your tour **CONCLUDES** (NOT before!)
- ⚠️ **NEVER** say "48 hours before tour" - this is WRONG

### Cancellation Policy
- **45+ days before**: 100% refund of deposit
- **21-44 days before**: 50% refund of deposit
- **Within 21 days**: No refund of deposit

### Vehicle & Conduct Policies
- No alcohol in vehicle
- No smoking/vaping in or around vehicle
- Right to refuse service for misconduct/inebriation
- $250 cleaning fee if significant cleaning required
- Right to change tour locations/order/vehicles as necessary
- Right to terminate tour for safety/legal reasons
- Termination for bad behavior = no refund

### Brand Contact Info
| Brand | Phone | Email | Website |
|-------|-------|-------|---------|
| Walla Walla Travel | (509) 200-8000 | info@wallawalla.travel | wallawalla.travel |
| NW Touring & Concierge | (509) 540-3600 | info@nwtouring.com | nwtouring.com |

---

## TOUR BUSINESS RULES (NON-NEGOTIABLE)

**These rules are enforced across ALL pages, code, and AI-generated content. Violations are bugs.**

### Winery Count Rules

| Guideline | Rule |
|-----------|------|
| Sweet spot | **3 wineries** per tour |
| Good short package | **2 wineries** + meal |
| Absolute maximum | **4 wineries** — even 4 is usually too many for most groups |
| NEVER | More than 4 wineries under any circumstances |

### Duration Rules

| Duration | Format |
|----------|--------|
| ~5 hours | 2 wineries + lunch |
| 6 hours | 3 wineries (the standard/popular tour) |
| NEVER | 8-hour tours — we do not offer them |

### Fleet Rules

**The fleet is 3 Mercedes Sprinter vans. NOTHING ELSE.**
- No SUVs, no sedans, no limos, no town cars
- ALL tours use Sprinter vans regardless of party size
- Do not mention, offer, or reference any other vehicle type
- The only valid vehicle type in code is `'sprinter'`

### Tasting Fee Rules

**Tasting fees are NEVER included in tour pricing by default.**
- All brands: Walla Walla Travel, NW Touring, Herding Cats, partner pages
- Typical tasting fees: $15-$40 per person per winery (guests pay directly)
- Do NOT use phrases like "tasting fees included", "all-inclusive", or "includes tastings"
- OK to say: "transportation to X wineries" or "visits to X wineries"
- Exception: Only include tasting fees when manually/specifically configured for a particular booking, corporate group, or special event
- If tasting fees ARE included for a specific package, it must be explicitly set up — never assumed

### Language Rules

**Avoid "fleet"** in non-commercial, personal, or country club contexts. Use "private Mercedes Sprinter" or "luxury transportation" instead. "Fleet" is fine for B2B, corporate, or large event contexts.

### Dining / Meal Rules

**Dining is NEVER "included" (pre-paid) in tour pricing by default.**
- Use "arranged", "coordinated", "reserved", or "features" — NOT "included"
- Exception: Only when manually/specifically configured for a particular booking or group
- For WWCC partner packages: we coordinate club dining, guests pay their own tab

### Accuracy Rules

- **No false experience claims** — do not claim "15+ years" or any specific years of experience
- **No inflated winery counts** — grep for "5 wineries", "6 wineries", "7 wineries", "4-5", "5-6", "6-7" and fix any found
- **No 8-hour tour references** — grep for "8 hour", "8-hour" and remove/fix
- **No SUV/sedan references** in customer-facing content (exception: competitor monitoring data)

---

## TRIP PROPOSAL SYSTEM

### Architecture Overview

Trip proposals are the core deliverable for custom travel planning. Key files:

| File | Purpose |
|------|----------|
| `lib/services/trip-proposal.service.ts` | Business logic, pricing calculations, CRUD operations |
| `lib/types/trip-proposal.ts` | TypeScript type definitions for proposals, stops, inclusions |
| `app/admin/trip-proposals/new/page.tsx` | Admin: create new proposal (thin orchestrator, 189 lines) |
| `app/admin/trip-proposals/[id]/page.tsx` | Admin: edit existing proposal |
| `app/trip-proposals/[proposalNumber]/page.tsx` | Client-facing proposal view |
| `components/trip-proposals/useProposalForm.ts` | Form state, CRUD ops, data loading (custom hook) |
| `components/trip-proposals/types.ts` | Shared interfaces & constants (StopData, DayData, etc.) |
| `components/trip-proposals/*.tsx` | Tab components: DetailsTab, DaysTab, GuestsTab, PricingTab, PricingSummary, StopCard |

### Service-Level Billing Model (NON-NEGOTIABLE)

**Billing lives at the SERVICE level, not the stop level.** This is the foundational design decision.

- **Stops** are itinerary-only (schedule/logistics) — they have NO billing fields visible in the UI
- **All billing** goes through Service Line Items (the `trip_proposal_inclusions` table with `pricing_type`)
- **Three pricing types:**

| `pricing_type` | Calculation | Example |
|-----------------|-------------|----------|
| `flat` | Fixed amount | Airport transfer: $150 |
| `per_person` | amount × party_size | Arranged tasting: $25 × 6 guests = $150 |
| `per_day` | amount × quantity | Multi-day tour: $800 × 3 days = $2,400 |

- **Stop `cost_note` field**: Optional informational text only (e.g., "Tasting fee ~$25/pp, paid at winery") — never calculated, never shown as a dollar amount
- **Legacy columns**: `per_person_cost` and `flat_cost` remain in DB for backward compatibility but are always set to 0 for new proposals

### Service Line Item Templates

Quick-add templates available in the admin UI:

| Template | Default `pricing_type` |
|----------|------------------------|
| Airport Transfer | `flat` |
| Multi-Day Tour | `per_day` |
| Planning/Coordination Fee | `flat` |
| Arranged Tasting Program | `per_person` |
| Custom | `flat` |

### Pricing Calculation Formula

All calculations use service line item totals — never stop costs.

```
subtotal              = sum of all service line item totals (NOT stop costs)
discount_amount       = subtotal × discount_percentage
subtotal_after_discount = subtotal - discount_amount
taxes                 = subtotal_after_discount × tax_rate
gratuity              = subtotal_after_discount × gratuity_percentage
total                 = subtotal_after_discount + taxes + gratuity
deposit               = total × deposit_percentage
```

### Anti-Patterns (NEVER DO)

- **Never** show per-stop dollar amounts in the client-facing proposal
- **Never** calculate subtotal from stop costs
- **Never** add billing fields (`per_person_cost`, `flat_cost`) to stop card UI
- **Never** create an inclusion without setting `pricing_type`

---

## 🤖 AI ENGINEERING TEAM

This project is managed by an 8-agent AI engineering team. The team framework provides:
- **Specialized agents** for different domains (Frontend, Backend, Quality, etc.)
- **Escalation rules** for when to involve the user
- **Runbooks** for common operations

### Team Skills

| Command | Agent | Purpose |
|---------|-------|---------|
| `/team` | Orchestrator | Route requests through team |
| `/simplify` | Technical Strategist | Review for unnecessary complexity |
| `/audit` | Quality Engineer | Full quality/security audit |
| `/steward` | Codebase Steward | File organization review |

### Team Documentation

Located in `.claude/team-wiki/`:
- `TEAM_CHARTER.md` - All 8 agents, roles, protocols
- `ESCALATION_RULES.md` - When to consult user
- `AGENT_PROMPTS/` - Detailed agent prompts
- `RUNBOOKS/` - Deployment, incidents, health checks

### User Involvement

**You will be consulted on**: Strategic decisions, business rules, costs, trade-offs

**Handled autonomously**: Technical implementation, code quality, routine operations

---

## 🔍 PROACTIVE IMPROVEMENT TRIGGERS

### After Completing Any Feature
Claude should automatically check:
1. **Test coverage**: Does the new/modified service have unit tests? If not, flag it: "This service has no test coverage. Want me to add tests?"
2. **Documentation currency**: Is the changelog up to date? Are any docs referencing outdated patterns?
3. **Type safety**: Are there any `any` types in the new code? Any missing return types?

### After Modifying Trip Proposals
- Verify `calculatePricing()` still only uses service line items (not stop costs)
- Verify client-facing view doesn't show per-stop dollar amounts
- Check that any new inclusion types are added to `INCLUSION_TYPES` in types and Zod schemas
- Run: `npx jest __tests__/lib/trip-proposal.service.test.ts --no-coverage`

### After Modifying API Routes
- Verify the route is wrapped with `withErrorHandling`
- Verify response format follows `{ success: true, data: ... }` pattern
- Check that the route has proper auth checks where needed

### After Modifying Database Schema
- Verify migration file follows naming convention: `NNN-description.sql`
- Verify corresponding TypeScript types are updated
- Verify Zod schemas are updated to match
- Check that the service layer handles the new/changed columns

### After Modifying Pricing/Billing
- Verify tax rate is 9.1% (0.091) not 8.9%
- Verify deposit percentage defaults are correct
- Verify the pricing formula: subtotal → discount → tax → gratuity → total → deposit
- Run pricing tests

### Weekly Maintenance Checks (on /standup)
- Are there services without test coverage?
- Are there console.log statements that should use the logger?
- Are there TODO comments that should be resolved?
- Is the changelog up to date?

---

## 📚 KEY FILES TO READ

### For Auditor's Dream
1. `auditors-dream/apps/operator/src/App.tsx` - All routes
2. `auditors-dream/apps/operator/src/store/auth.ts` - Auth state
3. `auditors-dream/packages/database/migrations/COMBINED_MIGRATION.sql`
4. `auditors-dream/docs/SHARED_SCHEMA.md`

### For Walla Walla Travel
1. `lib/services/booking.service.ts` - Business logic
2. `lib/api/middleware/error-handler.ts` - Error handling
3. `app/api/` - API routes
4. `lib/services/trip-proposal.service.ts` - Trip proposal business logic & pricing
5. `lib/types/trip-proposal.ts` - Trip proposal type definitions

### For Context
1. `CLAUDE_CODE_HANDOFF.md` - Immediate tasks
2. `PROJECT_SYNOPSIS.md` - Full overview
3. `ARCHITECTURE.md` - Architecture decisions
4. `COMMERCIAL_READINESS_ROADMAP.md` - Improvement plan

---

## 🔄 SESSION WORKFLOW

### Starting a Session
```
1. /status          # Check overall progress
2. /standup         # Plan today's work
3. Review handoff   # Check CLAUDE_CODE_HANDOFF.md for immediate tasks
```
- Check `docs/active-work.md` before starting tasks to avoid file conflicts.

### During Development
- Use TodoWrite for multi-step tasks
- Commit frequently with meaningful messages
- Run tests before major changes

### Switching Between Products
```bash
# Auditor's Dream
cd /Users/temp/.cursor/worktrees/walla-walla-final/auditors-dream/apps/operator
npm run dev  # http://localhost:5173

# Walla Walla Travel
cd /Users/temp/walla-walla-final
npm run dev  # http://localhost:3000
```

---

## 🔁 RALPH WORKFLOW (Project-Specific)

For TDD + iterative AI development on this project. See global `@RALPH_WORKFLOW.md` for full documentation.

### Project Test Commands

**Walla Walla Travel (Next.js):**
```bash
# Validation sequence (run in order)
npm run type-check      # TypeScript compilation
npm run lint            # ESLint
npm test                # Jest unit/integration tests
npm run test:e2e        # Playwright E2E tests

# Specific test targets
npm test -- ComponentName           # Single component
npm run test:api                    # API tests only
npm run test:security               # Security tests
npm run test:integration            # Integration tests
```

**Auditor's Dream (Vite+React):**
```bash
cd auditors-dream/apps/operator
npm run type-check      # TypeScript
npm run lint            # ESLint
npm test                # Vitest tests
```

### Ralph Completion Criteria (This Project)

**UI Component:**
```
[ ] npm run type-check passes
[ ] npm run lint passes
[ ] npm test -- ComponentName passes
[ ] Accessibility (axe-core) passes
```

**API Endpoint:**
```
[ ] npm run type-check passes
[ ] npm run test:api passes
[ ] Returns correct status codes
[ ] Input validation (Zod) works
```

**E2E Flow:**
```
[ ] npm run type-check passes
[ ] npm test passes (unit tests)
[ ] npm run test:e2e passes (Playwright)
[ ] Mobile viewport works
```

### Existing Test Structure

```
__tests__/
├── api/           # API endpoint tests
├── app/           # Route/page tests
├── lib/           # Service & utility tests
├── integration/   # Integration tests
├── security/      # Security tests
└── resilience/    # Resilience tests
```

When adding tests, follow existing patterns in `__tests__/`.

Integration tests in `e2e/flows/` trace complete workflows — every new feature should have one.

---

## Build & Commit Rules

- **MANDATORY**: Run `./scripts/verify.sh` before every commit
- **Never** use `git commit --no-verify`
- **Never** rely on `tsc --noEmit` alone — `next build` catches route type constraints that `tsc` misses
- Always run `npx next build` (not just `tsc`) before trusting a commit
- After pushing, verify CI status: `gh run list --limit 3`
- Pin dependency versions in CI workflows — unpinned `npx` commands will pull latest majors that break builds (e.g., Prisma 7 broke `datasource.url` syntax)
- Developers can run `./scripts/daily-health.sh` anytime for a quick health check (checks auth wrappers, Zod, CSRF, file sizes, vulnerabilities, test coverage)
- Run `./scripts/next-migration.sh` before creating migrations to get the next available number prefix
- The `.next` directory is auto-cleaned before builds (via `prebuild` script, `verify.sh`, and the pre-commit hook)

---

## Route Architecture (every new route MUST have all 5 layers)

```typescript
export const POST = withCSRF(                    // 4. CSRF on mutations (outermost)
  withRateLimit(rateLimiters.api)(               // 3. Rate limiting where appropriate
    withAdminAuth(async (request, session) => {  // 2. Auth (withAdminAuth/withAuth/withOptionalAuth)
      const parsed = BodySchema.parse(           // 5. Zod validation on all request.json()
        await request.json()
      );
      // business logic                          // 1. withErrorHandling (innermost, via auth wrapper)
    })
  )
);
```

### Exceptions
- Webhook routes (`/api/webhooks/*`) — skip CSRF, use signature verification
- Cron routes (`/api/cron/*`) — skip CSRF, use `withCronAuth` instead
- Auth routes (`/api/auth/*`) — skip CSRF
- Public GET handlers — skip auth

---

## Session Properties

- Use `session.userId` (string), `session.email`, `session.role`, `session.sid`
- **Never** use `session.user.id` — that's the old pattern
- `parseInt(session.userId)` when a numeric ID is needed (e.g., for `auditService.logFromRequest`)

---

## Session Hardening (March 2026)

- Server-side `user_sessions` table with `session_id` (UUID) embedded in JWT as `sid` claim
- **On login**: revoke all previous sessions, create new row, embed `sid` in JWT
- **On logout**: revoke specific session via `sessionStoreService.revokeSession(sid)`
- **On password change**: `sessionStoreService.revokeAllUserSessions(userId)` — forces re-login everywhere
- **Validation in `withAuth`**: check `sid` exists in DB, not revoked, within idle timeout
- **Idle timeout**: 30 minutes for admin/geology_admin sessions, 24 hours for regular users
- **Touch throttling**: compares `last_active_at` from DB (5-minute threshold) — NOT in-memory Map (won't survive serverless cold starts on Vercel)
- **Old JWTs without `sid`**: backward compatible, skip DB check, expire naturally within 7 days
- **DB failure fallback**: fall back to JWT-only validation (don't lock everyone out)
- **Key files**: `lib/services/session-store.service.ts`, `migrations/100-user-sessions.sql`
- **Revocation points**: login, logout, password reset, partner completeSetup, organizer completeSetup, partner-invite

---

## Anti-Patterns (never do these)

- **No inline auth checks** (`getSessionFromRequest`, `verifyAdmin`, `getSession`) — use wrapper middleware
- **No raw `request.json()`** without a Zod schema
- **No duplicate API paths** — check existing routes before creating new ones
- **No new routes without tests** — every route needs at least happy-path + error-path tests
- **No monster files over 500 lines** — decompose into services
- **No `getDay()`** for date logic — use `getUTCDay()` to avoid timezone-dependent behavior in CI/production
- **No `npx <tool>` in CI** without version pinning — always use `npx tool@version`
- **No in-memory state** for throttling/caching on Vercel — use DB timestamp comparison (cold starts wipe memory)
- **No `console.log`** — use structured logger from `lib/logger.ts`

---

## File Organization

- Business logic in `lib/services/`
- Routes are thin wrappers that validate input, call services, return responses
- Schemas inline in route files or in `lib/validation/schemas/`
- Types in `lib/types/`
- Tests mirror the app structure in `__tests__/`
- Middleware in `lib/api/middleware/`
- Large page components decomposed into `components/[feature]/` with custom hooks (e.g., `components/trip-proposals/`)
- Image uploads are EXIF-stripped via `sharp` before storage (`lib/uploads/strip-exif.ts`)

### Booking API Consolidation

Legacy `/api/booking/reserve/*` routes (4 endpoints, raw SQL) are still live but planned for migration to `/api/reservations/*` using `ReservationService`. See `docs/booking-api-consolidation.md` for the full migration plan. Do NOT delete legacy routes until all frontend callers are migrated.

---

## Audit Logging

- All DELETE operations **must** call `auditService.logFromRequest()`
- All approve/reject/cancel/assign operations **must** log
- Include entity type, entity ID, and action performed
- Place audit call **after** the successful operation, **before** the response
- Audit service is non-blocking — no try/catch needed
- Available actions: `resource_deleted`, `resource_updated`, `resource_created`, `booking_status_changed`, `booking_assigned`, `booking_cancelled`, `business_approved`, `business_rejected`, `bulk_action`, `partner_login`, `partner_login_failed`
- Partner auth events (`partner_login`, `partner_login_failed`) are logged automatically by the partner auth middleware

```typescript
await auditService.logFromRequest(request, parseInt(session.userId), 'resource_deleted', {
  entityType: 'trip_proposal',
  entityId: proposalId,
});
```

---

## Testing Rules

- Mock `withCSRF` in all test files that test mutation routes:
  ```typescript
  jest.mock('@/lib/api/middleware/csrf', () => ({
    withCSRF: (handler: unknown) => handler,
  }));
  ```
- Use `Promise.resolve({})` or `Promise.resolve({ param })` for route context params
- Date-dependent tests must use UTC-safe dates — never rely on local timezone
- Run full test suite: `npx jest --passWithNoTests`

---

## Cron Routes

- All use `withCronAuth('job-name', handler)` with timing-safe comparison (`crypto.timingSafeEqual`)
- Every cron logs job name, start time, duration, and response status
- `withCronLock('lock-name', fn)` uses PostgreSQL advisory locks to prevent duplicate runs on overlapping invocations
- `cleanup-sessions` runs daily at 5 AM UTC (table hygiene for `user_sessions`)
- `queue-worker` cron processes the Upstash Redis job queue (emails, CRM syncs, webhooks)
- `supabase-lint` runs daily at 6 AM UTC — queries `extensions.lint()` for SECURITY errors, alerts via Resend, stores in `system_health_checks`
- 20 total cron routes configured in `vercel.json`
- Pattern: `export const GET = withCronAuth('name', async (request) => { ... });`
- Support POST for manual triggering: `export const POST = GET;`

---

## Infrastructure & Services

Active services (all required):

| Service | Purpose | Notes |
|---------|---------|-------|
| **Supabase** | PostgreSQL DB + Storage + Realtime | Pro plan, daily backups. Auth and Edge Functions NOT used. Realtime IS used (hooks/useProposalRealtime.ts — 5 channel subscriptions for live proposal updates). **RLS enabled on ALL tables with no policies** — blocks PostgREST access via anon key; backend uses service_role (bypasses RLS). Views use SECURITY INVOKER. |
| **Stripe** | Payments | Dual-brand (WWT + NWTouring), test + live webhook secrets |
| **Resend** | Transactional email | Replaced Postmark. CAN-SPAM compliant: all emails include unsubscribe link via `lib/email/unsubscribe.ts` |
| **Upstash Redis** | Rate limiting + queue + response caching | 10 public GET routes cached (5-min TTL via `lib/cache.ts`) |
| **Sentry** | Error monitoring | `lib/logger.ts`, `lib/config/security.ts` |
| **Anthropic + Google/Gemini** | AI features | 21 + 40 files |
| **Twilio** | SMS notifications | |
| **Deepgram** | Voice transcription | |

See `/Users/temp/INFRASTRUCTURE.md` for complete registry.

---

## Health Monitoring

- **Local**: `./scripts/daily-health.sh` — auth wrappers, Zod, CSRF, oversized files, npm audit, test ratio, Supabase lint (if DATABASE_URL set)
- **Local**: `./scripts/verify.sh` — tsc + lint + next build + jest (mirrors CI)
- **CI**: `.github/workflows/daily-health-check.yml` — 3x daily + on every push
- **CI**: `.github/workflows/storage-backup.yml` — weekly Supabase Storage backup
- **Branch protection**: main requires Build Check + Lint Code status checks
- **Review reminders**: Velocity-adaptive — CI runs `check-review-due.sh` on every push, creates GitHub Issue when due. After review sessions, run `./scripts/mark-review-complete.sh` to tag and close issues.

---

## Security Bootstrap

For new projects, apply all Day-One Checklist items from `docs/templates/PROJECT-SECURITY-BOOTSTRAP.md` before writing features. This template codifies lessons from 4 audit sessions.

---

## Staging Environment

### Overview

A staging environment exists on the `staging` branch for testing changes before production. Vercel automatically creates a preview deployment for this branch.

### Workflow

```
feature-branch → staging → verify on preview URL → main (production)
```

1. Create a feature branch from `main`
2. When ready to test: merge into `staging` and push
3. Verify on the staging preview URL
4. Once verified: merge the feature branch into `main`

### Key Details

| Item | Value |
|------|-------|
| **Branch** | `staging` |
| **Preview URL** | `https://walla-walla-final-git-staging-walla-walla-travel-app.vercel.app` |
| **Database** | Shared with production (same Supabase) — use test data when testing |
| **Stripe** | Test mode — card `4242 4242 4242 4242`, any future date, any CVC |
| **Sentry** | Auto-tagged as `preview` environment (via `NEXT_PUBLIC_VERCEL_ENV`) |
| **Cron jobs** | Do NOT run on staging (Vercel only runs cron on production) |
| **Analytics** | Disabled — no `NEXT_PUBLIC_GA_MEASUREMENT_ID` set for Preview |

### Env Vars

- **Category A (safety-critical)**: Stripe test keys — scoped to Preview, different from production
- **Category B (best practice)**: CRON_SECRET, URL vars — unique values for Preview
- **Category C (shared)**: DATABASE_URL, Supabase, AI keys, Twilio, etc. — same values, Preview-scoped

To add/modify staging env vars: `vercel env add <NAME> preview` or Vercel Dashboard > Settings > Environment Variables.

### Merging to Staging

```bash
git checkout staging
git merge feature-branch
git push origin staging
# Wait for Vercel preview deployment
# Verify at the preview URL
```

### Resetting Staging

If staging gets messy, reset it to match main:
```bash
git checkout staging
git reset --hard main
git push --force origin staging
```

---

**Last Updated:** March 3, 2026
**Active Focus:** Security hardening (session hardening, CSRF, Zod validation, audit logging) + API consolidation (booking → reservations) + CI stability + Walla Walla Travel commercial readiness
