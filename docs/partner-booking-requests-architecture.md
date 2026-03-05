# Partner Booking Requests — Architecture

> **Status:** Design Document (no code written yet)
> **Created:** 2026-03-04
> **Purpose:** Enable admin to send customized booking/reservation requests to venue partners (wineries, restaurants, hotels) per itinerary stop, receive structured responses via token-based web forms, and track the conversation thread per stop.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Existing Foundation](#2-existing-foundation)
3. [System Overview](#3-system-overview)
4. [Database Schema](#4-database-schema)
5. [Request Emails](#5-request-emails)
6. [Response Pages](#6-response-pages)
7. [Stop-Level Conversation Threads](#7-stop-level-conversation-threads)
8. [Inbound Email Routing (Hybrid)](#8-inbound-email-routing-hybrid)
9. [API Routes](#9-api-routes)
10. [Frontend Pages & Components](#10-frontend-pages--components)
11. [Integration Points](#11-integration-points)
12. [Build Order](#12-build-order)
13. [Security Considerations](#13-security-considerations)

---

## 1. Problem Statement

When building a trip proposal itinerary, admin needs to contact venue partners (wineries, restaurants, hotels) to:

- Request availability for a specific date, time, and party size
- Request tasting reservations, private room bookings, or special arrangements
- Negotiate details (modify times, adjust party size, custom requests)
- Track all communication per stop in one place

**Current state:** Admin manually emails/calls venues, then manually updates the stop's `reservation_status` and `reservation_notes`. The `vendor_interactions` table exists but only supports manual log entries — there's no outbound email integration or partner response capture.

**Goal:** Structured request → response workflow with token-based partner response pages, automatic thread updates, and optional inbound email routing.

---

## 2. Existing Foundation

These tables, services, and patterns already exist and will be extended (not replaced):

### Database Tables

| Table | Relevant Fields | Role |
|-------|----------------|------|
| `trip_proposal_stops` | `reservation_status` (pending/requested/confirmed/waitlist/cancelled/na), `reservation_contact`, `reservation_confirmation`, `reservation_notes`, `vendor_name`, `vendor_email`, `vendor_phone`, `quote_status`, `quoted_amount`, `quote_notes` | Stop-level venue tracking |
| `vendor_interactions` | `trip_proposal_stop_id`, `interaction_type` (note/email_sent/email_received/phone_call/quote_received), `content`, `contacted_by`, `created_at` | Conversation log per stop |
| `wineries` | `name`, `email`, `phone`, `city`, `slug` | Venue directory |
| `restaurants` | `name`, `email`, `phone`, `cuisine_type`, `address` | Venue directory |
| `hotels` | `name`, `email`, `phone`, `address` | Venue directory |
| `partner_profiles` | `user_id`, `business_type`, `winery_id`, `hotel_id`, `restaurant_id`, `status` | Partner accounts (optional — not required for response flow) |

### Existing API Routes

| Route | Purpose |
|-------|---------|
| `GET/POST /api/admin/trip-proposals/[id]/stops/[stopId]/vendor-log` | Read/write vendor interaction log entries |

### Existing Services & Patterns

| Pattern | Location | Reuse |
|---------|----------|-------|
| Token generation | `crypto.randomBytes(32).toString('hex')` | Used in guest magic links, partner invites, password resets |
| Token-based page access | `/my-trip/[token]`, `/partner-setup?token=xxx` | URL pattern for unauthenticated access |
| Email sending | `lib/email.ts` — `sendEmail({ to, subject, html, replyTo })` | Resend with retry, supports `replyTo` and custom `headers` |
| Zod validation | All API routes | Input validation standard |
| `withErrorHandling` / `withAdminAuth` | `lib/api/middleware/` | Route wrappers |
| `withCSRF` | `lib/api/middleware/csrf.ts` | Mutation protection |
| Proposal notes | `lib/services/proposal-notes.service.ts` | Context-aware threading (context_type: 'stop') |

### Verified Resend Domain

- `wallawalla.travel` — verified, can send from any `*@wallawalla.travel` address
- `nwtouring.com` — pending verification

---

## 3. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADMIN (Trip Proposal Builder)                │
│                                                                     │
│  StopCard → "Request from Partner" button                          │
│    → Compose request (pre-filled from stop data)                   │
│    → Send email via Resend                                         │
│    → vendor_interactions log: interaction_type = 'email_sent'      │
│    → stop.reservation_status → 'requested'                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    Email with token URL
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PARTNER (Venue Contact)                         │
│                                                                     │
│  Option A: Click token URL → /partner-respond/[token]              │
│    → Web form: Confirm / Modify / Decline / Custom message         │
│    → Submits to POST /api/partner-respond/[token]                  │
│    → vendor_interactions log: interaction_type = 'partner_response' │
│    → stop.reservation_status updated automatically                 │
│                                                                     │
│  Option B: Reply to email (reply-to: stop-{id}@in.wallawalla.travel)│
│    → Resend inbound webhook → POST /api/webhooks/resend-inbound    │
│    → Auto-routed to vendor_interactions for that stop               │
│    → Admin sees reply in thread                                     │
│                                                                     │
│  Option C: Email arrives at generic inbox                           │
│    → Admin manually forwards via "Link Email" UI                    │
│    → Matched to stop, logged in vendor_interactions                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema

### Migration: `XXX-partner-booking-requests.sql`

```sql
-- ============================================================================
-- Partner Booking Requests
-- Token-based request/response system for venue partner communication
-- ============================================================================

-- 1. Partner request tokens (one per outbound request email)
CREATE TABLE IF NOT EXISTS partner_request_tokens (
  id              SERIAL PRIMARY KEY,
  token           VARCHAR(64) NOT NULL,
  stop_id         INTEGER NOT NULL REFERENCES trip_proposal_stops(id) ON DELETE CASCADE,
  proposal_id     INTEGER NOT NULL REFERENCES trip_proposals(id) ON DELETE CASCADE,

  -- Recipient
  partner_email   VARCHAR(255) NOT NULL,
  partner_name    VARCHAR(255),

  -- Request details (snapshot at time of send)
  request_type    VARCHAR(30) NOT NULL DEFAULT 'availability'
    CHECK (request_type IN ('availability', 'reservation', 'quote', 'custom')),
  request_subject VARCHAR(500),
  request_body    TEXT NOT NULL,

  -- State
  status          VARCHAR(30) NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'opened', 'responded', 'expired', 'revoked')),
  responded_at    TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,

  -- Metadata
  sent_by         INTEGER REFERENCES users(id),
  resend_message_id VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Token lookup (primary access path)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prt_token
  ON partner_request_tokens (token);

-- Find all requests for a stop
CREATE INDEX IF NOT EXISTS idx_prt_stop
  ON partner_request_tokens (stop_id);

-- Find active requests (not expired/revoked)
CREATE INDEX IF NOT EXISTS idx_prt_active
  ON partner_request_tokens (status, expires_at)
  WHERE status IN ('sent', 'opened');

-- 2. Partner responses (one per form submission — a token can have multiple responses)
CREATE TABLE IF NOT EXISTS partner_responses (
  id              SERIAL PRIMARY KEY,
  request_token_id INTEGER NOT NULL REFERENCES partner_request_tokens(id) ON DELETE CASCADE,
  stop_id         INTEGER NOT NULL REFERENCES trip_proposal_stops(id) ON DELETE CASCADE,

  -- Response
  action          VARCHAR(30) NOT NULL
    CHECK (action IN ('confirm', 'modify', 'decline', 'message')),
  message         TEXT,

  -- Structured fields (populated based on action)
  confirmed_date  DATE,
  confirmed_time  TIME,
  confirmed_party_size INTEGER,
  confirmation_code VARCHAR(100),
  alternate_date  DATE,
  alternate_time  TIME,
  quoted_amount   DECIMAL(10,2),

  -- Source
  response_source VARCHAR(30) NOT NULL DEFAULT 'web_form'
    CHECK (response_source IN ('web_form', 'inbound_email', 'manual_entry')),
  responder_name  VARCHAR(255),
  responder_email VARCHAR(255),
  responder_ip    INET,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_request
  ON partner_responses (request_token_id);

CREATE INDEX IF NOT EXISTS idx_pr_stop
  ON partner_responses (stop_id);

-- 3. Extend vendor_interactions with new types
ALTER TABLE vendor_interactions
  ALTER COLUMN interaction_type TYPE VARCHAR(30);

-- Drop and recreate the CHECK to add new types
ALTER TABLE vendor_interactions
  DROP CONSTRAINT IF EXISTS vendor_interactions_interaction_type_check;

ALTER TABLE vendor_interactions
  ADD CONSTRAINT vendor_interactions_interaction_type_check
  CHECK (interaction_type IN (
    'note', 'email_sent', 'email_received', 'phone_call', 'quote_received',
    'partner_response', 'request_sent', 'status_change'
  ));

-- Add optional FK to link interactions to specific request/response
ALTER TABLE vendor_interactions
  ADD COLUMN IF NOT EXISTS request_token_id INTEGER REFERENCES partner_request_tokens(id),
  ADD COLUMN IF NOT EXISTS response_id INTEGER REFERENCES partner_responses(id);

-- 4. Inbound email routing
CREATE TABLE IF NOT EXISTS inbound_email_log (
  id              SERIAL PRIMARY KEY,
  from_address    VARCHAR(255) NOT NULL,
  to_address      VARCHAR(255) NOT NULL,
  subject         VARCHAR(500),
  body_text       TEXT,
  body_html       TEXT,

  -- Routing
  routed_to_stop_id INTEGER REFERENCES trip_proposal_stops(id),
  routing_method  VARCHAR(30)
    CHECK (routing_method IN ('auto_address', 'manual_link', 'unmatched')),
  routed_at       TIMESTAMPTZ,
  routed_by       INTEGER REFERENCES users(id),

  -- Raw Resend webhook data
  resend_message_id VARCHAR(100),
  raw_headers     JSONB,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iel_to_address
  ON inbound_email_log (to_address);

CREATE INDEX IF NOT EXISTS idx_iel_unmatched
  ON inbound_email_log (routing_method)
  WHERE routing_method = 'unmatched';

-- 5. RLS (deny-all default — backend uses service_role)
ALTER TABLE partner_request_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_email_log ENABLE ROW LEVEL SECURITY;
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Tokens are per-request, not per-stop | A stop may have multiple rounds of communication (initial request → modify → re-request). Each outbound email gets its own token. |
| Responses stored separately from `vendor_interactions` | Responses have structured fields (confirmed_date, quoted_amount). The interaction log gets a summary entry linking to the response. |
| `vendor_interactions` extended, not replaced | Existing vendor log API (`GET/POST .../vendor-log`) continues to work. New interaction types added for request/response tracking. |
| `inbound_email_log` is a separate table | Inbound emails may arrive unmatched. Admin reviews and manually links them. Keeps the vendor thread clean. |
| Token expiry | Default 30 days. Prevents stale links from being actioned months later. |
| No partner account required | Partners respond via token — no login needed. This is critical for adoption (venue contacts won't create accounts for occasional requests). |

---

## 5. Request Emails

### Flow

1. Admin opens a stop's vendor panel in the trip proposal builder
2. Clicks "Send Request" — opens compose modal
3. Modal pre-fills: partner name/email (from stop's `vendor_email` or linked winery/restaurant/hotel), date, time, party size, special requests
4. Admin customizes subject and body (markdown-supported text)
5. On send:
   - Generate `crypto.randomBytes(32).toString('hex')` token
   - Insert `partner_request_tokens` row
   - Send email via `sendEmail()` with:
     - `from`: `bookings@wallawalla.travel`
     - `replyTo`: `stop-{stopId}@in.wallawalla.travel` (for inbound routing)
     - `to`: partner email
     - HTML body with branded template + response buttons
   - Insert `vendor_interactions` entry (type: `request_sent`)
   - Update `trip_proposal_stops.reservation_status` → `'requested'`
   - Update `trip_proposal_stops.vendor_email` if changed

### Email Template Structure

```
Subject: Reservation Request — [Customer Name], [Date], [Party Size] guests

Body:
  [WWT Logo]

  Hi [Partner Name],

  We'd like to arrange the following for our guest:

  ┌──────────────────────────────────────┐
  │  Date:       Saturday, July 15, 2026 │
  │  Time:       11:00 AM                │
  │  Party Size: 8 guests                │
  │  Duration:   ~60 minutes             │
  └──────────────────────────────────────┘

  [Custom message from admin]

  ─────────────────────────────────────

  Please respond using the buttons below:

  [ ✅ Confirm ]  [ ✏️ Suggest Changes ]  [ ❌ Can't Accommodate ]

  Or reply to this email — your response will be tracked automatically.

  ─────────────────────────────────────
  Walla Walla Travel | wallawalla.travel
```

The buttons link to:
- `{APP_URL}/partner-respond/{token}?action=confirm`
- `{APP_URL}/partner-respond/{token}?action=modify`
- `{APP_URL}/partner-respond/{token}?action=decline`

### Email Service Addition

New function in `lib/email/templates/partner-request.ts`:

```typescript
// Renders the HTML email for a partner booking request
export function renderPartnerRequestEmail(params: {
  partnerName: string;
  customerName: string;  // First name only (privacy)
  date: string;          // Formatted: "Saturday, July 15, 2026"
  time: string;          // Formatted: "11:00 AM"
  partySize: number;
  duration?: string;     // "~60 minutes"
  customMessage: string;
  responseUrl: string;   // Base URL with token
  stopType: string;      // "winery", "restaurant", "hotel"
}): { html: string; text: string }
```

---

## 6. Response Pages

### Route: `/partner-respond/[token]`

**Location:** `app/partner-respond/[token]/page.tsx`

This is a **public page** (no auth required) that validates the token and renders a response form.

### Page Flow

```
1. Load: GET /api/partner-respond/[token] → validate token, return request details
2. Display: Request summary (date, time, party size, original message)
3. Form: Based on ?action= query param (or default selector)
4. Submit: POST /api/partner-respond/[token] → save response
5. Confirm: Thank-you page with summary
```

### Form Variants

**Confirm (`?action=confirm`)**
- Confirmation code (optional text input)
- Any notes/special instructions (textarea)
- Submit: "Confirm Reservation"

**Modify (`?action=modify`)**
- Alternate date (date picker)
- Alternate time (time picker)
- Adjusted party size (number input)
- Explanation/notes (textarea)
- Submit: "Suggest Changes"

**Decline (`?action=decline`)**
- Reason (select: fully booked / too large / not available / other)
- Message (textarea)
- Submit: "Decline Request"

**Message (default / `?action=message`)**
- Free-form message (textarea)
- Submit: "Send Message"

### Page Design

- Clean, minimal, mobile-friendly (partners often check on phones)
- No login required — token IS the authentication
- Show request context at top: "Walla Walla Travel is requesting a reservation at [Venue] on [Date]"
- Brand: WWT logo, neutral colors, professional
- After submission: green confirmation with "You can close this page" message
- Token expired: friendly message with "Please contact us at info@wallawalla.travel"

### Success Page: `/partner-respond/[token]/success`

**Location:** `app/partner-respond/[token]/success/page.tsx`

- Confirmation message with summary of what was submitted
- "Send another message" link (back to `/partner-respond/[token]?action=message`)
- Contact info for follow-up

---

## 7. Stop-Level Conversation Threads

### Where It Lives

The conversation thread is displayed **inside the trip proposal builder** on each stop's expanded panel. It combines:

1. **`vendor_interactions`** — existing manual log entries
2. **`partner_request_tokens`** — outbound request records
3. **`partner_responses`** — inbound structured responses
4. **`inbound_email_log`** (routed) — email replies matched to this stop

### Thread Display (Admin View)

```
┌─────────────────────────────────────────────────────────────────┐
│  🔔 Vendor Communication — Leonetti Cellar                      │
│  Status: REQUESTED → awaiting response                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📤 Request Sent — Mar 4, 2026 at 2:15 PM         [by: Admin]  │
│  │  Reservation request for Jul 15, 8 guests at 11:00 AM       │
│  │  "Hi Chris, we have a group of wine enthusiasts..."          │
│  │                                                              │
│  ✅ Partner Confirmed — Mar 5, 2026 at 9:30 AM     [via: web]  │
│  │  Confirmation code: LC-2026-0715                             │
│  │  "Happy to accommodate! We'll have the reserve room..."     │
│  │                                                              │
│  📝 Note — Mar 5, 2026 at 10:00 AM                [by: Admin]  │
│  │  "Updated reservation_status to confirmed"                   │
│  │                                                              │
│  📧 Email Received — Mar 6, 2026 at 8:00 AM  [auto-routed]    │
│  │  From: chris@leonetti.com                                    │
│  │  "Quick update — we can also offer a barrel tasting..."     │
│                                                                 │
│  ─── Compose ─────────────────────────────────────────────────  │
│  [Add Note]  [Send Request]  [Log Phone Call]                   │
└─────────────────────────────────────────────────────────────────┘
```

### Unified Thread Query

A single API endpoint returns the combined, chronologically-sorted thread:

```sql
-- Pseudo-query for combined thread view
SELECT
  'interaction' as entry_type,
  vi.id, vi.interaction_type, vi.content, vi.created_at,
  u.name as author_name,
  vi.request_token_id, vi.response_id
FROM vendor_interactions vi
LEFT JOIN users u ON u.id = vi.contacted_by
WHERE vi.trip_proposal_stop_id = $1

UNION ALL

SELECT
  'request' as entry_type,
  prt.id, 'request_sent', prt.request_body, prt.created_at,
  u.name as author_name,
  prt.id as request_token_id, NULL
FROM partner_request_tokens prt
LEFT JOIN users u ON u.id = prt.sent_by
WHERE prt.stop_id = $1

UNION ALL

SELECT
  'response' as entry_type,
  pr.id, 'partner_response', pr.message, pr.created_at,
  pr.responder_name as author_name,
  pr.request_token_id, pr.id
FROM partner_responses pr
WHERE pr.stop_id = $1

ORDER BY created_at ASC
```

### Status Auto-Updates

When a partner response arrives, the stop's `reservation_status` is updated automatically:

| Response Action | New `reservation_status` | Additional Updates |
|----------------|------------------------|--------------------|
| `confirm` | `confirmed` | `reservation_confirmation` = confirmation code |
| `modify` | `pending` (back to negotiation) | — |
| `decline` | `cancelled` | — |
| `message` | (unchanged) | — |

---

## 8. Inbound Email Routing (Hybrid)

### Architecture

```
Partner replies to email
         │
         ▼
  reply-to: stop-{stopId}@in.wallawalla.travel
         │
         ▼
  Resend Inbound Webhook
  POST /api/webhooks/resend-inbound
         │
    ┌────┴────┐
    │ Parse   │
    │ to-addr │
    └────┬────┘
         │
    ┌────┴──────────────┐
    │ Match stop-{id}   │──── YES ──→ Create vendor_interaction
    │ pattern?          │              (type: 'email_received')
    └────┬──────────────┘              Update thread
         │ NO
         ▼
    Log as 'unmatched' in
    inbound_email_log
         │
         ▼
    Admin sees in "Unrouted Emails" queue
    → manually links to a stop
```

### Resend Inbound Setup

**Prerequisite:** Configure Resend inbound for `in.wallawalla.travel` subdomain.

1. Add MX record for `in.wallawalla.travel` pointing to Resend's inbound server
2. Configure webhook URL: `https://wallawalla.travel/api/webhooks/resend-inbound`
3. Resend delivers inbound emails as POST webhooks

**Reply-to address format:** `stop-{stopId}@in.wallawalla.travel`

- Deterministic: derived from stop ID, no lookup table needed
- Parse with regex: `/^stop-(\d+)@in\.wallawalla\.travel$/`

### Webhook Handler

**Route:** `POST /api/webhooks/resend-inbound`

```
1. Verify Resend webhook signature (svix)
2. Parse to-address → extract stop ID
3. If matched:
   a. Verify stop exists
   b. Insert vendor_interaction (type: 'email_received', content: email body)
   c. Insert inbound_email_log (routing_method: 'auto_address')
   d. Notify admin (optional: real-time via Supabase channel)
4. If not matched:
   a. Insert inbound_email_log (routing_method: 'unmatched')
   b. Admin reviews in queue
```

### Manual Email Forwarding UI

For emails that arrive at `info@wallawalla.travel` or other inboxes:

**Admin UI:** "Unrouted Emails" panel (accessible from trip proposal builder or standalone page)

1. Admin sees list of unmatched inbound emails
2. Clicks "Link to Stop" → selects proposal → selects stop
3. System creates `vendor_interaction` entry and updates `inbound_email_log.routed_to_stop_id`

Alternatively, admin can manually paste email content into the vendor log using the existing "Add Note" feature with `interaction_type: 'email_received'`.

---

## 9. API Routes

### New Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/admin/trip-proposals/[id]/stops/[stopId]/send-request` | Admin + CSRF | Compose and send partner request email |
| `GET` | `/api/partner-respond/[token]` | Token (public) | Validate token, return request details for form |
| `POST` | `/api/partner-respond/[token]` | Token (public) | Submit partner response |
| `GET` | `/api/admin/trip-proposals/[id]/stops/[stopId]/thread` | Admin | Combined conversation thread for a stop |
| `POST` | `/api/webhooks/resend-inbound` | Webhook signature | Receive inbound emails from Resend |
| `GET` | `/api/admin/inbound-emails` | Admin | List unrouted inbound emails |
| `POST` | `/api/admin/inbound-emails/[id]/route` | Admin + CSRF | Manually route an email to a stop |
| `POST` | `/api/admin/trip-proposals/[id]/stops/[stopId]/resend-request/[tokenId]` | Admin + CSRF | Resend a request email |

### Modified Routes

| Route | Change |
|-------|--------|
| `GET /api/admin/trip-proposals/[id]/stops/[stopId]/vendor-log` | Extend to return unified thread (interactions + requests + responses) |

### Route Details

#### `POST /api/admin/.../send-request`

```
Input (Zod):
  partner_email: string (email)
  partner_name: string (optional)
  request_type: 'availability' | 'reservation' | 'quote' | 'custom'
  subject: string
  body: string (the custom message)
  expires_in_days: number (default: 30)

Process:
  1. Validate stop belongs to proposal
  2. Generate token
  3. Render email HTML from template
  4. Send via Resend (capture message_id)
  5. Insert partner_request_tokens
  6. Insert vendor_interactions (type: 'request_sent')
  7. Update stop.reservation_status → 'requested'
  8. Update stop.vendor_email/vendor_name if different

Response: { success: true, data: { tokenId, messageId } }
```

#### `GET /api/partner-respond/[token]`

```
Process:
  1. Look up token in partner_request_tokens
  2. Check not expired, not revoked
  3. Record opened_at if first visit
  4. Return: request details, stop info (venue name, date, time, party size)
  5. Do NOT return: customer last name, proposal financials, internal notes

Response: {
  request: { type, subject, body, createdAt },
  stop: { venueName, date, time, partySize, stopType },
  tokenStatus: 'active' | 'expired' | 'responded',
  previousResponses: [{ action, message, createdAt }]  // if any
}
```

#### `POST /api/partner-respond/[token]`

```
Input (Zod):
  action: 'confirm' | 'modify' | 'decline' | 'message'
  message: string (optional for confirm, required for others)
  confirmation_code: string (optional, for confirm)
  alternate_date: string (optional, for modify)
  alternate_time: string (optional, for modify)
  party_size: number (optional, for modify)
  quoted_amount: number (optional)
  responder_name: string (required)
  responder_email: string (optional)

Process:
  1. Validate token (active, not expired)
  2. Insert partner_responses
  3. Insert vendor_interactions (type: 'partner_response')
  4. Update partner_request_tokens.status → 'responded'
  5. Auto-update stop.reservation_status based on action
  6. If confirm: update stop.reservation_confirmation
  7. If quoted_amount: update stop.quoted_amount, stop.quote_status → 'quoted'
  8. Send notification email to admin (staff email)

Response: { success: true, message: 'Response recorded' }
```

#### `POST /api/webhooks/resend-inbound`

```
Process:
  1. Verify webhook signature (Resend uses svix for signing)
  2. Parse webhook payload: { from, to, subject, text, html, headers }
  3. Extract stop ID from to-address pattern
  4. If matched stop:
     a. Insert vendor_interactions (type: 'email_received')
     b. Insert inbound_email_log (routing_method: 'auto_address')
  5. If no match:
     a. Insert inbound_email_log (routing_method: 'unmatched')

Response: 200 OK (webhook acknowledgment)
```

---

## 10. Frontend Pages & Components

### New Pages

| Page | Location | Auth | Description |
|------|----------|------|-------------|
| Partner Response Form | `app/partner-respond/[token]/page.tsx` | Public (token) | Multi-action response form |
| Partner Response Success | `app/partner-respond/[token]/success/page.tsx` | Public | Confirmation after submission |
| Unrouted Emails (Admin) | `app/admin/inbound-emails/page.tsx` | Admin | Queue of unmatched inbound emails |

### Modified Components

| Component | Location | Changes |
|-----------|----------|---------|
| StopCard (vendor section) | `components/trip-proposals/StopCard.tsx` | Add "Send Request" button, conversation thread panel, request status badge |
| useProposalForm | `components/trip-proposals/useProposalForm.ts` | Add vendor thread state management |

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `VendorThread` | `components/trip-proposals/VendorThread.tsx` | Renders combined conversation thread for a stop |
| `SendRequestModal` | `components/trip-proposals/SendRequestModal.tsx` | Compose/send request email modal |
| `RequestStatusBadge` | `components/trip-proposals/RequestStatusBadge.tsx` | Shows current request state (sent/opened/responded) |

### Partner Response Page Layout

```
┌──────────────────────────────────────────────┐
│  [WWT Logo]                                  │
│                                              │
│  Reservation Request                         │
│  from Walla Walla Travel                     │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  📍 Leonetti Cellar                    │  │
│  │  📅 Saturday, July 15, 2026           │  │
│  │  🕐 11:00 AM                          │  │
│  │  👥 8 guests                          │  │
│  │  ⏱  ~60 minutes                       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Message from Walla Walla Travel:            │
│  "Hi Chris, we have a group of wine          │
│   enthusiasts visiting from Portland..."     │
│                                              │
│  ── Your Response ─────────────────────────  │
│                                              │
│  ○ ✅ Confirm    ○ ✏️ Suggest Changes        │
│  ○ ❌ Decline    ○ 💬 Send Message           │
│                                              │
│  [Form fields based on selection]            │
│                                              │
│  Your Name: [________________]               │
│                                              │
│  [ Submit Response ]                         │
│                                              │
│  ─────────────────────────────────────────── │
│  Questions? Contact info@wallawalla.travel   │
└──────────────────────────────────────────────┘
```

---

## 11. Integration Points

### With Existing Systems

| System | Integration |
|--------|-------------|
| **Trip Proposal Builder** | VendorThread component embedded in StopCard. SendRequestModal triggered from stop actions. |
| **Vendor Interactions API** | Existing `GET/POST .../vendor-log` route extended to return unified thread. New interaction types added. |
| **Resend Email** | Uses existing `sendEmail()` from `lib/email.ts`. New template in `lib/email/templates/partner-request.ts`. |
| **Stop Data** | Reads `vendor_email`, `vendor_name`, `reservation_status` from stop. Auto-updates these on response. |
| **Winery/Restaurant/Hotel DB** | Pre-fills partner email from linked venue record if `vendor_email` is empty. |
| **Admin Notifications** | When partner responds, sends notification email to `STAFF_NOTIFICATION_EMAIL`. |
| **Audit Log** | All request sends and response processing logged via `auditService.logFromRequest()`. |

### With Future Systems

| System | How It Connects |
|--------|-----------------|
| **Partner Portal (Business Partners)** | If venue contact has a partner_profile, their responses could be linked. Not required for MVP. |
| **Google Calendar Sync** | Confirmed reservations could sync to venue's calendar. Future enhancement. |
| **AI Trip Builder** | AI could draft request emails using `partner-context.service.ts` venue knowledge. Future enhancement. |

---

## 12. Build Order

Designed for parallel development windows. Each track is independently deployable.

### Track 1: Database + Core Service (Foundation)

```
Migration file + TypeScript types + service class
├── Migration: XXX-partner-booking-requests.sql
├── Types: lib/types/partner-request.ts
├── Service: lib/services/partner-request.service.ts
│   ├── createRequest(stopId, partnerEmail, subject, body, sentBy)
│   ├── getByToken(token)
│   ├── recordResponse(token, action, data)
│   ├── getThread(stopId)
│   ├── expireStaleTokens()  // cron-ready
│   └── revokeToken(tokenId)
└── Tests: __tests__/lib/partner-request.service.test.ts
```

**Depends on:** Nothing (new tables only)
**Blocks:** Tracks 2, 3, 4

### Track 2: Admin Send Request (API + UI)

```
Admin-side: compose and send request emails
├── API: app/api/admin/trip-proposals/[id]/stops/[stopId]/send-request/route.ts
├── API: app/api/admin/trip-proposals/[id]/stops/[stopId]/thread/route.ts
├── Email template: lib/email/templates/partner-request.ts
├── Component: components/trip-proposals/SendRequestModal.tsx
├── Component: components/trip-proposals/VendorThread.tsx
├── Component: components/trip-proposals/RequestStatusBadge.tsx
└── StopCard modification: add vendor section with thread + send button
```

**Depends on:** Track 1
**Can parallel with:** Track 3 (after Track 1 done)

### Track 3: Partner Response Pages (Public)

```
Partner-facing: response form + API
├── API: app/api/partner-respond/[token]/route.ts (GET + POST)
├── Page: app/partner-respond/[token]/page.tsx
├── Page: app/partner-respond/[token]/success/page.tsx
├── Admin notification email on response
└── Tests: __tests__/api/partner-respond.test.ts
```

**Depends on:** Track 1
**Can parallel with:** Track 2 (after Track 1 done)

### Track 4: Inbound Email Routing (Enhancement)

```
Email reply handling + manual forwarding
├── Webhook: app/api/webhooks/resend-inbound/route.ts
├── Admin page: app/admin/inbound-emails/page.tsx
├── API: app/api/admin/inbound-emails/route.ts (GET)
├── API: app/api/admin/inbound-emails/[id]/route/route.ts (POST)
├── DNS: MX record for in.wallawalla.travel
└── Resend: Configure inbound webhook
```

**Depends on:** Track 1 (+ Track 2 for full UX)
**Can parallel with:** Track 3
**Infrastructure dependency:** Resend inbound MX record setup

### Parallel Execution Plan

```
Week 1:     [Track 1: DB + Service + Types]
              ↓
Week 2:     [Track 2: Admin Send]  ←→  [Track 3: Partner Response]
              ↓                           ↓
Week 3:     [Track 4: Inbound Email]  ←  [Integration testing]
              ↓
Week 4:     [Polish + E2E tests]
```

---

## 13. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| **Token brute-force** | 32-byte random tokens (256-bit entropy). Rate limit response endpoint. |
| **Token expiry** | Default 30-day expiry. Cron job to mark expired tokens. |
| **Information disclosure** | Partner response page shows venue name, date, time, party size only. No customer last name, no financials, no internal notes. |
| **CSRF on response form** | Not needed — token-based auth (no session cookies). Form submission is idempotent (multiple responses allowed). |
| **Webhook verification** | Resend webhooks signed with svix. Verify signature before processing. |
| **Inbound email injection** | Sanitize email body before storing. Strip HTML tags for display in thread. |
| **Reply-to address enumeration** | Stop IDs are sequential integers — but knowing `stop-123@in.wallawalla.travel` without access to the system is useless (no response page access without token). |
| **Admin routes** | All admin APIs use `withAdminAuth` + `withCSRF` for mutations. |
| **Rate limiting** | Apply `rateLimiters.api` to partner response endpoint. Apply stricter limit to send-request (prevent email spam). |
| **Audit logging** | All sends and responses logged via `auditService`. |

---

## Appendix: File Inventory

### New Files

```
migrations/XXX-partner-booking-requests.sql
lib/types/partner-request.ts
lib/services/partner-request.service.ts
lib/email/templates/partner-request.ts
app/api/admin/trip-proposals/[id]/stops/[stopId]/send-request/route.ts
app/api/admin/trip-proposals/[id]/stops/[stopId]/thread/route.ts
app/api/admin/trip-proposals/[id]/stops/[stopId]/resend-request/[tokenId]/route.ts
app/api/partner-respond/[token]/route.ts
app/partner-respond/[token]/page.tsx
app/partner-respond/[token]/success/page.tsx
app/api/webhooks/resend-inbound/route.ts
app/api/admin/inbound-emails/route.ts
app/api/admin/inbound-emails/[id]/route/route.ts
app/admin/inbound-emails/page.tsx
components/trip-proposals/VendorThread.tsx
components/trip-proposals/SendRequestModal.tsx
components/trip-proposals/RequestStatusBadge.tsx
__tests__/lib/partner-request.service.test.ts
__tests__/api/partner-respond.test.ts
```

### Modified Files

```
components/trip-proposals/StopCard.tsx          — add vendor thread panel + send request button
components/trip-proposals/useProposalForm.ts    — add vendor thread state
components/trip-proposals/types.ts              — add vendor thread types
app/api/admin/trip-proposals/[id]/stops/[stopId]/vendor-log/route.ts — extend thread query
```

### Infrastructure Changes

```
DNS: MX record for in.wallawalla.travel → Resend inbound server
Resend: Configure inbound webhook → /api/webhooks/resend-inbound
Env: RESEND_INBOUND_WEBHOOK_SECRET (for svix signature verification)
```
