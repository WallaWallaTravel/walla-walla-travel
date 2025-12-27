# Strategic Roadmap: 2026 Growth Initiative

## Executive Summary

This roadmap addresses three interconnected priorities:
1. **ChatGPT Integration** - Get listed in the GPT Store/Apps to capture AI-driven bookings
2. **Central Calendar & Booking System** - Prevent double-bookings across 3 brands and 3 vehicles
3. **DOT Compliance & Audit Readiness** - Complete Auditor's Dream and prepare for potential audits

**Target Outcome:** Be the first Walla Walla wine tour service discoverable in ChatGPT, with bulletproof booking infrastructure and audit-ready compliance.

---

## Part 1: ChatGPT GPT Store Integration

### Why This Matters
- Booking.com and Expedia launched ChatGPT integrations in Oct 2025
- Users increasingly ask ChatGPT for travel recommendations
- First-mover advantage in Walla Walla wine tours = significant 2026 bookings

### Two Paths Available

| Path | Complexity | Features | Recommendation |
|------|-----------|----------|----------------|
| **GPT Actions** | Lower | API-only interaction | Good starting point |
| **MCP Apps SDK** | Higher | Rich UI, calendars, photos | Ultimate goal |

### Implementation Strategy

#### Phase 1: GPT with Actions (2-3 weeks)
Create a custom GPT that can:
- Search available tours by date, party size, duration
- Check real-time availability
- Provide pricing quotes
- Hand off to website for actual booking

**Required API Endpoints:**
```
GET  /api/chatgpt/tours          - List tour types and pricing
GET  /api/chatgpt/availability   - Check availability for date/party
GET  /api/chatgpt/quote          - Generate price quote
POST /api/chatgpt/inquiry        - Submit booking inquiry (leads to human follow-up)
```

**OpenAPI Schema Requirements:**
- Maximum 300 chars per endpoint description
- Maximum 700 chars per parameter description
- Use `x-openai-isConsequential: true` for booking actions
- Clear, descriptive operation IDs

#### Phase 2: Full MCP App (4-6 weeks)
Build an MCP server that provides:
- Visual tour listings with photos
- Interactive availability calendar
- Rich booking confirmation display
- OAuth for returning customers

**MCP Server Structure:**
```typescript
// Tools to implement
search_wine_tours      // readOnlyHint: true
get_tour_details       // readOnlyHint: true
check_availability     // readOnlyHint: true
request_booking        // openWorldHint: true, consequential
get_my_bookings        // requires OAuth
```

### GPT Store Optimization

**Naming Strategy:**
- Primary: "Walla Walla Wine Tour Booking"
- Alternative: "Wine Country Tour Planner - Walla Walla"

**Description Keywords:**
- Walla Walla wine tours
- Wine country transportation
- Private wine tasting tours
- Group wine tours Washington
- Sprinter van wine tours

**Ranking Factors:**
- Activity (keep GPT updated)
- Ratings (encourage reviews)
- Usage (promote externally)
- Relevance (optimize keywords)

### Submission Checklist

```
[ ] Verified OpenAI Organization account
[ ] ChatGPT Plus/Pro subscription
[ ] Builder Profile verification
[ ] Privacy Policy URL (wallawalla.travel/privacy)
[ ] Domain verification (DNS TXT record)
[ ] OpenAPI 3.1.0 schema
[ ] Logo/icon design
[ ] Testing guidelines document
```

---

## Part 2: Central Calendar & Booking System

### Current State Analysis

**Assets to Manage:**
| Vehicle | Capacity | VIN/ID |
|---------|----------|--------|
| Sprinter #1 | 14 passengers | TBD |
| Sprinter #2 | 14 passengers | TBD |
| Sprinter #3 | 11 passengers | TBD |

**Booking Sources:**
1. wallawalla.travel (Walla Walla Travel brand)
2. nwtouring.com (NW Touring & Concierge)
3. herdingcatswinetours.com (Herding Cats Wine Tours)
4. Direct phone/email inquiries
5. ChatGPT (future)

### Critical Gap: No Database-Level Double-Booking Prevention

**Current Problem:**
- Availability check is application-level only
- Race condition possible with simultaneous bookings
- No unique constraint on (vehicle_id, tour_date, time_range)

### Solution Architecture

#### 1. Central Availability Table

