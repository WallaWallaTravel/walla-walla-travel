# Booking API Consolidation Plan

> **Status:** Planning (documentation only — no code changes yet)
> **Created:** 2026-03-03
> **Context:** The booking API audit found 4 legacy routes (`/api/booking/reserve/*`) still serving live traffic through the `/book/reserve` pages. This document maps every caller, identifies modern equivalents, and defines a safe migration order.

---

## Background

The codebase has two parallel booking systems:

| System | Routes | DB Table | Service Layer | Status |
|--------|--------|----------|---------------|--------|
| **Legacy "Reserve & Refine"** | `POST /api/booking/reserve` | `reservations` | Raw SQL (inline) | Live — 3 pages call these |
| **Modern Booking** | `/api/bookings/*`, `/api/v1/bookings/*` | `bookings` | `bookingService` (facade) | Live — admin + main booking flow |

The legacy routes use **raw SQL** directly in the route handler instead of the service layer. They write to the `reservations` table (a separate table from `bookings`). The modern service layer has a `ReservationService` (`lib/services/reservation.service.ts`) that provides the same functionality through proper abstractions.

---

## Legacy Routes (Set A — to be retired)

| # | Route | Method | Purpose | File |
|---|-------|--------|---------|------|
| 1 | `/api/booking/reserve` | POST | Create reservation with deposit | `app/api/booking/reserve/route.ts` |
| 2 | `/api/booking/reserve/[id]` | GET | Fetch reservation by ID | `app/api/booking/reserve/[id]/route.ts` |
| 3 | `/api/booking/reserve/create-payment-intent` | POST | Create Stripe PaymentIntent for deposit | `app/api/booking/reserve/create-payment-intent/route.ts` |
| 4 | `/api/booking/reserve/confirm-payment` | POST | Confirm payment + update reservation | `app/api/booking/reserve/confirm-payment/route.ts` |

All 4 routes are already marked `@deprecated` in their JSDoc headers.

---

## Frontend Callers

### Page 1: `/book/reserve` (Reserve & Refine form)

**File:** `app/book/reserve/page.tsx` (686 lines)

| Line | Legacy Call | What It Does |
|------|------------|--------------|
| 221 | `POST /api/booking/reserve` | Submits form data (contact info, party size, dates, payment method) to create a reservation |

**Behavior after call:** On success, redirects to either `/book/reserve/payment?id={id}` (card) or `/book/reserve/confirmation?id={id}` (check).

---

### Page 2: `/book/reserve/payment` (Stripe deposit payment)

**File:** `app/book/reserve/payment/page.tsx` (263 lines)

| Line | Legacy Call | What It Does |
|------|------------|--------------|
| 55 | `GET /api/booking/reserve/${reservationId}` | Fetches reservation details to display summary and get deposit amount |
| 63 | `POST /api/booking/reserve/create-payment-intent` | Creates Stripe PaymentIntent with reservation metadata |
| 98 | `POST /api/booking/reserve/confirm-payment` | After Stripe payment succeeds, confirms payment in DB and triggers confirmation email |

**Behavior after call:** On payment success, redirects to `/book/reserve/confirmation?id={id}`.

---

### Page 3: `/book/reserve/confirmation` (Post-reservation confirmation)

**File:** `app/book/reserve/confirmation/page.tsx` (294 lines)

| Line | Legacy Call | What It Does |
|------|------------|--------------|
| 47 | `GET /api/booking/reserve/${reservationId}` | Fetches reservation + customer details to display confirmation receipt |

---

## Modern Equivalents

### Service Layer

The `ReservationService` (`lib/services/reservation.service.ts`) already provides:

| Legacy Route | Modern Service Method | Notes |
|-------------|----------------------|-------|
| `POST /api/booking/reserve` | `reservationService.createReservation(data)` | Uses `BaseService` transactions, same Zod schema shape. Generates `RES-YYYY-XXXXXX` numbers. |
| `GET /api/booking/reserve/[id]` | `reservationService.findManyWithFilters({ ... })` or direct query | Service has `findManyWithFilters` but lacks a `getById()` method — needs one added. |
| `POST .../create-payment-intent` | `createDepositPaymentIntent()` from `lib/stripe` | The Stripe helper is already extracted; only the route wrapping is legacy. |
| `POST .../confirm-payment` | No direct equivalent | Combines Stripe confirmation + DB update + email + CRM sync. Needs a service method. |

