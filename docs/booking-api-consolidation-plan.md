# Booking API Consolidation Plan

> **Status:** Planning (documentation only — no code changes yet)
> **Created:** 2026-03-03
> **Companion doc:** `docs/booking-api-consolidation.md` — detailed legacy reserve route analysis
> **Scope:** All 35 booking-related API routes across 8 categories

---

## Executive Summary

The codebase has **35 booking-related API routes** spread across 8 URL prefixes. Four legacy routes (`/api/booking/reserve/*`) use raw SQL and are deprecated. Two V1 routes (`/api/v1/bookings/*`) have zero frontend callers. Several admin routes use raw SQL instead of the service layer. This plan defines what to keep, migrate, merge, or delete — and in what order.

---

## Current Route Inventory

### Category 1: Legacy Reserve & Refine (4 routes — DELETE after migration)

| Route | Method | SQL/Service | Deprecated | Frontend Callers |
|-------|--------|-------------|------------|------------------|
| `/api/booking/reserve` | POST | Raw SQL | Yes | `app/book/reserve/page.tsx` |
| `/api/booking/reserve/[id]` | GET | Raw SQL | Yes | `app/book/reserve/payment/page.tsx`, `app/book/reserve/confirmation/page.tsx` |
| `/api/booking/reserve/create-payment-intent` | POST | Stripe helper | Yes | `app/book/reserve/payment/page.tsx` |
| `/api/booking/reserve/confirm-payment` | POST | Raw SQL | Yes | `app/book/reserve/payment/page.tsx` |

**Action:** Migrate to `/api/reservations/*` (see Phase 1-3 below), then delete.

---

### Category 2: Modern Bookings (7 routes — KEEP)

| Route | Method | SQL/Service | Frontend Callers |
|-------|--------|-------------|------------------|
| `/api/bookings` | GET, POST | Service layer | `admin/bookings/page.tsx`, `admin/bookings/new/page.tsx`, `admin/bookings/ManualBookingModal.tsx` |
| `/api/bookings/[bookingNumber]` | GET | Service layer | `customer-portal/[booking_number]/page.tsx` |
| `/api/bookings/calculate-price` | POST | Pricing engine | `admin/bookings/ManualBookingModal.tsx` |
| `/api/bookings/cancel` | POST | Service layer | `admin/bookings/[id]/BookingActions.tsx`, `customer-portal/[booking_number]/page.tsx` |
| `/api/bookings/check-availability` | POST, GET | Availability engine | `admin/bookings/AssignmentModal.tsx`, `book-tour/steps/Step1TourDetails.tsx` |
| `/api/bookings/create` | POST | Service layer | `book-tour/steps/Step4ReviewPayment.tsx` |
| `/api/bookings/send-confirmation` | POST | Email service | `admin/bookings/[id]/BookingActions.tsx`, `book-tour/steps/Step4ReviewPayment.tsx` |

**Action:** Keep as-is. These are the production booking flow.

---

### Category 3: V1 Unified API (2 routes — EVALUATE)

| Route | Method | SQL/Service | Frontend Callers |
|-------|--------|-------------|------------------|
| `/api/v1/bookings` | GET, POST | Service layer | **None** (0 frontend callers) |
| `/api/v1/bookings/[id]` | GET, PATCH, DELETE | Service layer | **None** (0 frontend callers) |

Referenced only in: docs, tests, and a `.example` file.

**Action:** Keep for now (documented API surface for future external integrations). Add `@experimental` annotation. Revisit when building public API or mobile app.

---

### Category 4: Admin Booking Management (5 routes — KEEP, migrate raw SQL)

| Route | Method | SQL/Service | Frontend Callers |
|-------|--------|-------------|------------------|
| `/api/admin/bookings` | GET | Service layer | `admin/bookings/page.tsx` |
| `/api/admin/bookings/[booking_id]` | GET, DELETE | Raw SQL | `admin/bookings/[id]/` components |
| `/api/admin/bookings/[booking_id]/assign` | PUT | Raw SQL | `admin/bookings/AssignmentModal.tsx` |
| `/api/admin/bookings/[booking_id]/status` | PATCH | Raw SQL | `admin/bookings/[id]/BookingActions.tsx` |
| `/api/admin/bookings/console/create` | POST | Raw SQL + service | `BookingConsole/BookingConsole.tsx` |

