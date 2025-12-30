# Walla Walla Ecosystem - Claude Code Master Context

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

```
┌─────────────────────────────────────────────────────────────┐
│              WALLA WALLA TRAVEL                              │
│         (Marketing & Customer-Facing Brand)                  │
│                                                              │
│   URL: wallawalla.travel                                     │
│   Role: Takes bookings, promotes services                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              NORTHWEST TOURING LLC                           │
│            (Regulated Motor Carrier)                         │
│                                                              │
│   USDOT: 3603851  |  MC: 1225087                            │
│   DBA: NW Touring & Concierge                               │
│   Operation: Charter & Tour, Passenger                      │
│   Scope: Interstate AND Intrastate                          │
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
- Test login: madsry@gmail.com / wwtRynMdsn03

### Running the Apps
```bash
# Walla Walla Travel
cd /Users/temp/walla-walla-final
npm run dev  # http://localhost:3000

# Auditor's Dream
cd /Users/temp/walla-walla-final/auditors-dream/apps/operator
npm run dev  # http://localhost:3001
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
6. **Northwest Touring LLC** is the real company (USDOT 3603851)

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

**Last Updated:** December 25, 2025
**Active Focus:** Auditor's Dream Supabase setup + Walla Walla Travel commercial readiness
