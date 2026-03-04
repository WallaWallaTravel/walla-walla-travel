# Migration Audit Report

**Date:** 2026-03-03
**Auditor:** Claude Code (automated)
**Scope:** All SQL migrations in `migrations/` (040–112) and `prisma/migrations/`

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total migration files | 75 (73 in `migrations/`, 1 in `prisma/migrations/`, 1 lock file missing) |
| Total SQL lines | 9,601 |
| Prisma models in schema | 193 |
| Naming collisions (duplicate numbers) | 4 files across 2 pairs |
| Destructive migrations (CASCADE drops) | 3 |
| Sequence-fix migrations (squashable) | 4 |
| Trivial migrations (<10 lines) | 8 |
| Revert/contradiction pairs | 2 |
| Schema drift status | Could not verify — `prisma migrate diff` requires shadow DB |

**Key finding:** The `migrations/` directory (raw SQL, manually applied) is the real migration system. The `prisma/migrations/` directory has only 1 migration and is missing `migration_lock.toml`, indicating Prisma Migrate is not the primary migration tool.

---

## Critical Issues

### 1. Naming Collisions (P0)

Four files share duplicate migration numbers, making execution order ambiguous:

| Number | File A | File B |
|--------|--------|--------|
| **055** | `055-crm-integration-enhancements.sql` (89 lines) | `055-fix-missing-primary-keys.sql` (93 lines) |
| **061** | `061-featured-photo-override.sql` (30 lines) | `061-google-calendar-sync.sql` (30 lines) |
| **074** | `074-marketing-automation.sql` (347 lines) | `074-users-id-sequence.sql` (17 lines) |
| **075** | `075-fix-reset-token-timezone.sql` (6 lines) | `075-strategy-execution-tracking.sql` (46 lines) |

**Impact:** Any migration runner that uses filename sorting will execute these in alphabetical order within the same number, which may not be the intended order.

**Safe to fix:** Yes — rename the secondary files (e.g., `055a-`, `061a-`, `074a-`, `075a-`).

### 2. Destructive Migrations (P1)

Three migrations begin with `DROP TABLE ... CASCADE`, destroying existing data if re-run:

| Migration | Tables Dropped |
|-----------|---------------|
| `054-crm-module.sql` | 8+ tables (crm_pipeline_templates, crm_pipeline_stages, crm_deal_types, crm_contacts, crm_deals, crm_activities, crm_tasks, corporate_requests) |
| `058-competitor-monitoring.sql` | 7 tables (competitors, competitor_pricing, competitor_snapshots, competitor_changes, competitor_swot, competitive_advantages, competitor_alerts) |
| `060-social-media-automation.sql` | 3 tables (social_accounts, scheduled_posts, content_suggestions) |

**Impact:** Not idempotent-safe. Re-running these destroys production data.

**Safe to squash:** These could be folded into 040 in a full squash, but the CASCADE drops should be converted to `CREATE TABLE IF NOT EXISTS` first.

### 3. Missing Prisma Lock File (P1)

`prisma/migrations/migration_lock.toml` does not exist. This means:
- `prisma migrate diff` cannot run without `--shadow-database-url`
- `prisma migrate deploy` will fail
- The Prisma migration system is effectively non-functional

**Safe to fix:** Yes — create the file with `provider = "postgresql"`.

### 4. Schema Drift Verification Failed

`npx prisma migrate diff --from-migrations --to-schema-datamodel` requires a shadow database connection, which is not available locally. Drift status is **unknown**.

**Recommendation:** Run this check in CI with a throwaway database, or compare the live Supabase schema against the Prisma schema using `--from-config-datasource`.

---

## Revert/Contradiction Pairs

### Pair 1: Migration 102 vs 105

| Migration | Action |
|-----------|--------|
| `102-performance-indexes.sql` | Adds 8 performance indexes (inspections, booking_wineries, time_cards) |
| `105-drop-unused-booking-indexes.sql` | Drops 3 indexes from bookings (referral_source, tour_start_date, tour_end_date) |

**Assessment:** These target different indexes on different tables — 102 adds to `inspections`/`booking_wineries`/`time_cards`, while 105 drops from `bookings`. **Not a true conflict** — 105 is intentional cleanup of unused indexes. Safe to keep both.

### Pair 2: Migration 108 vs 111

| Migration | Action |
|-----------|--------|
| `108-enable-rls-all-tables.sql` | Enables RLS on ALL public tables with no policies (deny-all) |
| `111-realtime-rls-policies.sql` | Adds SELECT policies for 5 Realtime-subscribed tables to restore functionality |

**Assessment:** Intentional two-step security hardening. 108 locked everything down, 111 selectively reopened Realtime channels. **Must always run in sequence.** Safe to squash into one migration.