**Action:** Keep routes, but migrate inline SQL to service layer methods (Phase 5). Low priority — these work correctly today.

---

### Category 5: Admin Reservations (3 routes — KEEP, pair with new `/api/reservations/*`)

| Route | Method | SQL/Service | Frontend Callers |
|-------|--------|-------------|------------------|
| `/api/admin/reservations` | GET | Raw SQL | Admin dashboard (no direct `.tsx` callers found) |
| `/api/admin/reservations/[id]/contact` | POST | Raw SQL | Admin dashboard |
| `/api/admin/reservations/[id]/deposit-request` | POST | Raw SQL + email/SMS | Admin dashboard |

**Action:** Keep. These serve admin operations on the `reservations` table. When `ReservationService` is built out (Phase 1), migrate inline SQL to service calls.

---

### Category 6: Partner Shared Tour Bookings (4 routes — KEEP)

| Route | Method | SQL/Service | Frontend Callers |
|-------|--------|-------------|------------------|
| `/api/partner/shared-tours/book` | POST | Service layer | Partner portal booking form |
| `/api/partner/shared-tours/bookings` | GET | Service layer | `partner-portal/shared-tours/bookings/page.tsx` |
| `/api/partner/shared-tours/bookings/[ticketNumber]/invoice` | GET | Raw SQL + PDF | Invoice download link |
| `/api/partner/shared-tours/bookings/cancel` | POST | Service layer | Partner portal cancel button |

**Action:** Keep as-is. Separate business domain (hotel partners + shared tours).

---

### Category 7: Booking-Adjacent Routes (KEEP — no changes needed)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/booking-requests` | GET, POST | Lead capture form (different from bookings) |
| `/api/client/booking-lookup` | POST | Customer self-service lookup by email |
| `/api/gpt/booking-status` | POST | ChatGPT plugin integration |
| `/api/invoices/[booking_id]` | GET | Invoice PDF generation |
| `/api/itineraries/[booking_id]` | GET, POST | Itinerary CRUD |
| `/api/itineraries/[booking_id]/reorder` | POST | Reorder itinerary stops |
| `/api/itineraries/[booking_id]/stops` | GET, POST | Itinerary stop management |
| `/api/v1/itinerary/[booking_id]` | GET | V1 itinerary endpoint |
| `/api/admin/approve-invoice/[booking_id]` | POST | Invoice approval workflow |
| `/api/kb/booking` | POST | Knowledge base booking assistant |

**Action:** No changes. These are distinct concerns that happen to reference booking IDs.

---

## What Gets Removed

| Route | When | Why |
|-------|------|-----|
| `POST /api/booking/reserve` | Phase 3 | Replaced by `POST /api/reservations` |
| `GET /api/booking/reserve/[id]` | Phase 3 | Replaced by `GET /api/reservations/[id]` |
| `POST /api/booking/reserve/create-payment-intent` | Phase 3 | Replaced by `POST /api/reservations/[id]/payment-intent` |
| `POST /api/booking/reserve/confirm-payment` | Phase 3 | Replaced by `POST /api/reservations/[id]/confirm-payment` |
| `app/api/booking/` directory | Phase 4 | Empty after route deletion |

**Total routes removed: 4** (out of 35).

---

## What Needs Redirects

None. The legacy routes are only called by frontend `fetch()` — no external consumers, no SEO implications, no bookmarked URLs. Once frontend callers are updated, the old routes can be deleted without redirects.

If external systems are later discovered calling these routes, add temporary `308 Permanent Redirect` responses before deletion.

---

## What Gets Created

| New Route | Replaces | Service Method |
|-----------|----------|----------------|
| `POST /api/reservations` | `POST /api/booking/reserve` | `reservationService.createReservation()` |
| `GET /api/reservations/[id]` | `GET /api/booking/reserve/[id]` | `reservationService.getById()` (new) |
| `POST /api/reservations/[id]/payment-intent` | `POST .../create-payment-intent` | `createDepositPaymentIntent()` |
| `POST /api/reservations/[id]/confirm-payment` | `POST .../confirm-payment` | `reservationService.confirmPayment()` (new) |

