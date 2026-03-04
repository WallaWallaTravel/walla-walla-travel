# Unused Tables Audit

> **Date:** 2026-03-03
> **Trigger:** Supabase plan evaluation identified 4 feature areas flagged as "possibly unused" by the Prisma migration audit
> **Method:** Full codebase search for table names, service references, API routes, UI pages, and cron jobs

---

## Summary

| Feature Area | Tables | Services | API Routes | UI Pages | Cron Jobs | Verdict |
|---|---|---|---|---|---|---|
| Competitor Monitoring | 7 | 2 (1,103 lines) | 2 | 4 | 0 | **USED — keep** |
| Social Media | 3 | 1 (1,000 lines) | 4 | 3 | 3 | **USED — keep** |
| Marketing Automation | 11 | Multiple handlers | 16+ | 10+ | 6 | **USED — keep** |
| Cart Tracking | 0 | 0 | 0 | 0 | 0 | **Never built** |

**The Prisma audit's "possibly unused" flag was incorrect for 3 of 4 areas.** All three implemented feature areas have comprehensive backend services, admin UI, and (for social/marketing) active cron jobs.

---

## 1. Competitor Monitoring — KEEP

**Tables (7):** `competitors`, `competitor_pricing`, `competitor_snapshots`, `competitor_changes`, `competitor_swot`, `competitive_advantages`, `competitor_alerts`

**Migration:** `058-competitor-monitoring.sql`

**Code references:**

| File | Purpose |
|------|---------|
| `lib/services/competitor-monitoring.service.ts` | 652 lines — full CRUD, pricing history, change tracking, SWOT |
| `lib/services/competitor-ai.service.ts` | 451 lines — Claude-powered threat assessment, market positioning |
| `app/admin/marketing/competitors/page.tsx` | Competitor dashboard |
| `app/admin/marketing/competitors/[id]/page.tsx` | Competitor detail view |
| `app/admin/marketing/competitors/advantages/page.tsx` | Competitive advantages management |
| `app/admin/marketing/competitors/comparison/page.tsx` | Price comparison matrix |
| `app/admin/marketing/competitors/positioning/page.tsx` | Market positioning analysis |
| `app/api/admin/marketing/competitors/changes/route.ts` | Change tracking API |
| `app/api/admin/marketing/competitors/comparison/route.ts` | Comparison API |

**Recommendation:** Keep. Fully implemented admin tool with AI integration.

---

## 2. Social Media — KEEP

**Tables (3):** `social_accounts`, `scheduled_posts`, `content_suggestions`

**Migrations:** `060-social-media-automation.sql`, `074-marketing-automation.sql`

**Code references:**

| File | Purpose |
|------|---------|
| `lib/services/social-intelligence.service.ts` | 1,000 lines — content generation, performance tracking, learning from approvals |
| `app/api/cron/publish-social-posts/route.ts` | Every 15 min — publishes scheduled posts to Buffer |
| `app/api/cron/generate-suggestions/route.ts` | Daily 6 AM — AI generates content suggestions |
| `app/api/cron/sync-post-metrics/route.ts` | Syncs engagement metrics from Buffer |
| `app/api/admin/marketing/social-accounts/route.ts` | Account management (Buffer OAuth) |
| `app/api/admin/marketing/social-posts/route.ts` | Post management |
| `app/api/admin/marketing/suggestions/route.ts` | Content suggestion review |
| `app/api/auth/buffer/callback/route.ts` | Buffer OAuth callback |
| `app/admin/marketing/social-posts/page.tsx` | Post scheduler UI |
| `app/admin/marketing/suggestions/page.tsx` | Suggestions review UI |
| `app/admin/marketing/social-accounts/page.tsx` | Account connection UI |

**Recommendation:** Keep. Production system with 3 active cron jobs and Buffer integration.

---

## 3. Marketing Automation — KEEP

**Tables (11):** `integrations`, `search_console_data`, `marketing_strategies`, `marketing_campaigns`, `campaign_items`, `content_refresh_suggestions`, `trending_topics`, `blog_drafts`, `content_approvals`, `ai_learning_preferences`, `marketing_report_logs`

**Migration:** `074-marketing-automation.sql`

**Code references:**

| Category | Count | Examples |
|----------|-------|---------|
| Cron jobs | 6 | `weekly-strategy`, `trending-topics`, `sync-search-console`, `seasonal-content-refresh`, `sync-campaign-performance`, `weekly-marketing-report` |
| API routes | 16+ | `campaigns`, `strategies`, `trending`, `content-refresh`, `blog-generator`, `seo`, `email-campaigns`, `metrics`, `approvals` |
| Admin pages | 10+ | `strategy`, `campaigns`, `campaigns/[id]`, `trending`, `content-refresh`, `blog-generator`, `seo`, `metrics` |

**Key integrations:** Google Search Console OAuth, Buffer, AI strategy generation (Monday 10 AM), learning from admin approvals.

**Recommendation:** Keep. Production marketing platform with 6 cron jobs and multi-channel campaign orchestration.

---

## 4. Cart Tracking — NOT BUILT

**Tables:** None. No `shopping_cart`, `cart_items`, `cart_tracking`, or `abandoned_cart` tables exist in any migration.

**Code references:** Zero. No services, API routes, UI pages, or types reference cart functionality.

**Recommendation:** No action needed — this feature was never implemented. The Prisma audit flagged it based on the concept, not actual tables.

---

## Actions Taken

- [x] Audited all 4 feature areas against full codebase
- [x] Confirmed 3 of 4 are actively used with comprehensive implementations
- [x] Confirmed cart tracking was never built (no tables exist)
- [ ] No tables to drop — all existing tables are in active use
