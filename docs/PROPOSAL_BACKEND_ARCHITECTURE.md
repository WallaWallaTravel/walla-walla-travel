# Proposal System - Backend Architecture Discussion

**Date:** November 2, 2025  
**Status:** 🔍 Planning Phase

## Current State

### ✅ What We Have

#### 1. **Frontend Proposal Builder** (`/app/admin/proposals/new/page-v2.tsx`)
- **Status:** Fully built, NOT connected to backend
- **Features:**
  - Client information form
  - Multiple service items (wine tours, transfers, wait time)
  - Per-service party size
  - Flexible pricing (calculated, hourly, flat rate)
  - Discount system
  - Gratuity settings
  - Proposal details (title, introduction, notes)
  - Real-time price calculation
  - Beautiful UI with live preview
- **Issue:** Line 272 has `// TODO: Implement API call to create proposal`

#### 2. **Client-Facing Proposal View** (`/app/proposals/[proposal_id]/page.tsx`)
- **Status:** Fully built, reads from database
- **Features:**
  - Clean, professional design
  - Service items display
  - Multi-day itinerary module
  - Corporate event module
  - Pricing breakdown
  - Media integration (structure ready)
  - Footer with company info
- **API Endpoint:** Uses `GET /api/proposals/[proposal_id]`

#### 3. **Proposal Acceptance Flow** (`/app/proposals/[proposal_id]/accept/page.tsx`)
- **Status:** Fully built, connected to backend
- **Features:**
  - Multi-step wizard
  - Digital signature
  - Gratuity selection
  - Terms acceptance
- **API Endpoint:** Uses `POST /api/proposals/[proposal_id]/accept`

#### 4. **Database Schema**
- **Status:** ✅ Migrations created, need to verify if run
- **Tables:**
  - `proposals` - Main proposal data
  - `proposal_service_items` - Individual services
  - `proposal_media` - Attached photos/videos
  - `proposal_activity_log` - Audit trail
- **Migrations:**
  - `/migrations/create-proposals-table.sql` - Base structure
  - `/migrations/enhance-proposals-system.sql` - Enhanced features
  - `/migrations/add-proposal-modules.sql` - Corporate/multi-day modules

#### 5. **Existing API Endpoints**
```
GET    /api/proposals/[proposal_id]        - Fetch single proposal
GET    /api/proposals/[proposal_id]/media  - Fetch proposal media
POST   /api/proposals/[proposal_id]/accept - Accept proposal
```

### ❌ What We DON'T Have

1. **No CREATE endpoint** - `POST /api/proposals`
2. **No UPDATE endpoint** - `PATCH /api/proposals/[proposal_id]`
3. **No LIST endpoint** - `GET /api/proposals` (for admin dashboard)
4. **No DELETE endpoint** - `DELETE /api/proposals/[proposal_id]`
5. **No admin dashboard** - `/app/admin/proposals/page.tsx`
6. **No edit page** - `/app/admin/proposals/[proposal_id]/edit/page.tsx`

---

## 🏗️ Architecture Questions to Discuss

### 1. **Boilerplate Text Management**

**Current Situation:**
- Hardcoded in the frontend builder:
  - Default proposal title: "Walla Walla Wine Country Experience"
  - Default introduction: "Thank you for your interest..."
  - Service descriptions (e.g., "Visit 3 premier wineries")
  - Footer text, terms & conditions, etc.

**Options:**

#### Option A: Database-Driven Templates
```sql
CREATE TABLE proposal_templates (
  id SERIAL PRIMARY KEY,
  template_name VARCHAR(255),
  proposal_title TEXT,
  introduction TEXT,
  wine_tour_description TEXT,
  transfer_description TEXT,
  terms_and_conditions TEXT,
  footer_text TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Pros:**
- Admin can edit without code changes
- Multiple templates for different scenarios
- Version history possible
- Non-technical staff can update

**Cons:**
- More complex to build
- Need admin UI for template management
- More database queries

#### Option B: Configuration File
```typescript
// /lib/config/proposal-templates.ts
export const PROPOSAL_TEMPLATES = {
  default: {
    title: "Walla Walla Wine Country Experience",
    introduction: "Thank you for your interest...",
    wineTourDescription: "Visit 3 premier wineries...",
    termsAndConditions: "...",
    footerText: "..."
  },
  corporate: {
    title: "Corporate Wine Country Experience",
    introduction: "Thank you for considering...",
    // ...
  }
};
```

**Pros:**
- Simple, fast
- Easy to version control
- No database overhead
- Can still be edited (just need code deploy)

**Cons:**
- Requires code changes to update
- Not user-friendly for non-technical staff

#### Option C: Hybrid Approach
- **Core templates** in config file (rarely change)
- **User-editable fields** in database (proposal intro, special notes)
- **System text** (T&C, policies) in database with admin UI

**Pros:**
- Balance of flexibility and simplicity
- Important legal text is editable
- Marketing copy can be customized per proposal
- System stays fast

**Cons:**
- More complex architecture
- Need to decide what goes where

### 2. **Proposal Editing Controls**

**Questions:**

#### A. **Can proposals be edited after creation?**
- **Before client views:** Yes/No?
- **After client views:** Yes/No?
- **After client accepts:** Yes/No?

#### B. **What fields are editable at each stage?**

**Possible Rules:**
```typescript
enum ProposalStatus {
  DRAFT = 'draft',           // Not sent yet
  SENT = 'sent',             // Sent to client
  VIEWED = 'viewed',         // Client opened it
  ACCEPTED = 'accepted',     // Client accepted
  EXPIRED = 'expired',       // Past valid_until date
  CANCELLED = 'cancelled'    // Admin cancelled
}

