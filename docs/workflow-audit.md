# End-to-End Workflow Audit

**Date:** March 4, 2026
**Method:** Code trace through pages, API routes, services, and migrations
**Scope:** 11 production workflows, rated by actual functionality

---

## Rating Key

| Rating | Meaning |
|--------|---------|
| **WORKING** | Full user journey completes end-to-end with real data |
| **PARTIALLY WORKING** | Core flow exists but has gaps, stubs, or hardcoded values |
| **BROKEN** | Code exists but fails at runtime due to missing tables, auth, or logic |
| **NOT BUILT** | Feature referenced in UI/docs but no implementation exists |

---

## 1. Lead → Proposal → Booking

**Rating: WORKING**

The core revenue workflow is complete end-to-end. A visitor can submit an inquiry, staff can create a proposal, build a full itinerary, share it, and the customer can view, accept, sign, pay a deposit via Stripe, and the trip appears in the admin Trips view.

### Step-by-step trace

| Step | Page/File | API Route | DB Table | Status |
|------|-----------|-----------|----------|--------|
| Lead capture (public form) | `app/(public)/inquiry/page.tsx` | `POST /api/inquiries` | `experience_requests` | WORKING |
| Admin views leads | `app/admin/leads/page.tsx` | `GET /api/admin/experience-requests` | `experience_requests` | WORKING |
| Create proposal | `app/admin/trip-proposals/new/page.tsx` | `POST /api/admin/trip-proposals` | `trip_proposals` | WORKING |
| Build itinerary (days, stops) | `app/admin/trip-proposals/[id]/page.tsx` — DaysStopsTab | CRUD routes under `/api/admin/trip-proposals/[id]/` | `trip_proposal_days`, `trip_proposal_stops` | WORKING |
| Set pricing (service line items) | PricingTab | `/api/admin/trip-proposals/[id]/inclusions` | `trip_proposal_inclusions` | WORKING |
| Add guests | GuestsTab | `/api/admin/trip-proposals/[id]/guests` | `trip_proposal_guests` | WORKING |
| Send to customer | SendProposalModal | `POST /api/admin/trip-proposals/[id]/send` | `email_logs` | WORKING — real email via Resend |
| Customer views proposal | `app/trip-proposals/[proposalNumber]/page.tsx` | `GET /api/trip-proposals/[proposalNumber]` | — | WORKING — auto-marks status `viewed` |
| Customer accepts + signs | `app/trip-proposals/[proposalNumber]/accept/page.tsx` | `POST /api/trip-proposals/[proposalNumber]/accept` | `trip_proposals.status → accepted` | WORKING — signature capture (type or draw) |
| Customer pays deposit | `app/trip-proposals/[proposalNumber]/pay/page.tsx` | `POST .../create-payment`, `POST .../confirm-payment` | `payments`, Stripe PaymentIntent | WORKING — real Stripe, brand-aware, idempotent |
| Success / receipt | `app/trip-proposals/[proposalNumber]/pay/success/page.tsx` | — | `trip_proposals.deposit_paid = true` | WORKING — receipt email sent |
| Trip visible in admin | `app/admin/bookings/page.tsx` (labeled "Trips") | `GET /api/admin/trip-proposals` | `trip_proposals` | WORKING — accepted proposals show in Planning tab |
| Convert to booking (optional) | ProposalHeader "Convert to Booking" button | `POST /api/admin/trip-proposals/[id]/convert` | `bookings` | WORKING — manual admin action |

### Gaps

- **No "Create Proposal" button on inquiry-type leads.** Consultation and corporate leads have a direct "Create Proposal" CTA. Inquiry leads only show "Contact" (mailto). Staff must navigate to `/admin/trip-proposals/new` manually.
- **Pre-population from lead is uncertain.** The URL param `?consultationId=` is passed but whether `useProposalForm` actually fetches and fills the form was not conclusively verified.

---

## 2. Guest Registration + Individual Deposits

**Rating: PARTIALLY WORKING**

The guest self-registration flow is complete. Per-guest billing is fully built in the admin UI and API backend. But the guest-facing payment page (where an individual guest enters their card) does not exist yet.

### What works

