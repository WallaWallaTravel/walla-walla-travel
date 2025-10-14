# 🧠 ARCHITECTURE DECISION RECORDS (ADRs)
**Purpose:** Document WHY we made key technical decisions to prevent re-litigating them later.

---

## Decision Format

Each decision should answer:
1. **Context:** What's the problem we're solving?
2. **Decision:** What did we choose?
3. **Rationale:** Why did we choose this?
4. **Consequences:** What are the trade-offs?
5. **Alternatives Considered:** What else did we evaluate?

---

## 📋 Active Decisions

### **ADR-001: Remove Supabase, Use Cookie-Based Auth**
**Date:** October 12, 2025  
**Status:** ✅ IMPLEMENTED

**Context:**
- Original app used Supabase for auth & database
- Supabase dependencies caused build failures
- App needs to work without external auth service

**Decision:**
- Removed all Supabase packages
- Implemented cookie-based session management
- Use `lib/auth.ts` for authentication logic

**Rationale:**
- Simplifies deployment (no external dependencies)
- Reduces costs (no Supabase subscription needed)
- Full control over auth flow
- Works offline/locally

**Consequences:**
- ✅ Build now passes (4.5s compile)
- ✅ No external dependencies
- ✅ Simpler architecture
- ⚠️ Need to implement own password hashing
- ⚠️ Need to add CSRF protection
- ⚠️ Need to add rate limiting

**Alternatives Considered:**
- **Keep Supabase:** Rejected due to build issues, cost, complexity
- **NextAuth.js:** Rejected due to similar complexity, still requires database
- **Custom JWT:** Rejected in favor of simpler cookie sessions

**Follow-up Work:**
- [ ] Add bcrypt password hashing
- [ ] Implement CSRF tokens
- [ ] Add rate limiting middleware

---

### **ADR-002: Mobile-First Design with 48px Touch Targets**
**Date:** October 10, 2025  
**Status:** ✅ IMPLEMENTED

**Context:**
- Primary users are drivers using phones
- Drivers wear gloves in winter
- One-handed operation required while holding clipboard

**Decision:**
- All touch targets minimum 48px height
- Primary actions in bottom 20% of screen
- High contrast text (WCAG AAA)
- Haptic feedback on interactions

**Rationale:**
- iOS Human Interface Guidelines recommend 44pt minimum
- Android Material Design recommends 48dp minimum
- 48px = 12mm = comfortable thumb target
- Bottom actions = one-thumb zone (75% of users)

**Consequences:**
- ✅ Easy to use with gloves
- ✅ Reduces mis-taps
- ✅ Accessible (WCAG compliant)
- ⚠️ Larger UI footprint (fewer items per screen)

**Alternatives Considered:**
- **Standard web sizing (32-40px):** Rejected due to usability issues
- **Adaptive sizing:** Rejected due to complexity, inconsistency

**Implementation:**
- Created `components/mobile/` library
- All components default to 48px minimum
- See: `docs/MOBILE_COMPONENTS.md`

---

### **ADR-003: Mock Data for MVP, Real Database for Production**
**Date:** October 12, 2025  
**Status:** ⚠️ TEMPORARY

**Context:**
- Need to test UI/workflow without database
- Want to iterate quickly on design
- Will need real database for production

**Decision:**
- Use mock functions in `app/actions/` for MVP
- Mock returns success/failure based on input
- Store temporary data in localStorage for demo
- Plan migration to PostgreSQL for production

**Rationale:**
- Allows rapid prototyping
- Tests workflow logic without DB setup
- Can demo to stakeholders quickly
- Clear migration path

**Consequences:**
- ✅ Fast development iteration
- ✅ No database setup overhead
- ⚠️ Data doesn't persist across devices
- ❌ Cannot deploy to production as-is
- ❌ No data integrity guarantees

**Alternatives Considered:**
- **SQLite:** Rejected due to deployment complexity
- **Supabase:** Already removed (ADR-001)
- **Firebase:** Rejected due to vendor lock-in

**Migration Plan:**
1. [ ] Set up PostgreSQL database
2. [ ] Create schema (see ADR-004)
3. [ ] Create `lib/db.ts` connection
4. [ ] Replace mock functions one-by-one
5. [ ] Add migration scripts
6. [ ] Test in staging

**Timeline:** Phase 1 (Week 1-2)

---

### **ADR-004: PostgreSQL as Primary Database**
**Date:** October 12, 2025  
**Status:** 📝 PLANNED

**Context:**
- Need persistent data storage
- Need relational data (users, inspections, workflows)
- Need ACID guarantees for compliance
- May need to scale horizontally

**Decision:**
- Use PostgreSQL as primary database
- Host on Railway/Render/Supabase (just DB, not auth)
- Use Prisma ORM for type safety
- Store files/signatures in object storage (S3/Cloudflare R2)

**Rationale:**
- PostgreSQL is industry standard
- Excellent JSON support (for inspection items)
- Strong ACID guarantees
- Great tooling (pg_dump, migrations)
- Scales well

