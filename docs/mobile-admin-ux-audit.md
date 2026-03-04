# Mobile Admin UX Audit

**Date:** March 3, 2026
**Viewport tested:** 375px (iPhone SE / small Android)
**Scope:** All admin portal pages, forms, modals, and tables
**Method:** Static code analysis of CSS classes, responsive breakpoints, and layout patterns

---

## Table of Contents

1. [Navigation Gap Analysis](#1-navigation-gap-analysis)
2. [Critical Workflow Issues](#2-critical-workflow-issues)
3. [Broken Tables](#3-broken-tables)
4. [Broken Modals](#4-broken-modals)
5. [Non-Responsive Grids](#5-non-responsive-grids)
6. [Touch Target Violations](#6-touch-target-violations)
7. [Hardcoded Widths](#7-hardcoded-widths)
8. [Miscellaneous Issues](#8-miscellaneous-issues)
9. [Fix Priority Matrix](#9-fix-priority-matrix)

---

## 1. Navigation Gap Analysis

### Desktop Sidebar vs Mobile Bottom Nav

The sidebar (`components/admin/AdminSidebar.tsx`) has **30+ navigation items** organized into 10 sections. The mobile bottom nav (`AdminMobileNav`, same file, line 298) shows only **4 items + Logout**.

#### Bottom Nav Items (mobile)
| Item | Href |
|------|------|
| Dashboard | `/admin/dashboard` |
| Leads | `/admin/leads` |
| Proposals | `/admin/trip-proposals` |
| Trips | `/admin/bookings` |
| Logout | (action) |

#### Missing from Bottom Nav (26 sections/pages)

| Category | Missing Pages | Impact |
|----------|---------------|--------|
| **Operations** | Today's Priorities, Calendar | HIGH - daily workflow pages |
| **Sales Pipeline** | Pending/Drafts, Tasks, Shared Tours | HIGH - active sales management |
| **CRM** | CRM Dashboard, Contacts, Pipeline | MEDIUM - relationship management |
| **Financial** | Invoices, Pricing | HIGH - billing inaccessible on mobile |
| **Content** | Page Content, Business Portal, Media Library, Wine Directory, Lodging | MEDIUM - content management |
| **Geology** | Dashboard, Topics, Facts, Sites, AI Guidance | LOW - specialized module |
| **Marketing** | Marketing Hub, Leads (marketing) | MEDIUM |
| **Events** | Events, Organizers | MEDIUM |
| **Partners** | Partners | MEDIUM |
| **System** | Users, Settings, Integrations | LOW - rarely done on mobile |

**Key concern:** No hamburger menu or "More" option exists on mobile. The 26 missing pages are **completely unreachable** unless the user knows the URL and types it directly into the browser address bar.

**Recommended fix (P0):** Add a 5th "More" item to the bottom nav that opens a slide-up sheet with the full navigation grouped by section.

---

## 2. Critical Workflow Issues

### 2.1 Creating Proposals (Trip Proposals Editor)

**File:** `app/admin/trip-proposals/[id]/page.tsx`

| Issue | Detail | Severity |
|-------|--------|----------|
| **6 tabs overflow** (line 179-193) | 6 tab buttons use `flex-1` in a `flex` container. At 375px the tabs need ~420px minimum — labels truncate or overlap. | P0 |
| **Sidebar blocks content** (line 175) | `grid grid-cols-1 lg:grid-cols-3` puts the `ProposalSidebar` below content at mobile. But `sticky top-6` (ProposalSidebar.tsx:148) keeps it pinned to viewport as user scrolls past it — blocking content behind it. | P1 |
| **Header buttons crushed** (ProposalHeader.tsx:57-158) | 4-5 action buttons ("Send Proposal", "Preview", "Generate Itinerary", "Convert to Booking", "More") in a `flex` row. At 375px they compress to ~70px each with no wrapping. The "More" button icon is only 20px (w-5 h-5). | P1 |

**Verdict:** Creating/editing proposals on mobile is **severely impaired** — tabs are unreadable and key actions are inaccessible.

### 2.2 Managing Trips (Bookings)

**File:** `app/admin/bookings/page.tsx`

| Issue | Detail | Severity |
|-------|--------|----------|
| **Recent bookings table** (line ~500+) | 6-column table (Booking #, Customer, Tour Date, Status, Amount, Actions) with `px-5` padding per cell. At 375px each column gets ~55px — unreadable. | P0 |
| **Three-dot menu** (line 530-551) | Menu button is `p-1.5` = ~20px total size — well below 44px touch minimum. Dropdown is `w-44` (176px) positioned `absolute right-0` — can clip off-screen depending on row position. | P1 |
| **Payment filter chips** (line 361-388) | Multiple inline badge buttons with `flex items-center gap-2`. At 375px, badges overflow beyond viewport with no horizontal scroll indicator. | P1 |

### 2.3 Editing Stops (Days & Stops Tab)

**File:** `app/admin/trip-proposals/[id]/components/DaysStopsTab.tsx`

| Issue | Detail | Severity |
|-------|--------|----------|
| **Vendor tracking grid** (line 220) | `grid grid-cols-3 gap-2` with NO responsive breakpoint. Three inputs (vendor name, email, phone) each get ~105px — too narrow for text input. | P0 |
| **Quote status grid** (line 267) | `grid grid-cols-3 gap-2` — same problem. Select + amount input + button at ~105px each. | P0 |
| **Stop type selects** (line 106) | `grid grid-cols-2 md:grid-cols-4 gap-2` — 2 columns at 375px gives ~170px per select. Tight but functional. | P2 |

### 2.4 Viewing Invoices

**File:** `app/admin/invoices/page.tsx`

| Issue | Detail | Severity |
|-------|--------|----------|
| **Invoice card borders** (line 159-199) | `grid grid-cols-1 lg:grid-cols-12` uses `border-l border-r` on middle section. When stacked vertically on mobile, left/right borders span full width — visually confusing. | P2 |
| **"View Booking Details" button** (line ~209) | `py-2` gives ~32px height — below 44px touch target. | P1 |

### 2.5 Partner Portal Management

**File:** `app/admin/partners/page.tsx`

| Issue | Detail | Severity |
|-------|--------|----------|
| **Partner table** (line 109) | `min-w-[800px]` forces 800px minimum width — guaranteed horizontal scroll on mobile. 6 columns. | P0 |
| **Filter buttons** (line 87-97) | `px-4 py-2` gives ~32px height — below 44px touch target. | P2 |

### 2.6 Booking Console

**File:** `components/admin/BookingConsole/BookingConsole.tsx`

| Issue | Detail | Severity |
|-------|--------|----------|
| **Container padding** (line 232) | `px-6` (24px each side) = 48px lost. Content area only 327px. | P2 |
| **Checkboxes** (CustomerPanel.tsx:174, VehicleSelector.tsx:94) | `w-5 h-5` (20px) — below 44px WCAG touch target. | P1 |
| **Email overflow** (DriverSelector.tsx:54) | No `break-all` or `overflow-wrap` on email text — long emails overflow container. | P1 |

---

## 3. Broken Tables

Every admin table uses the same pattern: `<table>` with `px-4`–`px-6` per cell, no mobile card alternative. All overflow at 375px.

| Page | File | Columns | Min Width Needed | Has `overflow-x-auto`? | Priority |
|------|------|---------|------------------|------------------------|----------|
| Dashboard - Recent Bookings | `dashboard/page.tsx` | 6 | ~600px | No | P0 |
| Bookings List | `bookings/page.tsx` | 6 | ~600px | No | P0 |
| Partners | `partners/page.tsx` | 6 | 800px (hardcoded) | Yes | P0 |
| Trip Estimates | `trip-estimates/page.tsx` | 8 | ~800px | Yes | P0 |
| Pricing Tiers | `pricing/page.tsx` | 7 | ~700px | No | P1 |
| Users - Admins | `users/page.tsx` | 5 | ~500px | Yes | P1 |
| Users - Drivers | `users/page.tsx` | 5 | ~500px | Yes | P1 |
| Organizers | `organizers/page.tsx` | 7 | ~700px | Yes | P1 |
| Hotel Partners | `hotel-partners/page.tsx` | 6 | ~600px | No | P1 |
| Business Portal | `business-portal/page.tsx` | 6 | ~600px | No | P1 |
| Events | `events/page.tsx` | 6 | ~600px | No | P1 |
| CRM Contacts | `crm/contacts/page.tsx` | 6 | ~600px | No | P1 |
| Lodging | `lodging/page.tsx` | 7 | 900px (hardcoded) | Yes | P1 |
| Shared Tour Manifest | `shared-tours/[tour_id]/manifest/page.tsx` | 5 | ~500px | No | P1 |
| Billing Tab (Proposals) | `trip-proposals/[id]/components/BillingTab.tsx` | 7 | ~700px | Yes | P1 |
| Pricing Tab (Proposals) | `trip-proposals/[id]/components/PricingTab.tsx` | 4 | ~400px | Yes | P2 |
| Guests Tab (Proposals) | `trip-proposals/[id]/components/GuestsTab.tsx` | 3 | ~360px | Yes | P2 |

**Pattern:** Tables without `overflow-x-auto` will break the page layout entirely (content bleeds outside container). Tables WITH it still require horizontal scrolling but don't break the page.

**Recommended fix:** Short-term: ensure all tables have `overflow-x-auto`. Long-term: convert to stacked card layout on mobile for the most-used tables (bookings, proposals, contacts).

---

## 4. Broken Modals

All modals use `max-w-*` classes that exceed 375px. With `mx-4` (16px margin), the effective viewport is 343px.

| Modal | File:Line | `max-w` Class | Actual px | Overflow? | Priority |
|-------|-----------|---------------|-----------|-----------|----------|
| Send Proposal | `SendProposalModal.tsx:65` | `max-w-lg` | 512px | YES (169px) | P1 |
| Create Payment Group | `BillingTab.tsx:147` | `max-w-md` | 448px | YES (105px) | P1 |
| Record Payment | `BillingTab.tsx:105` | `max-w-sm` | 384px | Borderline (41px) | P2 |
| Add Guest | `GuestsTab.tsx:63` | `max-w-md` | 448px | YES (105px) | P1 |
| Delete Confirm | `DeleteConfirmModal.tsx:45` | `max-w-sm` | 384px | Borderline | P2 |
| Create Shared Tour | `shared-tours/page.tsx:764` | `max-w-2xl` | 672px | YES (329px) | P0 |
| Edit Shared Tour | `shared-tours/page.tsx:1279` | `max-w-md` | 448px | YES | P1 |
| Discount Modal | `shared-tours/page.tsx:1323` | `max-w-lg` | 512px | YES | P1 |
| Tour Detail Discount | `shared-tours/[tour_id]/page.tsx:849` | `max-w-md` | 448px | YES | P1 |
| Tour Detail Edit | `shared-tours/[tour_id]/page.tsx:943` | `max-w-lg` | 512px | YES | P1 |
| Lead Detail | `leads/page.tsx:624` | `max-w-2xl` | 672px | YES (329px) | P0 |
| CRM Pipeline Deal | `crm/pipeline/page.tsx:303` | `max-w-lg` | 512px | YES | P1 |
| Pricing Tier Edit | `pricing/page.tsx:645` | `max-w-2xl` | 672px | YES | P1 |

**Note:** CSS `w-full` constrains to parent width, so modals don't literally overflow — but the `max-w-*` class is misleading and combined with `p-6` internal padding (48px total), content area shrinks to ~295px. Many modal forms have `grid-cols-2` inside with no mobile breakpoint.

**Recommended fix:** Replace all modal `max-w-*` with `w-full sm:max-w-md` (or appropriate size). Reduce internal padding to `p-4 sm:p-6`.

---

## 5. Non-Responsive Grids

Grids that use a fixed column count with no responsive breakpoint, causing content to be unreadable at 375px.

| Page | File:Line | CSS Classes | Columns at 375px | Per-Column Width | Priority |
|------|-----------|-------------|-------------------|------------------|----------|
| Shared Tours stats | `shared-tours/page.tsx:629` | `grid grid-cols-4` | 4 | ~75px | P0 |
| Tour Detail stats | `shared-tours/[tour_id]/page.tsx:458` | `grid grid-cols-5` | 5 | ~63px | P0 |
| Manifest stats | `manifest/page.tsx:253` | `grid grid-cols-4` | 4 | ~75px | P0 |
| Wine Directory stats | `wine-directory/page.tsx:187` | `grid grid-cols-4` | 4 | ~79px | P1 |
| Lodging stats | `lodging/page.tsx:170` | `grid grid-cols-4` | 4 | ~79px | P1 |
| CRM Tasks summary | `crm/tasks/page.tsx:171` | `grid grid-cols-3` | 3 | ~105px | P1 |
| DaysStopsTab vendor | `DaysStopsTab.tsx:220` | `grid grid-cols-3` | 3 | ~105px | P0 |
| DaysStopsTab quote | `DaysStopsTab.tsx:267` | `grid grid-cols-3` | 3 | ~105px | P0 |
| Events address fields | `events/new/page.tsx:368` | `grid grid-cols-3` | 3 | ~91px | P1 |
| Calendar filters | `calendar/page.tsx:525` | `grid grid-cols-3` | 3 | ~105px | P1 |

**Recommended fix:** Add responsive breakpoints: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (or appropriate ratios).

---

## 6. Touch Target Violations

WCAG 2.1 requires a minimum 44x44px touch target. These elements fall below that threshold.

| Element | File:Line | Current Size | Actual px | Priority |
|---------|-----------|-------------|-----------|----------|
| Bookings 3-dot menu | `bookings/page.tsx:530` | `p-1.5` | ~20px | P0 |
| Proposal "More" button | `ProposalHeader.tsx:118` | `p-2` (w-5 h-5 icon) | ~20px | P1 |
| Customer panel checkbox | `CustomerPanel.tsx:174` | `w-5 h-5` | 20px | P1 |
| Vehicle selector checkbox | `VehicleSelector.tsx:94` | `w-5 h-5` | 20px | P1 |
| Guest tab checkboxes | `GuestsTab.tsx:191-216` | `h-4 w-4` | 16px | P1 |
| Billing modal checkboxes | `BillingTab.tsx:162-177` | `h-4 w-4` | 16px | P1 |
| Events action buttons | `events/page.tsx:221-233` | `px-2.5 py-1.5` | ~24px | P1 |
| Partner filter buttons | `partners/page.tsx:87-97` | `px-4 py-2` | ~32px | P2 |
| Organizer filter buttons | `organizers/page.tsx:181` | `px-3.5 py-2` | ~28px | P2 |
| Invoices secondary button | `invoices/page.tsx:~209` | `py-2` | ~32px | P2 |
| Wine directory filters | `wine-directory/page.tsx:210-221` | `px-4 py-2` | ~32px | P2 |
| Pricing toggle switch | `pricing/page.tsx:482` | `h-6 w-11` | 24px height | P2 |
| Proposal list action btns | `trip-proposals/page.tsx:660-721` | `p-2` | ~32px | P2 |
| Drafts action buttons | `drafts/page.tsx:276-299` | `px-3 py-1.5` | ~24px | P2 |

**Recommended fix:** Wrap small interactive elements in a larger clickable area (e.g., `<label>` with `p-3` around checkboxes). For icon buttons, use `min-w-[44px] min-h-[44px]`.

---

## 7. Hardcoded Widths

Fixed-width elements that don't adapt to mobile viewports.

| Element | File:Line | CSS Class | Width | Viewport % at 375px | Priority |
|---------|-----------|-----------|-------|---------------------|----------|
| Lodging table | `lodging/page.tsx:226` | `min-w-[900px]` | 900px | 240% (overflow) | P0 |
| Partner table | `partners/page.tsx:109` | `min-w-[800px]` | 800px | 213% (overflow) | P0 |
| Wine directory search | `wine-directory/page.tsx:229` | `w-64` | 256px | 68% | P1 |
| Lodging filter select | `lodging/page.tsx:198` | `min-w-[220px]` | 220px | 59% | P1 |
| Settings inputs | `settings/page.tsx:438,551,577,707,738` | `w-32` / `w-24` | 128/96px | 34/26% | P2 |
| Pricing discount input | `PricingCalculator.tsx:101` | `w-16` | 64px | 17% | P2 |
| Kanban columns | `crm/pipeline/page.tsx:208` | `w-72` | 288px | 77% | P2 |
| Manifest container | `manifest/page.tsx:232` | `p-8` | 64px padding total | 17% lost | P2 |

---

## 8. Miscellaneous Issues

### 8.1 Calendar Day Cells (calendar/page.tsx)
- **Line 679:** `min-h-[160px]` on day cells. At 375px, 7 columns = 53px per cell. Event text at `text-xs` (12px) in a 53px column is unreadable. Time strings like "10:30 AM" don't fit.
- **Priority:** P1
- **Fix:** Show month view as a list on mobile, or limit to 5-day/3-day view.

### 8.2 Kanban Board (crm/pipeline/page.tsx)
- **Line 208-209:** `flex gap-4` with `w-72` columns and `min-w-max`. Only 1 column visible at a time. No scroll indicator, no snap-scroll.
- **Priority:** P1
- **Fix:** Add scroll-snap, visual scroll indicators, or a list-based view toggle on mobile.

### 8.3 Proposal Tab Labels Truncation (trip-proposals/[id]/page.tsx)
- **Line 179-193:** 6 tabs ("Overview", "Days & Stops", "Guests", "Pricing", "Billing", "Notes") in a `flex` row with emoji icons. Total minimum width ~420px exceeds 375px viewport.
- **Priority:** P0
- **Fix:** Use horizontal scroll on the tab bar (`overflow-x-auto`) with `flex-shrink-0` on each tab, or switch to a dropdown selector on mobile.

### 8.4 Sticky Sidebar on Mobile (ProposalSidebar.tsx)
- **Line 148:** `sticky top-6` applies at all breakpoints. On mobile where the sidebar renders below main content (single column layout), it sticks to the viewport and blocks scrolling past it.
- **Priority:** P1
- **Fix:** Change to `lg:sticky lg:top-6` so sticky only applies on desktop.

### 8.5 Email Text Overflow (DriverSelector.tsx)
- **Line 54:** Email addresses rendered with no `break-all` or `overflow-wrap: break-word`. Long emails overflow their container.
- **Priority:** P1
- **Fix:** Add `break-all` or `overflow-wrap-anywhere` class.

### 8.6 Invoice Card Borders When Stacked (invoices/page.tsx)
- **Line 159-199:** `border-l border-r` on middle section of a `lg:grid-cols-12` grid. When stacked vertically on mobile, left/right borders span full width — looks wrong.
- **Priority:** P2
- **Fix:** Change to `lg:border-l lg:border-r border-t lg:border-t-0`.

### 8.7 Lead Detail Modal iOS Scroll (leads/page.tsx)
- **Line 624:** `max-h-[90vh] overflow-y-auto` on a `fixed` modal. iOS Safari has known issues with scroll inside fixed-position elements — content may not scroll on some devices.
- **Priority:** P1
- **Fix:** Use `-webkit-overflow-scrolling: touch` or a dedicated modal library with iOS scroll handling.

### 8.8 Booking Detail Nested Grids (bookings/[id]/page.tsx)
- **Line 261, 299:** Inner grids use `grid grid-cols-2` with no responsive breakpoint (unlike the parent which correctly uses `lg:grid-cols-3`). At 375px, each inner column gets ~163px — email addresses and phone numbers get cramped.
- **Priority:** P2
- **Fix:** Change to `grid-cols-1 md:grid-cols-2`.

---

## 9. Fix Priority Matrix

### P0 — Blocking / Workflow-Breaking (fix first)

| # | Issue | Pages Affected | Effort |
|---|-------|---------------|--------|
| 1 | **No "More" menu in bottom nav** — 26 pages unreachable on mobile | All admin pages | Medium |
| 2 | **Proposal editor tabs overflow** — can't switch between tabs | Trip proposal editor | Small |
| 3 | **DaysStopsTab vendor/quote grids** — `grid-cols-3` with no breakpoint | Proposal stop editing | Small |
| 4 | **Dashboard/bookings table overflow** — no `overflow-x-auto` | Dashboard, Bookings list | Small |
| 5 | **Partners table `min-w-[800px]`** — forced overflow | Partners list | Small |
| 6 | **Lodging table `min-w-[900px]`** — forced overflow | Lodging list | Small |
| 7 | **Shared tours stats grids** — `grid-cols-4`/`grid-cols-5` no breakpoint | Shared tours pages | Small |
| 8 | **Lead detail modal `max-w-2xl`** — exceeds viewport | Leads page | Small |
| 9 | **Create shared tour modal `max-w-2xl`** — exceeds viewport | Shared tours | Small |

### P1 — Degraded Experience (fix next)

| # | Issue | Pages Affected | Effort |
|---|-------|---------------|--------|
| 10 | **All remaining tables without `overflow-x-auto`** | ~8 pages | Small |
| 11 | **All modals with `max-w-md`/`max-w-lg`** — padding too aggressive | ~10 modals | Small |
| 12 | **Touch targets below 44px** — 3-dot menus, checkboxes, icon buttons | ~12 pages | Medium |
| 13 | **Sticky sidebar not `lg:`-scoped** | Proposal editor, Estimates | Small |
| 14 | **Calendar day cells** — 53px wide at 375px | Calendar page | Large |
| 15 | **Kanban board** — no scroll indicator | CRM Pipeline | Medium |
| 16 | **Proposal header action buttons** — crushed, no wrapping | Proposal editor | Small |
| 17 | **Email text overflow** — no word-break | Booking console | Small |
| 18 | **iOS modal scroll** — fixed + overflow-y-auto | Leads modal | Small |

### P2 — Cosmetic / Minor (fix when convenient)

| # | Issue | Pages Affected | Effort |
|---|-------|---------------|--------|
| 19 | **Hardcoded `w-64`/`w-32` inputs** | Wine directory, Settings | Small |
| 20 | **Invoice card borders on stack** | Invoices | Small |
| 21 | **Booking detail nested `grid-cols-2`** | Booking detail | Small |
| 22 | **Non-responsive stat grids** (`grid-cols-3`/`grid-cols-4`) | CRM, Wine Dir, Lodging | Small |
| 23 | **Filter/action button heights** (~28-32px) | ~6 pages | Small |
| 24 | **Events address `grid-cols-3`** | Event creation form | Small |
| 25 | **Manifest container `p-8`** | Tour manifest | Small |

---

## Estimated Total Effort

| Priority | Issues | Estimated Effort |
|----------|--------|-----------------|
| P0 | 9 | ~4-6 hours |
| P1 | 9 | ~6-8 hours |
| P2 | 7 | ~3-4 hours |
| **Total** | **25** | **~13-18 hours** |

---

## Quick Wins (< 30 min each)

These fixes are single-line CSS class changes:

1. Add `overflow-x-auto` wrapper to all tables missing it
2. Change `grid-cols-N` to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N` on stat grids
3. Change modal `max-w-lg` to `w-full sm:max-w-lg` and `p-6` to `p-4 sm:p-6`
4. Change `sticky top-6` to `lg:sticky lg:top-6` on proposal sidebar
5. Add `overflow-x-auto flex-shrink-0` to proposal tab container
6. Change DaysStopsTab `grid-cols-3` to `grid-cols-1 sm:grid-cols-3`
7. Add `break-all` to email display fields