const EDIT_PERMISSIONS = {
  draft: {
    canEdit: ['all_fields'],
    canDelete: true
  },
  sent: {
    canEdit: ['special_notes', 'valid_until', 'media'],
    canDelete: false,
    requiresVersioning: true  // Track changes
  },
  viewed: {
    canEdit: ['special_notes'],
    canDelete: false,
    requiresVersioning: true,
    notifyClient: true  // Email client about changes
  },
  accepted: {
    canEdit: [],  // Locked
    canDelete: false,
    canCreateRevision: true  // New proposal based on this one
  }
};
```

#### C. **Version History?**
- Track all changes to proposals?
- Show client what changed?
- Keep audit log?

### 3. **Proposal Creation Workflow**

**Option A: Single-Step Save**
```typescript
// Admin clicks "Create Proposal"
// → Saves to database as 'draft'
// → Redirects to proposal detail page
// → Admin can preview, edit, or send
```

**Option B: Multi-Step Wizard**
```typescript
// Step 1: Client Info → Save as draft
// Step 2: Services → Update draft
// Step 3: Pricing → Update draft
// Step 4: Review → Send or save
```

**Option C: Auto-Save Draft**
```typescript
// As admin types, auto-save every 5 seconds
// → Prevents data loss
// → Can come back later
// → "Send to Client" button when ready
```

### 4. **Proposal Sending Mechanism**

**How does a proposal get to the client?**

#### Option A: Email with Link
```typescript
// Admin clicks "Send Proposal"
// → Proposal status changes to 'sent'
// → Email sent to client with unique link
// → Link: https://app.com/proposals/{uuid}
// → Client can view, accept, or decline
```

#### Option B: PDF + Email
```typescript
// Admin clicks "Generate PDF"
// → PDF created with all details
// → Email sent with PDF attachment
// → Also include web link for acceptance
```

#### Option C: Client Portal
```typescript
// Client has login to portal
// → New proposals appear in their dashboard
// → Notification email sent
// → Client logs in to view/accept
```

### 5. **Admin Dashboard Structure**

**What should `/app/admin/proposals/page.tsx` show?**

#### Proposed Layout:
```
┌─────────────────────────────────────────────────────────┐
│ 📝 Proposals                           [+ New Proposal] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Filters: [All] [Draft] [Sent] [Accepted] [Expired]     │
│ Search: [___________________] 🔍                        │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 🟢 DRAFT    John Smith - Wine Tour Package         │ │
│ │            Created: Nov 1, 2025                     │ │
│ │            Total: $3,134.14                         │ │
│ │            [Edit] [Send] [Delete]                   │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 🟡 SENT     Sarah Johnson - Corporate Event        │ │
│ │            Sent: Oct 28, 2025 | Expires: Nov 4     │ │
│ │            Total: $1,388.48                         │ │
│ │            [View] [Edit] [Resend] [Cancel]         │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 🟢 ACCEPTED Mike Davis - Multi-Day Tour           │ │
│ │            Accepted: Oct 25, 2025                   │ │
│ │            Total: $5,234.50 | Deposit: $2,617.25   │ │
│ │            [View] [Convert to Booking]              │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 🔴 EXPIRED  Lisa Brown - Wine Tour                 │ │
│ │            Expired: Oct 20, 2025                    │ │
│ │            Total: $1,089.00                         │ │
│ │            [View] [Create New Version]              │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6. **Data Persistence Strategy**

**How do we store service items?**

#### Option A: JSON Column (Current Schema)
```sql
-- proposals table
service_items JSONB  -- All services in one JSON blob
```

**Pros:**
- Simple to save/retrieve
- Flexible structure
- Easy to version

**Cons:**
- Hard to query individual services
- Can't easily filter by service type
- Can't join with other tables