```sql
CREATE TABLE vehicle_availability_blocks (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  block_type VARCHAR(20) NOT NULL, -- 'booking', 'maintenance', 'hold'
  booking_id INTEGER REFERENCES bookings(id),
  brand_id INTEGER REFERENCES brands(id),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Prevent overlapping blocks on same vehicle
  CONSTRAINT no_overlap EXCLUDE USING gist (
    vehicle_id WITH =,
    block_date WITH =,
    tsrange(
      (block_date + start_time)::timestamp,
      (block_date + end_time)::timestamp
    ) WITH &&
  )
);

CREATE INDEX idx_availability_vehicle_date
  ON vehicle_availability_blocks(vehicle_id, block_date);
```

#### 2. Booking Creation Flow

```
1. Client requests availability
   ↓
2. Check vehicle_availability_blocks for conflicts
   ↓
3. BEGIN TRANSACTION
   ↓
4. INSERT into vehicle_availability_blocks (with block_type='hold')
   ↓
5. If successful, INSERT into bookings
   ↓
6. UPDATE availability block to link booking_id
   ↓
7. COMMIT (or ROLLBACK on any failure)
```

#### 3. Multi-Brand Vehicle Assignment

**Option A: Dedicated Vehicles per Brand**
- Sprinter #1 → Walla Walla Travel only
- Sprinter #2 → NW Touring only
- Sprinter #3 → Herding Cats only

**Option B: Shared Pool with Priority**
- All vehicles available to all brands
- Priority system for conflicts
- Admin approval for cross-brand sharing

**Recommendation:** Start with Option B (shared pool) for maximum flexibility.

```sql
-- Add brand association to vehicles
ALTER TABLE vehicles ADD COLUMN primary_brand_id INTEGER REFERENCES brands(id);
ALTER TABLE vehicles ADD COLUMN available_to_all_brands BOOLEAN DEFAULT true;
```

#### 4. Real-Time Calendar Sync

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    CENTRAL DATABASE                          │
│           vehicle_availability_blocks                        │
│                        │                                     │
└────────────────────────┼────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ WWT     │    │ NWT     │    │ Herding │
    │ Website │    │ Website │    │ Cats    │
    └─────────┘    └─────────┘    └─────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ Admin       │
                  │ Calendar    │
                  │ Dashboard   │
                  └─────────────┘
```

**Real-Time Updates:**
- Use database triggers or Supabase Realtime
- Broadcast availability changes to all connected clients
- Calendar auto-refreshes when bookings change

### Calendar UI Improvements

#### Admin Calendar Dashboard

```typescript
interface CalendarFeatures {
  views: ['day', 'week', 'month'];
  vehicles: {
    // Show all 3 vehicles as swim lanes
    showAsLanes: true;
    colorByBrand: true;
  };
  interactions: {
    dragToReschedule: true;
    clickToViewDetails: true;
    doubleClickToCreate: true;
  };
  filters: {
    byBrand: true;
    byVehicle: true;
    byStatus: true;
  };
  alerts: {
    showConflicts: true;
    showMaintenanceBlocks: true;
    showDriverHOSLimits: true;
  };
}
```

#### Public Availability Widget

For embedding on all brand websites:
```typescript
interface AvailabilityWidget {
  // Show available dates (green) vs booked (red)
  monthView: {
    availableDates: Date[];
    partiallyAvailable: Date[]; // Some vehicles available
    fullyBooked: Date[];
  };

