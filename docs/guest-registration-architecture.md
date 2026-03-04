# Guest Registration & Lunch Ordering — Architecture Document

**Date:** March 4, 2026
**Method:** Full codebase audit → gap analysis → architecture plan
**Scope:** Curated trip registration, shared tour registration, magic-link auth, guest portal, lunch ordering

---

## Table of Contents

1. [Phase 1 — Existing Code Inventory](#phase-1--existing-code-inventory)
2. [Phase 2 — Gap Analysis](#phase-2--gap-analysis)
3. [Phase 3 — Architecture Plan](#phase-3--architecture-plan)

---

## Phase 1 — Existing Code Inventory

### 1.1 Guest Registration (Curated Trips)

#### Join Page — Guest Self-Registration
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `app/my-trip/[token]/join/page.tsx` | 270 | **WORKING** | KEEP — extend with deposit payment |

**What it does:** Public-facing registration page. Guests enter name, email, phone. Validates capacity, rejects disposable emails, supports auto-approve vs manual approval. Returns `guest_access_token` for portal access.

**How it's accessed:** Shareable link `/my-trip/{access_token}/join`

#### Join API
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `app/api/my-trip/[token]/join/route.ts` | 183 | **WORKING** | EXTEND — add deposit creation after registration |

**What it does:** GET returns trip info (capacity, pricing, guest count). POST creates guest record with Zod validation, duplicate email check, capacity enforcement. Rate-limited (10/hr/IP), CSRF-protected.

#### Guest Identity System
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `hooks/useGuestIdentity.ts` | 150 | **WORKING** | KEEP |
| `components/my-trip/GuestRegistrationGate.tsx` | 150 | **WORKING** | KEEP |

**What they do:** `useGuestIdentity` reads `?guest={token}` from URL, persists to localStorage, resolves guest details via API. `GuestRegistrationGate` guards portal pages, shows inline registration if needed.

#### Admin Guest Management
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `components/trip-proposals/GuestsTab.tsx` | 130 | **WORKING** | KEEP |
| `app/admin/trip-proposals/[id]/components/BillingTab.tsx` | 527 | **WORKING** | KEEP |

**What they do:** GuestsTab — admin adds/edits/removes guests (name, email, phone, dietary). BillingTab — toggles individual billing, sets payment deadline, per-guest amount management (sponsored, override, manual payment recording), payment groups (couples), automated escalating reminder schedule (friendly → firm → urgent → final).

#### Admin Guest API Routes
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `app/api/admin/trip-proposals/[id]/guests/route.ts` | 58 | **WORKING** | KEEP |
| `app/api/admin/trip-proposals/[id]/guests/[guestId]/route.ts` | 119 | **WORKING** | KEEP |
| `app/api/admin/trip-proposals/[id]/guests/[guestId]/billing/route.ts` | 52 | **WORKING** | KEEP |
| `app/api/admin/trip-proposals/[id]/guests/[guestId]/record-payment/route.ts` | 41 | **WORKING** | KEEP |
| `app/api/admin/trip-proposals/[id]/payment-groups/route.ts` | 60 | **WORKING** | KEEP |

---

### 1.2 Guest Payment System

#### Individual Guest Payment
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `app/my-trip/[token]/guest/[guestToken]/pay/page.tsx` | 197 | **WORKING** | KEEP |
| `app/my-trip/[token]/guest/[guestToken]/pay/success/page.tsx` | 33 | **WORKING** | KEEP |
| `app/api/my-trip/[token]/guest/[guestToken]/create-payment/route.ts` | 108 | **WORKING** | KEEP |
| `app/api/my-trip/[token]/guest/[guestToken]/confirm-payment/route.ts` | 121 | **WORKING** | KEEP |
| `app/api/my-trip/[token]/guest/[guestToken]/payment-status/route.ts` | 53 | **WORKING** | KEEP |

**What it does:** Full Stripe PaymentElement integration. Loads payment status, detects already-paid/sponsored/zero-balance. Creates PaymentIntent with brand-aware keys. Shows amount breakdown (share, paid, remaining). Idempotent confirmation with `ON CONFLICT` duplicate prevention. Race-condition safe.

#### Group Payment (Couples)
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `app/my-trip/[token]/group/[groupToken]/page.tsx` | 211 | **WORKING** | KEEP |
| `app/api/my-trip/[token]/group/[groupToken]/create-payment/route.ts` | 126 | **WORKING** | KEEP |
| `app/api/my-trip/[token]/group/[groupToken]/members/route.ts` | 54 | **WORKING** | KEEP |

**What it does:** Two-step flow — select unpaid members via checkbox, then combined Stripe payment. Single PaymentIntent for multiple guests. Admin creates groups via BillingTab.

#### Proposal Owner Deposit Payment
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `app/my-trip/[token]/pay/page.tsx` | 300 | **WORKING** | KEEP |
| `app/my-trip/[token]/pay/success/page.tsx` | 250 | **WORKING** | KEEP |
| `app/api/my-trip/[token]/create-payment/route.ts` | 132 | **WORKING** | KEEP |
| `app/api/my-trip/[token]/confirm-payment/route.ts` | 158 | **WORKING** | KEEP |

**What it does:** 50% deposit payment after accepting proposal. Brand-aware Stripe keys. Unlocks `active_planning` phase on success. Receipt email sent. Idempotent.

#### Payment Reminders
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `lib/services/payment-reminder.service.ts` | ~470 | **WORKING** | KEEP |
| `app/api/cron/send-reminders/route.ts` | — | **WORKING** | KEEP |

**What it does:** Auto-schedules 5 escalating reminders (30/20/10/5/1 days before deadline). Atomic processing with `FOR UPDATE SKIP LOCKED`. Re-queries guest payment status at send time. Pause/resume per guest or per proposal. CAN-SPAM compliant with unsubscribe.

---

### 1.3 Guest Portal

#### Portal Layout & Pages
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `app/my-trip/[token]/MyTripClientLayout.tsx` | 700+ | **WORKING** | KEEP |
| `app/my-trip/[token]/layout.tsx` | 50 | **WORKING** | KEEP |
| `app/my-trip/[token]/page.tsx` | 150 | **WORKING** | KEEP |
| `app/my-trip/[token]/guests/page.tsx` | 200 | **WORKING** | KEEP |
| `app/my-trip/[token]/lunch/page.tsx` | 436 | **WORKING** | KEEP |
| `app/my-trip/[token]/notes/page.tsx` | 150 | **WORKING** | KEEP |
| `lib/contexts/proposal-context.tsx` | 35 | **WORKING** | KEEP |

**What it does:** Full portal with tabs — Itinerary (live, accept/decline, deposit payment), Lunch (coordinator or individual ordering), Guests (view roster, edit dietary/accessibility), Notes (messaging thread with 5s polling). Realtime subscription for proposal changes. Invite link sharing for guests.

**Phases:** proposal → active_planning → finalized. Tab visibility gated by phase.

#### Portal API Routes
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `app/api/my-trip/[token]/route.ts` | 101 | **WORKING** | KEEP |
| `app/api/my-trip/[token]/accept/route.ts` | 70 | **WORKING** | KEEP |
| `app/api/my-trip/[token]/decline/route.ts` | 53 | **WORKING** | KEEP |
| `app/api/my-trip/[token]/guests/resolve/route.ts` | 77 | **WORKING** | KEEP |
| `app/api/my-trip/[token]/guests/[guestId]/register/route.ts` | 73 | **WORKING** | KEEP |
| `app/api/my-trip/[token]/guests/[guestId]/route.ts` | 108 | **WORKING** | KEEP |

---

### 1.4 Shared Tours System

#### Public Pages
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `app/shared-tours/page.tsx` | 389 | **WORKING** | KEEP |
| `app/shared-tours/[tour_id]/book/page.tsx` | 905 | **WORKING** | KEEP |
| `app/shared-tours/[tour_id]/book/success/page.tsx` | 95 | **WORKING** | KEEP |
| `app/shared-tours/pay/[ticket_id]/page.tsx` | 450+ | **WORKING** | KEEP |
| `app/shared-tours/pay/[ticket_id]/success/page.tsx` | 95 | **WORKING** | KEEP |

**What it does:** Public tour calendar with availability. Multi-step booking: select tickets → enter details → review → Stripe payment. Hotel partner payment link flow. Per-person pricing ($95 base, $115 with lunch).

#### Admin & Partner Pages
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `app/admin/shared-tours/page.tsx` | 1,395 | **WORKING** | KEEP |
| `app/admin/shared-tours/[tour_id]/page.tsx` | 300+ | **WORKING** | KEEP |
| `app/admin/shared-tours/[tour_id]/manifest/page.tsx` | 150+ | **WORKING** | KEEP |
| `app/partner-portal/shared-tours/page.tsx` | 150+ | **WORKING** | KEEP |
| `app/partner-portal/shared-tours/book/[tour_id]/page.tsx` | 300+ | **WORKING** | KEEP |

#### Service & API Routes
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `lib/services/shared-tour.service.ts` | 1,538 | **WORKING** | KEEP |
| `app/api/shared-tours/route.ts` | 31 | **WORKING** | KEEP |
| `app/api/shared-tours/[tour_id]/route.ts` | 26 | **WORKING** | KEEP |
| `app/api/shared-tours/[tour_id]/availability/route.ts` | 23 | **WORKING** | KEEP |
| `app/api/shared-tours/[tour_id]/price/route.ts` | 24 | **WORKING** | KEEP |
| `app/api/shared-tours/tickets/route.ts` | 87 | **WORKING** | KEEP |
| `app/api/shared-tours/tickets/[ticket_id]/payment-intent/route.ts` | 97 | **WORKING** | KEEP |
| 7 admin routes, 5 partner routes | — | **WORKING** | KEEP |

#### Database (from migrations 040, 064, 066, 067)
- `shared_tours` — schedule, pricing, capacity, vehicle, status
- `shared_tours_tickets` — bookings per guest, payment tracking, hotel partner ref
- `shared_tour_presets` — templates for quick tour creation
- `hotel_partners` — hotel integration table
- DB functions: `check_shared_tour_availability()`, `calculate_ticket_price()`, `generate_ticket_number()`

**Key pattern:** Shared tours have their OWN ticket/payment system completely separate from trip proposals. No `trip_proposal_guests` linkage. Different Stripe flow (ticket-based, not guest-share-based).

---

### 1.5 Lunch Ordering System

#### Service Layer
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `lib/services/lunch-supplier.service.ts` | 626 | **WORKING** | EXTEND — add saved menu templates |
| `lib/types/lunch-supplier.ts` | 212 | **WORKING** | EXTEND — add menu template types |

**Methods:** Full CRUD for suppliers, menus, menu items. Order management (create → submit → send_to_supplier → confirm). Cutoff enforcement (48h default, 72h for 8+ guests). Tax calculation (9.1% WA). Supplier email notification via adapter.

#### Guest-Facing Lunch Pages & Components
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `app/my-trip/[token]/lunch/page.tsx` | 436 | **WORKING** | KEEP |
| `components/my-trip/LunchOrderForm.tsx` | 492 | **WORKING** | KEEP |
| `components/my-trip/IndividualLunchOrderForm.tsx` | 366 | **WORKING** | KEEP |

**What it does:** Displays lunch orders per day. Two ordering modes — coordinator (all guests at once) or individual (each guest submits their own). Cutoff countdown timer. Dietary tag badges. Live subtotal calculation.

#### Lunch API Routes
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `app/api/my-trip/[token]/lunch/route.ts` | 110 | **WORKING** | KEEP |
| `app/api/my-trip/[token]/lunch/individual/route.ts` | 160 | **WORKING** | KEEP |
| `app/api/admin/lunch-suppliers/route.ts` | 61 | **WORKING** | KEEP |
| `app/api/admin/lunch-suppliers/[id]/menus/route.ts` | 120 | **WORKING** | KEEP |
| `app/api/admin/lunch-orders/[orderId]/route.ts` | 58 | **WORKING** | KEEP |

#### Supplier Notification
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `lib/services/supplier-adapters/email-adapter.ts` | 155 | **WORKING** | KEEP |

#### Database Tables (migration 085)
- `lunch_suppliers` — vendor config (cutoff hours, closed days, contact, order method)
- `lunch_menus` — menu metadata with validity dates
- `lunch_menu_items` — items with category, price, dietary tags, availability, sort order
- `proposal_lunch_orders` — per-proposal orders with JSONB guest_orders, status, totals
- Column `ordering_mode` added in migration 087: 'coordinator' | 'individual'

#### Legacy System (separate, for old bookings)
| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `app/client-portal/[booking_id]/lunch/page.tsx` | 180 | PARTIAL | REPLACE — legacy, uses static JSON menus |
| `lib/menus.ts` | 73 | WORKING | REPLACE — static JSON menus (Wine Country Store, Memo's Tacos) |
| `lib/services/restaurant.service.ts` | 24 | WORKING | REPLACE — minimal, queries `restaurants` table (no migration found) |

---

### 1.6 CRM Integration

| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `lib/services/crm-sync.service.ts` | — | **WORKING** | EXTEND — sync guest registrations |
| `lib/services/crm-task-automation.service.ts` | — | **WORKING** | KEEP |

**Database:** `crm_contacts` table (migration 054) — email (unique), name, phone, lifecycle_stage, lead_score, lead_temperature, dietary_restrictions, accessibility_needs, stripe_customer_id, marketing consent flags, follow-up dates.

**Sync methods:** `syncCustomerToCRM()`, `syncTripProposalToCRM()`, `syncBookingToCRM()`, `logActivity()`. Trigger events auto-create CRM tasks.

---

### 1.7 Stripe Integration

| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `lib/stripe.ts` | ~170 | **WORKING** | KEEP |
| `lib/stripe-brands.ts` | ~65 | **WORKING** | KEEP |

**Brand-aware keys:** `getBrandStripeClient(brandId)` returns separate Stripe instances for WWT (brand 1) and NW Touring (brand 3). Fallback to default env vars.

**Payment patterns used:**
- Trip proposal deposits: PaymentIntent → Stripe Elements → confirm → webhook
- Per-guest billing: PaymentIntent per guest → confirm → update amount_paid
- Group billing: Single PaymentIntent for multiple guests
- Shared tours: PaymentIntent per ticket → confirm → mark paid
- All use idempotency keys to prevent duplicate charges

---

### 1.8 Token & Auth Patterns

| Pattern | Where Used | Format | Generation |
|---------|------------|--------|------------|
| Proposal access token | `/my-trip/[token]/` routes | 64-char alphanumeric | `generateSecureString(64)` |
| Guest access token | Per-guest portal access | UUID v4 | PostgreSQL `gen_random_uuid()` |
| Group access token | Couple/group payment links | UUID v4 | PostgreSQL `gen_random_uuid()` |
| Partner invite token | Partner setup flow | 64-char hex | `crypto.randomBytes(32).toString('hex')` |
| Share code (legacy) | Magic link for `trips` table | Alphanumeric | Legacy system |

**Magic link endpoint:** `POST /api/trips/magic-link` — sends email with link to `/trips/{share_code}`. Targets the legacy `trips` table (NOT `trip_proposals`). This is a **LEGACY PATTERN** — the trip proposals system uses access tokens, not magic links.

**Current guest auth model:** Token-in-URL (`?guest={token}`) with localStorage persistence via `useGuestIdentity` hook. No passwords, no sessions. Token acts as bearer credential.

---

### 1.9 Email System

| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `lib/email.ts` | ~100+ | **WORKING** | EXTEND — add guest portal magic link template |
| `lib/services/trip-proposal-email.service.ts` | ~470 | **WORKING** | EXTEND — add registration confirmation email |
| `lib/services/payment-reminder.service.ts` | ~470 | **WORKING** | KEEP |

**Provider:** Resend API with 3-retry exponential backoff. CAN-SPAM compliant (unsubscribe links). Dark mode support. Idempotency via `email_logs` table.

**Email types already built:** proposal_sent, proposal_accepted, deposit_received, payment_reminder_friendly/firm/urgent/final.

---

## Phase 2 — Gap Analysis

### Requirement 1: Curated Trips — Private Registration + Deposit

| Sub-requirement | Status | Detail |
|-----------------|--------|--------|
| Private registration link per trip | **EXISTS** at `app/my-trip/[token]/join/page.tsx` | Shareable link, capacity check, auto/manual approval |
| Guest registers (name/email/phone) | **EXISTS** | Zod-validated, disposable email rejection |
| Pay deposit via Stripe | **PARTIALLY EXISTS** — needs specific change | The join page does NOT collect payment. Deposit payment exists at `/my-trip/[token]/guest/[guestToken]/pay/` but is only triggered via BillingTab after admin enables individual billing and calculates amounts. **Gap:** No self-service deposit-on-registration flow. |
| Get linked to trip in admin | **EXISTS** | Guest appears in GuestsTab and BillingTab immediately |
| View live itinerary after registration | **EXISTS** at `app/my-trip/[token]/page.tsx` | Full portal with realtime updates |
| Order lunch after registration | **EXISTS** at `app/my-trip/[token]/lunch/page.tsx` | Both coordinator and individual ordering modes |
| Receive group email updates | **PARTIALLY EXISTS** | Payment reminder emails work. No general group-announcement email feature (admin can't email all guests with a custom message). |
| Registration confirmation email | **NOT BUILT** | Join API creates the guest record but sends no confirmation email |

### Requirement 2: Shared Tours — Public Registration + Payment

| Sub-requirement | Status | Detail |
|-----------------|--------|--------|
| Public page with open spots | **EXISTS** at `app/shared-tours/page.tsx` | Tour calendar with availability |
| Register + pay to reserve | **EXISTS** at `app/shared-tours/[tour_id]/book/page.tsx` | Multi-step booking with Stripe |
| Same guest portal after | **NOT BUILT** | Shared tour guests have NO portal access. After booking, they receive a confirmation email and ticket number. No itinerary view, no lunch ordering, no messaging. Shared tours and trip proposals are completely separate systems with no data linkage. |

### Requirement 3: Auth — Magic Links (Persistent Guest Record)

| Sub-requirement | Status | Detail |
|-----------------|--------|--------|
| Email-based magic links (no passwords) | **PARTIALLY EXISTS** | Legacy `POST /api/trips/magic-link` exists for `trips` table. Trip proposals use token-in-URL (not magic link). No email-based re-authentication for returning guests. |
| Persistent guest record across trips | **NOT BUILT** | `trip_proposal_guests` records are per-proposal. No unified guest identity table. If a guest joins 3 trips, they have 3 separate records with no linkage. `crm_contacts` could serve as the persistent record but is not connected to guest auth. |
| Guest can return to portal without re-registering | **PARTIALLY EXISTS** | If guest has their `guest_access_token` in localStorage or URL, they can return. But if they lose it (new device, cleared cache), there's no way to re-authenticate. No "resend my link" flow. |

### Requirement 4: Lunch Ordering — Admin Menus + Guest Selection

| Sub-requirement | Status | Detail |
|-----------------|--------|--------|
| Admin creates reusable saved menus | **PARTIALLY EXISTS** | Admin can create suppliers and menus via API. But menus are per-supplier and there's no "saved menu template" concept — each menu is tied to a supplier and has validity dates. No admin UI for browsing/managing saved menus across suppliers. |
| Fixed menu options (not free-text) | **EXISTS** | `lunch_menu_items` table has structured items with category, name, price, dietary tags |
| Assigns menus to stops/days | **PARTIALLY EXISTS** | `proposal_lunch_orders` links to `trip_proposal_day_id` and `supplier_id`. But the StopCard doesn't have a "select lunch menu" picker — the lunch order is created separately from the itinerary stop. No direct stop → menu linkage in the UI. |
| Guests select their choices | **EXISTS** | Individual ordering mode with `IndividualLunchOrderForm.tsx` |
| Deadline enforcement | **EXISTS** | Cutoff calculation (48h default, 72h for 8+) in service. Countdown timer in UI. |
| Admin views aggregated orders | **PARTIALLY EXISTS** | Service has `getOrdersForProposal()`. But there's no dedicated admin page for viewing/managing lunch orders across proposals. Orders are visible in the guest portal but admin visibility is limited to the BillingTab and raw API. |

---

### Gap Summary

| Gap ID | Description | Severity | Effort |
|--------|-------------|----------|--------|
| G1 | **No deposit-on-registration** — guests register but payment is a separate admin-triggered step | High | Medium |
| G2 | **No registration confirmation email** — guest joins but gets no email | Medium | Small |
| G3 | **No shared tour → guest portal bridge** — shared tour guests can't access itinerary/lunch/messaging | High | Large |
| G4 | **No persistent guest identity** — guest records are per-proposal, no cross-trip identity | Medium | Medium |
| G5 | **No magic link re-authentication** — lost token = lost access, no "resend my link" | Medium | Small |
| G6 | **No group announcement emails** — admin can't email all guests with custom messages | Low | Small |
| G7 | **No saved menu templates** — menus tied to suppliers, no reusable template library | Medium | Medium |
| G8 | **No stop → menu linkage in UI** — admin creates lunch orders separately from itinerary stops | Low | Medium |
| G9 | **No admin lunch order dashboard** — no cross-proposal view of all lunch orders | Low | Medium |

---

## Phase 3 — Architecture Plan

### 3.1 Database Schema

#### New Tables

**`guest_profiles`** — Persistent guest identity across trips
```
guest_profiles
├── id                  SERIAL PRIMARY KEY
├── email               VARCHAR(255) UNIQUE NOT NULL  -- canonical identity
├── name                VARCHAR(255)
├── phone               VARCHAR(50)
├── dietary_restrictions TEXT
├── accessibility_needs  TEXT
├── crm_contact_id      INTEGER REFERENCES crm_contacts(id)  -- link to CRM
├── stripe_customer_id  VARCHAR(100)                          -- reusable Stripe customer
├── created_at          TIMESTAMPTZ DEFAULT NOW()
├── updated_at          TIMESTAMPTZ DEFAULT NOW()
```

**Why:** Solves G4. Guests who appear on multiple trips share one profile. CRM linkage enables lifecycle tracking. Stripe customer ID enables saved payment methods.

**`guest_magic_links`** — Token-based email re-authentication
```
guest_magic_links
├── id                  SERIAL PRIMARY KEY
├── guest_profile_id    INTEGER NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE
├── token               VARCHAR(64) UNIQUE NOT NULL   -- crypto.randomBytes(32).hex
├── expires_at          TIMESTAMPTZ NOT NULL           -- 24 hours from creation
├── used_at             TIMESTAMPTZ                    -- NULL until used
├── created_at          TIMESTAMPTZ DEFAULT NOW()
```

**Why:** Solves G5. Guest requests link via email, clicks token URL, gets redirected to portal with all their trips listed. Expires after 24h, single-use.

**`saved_menus`** — Reusable menu templates (not tied to supplier)
```
saved_menus
├── id                  SERIAL PRIMARY KEY
├── name                VARCHAR(255) NOT NULL   -- "Wine Country Store Lunch", "Memo's Tacos"
├── supplier_id         INTEGER REFERENCES lunch_suppliers(id)  -- optional supplier link
├── is_active           BOOLEAN DEFAULT TRUE
├── created_at          TIMESTAMPTZ DEFAULT NOW()
├── updated_at          TIMESTAMPTZ DEFAULT NOW()
```

**`saved_menu_items`** — Items within a saved menu template
```
saved_menu_items
├── id                  SERIAL PRIMARY KEY
├── saved_menu_id       INTEGER NOT NULL REFERENCES saved_menus(id) ON DELETE CASCADE
├── category            VARCHAR(100)            -- "Sandwiches", "Salads", "Beverages"
├── name                VARCHAR(255) NOT NULL
├── description         TEXT
├── price               DECIMAL(8,2) NOT NULL
├── dietary_tags        VARCHAR(30)[]           -- ARRAY: vegetarian, vegan, gf, df, nut_free, halal, kosher
├── is_available        BOOLEAN DEFAULT TRUE
├── sort_order          INTEGER DEFAULT 0
```

**Why:** Solves G7. Admin creates menus once, reuses across proposals. Menu items are fixed options with prices and dietary info. Separate from `lunch_menus` (which are supplier-specific and date-bound).

#### Modifications to Existing Tables

**`trip_proposal_guests`** — Add profile linkage
```sql
ALTER TABLE trip_proposal_guests
  ADD COLUMN IF NOT EXISTS guest_profile_id INTEGER REFERENCES guest_profiles(id);

CREATE INDEX IF NOT EXISTS idx_tpg_guest_profile ON trip_proposal_guests(guest_profile_id);
```

**`trip_proposals`** — Add registration config
```sql
ALTER TABLE trip_proposals
  ADD COLUMN IF NOT EXISTS registration_deposit_amount DECIMAL(10,2),     -- NULL = no deposit on registration
  ADD COLUMN IF NOT EXISTS registration_deposit_type VARCHAR(20) DEFAULT 'flat'
    CHECK (registration_deposit_type IN ('flat', 'per_person', 'percentage')),
  ADD COLUMN IF NOT EXISTS guest_approval_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS registration_open BOOLEAN DEFAULT TRUE;
```

**`trip_proposal_stops`** — Add menu linkage
```sql
ALTER TABLE trip_proposal_stops
  ADD COLUMN IF NOT EXISTS saved_menu_id INTEGER REFERENCES saved_menus(id);
```

**`shared_tours_tickets`** — Add profile linkage
```sql
ALTER TABLE shared_tours_tickets
  ADD COLUMN IF NOT EXISTS guest_profile_id INTEGER REFERENCES guest_profiles(id);
```

**`proposal_lunch_orders`** — Add saved menu reference
```sql
ALTER TABLE proposal_lunch_orders
  ADD COLUMN IF NOT EXISTS saved_menu_id INTEGER REFERENCES saved_menus(id);
```

#### Entity Relationship Summary

```
guest_profiles (1) ──── (N) trip_proposal_guests    (N) ──── (1) trip_proposals
       │                          │
       │                          │── (N) guest_payments
       │                          │── (N) payment_reminders
       │
       ├──── (N) shared_tours_tickets (N) ──── (1) shared_tours
       │
       ├──── (N) guest_magic_links
       │
       └──── (0..1) crm_contacts

saved_menus (1) ──── (N) saved_menu_items
     │
     ├──── (N) trip_proposal_stops      (stop → menu assignment)
     └──── (N) proposal_lunch_orders    (order → menu source)
```

---

### 3.2 API Routes

#### Existing Routes to Reuse (no changes needed)
- All `/api/my-trip/[token]/guest/[guestToken]/*` payment routes
- All `/api/my-trip/[token]/group/[groupToken]/*` routes
- All `/api/my-trip/[token]/lunch/*` routes
- All `/api/admin/trip-proposals/[id]/guests/*` routes
- All `/api/shared-tours/*` routes
- All `/api/admin/shared-tours/*` routes

#### Existing Routes to Extend

**`POST /api/my-trip/[token]/join`** — Add deposit creation
- After creating guest record, if `registration_deposit_amount` is set on proposal:
  - Create Stripe PaymentIntent
  - Return `client_secret` and `publishable_key` alongside guest record
  - Client-side redirects to inline payment step before showing portal
- Also: create/link `guest_profiles` record on registration
- Also: send registration confirmation email via Resend

#### New API Routes

**Guest Profile & Magic Link Auth**
| Route | Method | Purpose |
|-------|--------|---------|
| `POST /api/guest/request-link` | POST | Send magic link to email. Creates `guest_magic_links` record. Rate-limited (3/hr/email). |
| `GET /api/guest/verify/[token]` | GET | Validate magic link token. Returns guest profile + list of trips. Sets cookie or returns session token. |
| `GET /api/guest/profile` | GET | Get current guest's profile (trips, payment history). Requires valid guest session. |
| `PATCH /api/guest/profile` | PATCH | Update guest profile (name, phone, dietary, accessibility). |

**Saved Menus (Admin)**
| Route | Method | Purpose |
|-------|--------|---------|
| `GET /api/admin/saved-menus` | GET | List all saved menus |
| `POST /api/admin/saved-menus` | POST | Create saved menu with items |
| `GET /api/admin/saved-menus/[id]` | GET | Get menu with items |
| `PATCH /api/admin/saved-menus/[id]` | PATCH | Update menu metadata |
| `DELETE /api/admin/saved-menus/[id]` | DELETE | Deactivate saved menu |
| `POST /api/admin/saved-menus/[id]/items` | POST | Add item to menu |
| `PATCH /api/admin/saved-menus/[id]/items/[itemId]` | PATCH | Update item |
| `DELETE /api/admin/saved-menus/[id]/items/[itemId]` | DELETE | Remove item |

**Group Announcements (Admin)**
| Route | Method | Purpose |
|-------|--------|---------|
| `POST /api/admin/trip-proposals/[id]/announce` | POST | Send custom email to all registered guests on a proposal |

**Shared Tour → Portal Bridge**
| Route | Method | Purpose |
|-------|--------|---------|
| `POST /api/shared-tours/tickets/[ticket_id]/link-to-proposal` | POST | Admin links a shared tour ticket to a trip proposal guest record (creates one if needed) |

---

### 3.3 Frontend Pages

#### Existing Pages to Extend

**`app/my-trip/[token]/join/page.tsx`** — Add deposit payment step
- After successful registration, if deposit is configured:
  - Show Step 2 with Stripe PaymentElement (reuse existing `GuestPaymentForm` component pattern)
  - On payment success, redirect to portal with confirmation
  - If no deposit: current behavior (redirect to portal)

**`components/trip-proposals/StopCard.tsx`** — Add saved menu picker
- For restaurant-type stops: add dropdown "Select lunch menu" populated from `saved_menus`
- When menu selected, auto-create `proposal_lunch_order` linked to the day

**Admin proposal editor (`app/admin/trip-proposals/[id]/page.tsx`)** — No structural changes needed
- BillingTab already handles per-guest billing configuration
- New `registration_deposit_amount` field can be added to the existing DetailsTab or a new Settings section

#### New Pages

**`app/guest/page.tsx`** — Guest Hub (magic link landing)
- Shows all trips the guest is associated with (via `guest_profiles` → `trip_proposal_guests`)
- Also shows shared tour tickets
- Links to each trip's portal
- Profile editor (name, phone, dietary, accessibility)
- This is a NEW top-level page, not under `/my-trip/`

**`app/guest/login/page.tsx`** — Magic Link Request
- Simple form: enter email
- Sends magic link to all trips associated with that email
- Success message: "Check your email for your access link"

**`app/admin/saved-menus/page.tsx`** — Saved Menu Management
- List all saved menus
- Create/edit menus with item management
- Category grouping, dietary tag badges
- Preview mode
- Link to supplier if applicable

**`app/admin/lunch-orders/page.tsx`** — Lunch Order Dashboard (optional, low priority)
- Cross-proposal view of all lunch orders
- Filter by date, status, supplier
- Aggregated order counts and revenue

---

### 3.4 Integration Points

#### CRM Integration
- **On guest registration:** Call `crmSyncService.syncCustomerToCRM()` with guest data
- **On guest profile creation:** Create or update `crm_contacts` record, link via `guest_profiles.crm_contact_id`
- **On payment:** Log `payment_received` activity to CRM

#### Stripe Integration
- **Registration deposit:** Use existing `getBrandStripeClient(brandId)` pattern from guest payment routes
- **Guest profiles → Stripe customers:** When `guest_profiles.stripe_customer_id` is set, pass to PaymentIntent for saved payment methods (future enhancement)
- **No new Stripe patterns needed** — all existing patterns (PaymentIntent + Elements + confirm) are reused

#### Resend Email Integration
- **Registration confirmation:** New template `buildRegistrationConfirmationEmail()`
  - Includes: trip name, dates, portal link, next steps
  - Template follows existing pattern in `lib/email/templates/`
- **Magic link email:** New template `buildGuestMagicLinkEmail()`
  - Includes: list of trips, one-click link, 24h expiry note
- **Group announcement:** New template `buildGroupAnnouncementEmail()`
  - Admin-authored content, trip context header/footer

#### Existing Email Templates to Reuse
- Payment reminder templates (friendly/firm/urgent/final) — no changes
- Deposit received template — no changes
- All shared tour email templates — no changes

#### Realtime Integration
- Existing Supabase Realtime subscription on `proposal_lunch_orders` — no changes needed
- Guest portal already subscribes to proposal changes — no changes needed

---

### 3.5 Build Order

The work breaks into 4 independent tracks that can run in parallel across 4 Claude Code windows.

#### Track 1: Guest Profiles + Magic Links (Foundation)

**Must complete first — other tracks depend on `guest_profiles` table.**

| Step | What | Files |
|------|------|-------|
| 1a | Migration: Create `guest_profiles`, `guest_magic_links` tables | `migrations/NNN-guest-profiles.sql` |
| 1b | Migration: Add `guest_profile_id` to `trip_proposal_guests` and `shared_tours_tickets` | Same migration file |
| 1c | Service: `lib/services/guest-profile.service.ts` — CRUD, magic link generation/validation, profile merging | New service |
| 1d | API: `POST /api/guest/request-link`, `GET /api/guest/verify/[token]` | New routes |
| 1e | API: `GET/PATCH /api/guest/profile` | New routes |
| 1f | Page: `app/guest/login/page.tsx` — magic link request form | New page |
| 1g | Page: `app/guest/page.tsx` — guest hub showing all trips | New page |
| 1h | Backfill: Extend `POST /api/my-trip/[token]/join` to create/link guest profile | Edit existing route |
| 1i | CRM integration: Link guest_profiles to crm_contacts on creation | Edit `crm-sync.service.ts` |

**Estimated scope:** 1 migration, 1 service (~300 lines), 4 API routes, 2 pages

#### Track 2: Registration Deposit + Confirmation Email

**Can start after Track 1 step 1a (needs `guest_profiles` table).**

| Step | What | Files |
|------|------|-------|
| 2a | Migration: Add `registration_deposit_amount`, `registration_deposit_type`, `registration_open` to `trip_proposals` | `migrations/NNN-registration-config.sql` |
| 2b | Extend join page: Add Stripe PaymentElement step after registration when deposit configured | Edit `app/my-trip/[token]/join/page.tsx` |
| 2c | Extend join API: Create PaymentIntent on registration if deposit set | Edit `app/api/my-trip/[token]/join/route.ts` |
| 2d | New API: `POST /api/my-trip/[token]/join/confirm-payment` — confirm registration deposit | New route |
| 2e | Email template: `buildRegistrationConfirmationEmail()` | New template in `lib/email/templates/` |
| 2f | Send confirmation email from join API on successful registration | Edit join route |
| 2g | Admin UI: Add registration config fields to proposal editor (DetailsTab or new section) | Edit admin page |

**Estimated scope:** 1 migration, 1 email template, 1 new route, 3 file edits

#### Track 3: Saved Menus + Stop Linkage

**Fully independent — no dependency on Track 1 or 2.**

| Step | What | Files |
|------|------|-------|
| 3a | Migration: Create `saved_menus`, `saved_menu_items` tables | `migrations/NNN-saved-menus.sql` |
| 3b | Migration: Add `saved_menu_id` to `trip_proposal_stops` and `proposal_lunch_orders` | Same migration |
| 3c | Service: `lib/services/saved-menu.service.ts` — CRUD for menus and items | New service |
| 3d | API routes: Full CRUD for `/api/admin/saved-menus/` | New routes (8 endpoints) |
| 3e | Page: `app/admin/saved-menus/page.tsx` — menu management UI | New page |
| 3f | Extend StopCard: Add "Select lunch menu" dropdown for restaurant stops | Edit `StopCard.tsx` |
| 3g | Extend lunch order creation: When menu assigned to stop, auto-populate available items | Edit lunch service |
| 3h | Seed data: Migrate static JSON menus (Wine Country Store, Memo's Tacos) into `saved_menus` | Migration seed |

**Estimated scope:** 1 migration (+ seed), 1 service (~200 lines), 8 API routes, 1 new page, 2 file edits

#### Track 4: Group Announcements + Polish

**Fully independent — no dependency on other tracks.**

| Step | What | Files |
|------|------|-------|
| 4a | API: `POST /api/admin/trip-proposals/[id]/announce` — send custom email to all guests | New route |
| 4b | Email template: `buildGroupAnnouncementEmail()` | New template |
| 4c | Admin UI: Add "Send Announcement" button to proposal editor | Edit admin page |
| 4d | Shared tour portal bridge: Design the data model for linking tickets to proposals | Design doc + migration if time allows |

**Estimated scope:** 1 route, 1 email template, 1 file edit, 1 design doc

#### Dependency Graph

```
Track 1 (Guest Profiles)     Track 3 (Saved Menus)
    │                              │
    │ step 1a completes            │ fully independent
    ▼                              ▼
Track 2 (Deposits + Email)   Track 4 (Announcements)
    │                              │
    │ fully independent            │ fully independent
    ▼                              ▼
  Integration Testing         Integration Testing
```

#### Reference: Where Similar Features Live

| Feature Type | Existing Example | Follow Same Pattern |
|--------------|-----------------|---------------------|
| Service class | `lib/services/lunch-supplier.service.ts` | `guest-profile.service.ts`, `saved-menu.service.ts` |
| Admin CRUD API | `app/api/admin/lunch-suppliers/route.ts` | Saved menus routes |
| Guest-facing API | `app/api/my-trip/[token]/lunch/route.ts` | Guest profile routes |
| Payment flow | `app/my-trip/[token]/guest/[guestToken]/pay/page.tsx` | Registration deposit |
| Email template | `lib/email/templates/payment-reminder-emails.ts` | New templates |
| Admin page | `app/admin/shared-tours/page.tsx` | Saved menus page |
| Migration | `migrations/089-per-guest-billing.sql` | New migrations |
| Token auth | `app/api/my-trip/[token]/join/route.ts` | Magic link verification |

---

### 3.6 What This Plan Does NOT Change

- **Shared tours remain a separate system.** The shared tour booking flow, pricing, ticket system, and admin management are untouched. The only addition is an optional `guest_profile_id` column for cross-system identity.
- **Existing payment flows are untouched.** All per-guest billing, group payment, and deposit payment routes stay exactly as they are.
- **Existing lunch ordering stays as-is.** The coordinator and individual ordering modes, cutoff enforcement, and supplier notification are unchanged. Saved menus are a parallel addition that feeds into the existing system.
- **No changes to the portal layout or tab structure.** The MyTripClientLayout, tab navigation, and realtime subscriptions are unchanged.
- **No changes to the admin proposal editor structure.** GuestsTab, BillingTab, PricingTab, DaysTab stay as they are. Small field additions only.

---

*Generated from full codebase audit. All file paths relative to project root (`/Users/temp/walla-walla-final/`). Based on code as of March 4, 2026.*
