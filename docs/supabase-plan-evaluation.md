# Supabase Plan Evaluation

**Date:** March 3, 2026 (updated)
**Project:** Walla Walla Travel (`eabqmcvmpkbpyhhpbcij`)
**Current Plan:** Pro ($25/month base)

---

## What We're Paying For vs What We Use

### Feature Usage Summary

| Supabase Feature | Included in Pro | We Use It? | Usage Level | Details |
|------------------|----------------|------------|-------------|---------|
| **Database (PostgreSQL)** | 8 GB | **Yes** | Heavy | 193 tables, 112+ migrations, primary data store |
| **Storage** | 100 GB | **Yes** | Moderate | 2 buckets (`media`, `winery-photos`) — winery photos, receipts, partner uploads |
| **Realtime** | 5M messages/mo | **Yes** | Light | 2 hooks: proposal updates (5 tables) + compliance sync (2 tables) |
| **Connection Pooler (Supavisor)** | Included | **Yes** | Heavy | All production queries go through port 6543 pooler |
| **Daily Backups** | 7-day retention | **Yes** | Automatic | Critical for production — no manual intervention needed |
| **Dashboard** | Included | **Yes** | Occasional | SQL editor, table browser, monitoring |
| **RLS Engine** | Included | **Yes** | Active | Enabled on all tables, 8 policies for Realtime + defense-in-depth |
| **Auth (GoTrue)** | 100K MAUs | **Minimal** | <10 MAUs | Only Auditor's Dream operator portal; WWT uses custom JWT auth |
| **Edge Functions** | 2M invocations | **No** | Zero | All server logic in Vercel/Next.js API routes |
| **PostgREST REST API** | Unlimited | **No** | Zero | All queries use direct PostgreSQL via `pg` library |
| **Vector/AI (pgvector)** | Included | **No** | Zero | Extension installed but unused; AI features use Anthropic + Gemini APIs |
| **Cron (pg_cron)** | Included | **No** | Zero | Cron jobs run via Vercel cron + Next.js API routes |

---

## Detailed Audit

### Database — Primary Use (Heavy)