  // When user selects date
  onDateSelect: (date: Date) => {
    showAvailableTimeSlots();
    showAvailableVehicles();
    showPricing();
  };
}
```

---

## Part 3: DOT Compliance & Audit Readiness

### Current Compliance Status

| Feature | Status | DOT Ready |
|---------|--------|-----------|
| Pre-trip Inspections | ✅ Complete | Yes |
| Post-trip Inspections | ✅ Complete | Yes |
| DVIR Generation | ✅ Complete | Yes |
| Time Cards (HOS) | ✅ Complete | Yes |
| Audit Logging | ✅ Complete | Yes |
| Driver Qualification Files | ❌ Missing | No |
| Medical Cert Tracking | ❌ Missing | No |
| 150-Air-Mile Tracking | ❌ Missing | No |
| Historical Data Entry | ❌ Missing | No |

### Priority 1: Driver Qualification Files (DQ Files)

**FMCSA Requirement (49 CFR 391.51):**
Every driver must have a qualification file containing:
- Employment application
- Motor vehicle record (MVR)
- Road test certification
- Medical examiner's certificate
- Annual review of driving record
- Hiring documentation

**Database Migration:**
```sql
-- Extend users table for DQ file tracking
ALTER TABLE users ADD COLUMN medical_cert_number VARCHAR(20);
ALTER TABLE users ADD COLUMN medical_cert_expiry DATE;
ALTER TABLE users ADD COLUMN medical_cert_url VARCHAR(500);
ALTER TABLE users ADD COLUMN license_number VARCHAR(50);
ALTER TABLE users ADD COLUMN license_state VARCHAR(2);
ALTER TABLE users ADD COLUMN license_expiry DATE;
ALTER TABLE users ADD COLUMN license_class VARCHAR(10);
ALTER TABLE users ADD COLUMN cdl_endorsements TEXT[];
ALTER TABLE users ADD COLUMN hired_date DATE;
ALTER TABLE users ADD COLUMN mvr_check_date DATE;
ALTER TABLE users ADD COLUMN mvr_check_url VARCHAR(500);
ALTER TABLE users ADD COLUMN background_check_date DATE;
ALTER TABLE users ADD COLUMN road_test_date DATE;
ALTER TABLE users ADD COLUMN annual_review_date DATE;
ALTER TABLE users ADD COLUMN dq_file_complete BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN dq_file_notes TEXT;

-- Create driver documents table for file storage
CREATE TABLE driver_documents (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id),
  document_type VARCHAR(50) NOT NULL,
    -- 'medical_cert', 'license', 'mvr', 'road_test', 'background_check',
    -- 'application', 'annual_review', 'training'
  document_name VARCHAR(255),
  document_url VARCHAR(500),
  issue_date DATE,
  expiry_date DATE,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_driver_docs_driver ON driver_documents(driver_id);
CREATE INDEX idx_driver_docs_type ON driver_documents(document_type);
CREATE INDEX idx_driver_docs_expiry ON driver_documents(expiry_date);
```

### Priority 2: 150-Air-Mile Exemption Tracking

**Rule:** Drivers operating within 150 air-miles of their work reporting location are exempt from paper logs IF they return to work location within 12 hours.

**BUT:** If a driver exceeds 150 air-miles more than 8 days in any 30-day period, they need ELDs or paper logs.

**Implementation:**
```sql
-- Track trip distances for exemption monitoring
CREATE TABLE trip_distances (
  id SERIAL PRIMARY KEY,
  time_card_id INTEGER NOT NULL REFERENCES time_cards(id),
  booking_id INTEGER REFERENCES bookings(id),

  -- Start location (typically work reporting location)
  start_lat DECIMAL(10,8),
  start_lng DECIMAL(11,8),
  start_location_name VARCHAR(255),

  -- Furthest point from start
  furthest_lat DECIMAL(10,8),
  furthest_lng DECIMAL(11,8),
  furthest_location_name VARCHAR(255),

  -- Calculated air miles (Haversine formula)
  max_air_miles DECIMAL(6,2),
  exceeds_150 BOOLEAN GENERATED ALWAYS AS (max_air_miles > 150) STORED,

  -- End location and time
  end_lat DECIMAL(10,8),
  end_lng DECIMAL(11,8),
  returned_within_12_hours BOOLEAN,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Monthly exemption status tracking
CREATE TABLE monthly_exemption_status (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id),
  year_month VARCHAR(7) NOT NULL, -- '2026-01'
  days_exceeding_150 INTEGER DEFAULT 0,
  is_exempt BOOLEAN GENERATED ALWAYS AS (days_exceeding_150 <= 8) STORED,
  requires_paper_logs BOOLEAN GENERATED ALWAYS AS (days_exceeding_150 > 8) STORED,
  calculated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(driver_id, year_month)
);
```

### Priority 3: Historical Data Entry

**Why Needed:**
- DOT audits can request records going back 6 months to 3 years
- Need to backfill paper records into digital system
- Establish compliance history before audits

**Historical Entry System:**
```sql
-- Add backdating capability to inspections
ALTER TABLE inspections ADD COLUMN is_historical_entry BOOLEAN DEFAULT false;
ALTER TABLE inspections ADD COLUMN historical_source VARCHAR(100); -- 'paper_form', 'excel_import'
ALTER TABLE inspections ADD COLUMN entered_by INTEGER REFERENCES users(id);
ALTER TABLE inspections ADD COLUMN entry_notes TEXT;