#### Option B: Separate Table (Also in Schema)
```sql
-- proposal_service_items table
CREATE TABLE proposal_service_items (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER REFERENCES proposals(id),
  service_type VARCHAR(50),
  date DATE,
  party_size INTEGER,
  calculated_price DECIMAL(10,2),
  -- ... all service fields
);
```

**Pros:**
- Queryable
- Relational integrity
- Can generate reports
- Can filter/search

**Cons:**
- More complex to save
- Multiple database writes
- Need to handle deletions

**Recommendation:** Use **Option B** (separate table) for production, but keep JSON as a backup/snapshot.

### 7. **Pricing Calculation**

**Where should pricing be calculated?**

#### Current: Frontend Only
```typescript
// In page-v2.tsx
const calculateServicePrice = (item: ServiceItem): number => {
  // Pricing logic here
};
```

**Issue:** Not reusable, not validated on backend

#### Proposed: Shared Library
```typescript
// /lib/pricing/calculate-service-price.ts
export function calculateServicePrice(item: ServiceItem): number {
  // Pricing logic here
  // Used by both frontend AND backend
}
```

**Backend validates on save:**
```typescript
// POST /api/proposals
const recalculatedPrice = calculateServicePrice(serviceItem);
if (Math.abs(recalculatedPrice - serviceItem.calculated_price) > 0.01) {
  throw new Error('Price mismatch - please refresh');
}
```

---

## 🎯 Recommended Architecture

### Phase 1: Core Backend (Immediate)

1. **Create API Endpoints:**
   - `POST /api/proposals` - Create new proposal
   - `PATCH /api/proposals/[proposal_id]` - Update proposal
   - `GET /api/proposals` - List all proposals (admin)
   - `DELETE /api/proposals/[proposal_id]` - Delete draft proposals

2. **Proposal Status Workflow:**
   ```
   DRAFT → SENT → VIEWED → ACCEPTED
              ↓
           EXPIRED
              ↓
           CANCELLED
   ```

3. **Edit Permissions:**
   - **DRAFT:** Full edit + delete
   - **SENT/VIEWED:** Limited edit (notes, dates, media)
   - **ACCEPTED:** Read-only (can create revision)

4. **Boilerplate Text:**
   - **Hybrid approach:**
     - Core templates in `/lib/config/proposal-templates.ts`
     - User-editable intro/notes in database
     - T&C and policies in database with admin UI (Phase 2)

5. **Data Storage:**
   - Use `proposal_service_items` table (relational)
   - Keep JSON snapshot in `proposals.service_items` for versioning
   - Both are saved on create/update

### Phase 2: Admin Dashboard (Next)

1. **Proposals List Page:**
   - Filter by status
   - Search by client name
   - Sort by date, amount
   - Quick actions (edit, send, delete)

2. **Proposal Detail/Edit Page:**
   - View full proposal
   - Edit if status allows
   - Send to client
   - Track activity (views, acceptance)

3. **Template Management:**
   - Edit default text
   - Create custom templates
   - Manage T&C and policies

### Phase 3: Advanced Features (Future)

1. **Version History:**
   - Track all changes
   - Show diff to client
   - Revert to previous version

2. **Email Integration:**
   - Send proposal via email
   - Track opens
   - Automated reminders

3. **PDF Generation:**
   - Download as PDF
   - Email PDF attachment
   - Branded templates

4. **Analytics:**
   - Proposal acceptance rate
   - Average time to accept
   - Most popular services

---

## 🤔 Questions for You

Before we start building, please clarify:

### 1. **Boilerplate Text:**
   - Should admins be able to edit default text without code changes?
   - Or is config file approach okay for now?

### 2. **Editing Rules:**
   - Can proposals be edited after being sent to client?
   - Should client be notified of changes?
   - Should we track version history?

### 3. **Sending Proposals:**
   - Email with link? PDF? Both?
   - Should we build email system now or later?

### 4. **Admin Dashboard Priority:**
   - Do you need the proposals list page immediately?
   - Or can we focus on create/edit functionality first?

### 5. **Data Migration:**
   - Have the proposal migrations been run on your database?
   - Should we verify/run them now?

### 6. **Existing Proposals:**
   - Do you have any proposals in the database already?
   - Or are we starting fresh?

---

## 📋 Proposed Next Steps

**Once you answer the questions above, I recommend:**

1. ✅ Verify database migrations are run
2. ✅ Create `POST /api/proposals` endpoint
3. ✅ Connect frontend builder to backend
4. ✅ Test creating a proposal
5. ✅ Create `GET /api/proposals` (list) endpoint
6. ✅ Build admin proposals dashboard
7. ✅ Create `PATCH /api/proposals/[proposal_id]` endpoint
8. ✅ Build proposal edit page
9. ✅ Implement status workflow
10. ✅ Add "Send to Client" functionality

**This will give you a fully functional proposal system!**

---

Let me know your preferences and we can start building! 🚀