| Feature | File | Status |
|---------|------|--------|
| Admin adds guests manually | `GuestsTab.tsx` | WORKING |
| Guest self-registration link | `app/my-trip/[token]/join/page.tsx` | WORKING — collects name, email, phone; checks capacity |
| Admin approval of registrations | `GuestsTab.tsx` — Approve/Reject buttons | WORKING |
| Per-guest access tokens | `trip_proposal_guests.guest_access_token` | WORKING |
| Dynamic pricing on join page | Join page shows price per person | WORKING |
| Individual billing toggle | `BillingTab.tsx` — `individual_billing_enabled` | WORKING |
| Per-guest amount calculation | BillingTab "Recalculate All" | WORKING |
| Payment group creation (couples) | BillingTab — guest payment groups UI | WORKING |
| Admin "Record Payment" (manual/offline) | BillingTab modal | WORKING |
| Payment reminder scheduling | BillingTab — automated escalating reminders | WORKING |
| Per-guest Stripe PaymentIntent API | `POST /api/my-trip/[token]/guest/[guestToken]/create-payment` | WORKING |

### What's missing

| Feature | Status |
|---------|--------|
| **Guest-facing payment page** | NOT BUILT — `app/my-trip/[token]/guest/[guestToken]/pay/` directory exists but has no `page.tsx`. The API backend is complete; the UI for a guest to enter their card is not. |
| Group payment page | NOT VERIFIED — `app/my-trip/[token]/group/` exists but not confirmed |

### Shared tours (separate system)

Individual ticket purchases for shared/public tours are **fully working** — a completely separate flow at `app/shared-tours/` with its own Stripe integration, `shared_tour_schedules` and `shared_tour_tickets` tables. Not connected to the trip proposal system.

---

## 3. Invoicing & Payments

**Rating: PARTIALLY WORKING**

Two separate billing systems exist: (1) trip proposal deposits (working), and (2) post-tour hourly invoicing (partially working). They are independent systems.

### Trip proposal billing (WORKING)

| Step | File | Status |
|------|------|--------|
| Service line items define pricing | `PricingTab.tsx` | WORKING — flat, per_person, per_day |
| Deposit calculated from total | `trip-proposal.service.ts` | WORKING — default 50% |
| Customer pays deposit via Stripe | `app/trip-proposals/[proposalNumber]/pay/` | WORKING |
| Deposit receipt email | `trip-proposal-email.service.ts` — `sendDepositReceivedEmail()` | WORKING — customer + staff copies |
| Balance tracking | BillingTab shows amount_paid vs total | WORKING |
| Payment reminders (automated) | `payment_reminders` table + BillingTab UI | WORKING — friendly/firm/urgent/final escalation |

### Post-tour hourly invoicing (PARTIALLY WORKING)

| Step | File | Status |
|------|------|--------|
| Admin reviews completed tours | `app/admin/invoices/page.tsx` | WORKING — shows tours 48+ hours past |
| Approve invoice + email customer | `POST /api/admin/approve-invoice/[booking_id]` | WORKING — creates `invoices` record, emails payment link |
| Customer payment page | `/payment/final/[bookingId]` | UNCERTAIN — directory exists, page not verified |
| Stripe PaymentIntent at invoice time | — | NOT BUILT — invoice email sends a link but no PI is pre-created |

### Key gap

The `payments` table's `trip_proposal_id` column may not exist — the confirm-payment route has a warning comment at line ~101 noting the schema may not have this column. Payments still work (the route catches the error gracefully), but payment-to-proposal linkage may be incomplete.

---

## 4. Lunch/Meal Ordering

**Rating: PARTIALLY WORKING**

The backend is sophisticated and complete. The admin UI has partial support. The guest-facing ordering UI is not verified.

### What's built

