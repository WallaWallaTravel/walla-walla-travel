# Task/Alert/Notification UX Audit

**Date:** 2026-03-05
**Status:** Complete

## Overview

Audit of all task, alert, and notification displays in the admin portal to ensure each includes:
- (a) The name of the entity it refers to
- (b) A direct link to that entity

## Locations Audited

### 1. Today's Priorities Dashboard (`app/admin/today/page.tsx`)

**Data source:** `lib/services/daily-digest.service.ts` -> `app/api/admin/today/route.ts`

| Section | Entity Name | Direct Link | Status |
|---------|-------------|-------------|--------|
| Overdue Tasks | contact_name + deal_title via JOIN | Title links to proposal or contact | FIXED |
| Today's Tasks | contact_name + deal_title via JOIN | Title links to proposal or contact | FIXED |
| Draft Proposals | customer_name | Edit button -> `/admin/trip-proposals/{id}` | OK |
| Upcoming Trips | customer_name | View button -> `/admin/trip-proposals/{id}` | OK |
| Admin Reminders | reminder message (self-contained) | N/A (no linked entity) | OK |

**What was fixed:**
- Daily digest service queries now JOIN `crm_contacts` and `crm_deals` for task data
- Tasks display contact name (linked to contact page) and deal title
- Task title is a clickable link to the related proposal (via `crm_deals.trip_proposal_id`) or contact

### 2. CRM Tasks Page (`app/admin/crm/tasks/page.tsx`)

| Element | Entity Name | Direct Link | Status |
|---------|-------------|-------------|--------|
| Task rows | contact_name, deal_title | Contact name links to `/admin/crm/contacts/{id}` | OK (already present) |

**Notes:** This page was already well-implemented. Task data comes from API with full JOIN to contacts, deals, users.

### 3. CRM Dashboard (`app/admin/crm/page.tsx`)

| Section | Entity Name | Direct Link | Status |
|---------|-------------|-------------|--------|
| Task alert badges | Count only (by design) | Links to `/admin/crm/tasks?overdue=true` | OK |
| Upcoming Tasks | contact_name, deal_title | Contact name now links to contact page | FIXED |
| Recent Activity | contact_name, performed_by | Text only (no link to contact) | OK (activity-level, not actionable) |

**What was fixed:**
- Contact name in upcoming tasks section is now a clickable `<Link>` to the contact page
- Deal title now displayed alongside contact name

### 4. Contact Detail Page (`app/admin/crm/contacts/[id]/page.tsx`)

| Section | Entity Name | Direct Link | Status |
|---------|-------------|-------------|--------|
| Tasks tab | Scoped to current contact | Implicit (already on contact page) | OK |

### 5. Daily Digest Email (`lib/email/templates/daily-digest-email.ts`)

| Section | Entity Name | Direct Link | Status |
|---------|-------------|-------------|--------|
| Overdue/Today Tasks | contact_name, deal_title | Title links to proposal or contact | FIXED |
| Draft Proposals | customer_name + proposal_number | No link (email format) | OK |
| Upcoming Trips | customer_name + proposal_number | No link (email format) | OK |

**What was fixed:**
- Task items in digest email now include contact name and deal title context line
- Task title is a clickable link to the relevant proposal or contact page

### 6. Vehicle Alerts (Operational)

Not displayed in the admin portal currently. Vehicle alerts exist in DB (`vehicle_alerts` table) but have no admin UI panel. Out of scope for this audit.

### 7. Competitor Alerts

Managed via competitor monitoring service, not shown as task-style cards. Out of scope.

### 8. Notifications (Emergency/Defect)

Driver-facing notifications (emergency help, critical defects) sent via SMS. Not shown in admin portal UI. Out of scope.

## Shared Component

Created `components/ui/TaskCard.tsx` — a shared component that enforces:
- Title (clickable link to related entity when available)
- Entity context (contact name + deal title)
- Due date label
- Priority badge
- Action buttons slot

All future task/alert displays should use this component.

## Database Schema Notes

The `crm_tasks` table links to entities via:
- `contact_id` -> `crm_contacts.id`
- `deal_id` -> `crm_deals.id` (deals have `trip_proposal_id` for proposal link)

There is no generic `related_entity_id`/`related_entity_type` polymorphic pattern. The existing `contact_id` + `deal_id` foreign keys are sufficient because:
- All tasks are associated with a contact and/or deal
- Deals store `trip_proposal_id`, `booking_id`, etc. for entity linking
- Task templates interpolate entity names into the title via `{{customerName}}`, `{{proposalNumber}}`
