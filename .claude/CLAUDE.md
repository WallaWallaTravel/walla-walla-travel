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
| Auth | JWT (Supabase Auth planned) |
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
2. **Use Supabase Auth**, not localStorage
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

### Accuracy Rules

- **No false experience claims** — do not claim "15+ years" or any specific years of experience
- **No inflated winery counts** — grep for "5 wineries", "6 wineries", "7 wineries", "4-5", "5-6", "6-7" and fix any found
- **No 8-hour tour references** — grep for "8 hour", "8-hour" and remove/fix
- **No SUV/sedan references** in customer-facing content (exception: competitor monitoring data)

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

---

**Last Updated:** January 9, 2026
**Active Focus:** Auditor's Dream Supabase setup + Walla Walla Travel commercial readiness