**Consequences:**
- ✅ Reliable, well-tested
- ✅ Rich ecosystem
- ✅ Good performance
- ⚠️ Need to manage migrations
- ⚠️ Hosting cost (~$7-15/month)

**Alternatives Considered:**
- **MySQL:** Similar, less JSON support
- **MongoDB:** Rejected due to lack of relations, weaker guarantees
- **SQLite:** Rejected due to deployment complexity

**Schema Design:**
```sql
-- See docs/SCHEMA.md for full schema
users (id, email, password_hash, role)
vehicles (id, number, type, vin)
inspections (id, driver_id, vehicle_id, type, items, mileage)
workflows (id, driver_id, status, clock_in, clock_out)
documents (id, driver_id, type, expiry_date, file_url)
```

**Implementation Timeline:** Week 1-2 (Phase 1)

---

### **ADR-005: Server Actions Over API Routes**
**Date:** October 10, 2025  
**Status:** ✅ IMPLEMENTED

**Context:**
- Next.js 14 introduced server actions
- Need to submit forms and save data
- Want type safety between client/server

**Decision:**
- Use server actions (`'use server'`) for mutations
- Keep in `app/actions/` directory
- Return structured results: `{ success: boolean, data?, error? }`

**Rationale:**
- Type safe by default (shared types)
- No need for separate API routes
- Automatic request deduplication
- Better error handling

**Consequences:**
- ✅ Type safety
- ✅ Less boilerplate
- ✅ Automatic serialization
- ⚠️ Must be in server components or separate files
- ⚠️ Cannot use in client components directly

**Alternatives Considered:**
- **API Routes:** More flexible but requires manual type management
- **tRPC:** Too heavy for this project size

**Pattern:**
```typescript
// app/actions/inspections.ts
'use server'

export async function saveInspectionAction(data: InspectionData) {
  try {
    // Validate
    // Save to DB
    return { success: true, inspectionId: 'xxx' }
  } catch (error) {
    return { success: false, error: 'Failed to save' }
  }
}
```

---

### **ADR-006: Jest + React Testing Library for Testing**
**Date:** October 12, 2025  
**Status:** ✅ IMPLEMENTED

**Context:**
- Need testing framework
- Want to test React components
- Want fast test execution

**Decision:**
- Use Jest as test runner
- Use React Testing Library for component tests
- Use jsdom for browser environment
- Target 60%+ coverage for MVP, 80%+ for production

**Rationale:**
- Jest is industry standard
- React Testing Library encourages good practices
- Fast execution
- Good Next.js integration

**Consequences:**
- ✅ Well-documented
- ✅ Large community
- ✅ Good tooling
- ⚠️ Need to mock Next.js router
- ⚠️ Need to configure for server actions

**Alternatives Considered:**
- **Vitest:** Faster but less mature
- **Playwright:** Better for E2E but slower

**See:** `docs/TESTING.md` for full guide

---

### **ADR-007: No DVIR Signatures in MVP, Add in Phase 3**
**Date:** October 12, 2025  
**Status:** ⏳ DEFERRED

**Context:**
- FMCSA requires driver signatures on DVIRs
- Signature capture is complex (canvas, touch, storage)
- Want to ship MVP quickly

**Decision:**
- Skip signature capture in MVP
- Add checkbox: "I certify this inspection is accurate"
- Store timestamp + driver ID as verification
- Add full signature component in Phase 3

**Rationale:**
- Reduces MVP complexity
- Still captures driver acknowledgment
- Can add signatures without breaking existing data
- Focus on core workflow first

**Consequences:**
- ✅ Faster MVP delivery
- ✅ Simpler initial implementation
- ⚠️ Not fully FMCSA compliant yet
- ⚠️ Will need migration when added

**Migration Plan:**
- [ ] Create signature component (canvas-based)
- [ ] Add signature column to inspections table
- [ ] Update inspection forms
- [ ] Backfill with "migrated" signatures for old data

**Timeline:** Phase 3 (Week 3-4)

---

## 🔄 Decision Review Process

### **When to Create an ADR:**
- Choosing between 2+ viable options
- Making architectural changes
- Adding/removing major dependencies
- Changing core workflows
- Security-related decisions

### **When NOT to Create an ADR:**
- Small bug fixes
- Styling changes
- Documentation updates
- Minor refactors

### **Review Cycle:**
- Review all ADRs monthly
- Mark outdated ones as SUPERSEDED
- Link new ADRs that replace old ones

---

## 📊 ADR Status Legend

- ✅ **IMPLEMENTED** - Decision made and code shipped
- ⏳ **DEFERRED** - Decision made but implementation postponed
- 📝 **PLANNED** - Decision made, implementation starting soon
- ❌ **REJECTED** - Decision considered but not chosen
- 🔄 **SUPERSEDED** - Replaced by newer decision

---

**Last Updated:** October 12, 2025  
**Next Review:** November 12, 2025