| Component | File | Status |
|-----------|------|--------|
| Restaurant stop type in proposals | `components/trip-proposals/types.ts` — `STOP_TYPES` includes `restaurant` | WORKING |
| Restaurant dropdown in day builder | `components/trip-proposals/StopCard.tsx` | WORKING — populated from `restaurants` table |
| Lunch supplier service | `lib/services/lunch-supplier.service.ts` | WORKING — full CRUD for suppliers, menus, menu items, orders |
| Order lifecycle | Service supports: create → submit → send to supplier → confirm → cancel | WORKING |
| Cutoff enforcement | Calculates deadline based on supplier config + party size | WORKING |
| Supplier notification | `lib/services/supplier-adapters/email-adapter.ts` | WORKING — emails order to supplier |
| Tax calculation | Hardcoded WA rate (9.1%) | WORKING |
| Admin lunch management APIs | `app/api/admin/lunch-suppliers/`, `app/api/admin/lunch-orders/` | EXISTS |
| Database tables | `lunch_suppliers`, `lunch_menus`, `lunch_menu_items`, `proposal_lunch_orders` (migration 085) | WORKING |

### What's missing

| Feature | Status |
|---------|--------|
| Per-guest meal selection UI | NOT VERIFIED — not in DaysTab/StopCard; may exist in `/my-trip/[token]` client portal |
| `restaurants` table migration | NOT FOUND — no `CREATE TABLE restaurants` in any migration file. Table must exist from pre-migration-tracking era or it's missing |

---

## 5. Calendar

**Rating: WORKING**

### What's shown

The admin calendar at `app/admin/calendar/page.tsx` displays:

| Data Type | Source | Visual |
|-----------|--------|--------|
| Confirmed bookings | `bookings` table via `/api/admin/calendar` | Solid-colored cells (green/yellow/blue/red by status) |
| Tentative proposals | `proposals` table via `/api/admin/calendar/events` | Blue dashed border |
| Corporate requests | `corporate_requests` table | Purple dashed border |
| Reservations | `reservations` table | Amber dashed border |
| Vehicle availability blocks | `vehicle_availability_blocks` table | Maintenance/blackout/hold markers |
| Compliance alerts | Driver + vehicle compliance checks | Red dot badges on cells, severity banner at top |
| Capacity | Calculated from vehicles/seats | Fill bar per day, "FULL" badge when no vehicles available |
| Conflicts | Booking + tentative on same date | Lightning bolt badge |

### Additional features

- **Filters:** by status, driver, vehicle
- **Quick Availability Checker:** single-date lookup panel
- **iCal feeds:** `GET /api/calendar/feed/bookings`, `/driver/[id]`, `/all` — real `.ics` generation with token auth (`CALENDAR_FEED_SECRET` required)

### What's not working

| Feature | Status |
|---------|--------|
| Google Calendar sync | NOT WORKING — `google-calendar-sync.service.ts` exists but requires local credential files (`scripts/import/credentials.json`, `token.json`). No cron job or trigger calls it. Inert. |

---

## 6. Driver Operations

**Rating: PARTIALLY WORKING**

The service layer and API routes are solid. The driver-portal pages work for the dashboard and schedule. Inspections and time-clock have auth/identity bugs.

### What works

| Feature | File | Status |
|---------|------|--------|
| Driver portal dashboard | `app/driver-portal/dashboard/page.tsx` | WORKING — proper session auth, real API calls to `/api/driver/tours` |
| Driver portal schedule | `app/driver-portal/schedule/page.tsx` | WORKING — monthly calendar of assigned tours |
| Pre-trip inspection form | `app/inspections/pre-trip/page.tsx` | WORKING — server-rendered, session-authenticated |
| Post-trip inspection form | `app/inspections/post-trip/page.tsx` | WORKING — fetches today's pre-trip mileage |
| Inspection service | `lib/services/inspection.service.ts` | WORKING — blocks duplicates, critical defects mark vehicle out-of-service |
| Inspection API routes | `app/api/inspections/pre-trip/`, `post-trip/`, `dvir/`, `history/`, `quick/` | WORKING — CSRF + auth + Zod |
| Timecard service | `lib/services/timecard.service.ts` | WORKING — clock-in/out, prevents doubles, checks vehicle not in use |
| Database tables | `inspections`, `time_cards`, `break_records`, `driver_status_logs`, `mileage_logs` (migration 076) | EXISTS |

### What's broken

