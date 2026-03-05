# Shared Tour Flow — End-to-End Integration Check

**Date:** 2026-03-04
**Method:** Code trace through all shared tour paths

---

## Flow Summary

| Step | Question | Status | Details |
|------|----------|--------|---------|
| 1 | Can a visitor see available tours with open spots? | **PASS** | Full listing with spots, capacity badges |
| 2 | Can they register and pay to reserve a spot? | **PASS** | 4-step booking + Stripe payment |
| 3 | After booking, do they get a guest profile? | **PARTIAL** | Guest profile: yes. Portal access: no |
| 4 | Can they view the itinerary and order lunch? | **BROKEN** | Requires manual admin import first |
| 5 | Does the calendar show the tour with spots remaining? | **PASS** | Tentative events with spots count |
| 6 | Does admin see ticket holder in both shared tour mgmt AND trip proposal guests? | **BROKEN** | No admin UI to link or sync |

---

## Step 1: Public Tour Discovery

**Status: PASS**

**Page:** `app/shared-tours/page.tsx`
**API:** `GET /api/shared-tours` (public, cached 120s)

Visitors see:
- All published tours grouped by week
- Spots remaining with color-coded badges (amber 1-3, blue 4+, red sold out)
- Pricing ($95 base / $115 with lunch)
- Winery previews
- "Book Now" button (disabled when sold out or past cutoff)

**No issues found.** The listing page is complete and well-designed.

---

## Step 2: Booking & Payment

**Status: PASS**

**Page:** `app/shared-tours/[tour_id]/book/page.tsx` (905 lines, 4 steps)

| Step | Action | API |
|------|--------|-----|
| 1 | Select tickets (1-6) + lunch option | `GET /api/shared-tours/[tour_id]/price` |
| 2 | Enter customer details + guest names | — |
| 3 | Review & confirm | — |
| 4 | Stripe payment | `POST /api/shared-tours/tickets` then `POST .../payment-intent` |

**Ticket creation** (`app/api/shared-tours/tickets/route.ts`):
- Zod validated, CSRF protected, rate limited (10/15min)
- Atomic transaction with row locking prevents overbooking
- `calculate_ticket_price()` SQL function handles pricing
- Ticket number generated: `ST-YYMMDD-XXXX`

**Payment** (`app/api/shared-tours/tickets/[ticket_id]/payment-intent/route.ts`):
- Creates Stripe PaymentIntent with metadata `{type: 'shared_tour_ticket'}`
- Webhook at `lib/webhooks/stripe/payment-intent.handler.ts` marks ticket paid
- Idempotent — duplicate webhooks don't resend emails

**Confirmation email** sent via `lib/email/templates/shared-tour-confirmation.ts`.

**No issues found.** The booking and payment flow is complete.

---

## Step 3: Guest Profile After Booking

**Status: PARTIAL — Guest profile created, but NO portal access**

### What WORKS

After ticket creation (`app/api/shared-tours/tickets/route.ts`, lines 54-65):
```
if (ticket.customer_email) {
  guestProfileService.findOrCreateByEmail(email, {name, phone})
  sharedTourService.linkGuestProfile(ticket.id, profile.id)
}
```

