# Booking Flow Integration Check

**Date:** 2026-03-05
**Scope:** End-to-end trace of guest registration → payment → portal → admin management

---

## Checkpoint 1: Guest Registration + Deposit Payment

### Code Path

```
Guest clicks join link
  → app/my-trip/[token]/join/page.tsx (GET renders form)
  → GET /api/my-trip/[token]/join/route.ts (loads trip metadata)
  → Guest fills form, submits
  → POST /api/my-trip/[token]/join/route.ts
    → Zod validation (name, email, phone)
    → Duplicate email check
    → tripProposalService.addGuest() (lib/services/trip-proposal.service.ts)
      → Atomic CTE: capacity check + INSERT into trip_proposal_guests
      → Returns guest with guest_access_token (UUID)
  → Success: redirect to /my-trip/[token]?guest=[guestToken]
```

### Status: PARTIALLY WIRED

| Feature | Status | Detail |
|---------|--------|--------|
| Join page loads trip info | OK | GET handler returns title, capacity, dates, dynamic pricing |
| Form submission creates guest | OK | `addGuest()` with atomic capacity check works |
| Guest gets `guest_access_token` | OK | UUID auto-generated, returned in response |
| Registration deposit collection | NOT WIRED | DB columns exist (`registration_deposit_amount`, `registration_deposit_type` via migration 116) but POST handler does NOT read them, does NOT create PaymentIntent, join page has NO Stripe PaymentElement |
| Registration confirmation email | NOT WIRED | Template exists at `lib/email/templates/registration-confirmation-email.ts` but is NEVER called. `confirm-payment/route.ts` has a TODO comment (lines 141-146) |
| Non-deposit confirmation email | NOT WIRED | No email sent for registrations without a deposit either |

### Broken Connections

1. **`registration_deposit_amount`** column exists in DB but is not read by the join route POST handler
2. **No PaymentIntent creation** in the join route — the `confirm-payment/route.ts` exists and would work IF a PaymentIntent were created, but nothing creates one
3. **`sendRegistrationConfirmationEmail()`** exists as a template but the call site is commented out as TODO
4. **`registration_deposit_amount`** is not included in `ProposalDetail` TypeScript type (`lib/types/proposal-detail.ts`)

---

## Checkpoint 2: Guest Appears in Admin Guests Tab

### Code Path

```
Admin navigates to /admin/trip-proposals/[id]
  → Clicks "Guests" tab
  → GuestsTab.tsx (app/admin/trip-proposals/[id]/components/GuestsTab.tsx)
    → Reads proposal.guests from parent ProposalDetail data
    → Renders guest list with: name, email, phone, dietary_restrictions
    → Add/edit/delete guest actions available
    → Guest approval/rejection works (if guest_approval_required = true)
```

### Status: OK (basic guest visibility)

| Feature | Status | Detail |
|---------|--------|--------|
| Guest appears after registration | OK | `addGuest()` inserts into `trip_proposal_guests`, GuestsTab reads from same table |
| Guest name/email/phone shown | OK | Displayed in guest list cards |
| Add/edit/delete guests | OK | Full CRUD via admin API |
| Guest approval/rejection | OK | Toggle available when `guest_approval_required` is true |

---

## Checkpoint 3: Admin Can See Payment Status Per Guest

### Code Path

```
GuestsTab.tsx renders guest cards
  → Shows: name, email, phone, dietary_restrictions, rsvp_status
  → Does NOT show: payment_status, amount_paid, amount_owed
```

### Status: NOT DISPLAYED

| Feature | Status | Detail |
|---------|--------|--------|
| `payment_status` column exists | OK | Added in migration 089 (`paid`, `partial`, `unpaid`, `refunded`) |
| `amount_paid` column exists | OK | Added in migration 089 |
| `amount_owed` column exists | OK | Added in migration 089 |
| Payment status shown in GuestsTab UI | NOT WIRED | Fields exist in the DB and TypeScript type but GuestsTab.tsx does not render them |
| Registration deposit config in GuestsTab | NOT WIRED | `registration_deposit_amount` not shown in Guest Settings card despite migration 116 adding the column |

### Broken Connections

1. **GuestsTab.tsx** does not display `payment_status`, `amount_paid`, or `amount_owed` even though these fields exist in the `ProposalGuest` type
2. **Registration deposit config** (`registration_deposit_amount`, `registration_deposit_type`) has no admin UI — cannot be configured

---

## Checkpoint 4: Guest Views Live Itinerary + Lunch Menus

### Code Path

```
Guest visits /my-trip/[token]?guest=[guestToken]
  → MyTripClientLayout.tsx loads proposal via GET /api/my-trip/[token]
  → Tabs rendered based on planning_phase:
    - proposal phase: Itinerary only
    - active_planning/finalized: Itinerary + Lunch + Guests tabs
  → Itinerary tab: LiveItinerary.tsx renders days → stops (time, name, description)
  → Lunch tab: /my-trip/[token]/lunch/page.tsx
    → GET /api/my-trip/[token]/lunch
    → Shows menu items per stop's supplier
    → Countdown timer for ordering deadline
```

### Status: OK