| Feature | File | Issue |
|---------|------|-------|
| Time-clock clock-in page | `app/time-clock/clock-in/page.tsx` | **NO AUTH** — driver is selected from a dropdown, not derived from session. Anyone can clock in as any driver. |
| Time-clock dashboard | `app/time-clock/dashboard/page.tsx` | **HARDCODES `driverId = 1`** — broken for all other drivers |
| Legacy driver page | `app/driver/page.tsx` | **HARDCODES `driverId = 1`** — broken for all other drivers |

---

## 7. Vehicle & Driver Documents

**Rating: PARTIALLY WORKING**

The database schema and compliance checking logic are production-quality. The upload UI is a stub. Admin visibility of document status doesn't exist.

### What's built

| Component | File | Status |
|-----------|------|--------|
| `driver_documents` table | Migration `047-driver-qualification-files.sql` | WORKING — full schema with `document_url`, `expiry_date`, `verified`, audit trail |
| DQ file tracking columns | 30+ columns added to `users` table (migration 047) | WORKING — `medical_cert_expiry`, `license_expiry`, `mvr_check_date`, `drug_test_date`, etc. |
| `driver_compliance_status` view | Migration 047 | WORKING — per-driver overall status with per-field valid/expiring_soon/expired/missing |
| `expiring_documents_alert` view | Migration 047 | WORKING — everything expiring within 60 days |
| Auto-complete trigger | `check_dq_file_complete()` function + trigger | WORKING — updates `dq_file_complete` when documents change |
| Compliance check service | `lib/services/compliance.service.ts` | WORKING — checks driver, vehicle, and HOS compliance. FMCSA 49 CFR 395.5 limits enforced |
| Compliance notification cron | `app/api/cron/compliance/route.ts` + `compliance-notification.service.ts` | PARTIALLY WORKING — sends threshold emails at 40/20/10/5/1/0 days, but only checks `license_expiry` and `medical_cert_expiry`. Does NOT check MVR, drug test, background check, or `driver_documents.expiry_date` |

### What's not built

| Feature | File | Status |
|---------|------|--------|
| Driver portal document upload | `app/driver-portal/documents/page.tsx` | **STUB** — hardcoded fake document list, upload handler calls `alert('Coming soon!')` |
| Admin document status view | `app/admin/users/page.tsx` | **NOT BUILT** — shows name/email/active only. The `driver_compliance_status` DB view exists but nothing queries it in the admin UI |

---

## 8. Partner Portal

**Rating: PARTIALLY WORKING**

The login, registration, dashboard, and profile flows work. Hotel partner tour booking works. The underlying `partner_profiles` table creation is not found in any migration file — it may exist from a pre-tracking-era SQL file or be missing entirely.

### What works

| Feature | File | Status |
|---------|------|--------|
| Partner login | `app/partner-portal/login/page.tsx` → `POST /api/partner/auth/login` | WORKING — JWT + HttpOnly cookie |
| Invite-only registration | `app/partner-portal/register/page.tsx` → token validation | WORKING |
| Partner setup (password) | `app/partner-setup/page.tsx` → `POST /api/partner/setup` | WORKING |
| Partner dashboard | `app/partner-portal/dashboard/page.tsx` → `GET /api/partner/dashboard` | WORKING — profile completion journey, view/AI stats |
| Partner profile editing | `app/partner-portal/profile/page.tsx` → `GET/PUT /api/partner/profile` | WORKING |
| Partner listing/story/tips | `app/partner-portal/listing/`, `story/`, `tips/` pages | EXISTS |
| Hotel partner shared tours | `app/partner-portal/shared-tours/` | WORKING — separate auth path for hotel partners |
| Admin partner management | `app/admin/partners/page.tsx` → `GET /api/admin/partners` | WORKING — list, filter by status, invite |
| Admin invite flow | `app/admin/partners/invite/page.tsx` | WORKING — generates token, creates user + partner_profiles row |
| Partner service | `lib/services/partner.service.ts` | WORKING — full CRUD, invitation, setup completion |

### Risk

| Issue | Detail |
|-------|--------|
| `partner_profiles` table | No `CREATE TABLE partner_profiles` found in any of the 78 migration files. Referenced in migrations 043, 059 as FK targets. If this table was never created, the entire partner portal will fail with "relation does not exist." It likely exists from a pre-migration-tracking SQL file. |

---

## 9. Public Winery Directory

**Rating: WORKING (but empty by default)**