- `guest_profiles` record created/found by email
- `shared_tour_tickets.guest_profile_id` linked
- This is non-blocking (failure doesn't break the ticket)

### What's BROKEN

**No `trip_proposal_guest` record is created.** The buyer does NOT get:
- A `guest_access_token` (required for portal access)
- An entry in `trip_proposal_guests` (required for itinerary view)
- Any link to a trip proposal at all

**The bridge exists in the database** (migration 116):
- `shared_tours.trip_proposal_id` FK column exists
- `shared_tour_tickets.guest_profile_id` FK column exists
- `trip_proposal_guests.guest_profile_id` FK column exists

**But there's no automation that uses it.** The only way to create the link is:
1. Admin manually sets `trip_proposal_id` on the shared tour (no UI for this)
2. Admin calls `POST /api/admin/shared-tours/[tour_id]/import-guests` (no button for this)

---

## Step 4: Itinerary View & Lunch Ordering

**Status: BROKEN — Requires manual admin steps with no UI**

### The Guest Portal (`app/my-trip/[token]`)

The portal itself is fully functional:
- Shows multi-day itinerary via `components/my-trip/LiveItinerary.tsx`
- Lunch ordering at `app/my-trip/[token]/lunch/page.tsx` (coordinator + individual modes)
- Guest identity resolved via `hooks/useGuestIdentity.ts` (reads `?guest=` param)

### The Break

A shared tour ticket holder **cannot access the portal** because:

1. Portal URL requires a trip proposal `access_token`: `/my-trip/[access_token]`
2. Individual guest view requires a `guest_access_token`: `?guest=[uuid]`
3. Neither token is generated or sent to the shared tour ticket buyer
4. The confirmation email (`shared-tour-confirmation.ts`) has no portal link

### What Would Need to Happen

For a shared tour ticket holder to access the portal:
1. Admin creates/links a trip proposal to the shared tour
2. Admin imports ticket holders into the proposal (creates `trip_proposal_guests` with `guest_access_token`)
3. Ticket holder receives the portal URL with their guest token
4. Now they can view the itinerary and order lunch

**None of these steps are automated or surfaced in the admin UI.**

---

## Step 5: Calendar Display

**Status: PASS**

**Page:** `app/admin/calendar/page.tsx`
**API:** `GET /api/admin/calendar/events`

- Shared tours appear as sky-blue tentative events
- Display format: `"{title} ({spotsRemaining} spots)"`
- Calculation: `spotsRemaining = max_guests - current_guests`
- `current_guests` auto-maintained by DB trigger on ticket insert/update/delete

**No issues found.**

---

## Step 6: Admin Cross-Visibility

**Status: BROKEN — Two separate silos with no cross-reference**

### Shared Tour Management View

**Page:** `app/admin/shared-tours/[tour_id]/page.tsx`

Admin CAN see:
- All ticket holders (name, email, phone, guest count)
- Payment status, check-in status
- Dietary restrictions, special requests
- Lunch selections

Admin CANNOT see:
- Whether the ticket holder is also on a trip proposal
- Any link to trip proposal guests
- A button to import guests into a trip proposal
- A way to set `trip_proposal_id` on the tour

### Trip Proposal Guests View

**Page:** `app/admin/trip-proposals/[id]/components/GuestsTab.tsx`

Admin CAN see:
- Manually-added proposal guests
- RSVP status, dietary restrictions
- Guest invite links

Admin CANNOT see:
- Whether a guest originally came from a shared tour ticket
- Cross-reference to shared tour ticket number
- Auto-populated guests from linked shared tours

### The Import Endpoint Exists But Has No UI

`POST /api/admin/shared-tours/[tour_id]/import-guests` (`app/api/admin/shared-tours/[tour_id]/import-guests/route.ts`):

This endpoint:
- Requires `shared_tours.trip_proposal_id` to be set first
- Iterates all non-cancelled tickets
- Creates `trip_proposal_guest` records via `tripProposalService.addGuest()`
- Links `guest_profile_id` on the new guest record

**But there is no button, menu item, or admin UI that calls this endpoint.**

---

## Additional Issues Found

### BUG: Tax Rate Mismatch (8.9% vs 9.1%)

| Location | Rate | Source |
|----------|------|--------|
| SQL function `calculate_ticket_price()` | **8.9%** (`0.089`) | `migrations/064-shared-tours-enhancements.sql:283` |
| SQL view `shared_tour_tickets` | **8.9%** (`0.089`) | `migrations/064-shared-tours-enhancements.sql:55` |
| Booking page UI label | **9.1%** | `app/shared-tours/[tour_id]/book/page.tsx:577,818` |
| Trip proposals (correct rate) | **9.1%** (`0.091`) | `migrations/082-trip-proposal-fixes.sql` |

The booking page **displays** "Tax (9.1%)" but the actual charge computed by the SQL function is **8.9%**. This means the label is wrong OR the rate is wrong. Either way, the customer sees an incorrect tax percentage.

**Impact:** On a $230 subtotal (2 tickets with lunch), the difference is:
- At 8.9%: $20.47 tax
- At 9.1%: $20.93 tax
- Delta: $0.46 per booking

### Missing Navigation Header

`/shared-tours` pages are NOT in the `(public)` route group. Per project rules (CLAUDE.md #7), public pages must be in `app/(public)/` to get the shared PublicHeader navigation. These pages have no site-wide navigation header.

No `app/shared-tours/layout.tsx` exists.

---

## Broken Connections Summary

| # | Connection | Current State | Impact |
|---|-----------|---------------|--------|
| 1 | Ticket purchase → trip_proposal_guest | **Missing** — no automation | Buyers can't access guest portal |
| 2 | Admin UI → set trip_proposal_id on shared tour | **Missing** — no UI | Can't link tours to proposals |
| 3 | Admin UI → import guests button | **Missing** — API exists, no button | Can't trigger import without API call |
| 4 | Confirmation email → portal link | **Missing** — email has no portal URL | Even if imported, buyer doesn't know the URL |
| 5 | Shared tour detail → trip proposal cross-reference | **Missing** — no bidirectional view | Admin can't see the same person in both contexts |
| 6 | Tax rate calculation vs display | **Mismatch** — 8.9% computed, 9.1% displayed | Incorrect label shown to customers |
| 7 | Navigation header on /shared-tours | **Missing** — not in (public) route group | No site-wide navigation on booking pages |

---

## Recommended Fixes (Priority Order)

### P0 — Tax rate fix
Fix `calculate_ticket_price()` and the `shared_tour_tickets` view to use 9.1% (`0.091`), matching the displayed label and trip proposal rate.

### P1 — Auto-create trip proposal + guests on tour publish
When a shared tour is published (or when `trip_proposal_id` is set), auto-create a skeleton trip proposal. When tickets are purchased, auto-create `trip_proposal_guest` records with `guest_access_token`.

### P1 — Add portal link to confirmation email
Include `/my-trip/[token]?guest=[guest_access_token]` in the shared tour confirmation email so buyers can access the itinerary and order lunch.

### P2 — Admin UI: link tour to proposal
Add a "Link to Trip Proposal" dropdown/button on the shared tour detail page that sets `trip_proposal_id`.

### P2 — Admin UI: import guests button
Add an "Import Ticket Holders" button on the shared tour detail page (when `trip_proposal_id` is set) that calls the existing import endpoint.

### P3 — Cross-reference badges
Show a "Shared Tour" badge on trip proposal guests who originated from shared tour tickets. Show a "On Proposal" badge on shared tour ticket holders who are also proposal guests.

### P3 — Move shared tours to (public) route group
Move `app/shared-tours/` into `app/(public)/shared-tours/` to get the PublicHeader navigation, or add a dedicated layout with navigation.