### Recommended New Routes

Rather than retrofitting the modern `/api/bookings/*` routes (which operate on the `bookings` table), create clean reservation-specific routes:

| New Route | Method | Replaces | Implementation |
|-----------|--------|----------|----------------|
| `/api/reservations` | POST | `POST /api/booking/reserve` | Call `reservationService.createReservation()`, send confirmation email |
| `/api/reservations/[id]` | GET | `GET /api/booking/reserve/[id]` | Add `getById()` to `ReservationService`, call it |
| `/api/reservations/[id]/payment-intent` | POST | `POST .../create-payment-intent` | Call `createDepositPaymentIntent()` with proper middleware |
| `/api/reservations/[id]/confirm-payment` | POST | `POST .../confirm-payment` | Add `confirmPayment()` to `ReservationService` |

**Why new `/api/reservations/*` instead of merging into `/api/bookings/*`?**

Reservations and bookings are fundamentally different entities:
- **Reservations** are deposit-only holds that await a consultation call. They live in the `reservations` table.
- **Bookings** are fully configured tours with itineraries, pricing, and vehicles. They live in the `bookings` table.
- A reservation can convert to a booking via the `booking_id` foreign key.

Forcing them into the same API would conflate two distinct business concepts.

---

## Migration Order (lowest risk first)

### Phase 1: Service layer gaps (no frontend changes)

1. **Add `getById(id)` to `ReservationService`** — simple query, no risk to existing callers.
2. **Add `confirmPayment(id, paymentIntentId)` to `ReservationService`** — encapsulates DB update + email + CRM sync from the legacy confirm-payment route.

### Phase 2: Create new routes (no frontend changes yet)

3. **Create `POST /api/reservations`** — calls `reservationService.createReservation()`, wraps with `withCSRF`, `withRateLimit`, `withErrorHandling`. Add `sendReservationConfirmation()` call.
4. **Create `GET /api/reservations/[id]`** — calls `reservationService.getById()`. Public route (no auth — customers view their own confirmation).
5. **Create `POST /api/reservations/[id]/payment-intent`** — calls `createDepositPaymentIntent()`. Wraps with CSRF + rate limit.
6. **Create `POST /api/reservations/[id]/confirm-payment`** — calls `reservationService.confirmPayment()`. Wraps with CSRF + rate limit.

**Validation checkpoint:** All 4 new routes should work when tested directly (curl/Postman) before touching frontend.

### Phase 3: Migrate frontend callers (one page at a time)

7. **Migrate `/book/reserve/confirmation`** — lowest risk, read-only.
   - Change `fetch(\`/api/booking/reserve/${reservationId}\`)` → `fetch(\`/api/reservations/${reservationId}\`)`.
   - Adjust response shape if needed (legacy returns `{ success, reservation }`, new should match).

8. **Migrate `/book/reserve/payment`** — medium risk, involves Stripe.
   - Change 3 fetch calls to new `/api/reservations/*` routes.
   - Test end-to-end with Stripe test mode before deploying.

9. **Migrate `/book/reserve`** — highest risk, the entry point.
   - Change `fetch('/api/booking/reserve', ...)` → `fetch('/api/reservations', ...)`.
   - Verify redirect URLs still work after submission.

### Phase 4: Cleanup (after all callers migrated)

10. **Delete legacy routes:**
    - `app/api/booking/reserve/route.ts`
    - `app/api/booking/reserve/[id]/route.ts`
    - `app/api/booking/reserve/create-payment-intent/route.ts`
    - `app/api/booking/reserve/confirm-payment/route.ts`
11. **Delete the empty `app/api/booking/` directory.**
12. **Remove `withErrorHandling` import from `lib/api-errors`** in `create-payment-intent/route.ts` (it imports from the old location).