### How it works

| Component | File | Detail |
|-----------|------|--------|
| Public listing page | `app/(public)/wineries/page.tsx` | Server component, ISR (1-hour revalidate) |
| Data source | `lib/services/winery.service.ts` → `getVerified()` | Queries `wineries WHERE verified = true AND is_active = true` |
| API route (client-side) | `app/api/wineries/route.ts` | Redis-cached (5 min), calls `wineryService.getAll()` |
| Individual winery page | `app/(public)/wineries/[slug]/page.tsx` | SSG with `generateStaticParams`, full detail view |
| Extended data service | `lib/services/wine-directory.service.ts` | Wines, winery content, people, FAQs, events — full-text search |

### Connection to partner data

YES — directly connected. The `wineries` table has a `verified` column (migration 043). Partners update content via `winery_content` and `winery_insider_tips` tables through the partner portal. The partner dashboard tracks completion by querying those same tables.

### Why it may appear empty

Only wineries with `verified = true` appear on the public page. If no partner has verified their winery profile, the directory shows the empty state: "Our curated winery directory is coming soon." The winery data itself exists (56+ slugs confirmed in SSG params) but `verified` flag is the gate.

---

## 10. Public Events Page

**Rating: WORKING (but content-dependent)**

### How it works

| Component | File | Detail |
|-----------|------|--------|
| Public listing page | `app/(public)/events/page.tsx` | Server component, `force-dynamic`, full filtering (category, search, free/paid), pagination (12/page), JSON-LD schema |
| Events service | `lib/services/events.service.ts` | `listPublished()`, `getFeatured()`, `getUpcoming()`, `getByCategory()`, `getCategories()` + full admin CRUD + recurring events system |
| Categories table | `event_categories` (migration 080) | SEEDED with 12 categories: Wine & Spirits, Festivals, Live Music, Food & Dining, Art & Culture, etc. |
| Events table | `events` (migration 080) | Full schema — title, slug, dates, venue, pricing, organizer, status, featured flag, view/click analytics |
| Recurring events | Migration 084 | `parent_event_id`, `is_recurring`, `recurrence_rule`, `is_instance_override` |
| Admin event management | `app/admin/events/page.tsx` | Full CRUD, status filter, recurring series "Hide instances" toggle, Publish/Cancel/Delete |
| Create event | `app/admin/events/new/` | EXISTS |

### Why it may appear empty

Events must be created manually by admins. No seed data exists in migrations. The public page gracefully shows: "We're building out our events calendar."

---

## 11. Marketing Automation

**Rating: PARTIALLY WORKING**

The marketing suite is the most extensive module in the admin portal. 8 of 10 sub-modules are fully functional with real data. 2 are scaffolded with hardcoded mock data.

### Fully functional (real data, working APIs)

| Module | Page | Key Service | Status |
|--------|------|-------------|--------|
| Marketing Hub | `app/admin/marketing/page.tsx` | `GET /api/admin/marketing/metrics` | WORKING — real aggregate counts |
| Social Media Scheduler | `marketing/social/page.tsx` | `buffer.service.ts` | WORKING — full CRUD, calendar/list views, Buffer integration |
| Campaigns | `marketing/campaigns/page.tsx` | `/api/admin/marketing/campaigns` | WORKING — create, approve, cancel, AI content generation |
| Competitors | `marketing/competitors/page.tsx` | `competitor-monitoring.service.ts` | WORKING — full monitoring, change workflow, comparison, advantages |
| Marketing Leads | `marketing/leads/page.tsx` | `/api/admin/marketing/leads` | WORKING — pipeline, filters, add modal |
| SEO Dashboard | `marketing/seo/page.tsx` | `search-console.service.ts` | WORKING — real Search Console data (requires Google OAuth setup) |
| AI Content Generator | `marketing/ai-generator/page.tsx` | Anthropic API | WORKING — live Claude calls, schedule output to social posts |
| Weekly Strategy | `marketing/strategy/page.tsx` | `social-intelligence.service.ts` | WORKING — AI-generated weekly strategies with full context gathering |

### Scaffolded (mock data, no backend)