**Total new routes: 4** (1:1 replacement of legacy routes).

---

## Migration Path

### Why `/api/reservations/*` and NOT merging into `/api/bookings/*`

Reservations and bookings are **different business entities**:

| Aspect | Reservations | Bookings |
|--------|-------------|----------|
| **Table** | `reservations` | `bookings` |
| **Purpose** | Deposit hold pending consultation | Fully configured tour |
| **Payment** | 50% deposit only | Full payment or deposit + balance |
| **Lifecycle** | Reserve → call → convert to booking | Create → assign → execute → complete |
| **Link** | `reservations.booking_id` → `bookings.id` | N/A |

Merging them into one API would conflate two distinct concepts. The V1 API (`/api/v1/bookings/*`) handles only `bookings` table operations.

---

## Execution Order

### Phase 1: Fill Service Layer Gaps (no frontend changes, no risk)

**Goal:** Ensure `ReservationService` has all methods needed before creating new routes.

1. Add `getById(id: number)` to `ReservationService`
   - Returns reservation with joined customer fields
   - Match the response shape legacy route returns (see Response Shapes below)

2. Add `confirmPayment(id: number, paymentIntentId: string)` to `ReservationService`
   - Encapsulates: DB status update → confirmation email → CRM sync
   - Currently this logic is inline in `confirm-payment/route.ts`

**Validation:** Unit tests for both new methods pass.

---

### Phase 2: Create New Routes (no frontend changes yet)

**Goal:** Stand up the replacement routes alongside legacy routes. Both coexist.

3. Create `POST /api/reservations` route
   - Middleware: `withCSRF`, `withRateLimit(rateLimiters.payment)`, `withErrorHandling`
   - Calls `reservationService.createReservation()`
   - Sends confirmation email

4. Create `GET /api/reservations/[id]` route
   - No auth required (customers view their own confirmation via URL)
   - Calls `reservationService.getById()`

5. Create `POST /api/reservations/[id]/payment-intent` route
   - Middleware: `withCSRF`, `withRateLimit(rateLimiters.payment)`, `withErrorHandling`
   - Calls `createDepositPaymentIntent()`

6. Create `POST /api/reservations/[id]/confirm-payment` route
   - Middleware: `withCSRF`, `withRateLimit(rateLimiters.payment)`, `withErrorHandling`
   - Calls `reservationService.confirmPayment()`

**Validation:** All 4 new routes respond correctly when tested directly (curl/Postman). Legacy routes still work unchanged.

---

### Phase 3: Migrate Frontend Callers (one page at a time, lowest risk first)

7. **Migrate `/book/reserve/confirmation`** (read-only, lowest risk)
   - File: `app/book/reserve/confirmation/page.tsx` (line 47)
   - Change: `fetch(/api/booking/reserve/${id})` → `fetch(/api/reservations/${id})`
   - Verify: Confirmation page renders correctly

8. **Migrate `/book/reserve/payment`** (medium risk — involves Stripe)
   - File: `app/book/reserve/payment/page.tsx` (lines 55, 63, 98)
   - Change 3 fetch calls to new `/api/reservations/*` endpoints
   - Test: End-to-end with Stripe test mode (`4242 4242 4242 4242`)

9. **Migrate `/book/reserve`** (highest risk — entry point for new reservations)
   - File: `app/book/reserve/page.tsx` (line 221)
   - Change: `fetch('/api/booking/reserve', ...)` → `fetch('/api/reservations', ...)`
   - Verify: Form submission → redirect → payment → confirmation flow works end-to-end

**Validation:** Full reservation flow works: create → pay deposit → view confirmation.

---

### Phase 4: Cleanup (after all callers verified)

10. Delete the 4 legacy route files:
    - `app/api/booking/reserve/route.ts`
    - `app/api/booking/reserve/[id]/route.ts`
    - `app/api/booking/reserve/create-payment-intent/route.ts`
    - `app/api/booking/reserve/confirm-payment/route.ts`

11. Delete the empty `app/api/booking/` directory

12. Update `docs/booking-api-consolidation.md` status to "Completed"

