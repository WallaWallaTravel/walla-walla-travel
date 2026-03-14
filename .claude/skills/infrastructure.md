---
name: infrastructure
description: External services and infrastructure details. Use when debugging connectivity, configuring services, or checking health.
---

## Active Services
| Service | Purpose | Notes |
|---------|---------|-------|
| Supabase Pro | PostgreSQL DB + Storage | Auth/Edge/PostgREST unused. $25/mo. Daily backups + PITR. |
| Stripe | Payments | Dual brand: WWT + NW Touring via `lib/stripe-brands.ts` |
| Resend | Email | Transactional + inbound via `in.wallawalla.travel`. 21 templates. Dark mode CSS. |
| Upstash Redis | Rate limiting + caching | 10 public routes cached (60-300s), 10 admin invalidation routes |
| Sentry | Error monitoring | Client + server + edge. Error boundaries active. |
| Vercel | Hosting | Enhanced Builds (16GB). ESLint skipped in build. ~4m 25s build time. |
| Twilio | SMS | |
| Deepgram | Voice | |

## Health Check
- Endpoint: `wallawalla.travel/api/health` — returns DB status + latency
- Latency >400ms = elevated but functional
- GitHub Actions: 3x daily + on every push
- Local: `./scripts/verify.sh`

## Supabase Specifics
- `pgvector` dropped, `migration_lock.toml` created
- Extensions in `extensions` schema (btree_gist + vector), `search_path` covers it
- 75 migrations, 4 naming collisions known, 3 destructive CASCADEs documented
- Weekly storage backup via GitHub Actions