| Module | Page | Issue |
|--------|------|-------|
| Email Campaigns | `marketing/email/page.tsx` | Campaigns list populated via `setTimeout` with hardcoded data. Stats ("3,150 subscribers") are static strings. Create modal has no submit handler. |
| Content Calendar | `marketing/calendar/page.tsx` | 8 hardcoded content items via `setTimeout`. Add Content modal collects input but submits nowhere. |

### Cron jobs (all 9 functional)

| Cron | Schedule | What it does |
|------|----------|-------------|
| `competitor-check` | Mon/Wed/Fri 8am | Fetches competitor pages, diffs content, creates change records |
| `publish-social-posts` | Daily 4pm | Publishes scheduled posts to Buffer |
| `sync-post-metrics` | Daily 3pm | Pulls engagement from Buffer, categorizes uncategorized posts via AI |
| `weekly-marketing-report` | Monday 4pm | Aggregates 7-day metrics, generates AI narrative, emails report |
| `sync-search-console` | Daily 1pm | Fetches Google Search Console data, updates blog performance |
| `seasonal-content-refresh` | 1st of month 5pm | AI analysis of 13 public pages for stale/seasonal content |
| `trending-topics` | Monday 3pm | AI-generated trending wine-tourism topics |
| `weekly-strategy` | Monday 6pm | Full AI strategy with daily post recommendations |
| `sync-campaign-performance` | Daily 5pm | Joins campaign items to social posts for engagement tracking |

### Not audited

`marketing/analytics/`, `marketing/blog/`, `marketing/ab-testing/`, `marketing/suggestions/`, `marketing/settings/` — directories exist but were not traced in this audit.

---

## Overall Status Matrix

| # | Workflow | Rating | Summary |
|---|----------|--------|---------|
| 1 | Lead → Proposal → Booking | **WORKING** | Complete end-to-end with real Stripe payments |
| 2 | Guest Registration + Individual Deposits | **PARTIALLY WORKING** | Registration and admin billing work; guest payment page not built |
| 3 | Invoicing & Payments | **PARTIALLY WORKING** | Proposal deposits work fully; hourly invoice payment page uncertain |
| 4 | Lunch/Meal Ordering | **PARTIALLY WORKING** | Backend complete; restaurant stop works in proposals; guest-facing ordering UI unverified |
| 5 | Calendar | **WORKING** | Full month view with bookings, proposals, compliance, capacity |
| 6 | Driver Operations | **PARTIALLY WORKING** | Portal and inspections work; time-clock has no auth and hardcoded driver IDs |
| 7 | Vehicle & Driver Documents | **PARTIALLY WORKING** | Schema and compliance logic are production-quality; upload UI is a stub; admin view doesn't show document status |
| 8 | Partner Portal | **PARTIALLY WORKING** | Login/register/dashboard/profile work; `partner_profiles` table migration not found (risk) |
| 9 | Public Winery Directory | **WORKING** | Fully functional but shows only `verified` wineries — may appear empty |
| 10 | Public Events Page | **WORKING** | Fully functional with categories seeded — empty until admins create events |
| 11 | Marketing Automation | **PARTIALLY WORKING** | 8/10 modules functional with real data; Email Campaigns and Content Calendar are scaffolded |

---

## Top 5 Issues to Fix (by impact)

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| 1 | **Guest payment page not built** — API exists at `/api/my-trip/[token]/guest/[guestToken]/create-payment` but no `page.tsx` for the guest to enter their card | Blocks individual guest payments for multi-day trips | Medium |
| 2 | **Time-clock has no authentication** — any driver can clock in as any other driver from the dropdown | Security/compliance violation for FMCSA records | Small |
| 3 | **Time-clock dashboard hardcodes `driverId = 1`** — broken for all other drivers | Blocks driver self-service | Small |
| 4 | **Driver document upload is a stub** — `alert('Coming soon!')` on file select | Blocks DQ file digitization | Medium |
| 5 | **`partner_profiles` table creation not in migrations** — if table doesn't exist in production, entire partner portal fails | Could be silent production failure | Small (verify + add migration if needed) |

---

*Generated by code trace audit. All file paths are relative to project root (`/Users/temp/walla-walla-final/`). Ratings based on whether a real user could complete the workflow today, not on code quality.*