---

## Squashable Migration Groups

### Group A: Sequence Fixes (4 migrations → 1)

These four migrations all follow an identical pattern: fix a missing auto-increment sequence.

| Migration | Table | Lines |
|-----------|-------|-------|
| `068-fix-shared-tours-id-sequence.sql` | shared_tours | 15 |
| `069-fix-vehicle-availability-blocks-id-sequence.sql` | vehicle_availability_blocks | 15 |
| `070-fix-shared-tours-availability-id-sequence.sql` | shared_tours_availability | 16 |
| `074-users-id-sequence.sql` | users | 17 |

**Safe to squash:** Yes — combine into a single `fix-id-sequences.sql`.

### Group B: RLS/Security Hardening (5 migrations → 1-2)

| Migration | Purpose | Lines |
|-----------|---------|-------|
| `108-enable-rls-all-tables.sql` | Enable RLS on all tables | 89 |
| `109-fix-function-search-paths.sql` | Set search_path on 39 functions | 44 |
| `110-auth-events-rls.sql` | Enable RLS on auth_events | 6 |
| `111-realtime-rls-policies.sql` | Add Realtime SELECT policies | 75 |
| `112-move-extensions-to-extensions-schema.sql` | Move extensions to proper schema | 13 |

**Safe to squash:** Yes — these are a single security hardening initiative.

### Group C: Trip Proposal Evolution (could consolidate context)

| Migration | Purpose | Lines |
|-----------|---------|-------|
| `053-trip-proposals.sql` | Create proposal system | 477 |
| `079-proposal-service-billing.sql` | Add service-level billing columns | 12 |
| `082-trip-proposal-fixes.sql` | Fix tax rate, column naming, CHECK constraints | 42 |
| `085-collaborative-itinerary.sql` | Add Realtime collaboration features | 208 |
| `086-accept-behavior-toggle.sql` | Add skip_deposit flag | 5 |
| `087-guest-identity-and-ordering-mode.sql` | Per-guest tokens, ordering mode | 20 |
| `088-per-item-tax-and-planning-fee.sql` | Per-inclusion tax control | 14 |
| `089-per-guest-billing.sql` | Guest billing infrastructure | 65 |
| `090-payment-reminders.sql` | Payment reminder system | 39 |
| `091-admin-internal-reminders.sql` | Admin reminders | 29 |
| `093-billing-hardening.sql` | Financial safety constraints | 45 |
| `095-guest-capacity.sql` | Capacity controls | 25 |
| `098-trip-proposal-archived.sql` | Soft delete | 7 |
| `099-draft-reminders.sql` | Draft reminder tracking | 10 |

**Safe to squash:** Yes, but only in a full migration reset. These are spread across the timeline and squashing mid-sequence would require careful testing.

---

## Trivial Migrations (< 10 meaningful lines)

These contain fewer than 5 SQL statements and could be absorbed into adjacent migrations in a squash:

| Migration | Lines | What It Does |
|-----------|-------|-------------|
| `097-add-multi-day-wine-trip-type.sql` | 4 | Adds 3 values to CHECK constraint |
| `086-accept-behavior-toggle.sql` | 5 | Adds 1 boolean column |
| `075-fix-reset-token-timezone.sql` | 6 | Changes column type to TIMESTAMPTZ |
| `110-auth-events-rls.sql` | 6 | Single `ALTER TABLE ENABLE ROW LEVEL SECURITY` |
| `098-trip-proposal-archived.sql` | 7 | Adds 1 column + 1 partial index |
| `073-password-reset-tokens.sql` | 7 | Adds 2 columns + 1 index |
| `099-draft-reminders.sql` | 10 | Adds 3 columns + 1 index |
| `103-hotel-partner-password-reset.sql` | 10 | Adds 2 columns + 1 index |

**Safe to squash:** Yes — these are all additive (no drops, no data changes).

---

## Potentially Unused/Dead Feature Migrations

These migrations create large table systems that may not be actively used in production. Verification recommended before any squash.

| Migration | Feature | Tables Created | Lines | Concern |
|-----------|---------|---------------|-------|---------|
| `058-competitor-monitoring.sql` | Competitor tracking | 7 tables + seed data | 480 | Seeds 9 competitors — is this monitored? |
| `060-social-media-automation.sql` | Buffer/social posting | 3 tables | 281 | Buffer OAuth integration — is this active? |
| `074-marketing-automation.sql` | AI marketing strategy | 11 tables | 347 | Massive scope — are all 11 tables queried? |
| `042-abandoned-booking-tracking.sql` | Cart abandonment analytics | 3 tables | 143 | Basic analytics — are these tables populated? |

**Action needed:** Query production to check row counts before marking as dead.

---

## Complete Migration Inventory