**Validation:** `npx next build` passes. No references to `/api/booking/reserve` remain in `*.tsx` files.

---

### Phase 5: Admin Raw SQL Migration (future — lower priority)

These routes work correctly but use inline SQL instead of the service layer. Migrate opportunistically.

| Route | Current | Target |
|-------|---------|--------|
| `GET /api/admin/bookings/[booking_id]` | Raw SQL | `bookingService.getFullBookingDetails()` |
| `DELETE /api/admin/bookings/[booking_id]` | Raw SQL | `bookingService.delete()` (new) |
| `PUT /api/admin/bookings/[booking_id]/assign` | Raw SQL | `bookingService.assign()` (new) |
| `PATCH /api/admin/bookings/[booking_id]/status` | Raw SQL | `bookingService.updateStatus()` (new) |
| `POST /api/admin/bookings/console/create` | Raw SQL + service | Consolidate to service only |
| `GET /api/admin/reservations` | Raw SQL | `reservationService.list()` |
| `POST /api/admin/reservations/[id]/contact` | Raw SQL | `reservationService.markContacted()` (new) |
| `POST /api/admin/reservations/[id]/deposit-request` | Raw SQL | `reservationService.sendDepositRequest()` (new) |

**Priority:** Low. These are admin-only routes behind `withAdminAuth` and work correctly. Migrate when touching these files for other reasons.

---

## Response Shape Compatibility

New routes must match the response shapes the frontend expects. Mismatches cause silent UI failures.

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

The confirmation page reads: `data.reservation.*` (full reservation with joined customer).

Both shapes must be supported by the new endpoint.

### `POST /api/reservations/[id]/payment-intent`

```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

### `POST /api/reservations/[id]/confirm-payment`

```json
{
  "success": true,
  "reservationId": 123,
  "reservationNumber": "RES-2026-123456"
}
```

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Breaking live `/book/reserve` flow | High | Low | Migrate one page at a time; legacy routes stay alive until Phase 4 |
| Stripe payment failures during migration | High | Low | Test with Stripe test mode; deploy on a quiet day |
| Response shape mismatch | Medium | Medium | Document shapes above; match exactly in new routes |
| Reservation number format change | Low | Low | Service generates `RES-YYYY-XXXXXX`; existing reservations unchanged |
| Undiscovered external callers | Medium | Very Low | Grep confirms only 3 `.tsx` files call legacy routes; no external API consumers |

---

## Route Count After Consolidation

| Category | Before | After | Change |
|----------|--------|-------|--------|
| Legacy `/api/booking/reserve/*` | 4 | 0 | -4 (deleted) |
| New `/api/reservations/*` | 0 | 4 | +4 (created) |
| Modern `/api/bookings/*` | 7 | 7 | — |
| V1 `/api/v1/bookings/*` | 2 | 2 | — |
| Admin bookings | 5 | 5 | — (raw SQL → service in Phase 5) |
| Admin reservations | 3 | 3 | — (raw SQL → service in Phase 5) |
| Partner shared tours | 4 | 4 | — |
| Booking-adjacent | 10 | 10 | — |
| **Total** | **35** | **35** | **Net zero** (4 replaced) |

The consolidation is a **rename + refactor**, not a reduction. The route count stays the same, but raw SQL usage drops from 12 routes to 4 (Phase 1-4), eventually to 0 (Phase 5).

---

## Definition of Done

### Phases 1-4 (Primary Consolidation)

- [ ] `ReservationService` has `getById()` and `confirmPayment()` methods
- [ ] All 4 new `/api/reservations/*` routes created with proper middleware
- [ ] All 3 frontend pages updated to call new routes
- [ ] End-to-end test: create reservation → pay deposit → view confirmation
- [ ] Legacy 4 routes deleted
- [ ] `app/api/booking/` directory removed
- [ ] Build passes (`npx next build`)
- [ ] No `*.tsx` files reference `/api/booking/reserve`

### Phase 5 (Future — Admin Raw SQL Migration)

- [ ] All admin booking routes use service layer instead of raw SQL
- [ ] All admin reservation routes use service layer instead of raw SQL
- [ ] Tests cover new service methods