-- Add backdating capability to time_cards
ALTER TABLE time_cards ADD COLUMN is_historical_entry BOOLEAN DEFAULT false;
ALTER TABLE time_cards ADD COLUMN historical_source VARCHAR(100);
ALTER TABLE time_cards ADD COLUMN entered_by INTEGER REFERENCES users(id);
ALTER TABLE time_cards ADD COLUMN entry_notes TEXT;
```

**Admin Interface for Historical Entry:**
- Date picker (allow past dates)
- Driver selection
- Vehicle selection
- Standard inspection checklist
- Notes field for "Source: paper form dated X"
- Batch import from CSV/Excel

### Priority 4: Compliance Dashboard

```typescript
interface ComplianceDashboard {
  // Overview card
  overallStatus: 'compliant' | 'warning' | 'critical';

  // Driver compliance
  drivers: {
    totalActive: number;
    dqFileComplete: number;
    medicalCertExpiringSoon: Driver[]; // Within 30 days
    licenseExpiringSoon: Driver[];
    mvrOverdue: Driver[]; // Annual MVR check
    annualReviewOverdue: Driver[];
  };

  // Vehicle compliance
  vehicles: {
    totalActive: number;
    dotCompliant: number;
    insuranceExpiringSoon: Vehicle[];
    registrationExpiringSoon: Vehicle[];
    maintenanceOverdue: Vehicle[];
  };

  // HOS compliance
  hosSummary: {
    driversNearLimit: Driver[]; // Within 2 hours of limit
    driversOverLimit: Driver[]; // VIOLATION
    weeklyHoursUsed: Record<DriverId, number>;
  };

  // 150-mile exemption
  exemptionStatus: {
    driversAtRisk: Driver[]; // 6+ days this month
    driversRequiringLogs: Driver[]; // 8+ days
  };

  // Upcoming expirations
  alerts: {
    critical: Alert[]; // Expired or expires in 7 days
    warning: Alert[];  // Expires in 30 days
    info: Alert[];     // Expires in 60 days
  };
}
```

### DOT Audit Preparation Report

**Generate on-demand report containing:**
1. Company information (USDOT, MC#, operating authority)
2. Driver roster with DQ file status
3. Vehicle roster with inspection/maintenance records
4. Last 6 months of inspections (pre-trip, post-trip, DVIRs)
5. Last 6 months of time cards/HOS records
6. Any violations or incidents
7. Insurance certificates
8. Process agent designation

**Export Format:** PDF with table of contents

---

## Part 4: Integration Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CENTRAL DATABASE                             │
│                    (PostgreSQL on Heroku/Railway)                    │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ bookings │  │ vehicles │  │ users    │  │ vehicle_availability │ │
│  │          │  │          │  │ (drivers)│  │ _blocks              │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │inspections│ │time_cards│  │ brands   │  │ compliance_status    │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
   │ WALLA WALLA │        │ NW TOURING  │        │ HERDING     │
   │ TRAVEL      │        │ & CONCIERGE │        │ CATS        │
   │             │        │             │        │             │
   │ Next.js App │        │ (Future)    │        │ (Future)    │
   │ Admin Portal│        │             │        │             │
   │ Driver App  │        │             │        │             │
   │ Public Book │        │             │        │             │
   └─────────────┘        └─────────────┘        └─────────────┘
          │
          ▼
   ┌─────────────┐        ┌─────────────┐
   │ CHATGPT     │        │ AUDITOR'S   │
   │ INTEGRATION │        │ DREAM       │
   │             │        │             │
   │ MCP Server  │        │ Compliance  │
   │ GPT Actions │        │ Dashboard   │
   └─────────────┘        └─────────────┘
```

### Data Flow: Booking → Compliance

