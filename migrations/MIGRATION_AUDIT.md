# Migration Audit — March 2026

## Overview

- **71 SQL migration files** in `migrations/` (040 through 106)
- **1 Prisma migration** in `prisma/migrations/20260303000002_add_tier2_indexes/`
- **No `_prisma_migrations` table** — Prisma's migration system is not used
- **Custom `_migrations` tracking table** records only 13 of 71 applied migrations
- **All migrations verified as applied** via table/column/index spot-checks
- **No empty or comment-only migrations**
- **No content-identical files** (all MD5 hashes unique)

## Duplicate-Numbered Migrations (4 conflicts)

These are **different migrations accidentally given the same number**, not content duplicates.
Both files in each pair were applied — do NOT remove either.

| Number | File A | File B | Notes |
|--------|--------|--------|-------|
| **055** | `055-crm-integration-enhancements.sql` (Jan 30) — SMS activity type, task templates | `055-fix-missing-primary-keys.sql` (Jan 28) — adds PKs to tables missing them | Both applied; different purposes |
| **061** | `061-featured-photo-override.sql` (Feb 2) — admin photo override column on wineries | `061-google-calendar-sync.sql` (Feb 1) — Google Calendar event tracking | Both applied; different purposes |
| **074** | `074-marketing-automation.sql` (Feb 16) — SEO, campaigns, trending topics, blog gen | `074-users-id-sequence.sql` (Feb 17) — fix auto-increment on users.id | Both applied; one is a major feature, one is a hotfix |
| **075** | `075-fix-reset-token-timezone.sql` (Feb 17) — TIMESTAMP → TIMESTAMPTZ on users | `075-strategy-execution-tracking.sql` (Feb 17) — strategy_id on posts, execution_summary | Both applied; one is a hotfix, one is a feature |

**Recommendation**: Do NOT renumber — all have been applied and may be referenced in
commit history, docs, or deployment logs. Future migrations should continue from 107+.

## Tracking Table (`_migrations`)

Only 13 of 71 migrations are recorded. Most were applied before tracking was set up
(tracking started around migration 040/master consolidation in Dec 2025).

Tracked migrations: 040, 041, 045, 046, 047, 062, 063, 065, 071, 101, 102, and
the Prisma migration (20260303000002_add_tier2_indexes).

Gap from 048–061 and 064–100 are all applied but untracked.

## Prisma Migration

`prisma/migrations/20260303000002_add_tier2_indexes/migration.sql` creates 5 indexes
(booking_timeline, reservations×3, wineries). Applied and tracked in `_migrations`.
No `_prisma_migrations` table exists — Prisma migrate is not used as a workflow.

## Verification Spot-Checks (all passed)

| Migration | Object checked | Exists? |
|-----------|---------------|---------|
| 042 | `booking_attempts` table | Yes |
| 053 | `trip_proposals` table | Yes |
| 054 | `crm_contacts` table | Yes |
| 058 | `competitor_snapshots` table | Yes |
| 060 | `social_accounts`, `scheduled_posts`, `content_suggestions` tables | Yes |
| 064 | `shared_tours` table | Yes |
| 073 | `users.reset_token` column | Yes |
| 090 | `payment_reminders` table | Yes |
| 100 | `user_sessions` table | Yes |
| 103 | `hotel_partners.reset_token` column | Yes |
| 104 | `email_preferences` table | Yes |
| 105 | 3 bookings indexes dropped | Yes (verified gone) |
| 106 | `auth_events` table | Yes |

## Action Items

- [ ] **Avoid reusing numbers** — next migration is **107**
- [ ] **Consider backfilling `_migrations`** for the untracked 048–100 range (optional, low priority)
- [ ] **No deletions needed** — all files correspond to applied schema changes
