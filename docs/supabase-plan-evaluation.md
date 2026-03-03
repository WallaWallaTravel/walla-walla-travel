# Supabase Plan Evaluation

**Date:** March 3, 2026
**Project:** Walla Walla Travel (`eabqmcvmpkbpyhhpbcij`)
**Current Plan:** Pro ($25/month base)

---

## What We're Paying For vs What We Use

### Feature Usage Summary

| Supabase Feature | Included in Pro | We Use It? | Details |
|------------------|----------------|------------|---------|
| **Database (PostgreSQL)** | 8 GB | Yes — heavily | 108 tables, primary data store for all app data |
| **Storage** | 100 GB | Yes | Media library, winery photos, receipt uploads, backups |
| **Realtime** | 5M messages/mo | Yes — lightly | 5 channels in `useProposalRealtime.ts` for live trip proposal updates |
| **Auth** | 100K MAUs | **No** | Custom JWT auth via `jose` + HttpOnly cookies. Zero `.auth()` calls. |
| **Edge Functions** | 2M invocations | **No** | All server logic runs in Vercel/Next.js API routes |
| **Vector/AI** | Included | **No** | AI features use Anthropic + Gemini APIs directly |

### Detailed File-Level Audit

**Database (primary use — 108 tables):**
- All business logic via `lib/db` connection pool (direct PostgreSQL, not Supabase client)
- Supabase client used for typed queries in `ClientNotesClient.tsx`
- Health monitoring via `lib/services/health.service.ts`
- Connection pool tuned for Supabase's 200-connection PgBouncer limit

**Storage (6 active integration points):**
- `lib/storage/supabase-storage.ts` — centralized client with upload, delete, signed URLs, EXIF stripping
- `app/api/media/upload/route.ts` — media library uploads
- `app/api/media/[media_id]/replace/route.ts` — media replacement
- `app/api/driver/expenses/upload-receipt/route.ts` — receipt photos
- `app/api/partner/photos/route.ts` — winery partner photos
- `scripts/backup-storage.ts` — disaster recovery backup script
- `app/page.tsx` + `next.config.ts` — hardcoded public storage URLs for hero images

**Realtime (1 hook, 5 channels):**
- `hooks/useProposalRealtime.ts` subscribes to changes on: `trip_proposals`, `trip_proposal_days`, `trip_proposal_stops`, `proposal_notes`, `proposal_lunch_orders`
- Triggers React Query refetch on INSERT/UPDATE/DELETE
- Low volume — used by admin staff only, not public-facing

**Auth — completely unused:**
- `@supabase/ssr` is installed but only provides `createBrowserClient`/`createServerClient` factories for data access
- Authentication is entirely custom: JWT signed with `jose`, HttpOnly cookies, server-side session store (`user_sessions` table)
- No Supabase Auth dashboard users, no auth webhooks, no auth policies

**Edge Functions — completely unused:**
- All server logic in Next.js API routes on Vercel
- No `supabase/functions/` directory exists

---

## Cost Analysis

### What We Pay

| Line Item | Cost |
|-----------|------|
| Pro plan base | $25/month |
| Compute add-on (if any) | Check Supabase dashboard — likely Micro ($5) or none |
| Database overage (if >8 GB) | $0.125/GB/month |
| Storage overage (if >100 GB) | $0.021/GB/month |
| **Estimated total** | **$25–35/month** |

### What We Get For Free (Included But Unused)

| Feature | Pro Quota | Our Usage | Waste |
|---------|-----------|-----------|-------|
| Auth | 100K MAUs | 0 MAUs | 100% unused |
| Edge Functions | 2M invocations | 0 invocations | 100% unused |
| Vector/AI | Included | 0 queries | 100% unused |
| Realtime | 5M messages | Low (admin-only) | ~99% unused |

### Is the Pro Plan Worth It?

**Yes.** Even though Auth, Edge Functions, and Vector are unused, the Pro plan is still the right tier because:

1. **No à la carte option.** Supabase bundles all features — you can't pay for "DB + Storage only." The unused features don't cost extra unless you exceed their quotas, which we don't.

2. **Pro is required for production.** Free tier has hard limits (500 MB DB, 1 GB storage, project pausing after inactivity) that would break a production app.

3. **$25/month is cheap.** For managed PostgreSQL + Storage + daily backups + connection pooling + a dashboard, $25/month is well below the cost of any alternative (AWS RDS starts at ~$15/month for DB alone, plus S3 storage, plus management overhead).

4. **No overage risk.** Our usage is well within Pro quotas for every feature.

---

## Optimization Opportunities

### Not Recommended

| Option | Why Not |
|--------|---------|
| **Downgrade to Free tier** | 500 MB DB limit, project pauses after 1 week of inactivity — unusable for production |
| **Self-host Supabase** | Requires managing PostgreSQL, Storage (S3-compatible), and infrastructure — defeats the "sleep well at night" philosophy |
| **Move DB to another managed provider** | Would need to also move Storage, re-configure all connection strings, lose the dashboard — effort exceeds savings |
| **Remove `@supabase/ssr`** | It provides the client factories used for Realtime and typed queries — cannot be removed |

### Could Consider (Low Priority)

| Option | Savings | Effort | Verdict |
|--------|---------|--------|---------|
| **Remove Realtime dependency** | ~$0/month (within quota) | Medium — would need polling or SSE replacement for proposal live updates | Not worth it — Realtime works well, costs nothing extra |
| **Move Storage to Cloudflare R2** | ~$0/month at current scale | High — rewrite upload/download code, update all URLs | Not worth it — no cost savings at current usage |
| **Check compute add-on** | $5–10/month if on Micro/Small | 5 min — check Supabase dashboard | Worth checking — if on a compute add-on we don't need, easy savings |

---

## Recommendation

**Stay on Pro. No changes needed.**

At $25–35/month for managed PostgreSQL + Storage + Realtime + daily backups + connection pooling, this is excellent value. The unused features (Auth, Edge Functions, Vector) cost us nothing extra.

The only action item: check the Supabase dashboard to confirm whether a compute add-on is enabled. If the Micro ($5/month) or Small ($10/month) add-on is active but not needed for our workload, that's an easy saving.

---

## References

- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Pro Plan Breakdown](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance)
- Project infrastructure: `/Users/temp/INFRASTRUCTURE.md`