```
BOOKING CREATED
     │
     ▼
┌─────────────────────────────────────┐
│ 1. vehicle_availability_block      │
│    created (prevents double-book)   │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 2. Driver assigned                  │
│    - Check HOS availability         │
│    - Check 150-mile status          │
│    - Verify DQ file complete        │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 3. Day of tour                      │
│    - Driver clocks in               │
│    - Pre-trip inspection            │
│    - GPS tracking starts            │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 4. Tour execution                   │
│    - Track furthest point (air mi)  │
│    - Record any incidents           │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 5. Tour completion                  │
│    - Post-trip inspection           │
│    - Driver clocks out              │
│    - HOS hours calculated           │
│    - 150-mile status updated        │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 6. Compliance dashboard updated     │
│    - All records audit-ready        │
└─────────────────────────────────────┘
```

---

## Implementation Timeline

### Week 1-2: Database Foundation

**Tasks:**
- [ ] Create `vehicle_availability_blocks` table with exclusion constraint
- [ ] Add DQ file fields to `users` table
- [ ] Create `driver_documents` table
- [ ] Create `trip_distances` table
- [ ] Create `monthly_exemption_status` table
- [ ] Add historical entry fields to inspections/time_cards

**Deliverable:** Database migrations complete, schema ready

### Week 3-4: Booking System Hardening

**Tasks:**
- [ ] Implement transactional booking with availability blocks
- [ ] Update availability engine to use new constraint
- [ ] Add vehicle-to-brand association
- [ ] Create unified availability API for all brands
- [ ] Add real-time availability updates (websocket or polling)

**Deliverable:** Double-booking prevention working across all brands

### Week 5-6: Calendar & Admin UI

**Tasks:**
- [ ] Rebuild admin calendar with vehicle swim lanes
- [ ] Add drag-drop rescheduling
- [ ] Add conflict visualization
- [ ] Create public availability widget
- [ ] Add maintenance block management

**Deliverable:** Full-featured admin calendar, embeddable widget

### Week 7-8: Compliance Dashboard

**Tasks:**
- [ ] Build DQ file management UI
- [ ] Create document upload/storage (S3 or Supabase Storage)
- [ ] Build expiration alert system
- [ ] Create historical data entry interface
- [ ] Build compliance status dashboard

**Deliverable:** Complete compliance management system

### Week 9-10: ChatGPT Integration

**Tasks:**
- [ ] Create ChatGPT-specific API endpoints
- [ ] Write OpenAPI 3.1.0 schema
- [ ] Build GPT with Actions
- [ ] Verify domain with OpenAI
- [ ] Submit to GPT Store
- [ ] Begin MCP server development

**Deliverable:** GPT live in store, MCP server prototype

### Week 11-12: Historical Data & Polish

**Tasks:**
- [ ] Enter historical inspection data
- [ ] Enter historical time card data
- [ ] Verify 6-month compliance history
- [ ] Generate test audit report
- [ ] Performance optimization
- [ ] Bug fixes

**Deliverable:** Audit-ready system with historical data

---

## Success Metrics

### ChatGPT Integration
- [ ] GPT approved and live in store
- [ ] First booking inquiry via ChatGPT
- [ ] 10+ bookings attributed to ChatGPT in Q1 2026

### Booking System
- [ ] Zero double-bookings after implementation
- [ ] All 3 brands using central calendar
- [ ] Sub-second availability checks

### Compliance
- [ ] 100% DQ files complete for all drivers
- [ ] Zero expired documents
- [ ] 6+ months historical data entered
- [ ] DOT audit report generates successfully

---

## Resources Needed

### Development
- Claude Code for implementation
- Database migration tools
- S3 or Supabase Storage for documents

### External Services
- OpenAI API (for ChatGPT integration)
- AWS S3 or Supabase Storage (document storage)
- Resend (email notifications for expirations)

### Data Entry
- Access to historical paper records
- Driver documentation (medical certs, licenses)
- Vehicle documentation (registration, insurance)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| ChatGPT review rejection | Follow all guidelines, start with simple GPT Actions |
| Double-booking during migration | Implement availability blocks first, then migrate bookings |
| Historical data gaps | Prioritize last 6 months, work backward |
| DOT audit before ready | Fast-track DQ files and inspection history |
| Multi-brand coordination | Start with WWT, prove system, then add other brands |

---

## Next Steps

1. **Today:** Review and approve this roadmap
2. **This Week:** Begin database migrations (Part 2 & 3 foundations)
3. **Next Week:** Start booking system hardening
4. **Ongoing:** Enter historical data as features are built

---

*Last Updated: December 26, 2025*
*Document Owner: Walla Walla Travel Development Team*