### Migrations 040–050: Foundation & Analytics

| # | File | Lines | Type | Issues |
|---|------|-------|------|--------|
| 040 | master-consolidation.sql | 882 | Foundation | None — massive but necessary |
| 041 | strategic-roadmap-phase1.sql | 536 | Feature | None |
| 042 | abandoned-booking-tracking.sql | 143 | Analytics | Possibly unused |
| 043 | winery-data-architecture-fixed.sql | 140 | Data enrichment | None |
| 044 | announcements.sql | 56 | Feature | None |
| 045 | add-vehicles-table.sql | 73 | Feature | Inserts test data (fixed by 062) |
| 046 | vehicle-availability-blocks.sql | 220 | Feature | Constraint modified by 065 |
| 047 | driver-qualification-files.sql | 376 | Compliance | None |
| 048 | ai-chat-config.sql | 86 | Feature | None |
| 049 | experience-requests.sql | 158 | Feature | None |
| 050 | booking-clicks.sql | 27 | Analytics | None |

### Migrations 051–060: Major Feature Systems

| # | File | Lines | Type | Issues |
|---|------|-------|------|--------|
| 051 | trip-planner.sql | 244 | Feature | None |
| 052 | geology-schema.sql | 361 | Feature | None |
| 053 | trip-proposals.sql | 477 | Feature | cost_notes column later removed by 082 |
| 054 | crm-module.sql | 556 | Feature | **CASCADE drops** — destructive |
| 055 | crm-integration-enhancements.sql | 89 | Enhancement | **Duplicate number** |
| 055 | fix-missing-primary-keys.sql | 93 | Fix | **Duplicate number** |
| 056 | contact-inquiries.sql | 77 | Feature | None |
| 057 | annual-reengagement.sql | 51 | Enhancement | None |
| 058 | competitor-monitoring.sql | 480 | Feature | **CASCADE drops** — possibly unused |
| 059 | business-directory.sql | 251 | Feature | None |
| 060 | social-media-automation.sql | 281 | Feature | **CASCADE drops** — possibly unused |

### Migrations 061–070: Enhancements & Fixes

| # | File | Lines | Type | Issues |
|---|------|-------|------|--------|
| 061 | featured-photo-override.sql | 30 | Enhancement | **Duplicate number** |
| 061 | google-calendar-sync.sql | 30 | Enhancement | **Duplicate number** |
| 062 | update-fleet-vehicles.sql | 84 | Data fix | Corrects test data from 045 |
| 063 | content-cms.sql | 197 | Feature | None |
| 064 | shared-tours-enhancements.sql | 453 | Enhancement | None |
| 065 | allow-overlap-vehicle-blocks.sql | 72 | Enhancement | Modifies 046 constraint |
| 066 | shared-tour-presets.sql | 115 | Feature | None |
| 067 | shared-tour-discounts.sql | 47 | Enhancement | None |
| 068 | fix-shared-tours-id-sequence.sql | 15 | Fix | **Squashable** with 069, 070, 074a |
| 069 | fix-vehicle-availability-blocks-id-sequence.sql | 15 | Fix | **Squashable** with 068, 070, 074a |
| 070 | fix-shared-tours-availability-id-sequence.sql | 16 | Fix | **Squashable** with 068, 069, 074a |

### Migrations 071–080: Billing & Events

| # | File | Lines | Type | Issues |
|---|------|-------|------|--------|
| 071 | driver-tips-and-tour-completion.sql | 110 | Feature | None |
| 072 | trip-estimates.sql | 145 | Feature | None |
| 073 | password-reset-tokens.sql | 7 | Feature | **Trivial** — could merge with adjacent |
| 074 | marketing-automation.sql | 347 | Feature | **Duplicate number** — possibly unused |
| 074 | users-id-sequence.sql | 17 | Fix | **Duplicate number** — squashable |
| 075 | fix-reset-token-timezone.sql | 6 | Fix | **Duplicate number** — trivial |
| 075 | strategy-execution-tracking.sql | 46 | Enhancement | **Duplicate number** |
| 076 | operational-tables.sql | 217 | Feature + Fix | Fixes missing PKs on time_cards, inspections |
| 077 | brand-separation.sql | 233 | Feature | None — good backward compat |
| 078 | lodging-module.sql | 111 | Feature | None |
| 079 | proposal-service-billing.sql | 12 | Enhancement | **Trivial** — 2 column additions |
| 080 | events-system.sql | 140 | Feature | None |

### Migrations 081–090: Proposal Refinement