| Feature | Status | Detail |
|---------|--------|--------|
| Guest portal loads | OK | MyTripClientLayout.tsx fetches full proposal data |
| Live itinerary renders | OK | LiveItinerary.tsx shows days/stops with times |
| Tabs gated by planning_phase | OK | Lunch/Guests only visible during active_planning or finalized |
| Lunch menus displayed | OK | Menu items fetched per stop's linked supplier |
| Menu items show prices | OK | Price per item displayed in order form |

---

## Checkpoint 5: Guest Places Lunch Order + Deadline Enforcement

### Code Path

```
Guest opens Lunch tab
  → /my-trip/[token]/lunch/page.tsx
  → Fetches GET /api/my-trip/[token]/lunch (orders + menu items + cutoff)
  → Renders based on ordering_mode:
    - coordinator: LunchOrderForm.tsx (one person orders for group)
    - individual: IndividualLunchOrderForm.tsx (each guest orders their own)
  → useCutoffCountdown() hook shows countdown timer
  → Guest selects items, submits
  → POST /api/my-trip/[token]/lunch
    → lunchSupplierService.submitOrder()
      → isOrderingOpen() checks cutoff_at timestamp (LAYER 1: service)
      → API route also checks cutoff before calling service (LAYER 2: API)
      → Frontend disables form when countdown reaches 0 (LAYER 3: UI)
  → Cutoff formula: tour_date + tour_start_time - cutoff_hours
```

### Status: OK

| Feature | Status | Detail |
|---------|--------|--------|
| Coordinator mode ordering | OK | LunchOrderForm.tsx handles group ordering |
| Individual mode ordering | OK | IndividualLunchOrderForm.tsx for per-guest orders |
| Deadline countdown | OK | `useCutoffCountdown()` hook with live timer |
| 3-layer deadline enforcement | OK | UI disables, API validates, service checks — all three layers |
| Order calculation (prices/tax) | OK | Service calculates subtotal + tax on submit |

---

## Checkpoint 6: Admin Sends Group Announcement

### Code Path

```
Admin clicks "Send Update to Guests" in ProposalHeader.tsx
  → AnnounceGuestsModal opens (subject + message fields)
  → POST /api/admin/trip-proposals/[id]/announce/route.ts
    → withCSRF + withAdminAuth
    → Zod validation (subject, message)
    → Fetches all guests with email addresses
    → Builds email via buildGroupAnnouncementEmail()
      (lib/email/templates/group-announcement-emails.ts)
    → Sends via sendEmail() (Resend) to each guest
    → Returns success with count
```

### Status: WORKS BUT NON-COMPLIANT

| Feature | Status | Detail |
|---------|--------|--------|
| "Send Update to Guests" button | OK | Visible in ProposalHeader when guests have emails |
| Announcement modal | OK | Subject + message fields with preview |
| Email delivery | OK | Sends via Resend to all guests with email addresses |
| Unsubscribe check before sending | MISSING | Does NOT call `emailPreferencesService.isUnsubscribed()` — sends to ALL guests regardless |
| Unsubscribe link in email | MISSING | `buildGroupAnnouncementEmail()` does not include unsubscribe link/header |
| List-Unsubscribe header | MISSING | No RFC 8058 header — CAN-SPAM non-compliant |
| Email logging | MISSING | Announcement sends are not logged for audit trail |

### Broken Connections

1. **CAN-SPAM violation**: Announcements skip `emailPreferencesService` entirely — no unsubscribe check, no unsubscribe link, no List-Unsubscribe header
2. **No email logging**: Unlike other email sends in the system, announcements don't create audit records

---

## Summary of Broken Connections

| # | Issue | Severity | Files Involved |
|---|-------|----------|----------------|
| 1 | Registration deposit not wired (DB exists, no UI/API logic) | High | `app/api/my-trip/[token]/join/route.ts`, `app/my-trip/[token]/join/page.tsx` |
| 2 | Registration confirmation email never sent | High | `lib/email/templates/registration-confirmation-email.ts`, `app/api/my-trip/[token]/join/confirm-payment/route.ts` (TODO) |
| 3 | No confirmation email for non-deposit registrations | Medium | `app/api/my-trip/[token]/join/route.ts` |
| 4 | Payment status not displayed in admin GuestsTab | Medium | `app/admin/trip-proposals/[id]/components/GuestsTab.tsx` |
| 5 | Registration deposit config missing from admin UI | High | `app/admin/trip-proposals/[id]/components/GuestsTab.tsx` |
| 6 | `registration_deposit_amount` missing from ProposalDetail type | Medium | `lib/types/proposal-detail.ts` |
| 7 | Announcements lack CAN-SPAM compliance (no unsubscribe) | Critical | `app/api/admin/trip-proposals/[id]/announce/route.ts`, `lib/email/templates/group-announcement-emails.ts` |
| 8 | No email logging for announcements | Low | `app/api/admin/trip-proposals/[id]/announce/route.ts` |

### What Works End-to-End

- Guest registration (without deposit) → appears in admin → portal access
- Guest views itinerary → sees lunch menus → places order with deadline enforcement
- Admin sends announcement emails (delivery works, compliance doesn't)

### What Doesn't Work End-to-End

- Registration deposit collection (Track 2 backend exists but frontend/API not wired)
- Registration confirmation emails (template exists but never called)
- Admin viewing guest payment status (data exists but not displayed)