---

## Response Shape Compatibility

The frontend pages expect specific response shapes. The new routes must match:

### `POST /api/reservations` (replaces `POST /api/booking/reserve`)
```json
{
  "success": true,
  "reservationId": 123,
  "reservationNumber": "RES-2026-123456",
  "message": "Reservation created! Processing payment..."
}
```

### `GET /api/reservations/[id]` (replaces `GET /api/booking/reserve/[id]`)

The payment page reads: `resData.deposit_amount`, `resData.id`, `resData.customer.email`, `resData.customer.name`, `resData.party_size`, `resData.preferred_date`.

The confirmation page reads: `data.reservation.*` (the full reservation object with joined customer fields).

Both shapes should be supported, or the pages should be updated to use a consistent shape.

### `POST /api/reservations/[id]/payment-intent` (replaces `POST .../create-payment-intent`)
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

### `POST /api/reservations/[id]/confirm-payment` (replaces `POST .../confirm-payment`)
```json
{
  "success": true,
  "reservationId": 123,
  "reservationNumber": "RES-2026-123456"
}
```

---

## Ghost Supabase Auth References

The booking API audit also identified stale references to "Supabase Auth" throughout documentation. The main app uses **JWT-based authentication** (via `lib/auth/session.ts` and `jose`). Supabase is used only for database access and storage — never for authentication.

### Files with ghost references (documentation/comments only — no active code):

| File | Ghost Reference | Fix |
|------|----------------|-----|
| `.claude/CLAUDE.md` | `Auth: JWT (Supabase Auth planned)` | Update to `Auth: JWT (custom, session-hardened)` |
| `.claude/team-wiki/AGENT_PROMPTS/backend-lead.md` | `Auth: JWT (Supabase Auth planned)` | Same fix |
| `.claude/team-wiki/RUNBOOKS/incident-response.md` | References "Supabase Auth service" in troubleshooting | Remove Supabase Auth references; auth is JWT-based |
| `.claude/team-wiki/RUNBOOKS/health-checks.md` | Health check row for Supabase Auth | Remove — auth does not depend on Supabase |
| `.claude/commands/supabase-setup.md` | Steps mentioning "Open Supabase Auth" | Remove auth setup steps — not applicable |
| `claudedocs/PUBLIC_LAUNCH_READINESS.md` | "Supabase Auth configured" checklist item | Remove or replace with "JWT session auth configured" |
| `lib/supabase/types.ts` | Comment: "linked to Supabase Auth" | Update to "linked to JWT session auth" |

**Note:** The Auditor's Dream sub-app (`auditors-dream/apps/operator/src/store/auth.ts`) legitimately uses Supabase Auth — those references are correct and should not be changed.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking live `/book/reserve` flow | Migrate one page at a time; keep legacy routes alive until Phase 4 |
| Stripe payment failures during migration | Test with Stripe test mode (card `4242 4242 4242 4242`); deploy payment page migration on a quiet day |
| Response shape mismatch | Document expected shapes (above); new routes must match exactly |
| Reservation number format change | Legacy generates `RES{timestamp}`, service generates `RES-YYYY-XXXXXX`. New reservations will use the service format; existing reservations remain unchanged in DB |
| Legacy route referenced elsewhere | grep confirms only 3 frontend pages call these routes — no other callers |

---

## Definition of Done

- [ ] All 4 new `/api/reservations/*` routes created with proper middleware (CSRF, rate limit, error handling)
- [ ] `ReservationService` has `getById()` and `confirmPayment()` methods
- [ ] All 3 frontend pages (`/book/reserve`, `/book/reserve/payment`, `/book/reserve/confirmation`) updated to call new routes
- [ ] End-to-end test: create reservation → pay deposit → view confirmation (Stripe test mode)
- [ ] Legacy routes deleted
- [ ] Legacy `app/api/booking/` directory removed
- [ ] Ghost Supabase Auth references cleaned from documentation
- [ ] Build passes (`npx next build`)