| # | File | Lines | Type | Issues |
|---|------|-------|------|--------|
| 081 | event-organizers.sql | 99 | Feature | None |
| 082 | trip-proposal-fixes.sql | 42 | Fix | Removes cost_notes from 053 — **intentional cleanup** |
| 083 | email-logs-trip-proposal.sql | 23 | Fix | Table was missing migration — **schema debt** |
| 084 | recurring-events.sql | 19 | Enhancement | None |
| 085 | collaborative-itinerary.sql | 208 | Feature | None — excellent Realtime design |
| 086 | accept-behavior-toggle.sql | 5 | Enhancement | **Trivial** — 1 column |
| 087 | guest-identity-and-ordering-mode.sql | 20 | Enhancement | None |
| 088 | per-item-tax-and-planning-fee.sql | 14 | Enhancement | None |
| 089 | per-guest-billing.sql | 65 | Feature | None |
| 090 | payment-reminders.sql | 39 | Feature | None |

### Migrations 091–100: Operational Hardening

| # | File | Lines | Type | Issues |
|---|------|-------|------|--------|
| 091 | admin-internal-reminders.sql | 29 | Feature | None |
| 092 | vendor-tracking.sql | 33 | Feature | None |
| 093 | billing-hardening.sql | 57 | Security | None — critical financial safety |
| 094 | rename-converted-statuses.sql | 15 | Cleanup | None |
| 095 | guest-capacity.sql | 27 | Enhancement | None |
| 096 | business-types-multiselect.sql | 60 | Schema evolution | Maintains dual-column state with sync trigger |
| 097 | add-multi-day-wine-trip-type.sql | 4 | Enhancement | **Trivial** — 1 CHECK constraint change |
| 098 | trip-proposal-archived.sql | 7 | Enhancement | **Trivial** — 1 column + 1 index |
| 099 | draft-reminders.sql | 10 | Enhancement | **Trivial** |
| 100 | user-sessions.sql | 26 | Security | None |

### Migrations 101–112: Hardening & Security

| # | File | Lines | Type | Issues |
|---|------|-------|------|--------|
| 101 | data-model-hardening.sql | 335 | Security | None — fixes 58 FK relationships |
| 102 | performance-indexes.sql | 54 | Performance | None |
| 103 | hotel-partner-password-reset.sql | 11 | Feature | **Trivial** |
| 104 | email-preferences.sql | 17 | Compliance | None |
| 105 | drop-unused-booking-indexes.sql | 14 | Cleanup | Drops indexes — **intentional**, not a revert of 102 |
| 106 | auth-events.sql | 24 | Security | None |
| 107 | email-retry-backoff.sql | 17 | Enhancement | None |
| 108 | enable-rls-all-tables.sql | 89 | Security | **Squashable** with 109-112 |
| 109 | fix-function-search-paths.sql | 44 | Security | **Squashable** with 108, 110-112 |
| 110 | auth-events-rls.sql | 6 | Security | **Trivial** — squashable |
| 111 | realtime-rls-policies.sql | 75 | Security | **Must follow 108** — squashable |
| 112 | move-extensions-to-extensions-schema.sql | 13 | Cleanup | **Squashable** with 108-111 |

### Prisma Migrations

| File | Lines | Issues |
|------|-------|--------|
| `20260303000002_add_tier2_indexes/migration.sql` | 13 | None — clean index additions |
| _(missing)_ `migration_lock.toml` | — | **Missing** — Prisma Migrate non-functional |

---

## Recommendations

### Immediate (no-risk)

1. **Fix naming collisions** — Rename duplicate-numbered files (055a, 061a, 074a, 075a)
2. **Create `migration_lock.toml`** — Add the missing Prisma lock file
3. **Verify unused features** — Query production row counts for tables in 042, 058, 060, 074-marketing

### Safe to Squash (when ready)

| Group | Migrations | Savings |
|-------|-----------|---------|
| Sequence fixes | 068, 069, 070, 074a → 1 file | 3 files |
| Security hardening | 108-112 → 1-2 files | 3-4 files |
| Trivial additions | 073, 086, 097, 098, 099, 103, 110 → absorb into neighbors | 7 files |

**Total potential reduction:** ~13 files (75 → ~62)

### Future Consideration

A full migration squash (all 75 → 1 baseline + incremental) would be the cleanest approach but requires:
1. A complete schema snapshot from production
2. Testing against a fresh database
3. Updating the `_migrations` tracking table
4. Coordination with any pending feature work

---

## Schema Drift Notes

- `prisma migrate diff` could not run due to missing shadow database
- The project uses **dual migration systems**: raw SQL in `migrations/` (primary) and Prisma Migrate in `prisma/migrations/` (secondary, 1 migration only)
- The 260KB `prisma/schema.prisma` file defines 193 models — manual verification against the 73 SQL migrations was not performed due to scope
- Recommendation: Run `npx prisma migrate diff --from-config-datasource --to-schema-datamodel` against the live Supabase instance to detect actual drift