**Connection architecture:**
- Direct PostgreSQL via `pg` library (v8.16.3) — NOT through Supabase client/PostgREST
- Connection pool: max 5 connections per serverless function (tuned for Supabase's 200-connection Supavisor limit)
- 30-second statement timeout, SSL required
- Transaction support with isolation levels and savepoints

**Key files:**
- `lib/db.ts` — pool configuration & query execution
- `lib/config/database.ts` — environment-based config
- `lib/db/transaction.ts` — transaction helpers
- `lib/services/*.ts` — all business logic (booking, proposals, CRM, compliance, etc.)

**ORM status:**
- Prisma is installed and has 106 generated model files at `lib/generated/prisma/`
- However, Prisma is **not actively used** — all queries are raw SQL via `pg`
- Prisma serves as documentation/type reference only

**Extensions installed:**
- `uuid-ossp` — UUID generation (active)
- `moddatetime` — automatic `updated_at` triggers (active)
- `btree_gist` — GiST index type for exclusion constraints on `vehicle_availability_blocks` (active)
- `splinter` — Supabase linter, queried by `supabase-lint` cron job (active)
- `pgvector` — vector similarity search; **installed but NOT used by any application code** (candidate for removal)
- Extensions moved to `extensions` schema per Supabase best practice (migration 112)

### Storage — Active Use (Moderate)

**Buckets:**
- `media` — public, general media (winery photos, exploration images)
- `winery-photos` — public, partner-uploaded winery photos

**Integration points (6 files):**
| File | Purpose | Bucket |
|------|---------|--------|
| `lib/storage/supabase-storage.ts` | Centralized client: upload, delete, signed URLs, bucket creation | `media` |
| `app/api/media/upload/route.ts` | Admin media library uploads | `media` |
| `app/api/media/[media_id]/replace/route.ts` | Media replacement | `media` |
| `app/api/driver/expenses/upload-receipt/route.ts` | Driver receipt photos | `media` |
| `app/api/partner/photos/route.ts` | Winery partner photo uploads | `winery-photos` |
| `scripts/backup-storage.ts` | Weekly disaster recovery backup (CI workflow) | All buckets |

**Operations used:**
- `.upload()` — 3 call sites
- `.getPublicUrl()` — 3 call sites
- `.remove()` — 1 active (soft-delete pattern preferred)
- `.list()` — 2 call sites (file listing + backup)
- `.createSignedUrl()` — available but not actively triggered
- `.listBuckets()` / `.createBucket()` — initialization and backup

**Features used:**
- EXIF metadata stripping on upload (GPS/PII removal via `sharp`)
- Category-based file organization (`{category}/{subcategory}/{timestamp}-{random}.{ext}`)
- Allowed types: JPEG, PNG, WebP, GIF (10 MB max); MP4, WebM (100 MB max)
- 1-hour cache control headers
- Fallback to base64 data URLs if storage unavailable (partner photo route)

### Realtime — Limited Use (Light)

**Two active hooks:**

**1. `hooks/useProposalRealtime.ts`** — WWT admin, live proposal editing

Subscriptions (5 tables):
1. `trip_proposals` — proposal status/field changes
2. `trip_proposal_days` — day additions/modifications
3. `trip_proposal_stops` — stop additions/modifications
4. `proposal_notes` — collaborative notes
5. `proposal_lunch_orders` — meal coordination

**2. `auditors-dream/apps/operator/src/hooks/useComplianceSync.ts`** — Auditor's Dream

Subscriptions (2 tables):
1. `compliance_status` — real-time compliance score changes
2. `compliance_audit_log` — new audit log inserts

**Usage pattern:**
- Admin/operator-only (not public-facing) — very low message volume
- Triggers React Query cache invalidation on INSERT/UPDATE/DELETE events
- Properly unsubscribes on component unmount
- RLS policies (migration 111) restrict anon SELECT to non-draft proposals
- `useRealtimeSync` in Auditor's Dream subscribes channels without handlers (possibly dead code)

### Supabase Client Library — Strategic Use

**Packages:** `@supabase/supabase-js` v2.89.0, `@supabase/ssr` v0.8.0

**Three client implementations:**
| Client | File | Used For | Auth Level |
|--------|------|----------|------------|
| Browser | `lib/supabase/client.ts` | Realtime subscriptions | Anon key |
| Server | `lib/supabase/server.ts` | Server components (SSR) | Anon key + cookies |
| Admin | `lib/supabase/admin.ts` | Storage operations | Service role (bypasses RLS) |

**Usage:** Supabase client is used **only** for Storage + Realtime. All CRUD operations go through direct PostgreSQL.

### Row Level Security — Defense-in-Depth

- RLS enabled on all public tables (migration 108) with deny-all default
- 8 RLS policies total:
  - 5 SELECT-only policies for Realtime (anon role, non-draft proposals only)
  - 1 on `auth_events` (migration 110)
  - 2 from migration 108
- Backend uses service_role key (bypasses RLS)
- Custom JWT auth means no `auth.uid()` available for per-user policies
- Views use `SECURITY INVOKER` (not `DEFINER`)
- All functions have explicit `SET search_path = public` (migration 109)

### Auth (GoTrue) — Minimal Use (Auditor's Dream Only)

**Supabase Auth is used ONLY by the Auditor's Dream operator portal** (<10 MAUs):

| File | Supabase Auth Method |
|------|---------------------|
| `auditors-dream/apps/operator/src/store/auth.ts` | `signInWithPassword()`, `signOut()`, `getSession()`, `onAuthStateChange()` |
| `auditors-dream/apps/operator/src/lib/supabase.ts` | `createClient()` with anon key |
| `auditors-dream/apps/operator/src/pages/Login.tsx` | Login form calling auth store |

**The main WWT application has ZERO Supabase Auth usage.** Authentication is entirely custom:
- JWT signed with `jose` library
- HttpOnly cookies with server-side session store (`user_sessions` table)
- Bcrypt password hashing
- Session rotation on privilege changes
- Idle timeout (30 min admin, 24 hr users)
- Rate-limited login (5 attempts per 15 minutes)
- Hotel partner auth uses a separate JWT flow (`lib/auth/hotel-session.ts`)

**Supabase Auth features NOT used anywhere:**
`signUp()`, `resetPasswordForEmail()`, `updateUser()`, OAuth providers, Magic links, OTP/2FA, Supabase email templates, Auth webhooks, `auth.uid()` in RLS policies

### Edge Functions — Completely Unused

- No `supabase/functions/` directory
- Zero `supabase.functions.invoke()` calls
- All server logic in Next.js API routes (285+ routes)

### PostgREST REST API — Not Used for Data Queries

- Supabase JS client `.from('table').select()` is NOT used for app data queries
- All CRUD goes through direct SQL via `pg` connection pool
- Supabase JS client is used only for Storage API and Realtime subscriptions
- RLS blocks PostgREST data access anyway (defense-in-depth)

---

## Cost Analysis

### What We Pay

| Line Item | Cost |
|-----------|------|
| Pro plan base | $25/month |
| Compute add-on | Check Supabase dashboard — likely Micro ($5/mo) or none |
| Database overage (if >8 GB) | $0.125/GB/month |
| Storage overage (if >100 GB) | $0.021/GB/month |
| **Estimated total** | **$25–35/month** |

### What We Get For Free (Included But Unused)

| Feature | Pro Quota | Our Usage | Waste |
|---------|-----------|-----------|-------|
| Auth | 100K MAUs | <10 MAUs (Auditor's Dream only) | ~99.99% unused |
| Edge Functions | 2M invocations | 0 invocations | 100% unused |
| PostgREST API | Unlimited requests | 0 data requests | 100% unused |
| pgvector | Included | 0 queries | 100% unused |
| pg_cron | Included | 0 jobs | 100% unused |
| Realtime | 5M messages | Low (admin-only, 7 tables) | ~99% unused |

### Is the Pro Plan Worth It?

**Yes.** Even though Auth, Edge Functions, PostgREST, and Vector are unused, the Pro plan is the right tier:

1. **No a la carte option.** Supabase bundles all features — you can't pay for "DB + Storage only." The unused features cost nothing extra unless you exceed their quotas (we don't).

2. **Pro is required for production.** Free tier has hard limits (500 MB DB, 1 GB storage, project pauses after 1 week inactivity) that would break a production app.

3. **$25/month is excellent value.** For managed PostgreSQL + connection pooler + Storage + Realtime + daily backups + dashboard, $25/month is well below alternatives:
   - AWS RDS (PostgreSQL): ~$15/month DB-only + S3 + management overhead
   - Neon: $19/month for comparable compute + separate storage costs
   - Railway: ~$20/month + per-GB pricing
   - Self-hosted: Server costs + maintenance time

4. **No overage risk.** Current usage is well within Pro quotas for every metered feature.

---

## Optimization Opportunities

### Not Recommended

| Option | Why Not |
|--------|---------|
| **Downgrade to Free** | 500 MB DB limit, project pauses after inactivity — unusable for production |
| **Self-host Supabase** | Requires managing PostgreSQL, Storage, Supavisor, backups — defeats "sleep well at night" philosophy |
| **Move DB elsewhere** | Would also need to move Storage, re-configure connection pooling, lose dashboard — effort vastly exceeds savings |
| **Remove `@supabase/ssr`** | Provides client factories used for Realtime and Storage — needed |
| **Migrate to Supabase Auth** | Custom auth works well with server-side sessions. Migration would be significant effort for minimal benefit. Consider only if per-user RLS policies become necessary. |
| **Remove Realtime** | Costs nothing (within quota). Would need polling/SSE replacement. Not worth the effort. |

### Could Consider (Low Priority)

| Option | Potential Savings | Effort | Verdict |
|--------|-------------------|--------|---------|
| **Check compute add-on** | $5–10/month if on Micro/Small | 5 min — check Supabase dashboard | **Worth checking** — if an unnecessary add-on is active, easy savings |
| **Remove `pgvector` extension** | 0 (frees DB memory) | Low — `DROP EXTENSION IF EXISTS vector;` | Extension is installed but zero application code uses it |
| **Audit `useRealtimeSync` dead code** | 0 (cleanup) | Low — verify + remove unused hook in Auditor's Dream | Subscribes channels without `.on()` handlers |
| **Remove unused Prisma** | 0 (no cost, just cleanup) | Low — remove `prisma` from deps, delete `lib/generated/prisma/` | Low priority — harmless but adds to `node_modules` size |
| **Set storage alert at 50 GB** | 0 (monitoring) | 5 min — Supabase dashboard | Photo uploads from partners could grow; alert provides lead time |

---

## Recommendation

**Stay on Pro. No changes needed.**

At $25–35/month for managed PostgreSQL + connection pooler + Storage + Realtime + daily backups + RLS + dashboard, this is excellent value. The unused features (Auth, Edge Functions, PostgREST, Vector, pg_cron) cost nothing extra.

**Action items:**
- [ ] Check the Supabase dashboard (Settings > Billing) to confirm whether a compute add-on is enabled. If Micro ($5/month) or Small ($10/month) is active but not needed for current workload, that's an easy saving.
- [ ] Remove `pgvector` extension — installed but zero application code uses it (`DROP EXTENSION IF EXISTS vector;`)
- [ ] Verify and remove `useRealtimeSync` dead code in Auditor's Dream (subscribes channels without handlers)
- [ ] Set storage alert at 50 GB in Supabase dashboard (partner photo growth monitoring)
- [ ] Re-evaluate annually or if usage patterns change significantly

---

## Architecture Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                     Supabase Pro ($25/mo)                         │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │   PostgreSQL DB    │  │   Storage     │  │    Realtime     │  │
│  │   193 tables       │  │   2 buckets   │  │    7 tables     │  │
│  │   112+ migrations  │  │   media +     │  │    admin-only   │  │
│  │   HEAVY USE        │  │   winery-     │  │    LIGHT USE    │  │
│  │                    │  │   photos      │  │                 │  │
│  │                    │  │   MODERATE    │  │                 │  │
│  └──────┬────────────┘  └──────┬────────┘  └──────┬──────────┘  │
│         │                      │                    │             │
│  ┌──────┴────────────┐        │                    │             │
│  │  Supavisor        │        │                    │             │
│  │  (port 6543)      │        │                    │             │
│  │  Connection pool   │        │                    │             │
│  └──────┬────────────┘        │                    │             │
│         │                      │                    │             │
│  ╔══════╧═════════════════╗   │                    │             │
│  ║  MOSTLY UNUSED:        ║   │                    │             │
│  ║  Auth (<10 of 100K)    ║──── Auditor's Dream only             │
│  ║  Edge Functions (0/2M) ║   │                    │             │
│  ║  PostgREST (0 queries) ║   │                    │             │
│  ║  pgvector (installed,  ║   │                    │             │
│  ║    not used)           ║   │                    │             │
│  ║  pg_cron (0 jobs)      ║   │                    │             │
│  ╚════════════════════════╝   │                    │             │
└──────────┬───────────────────┬────────────────────┬─────────────┘
           │                   │                    │
      direct pg           supabase-js          supabase-js
      (lib/db.ts)         admin client         browser client
           │              (service_role)        (anon key)
           │                   │                    │
           ▼                   ▼                    ▼
    ┌──────────────────────────────────────────────────────┐
    │               Vercel (Next.js App)                   │
    │    285+ API routes    │   Client components          │
    │    Service layer      │   useProposalRealtime        │
    │    Custom JWT auth    │   Media uploads              │
    └──────────────────────────────────────────────────────┘
                                        │
                              ┌─────────┴──────────┐
                              │  Auditor's Dream    │
                              │  (Vite+React)       │
                              │  Uses Supabase Auth │
                              │  + Realtime         │
                              └────────────────────┘
```

---

## Pro Plan Quotas Reference

| Feature | Included | Overage Rate |
|---------|----------|-------------|
| Database disk | 8 GB | $0.125/GB |
| Storage | 100 GB | $0.021/GB |
| Egress | 250 GB | $0.09/GB |
| Auth MAUs | 100,000 | $0.00325/user |
| Edge Functions | 2M invocations | $2/million |
| Realtime messages | 5M/month | $2.50/million |
| Realtime peak connections | 500 | $10/1000 |

## References

- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Billing Docs](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase Pro Plan Breakdown](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance)
- Project infrastructure: `INFRASTRUCTURE.md` (repo root)
- CLAUDE.md infrastructure section: `.claude/CLAUDE.md`
