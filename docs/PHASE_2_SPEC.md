# Phase 2: Booking & Scheduling System
## Technical Specification Document

**Version:** 1.0
**Target Release:** Q4 2025
**Development Timeline:** 12 weeks
**Priority:** High (Revenue-Generating Feature)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Requirements](#business-requirements)
3. [User Stories](#user-stories)
4. [System Architecture](#system-architecture)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [User Interface Requirements](#user-interface-requirements)
8. [Third-Party Integrations](#third-party-integrations)
9. [Implementation Sequence](#implementation-sequence)
10. [Testing Requirements](#testing-requirements)
11. [Security Considerations](#security-considerations)
12. [Performance Requirements](#performance-requirements)

---

## Executive Summary

Phase 2 introduces a comprehensive booking and scheduling system that transforms manual tour booking processes into an automated, online reservation platform. This system will handle public bookings, real-time availability, payment processing, scheduling conflicts, and customer management.

### Key Objectives

- **Automate Booking:** Replace phone/email bookings with 24/7 online reservations
- **Prevent Conflicts:** Intelligent scheduling to eliminate double-bookings
- **Process Payments:** Secure credit card processing with Stripe
- **Optimize Operations:** Maximize fleet and driver utilization
- **Enhance Customer Experience:** Instant confirmations, PDF itineraries, automated reminders

### Success Metrics

- **Booking Conversion Rate:** 25%+ (industry average: 12-18%)
- **Average Booking Value:** $450 per reservation
- **Monthly Bookings:** 80+ in first 3 months
- **Customer Satisfaction:** 4.5+ stars on booking experience
- **System Uptime:** 99.9% availability

---

## Business Requirements

### BR-1: Public Booking Interface

**Description:** Customers can book wine tours online without requiring an account.

**Requirements:**
- Guest checkout with email verification
- Optional account creation for faster rebooking
- Mobile-responsive design (60%+ of traffic is mobile)
- ADA-compliant accessibility (WCAG 2.1 Level AA)
- Multi-language support (English, Spanish) - Phase 2.1

**Business Rules:**
- Minimum 48-hour advance booking requirement
- Maximum 120-day advance booking window
- Bookings require 50% deposit (configurable)
- Cancellation allowed up to 72 hours before tour (full refund minus processing fee)
- 72-24 hours before: 50% refund
- Less than 24 hours: No refund

### BR-2: Real-Time Availability

**Description:** System calculates availability based on vehicle, driver, and booking conflicts.

**Requirements:**
- Check vehicle availability (maintenance schedules, existing bookings)
- Check driver availability (HOS limits, existing assignments, time off)
- Calculate travel time between bookings
- Account for inspection and cleaning time (60 minutes minimum)
- Display only available time slots to customers

**Business Rules:**
- Vehicles cannot be double-booked
- Drivers cannot exceed 10-hour driving day
- Minimum 60-minute buffer between bookings for same vehicle
- Block out holidays and company downtime
- Allow admin override for special circumstances

### BR-3: Flexible Tour Building

**Description:** Customers can customize tours with wineries, timing, and special requests.

**Requirements:**
- Select 2-6 wineries from curated list
- Choose tour duration (4, 6, or 8 hours)
- Specify party size (1-14 passengers based on vehicle)
- Add special requests (dietary restrictions, celebrations, accessibility needs)
- Optional lunch reservation integration

**Business Rules:**
- Minimum 2 wineries, maximum 6 wineries per tour
- Duration limits: 4-hour (2-3 wineries), 6-hour (3-4 wineries), 8-hour (4-6 wineries)
- Vehicle automatically selected based on party size
- Sprinter van (1-14 passengers): $600-$1,200
- Luxury sedan (1-4 passengers): $400-$800
- Price varies by duration and day of week (weekend premium)

### BR-4: Secure Payment Processing

**Description:** Accept credit cards and process payments through Stripe.

**Requirements:**
- PCI DSS compliant (Stripe handles card data)
- Support Visa, Mastercard, American Express, Discover
- Save payment methods for future bookings (with permission)
- Automatic deposit collection (50% at booking)
- Final payment processing (50% at 48 hours before tour)
- Refund processing for cancellations

**Business Rules:**
- All prices in USD
- 3% credit card processing fee (absorbed or passed to customer - configurable)
- Failed payment results in booking hold (24 hours to update payment)
- Automatic retry for failed final payments (3 attempts)

### BR-5: Admin Scheduling Dashboard

**Description:** Supervisors manage bookings, assign drivers/vehicles, handle conflicts.

**Requirements:**
- Multi-view calendar (daily, weekly, monthly)
- Drag-and-drop booking rescheduling
- Manual booking creation (phone bookings)
- Driver assignment interface
- Vehicle assignment interface
- Conflict detection and resolution tools
- Booking status management (pending, confirmed, in-progress, completed, cancelled)

**Business Rules:**
- Only admin/supervisor roles can create manual bookings
- All bookings require driver and vehicle assignment before tour date
- System sends alerts 48 hours before unassigned bookings
- Admin can override availability restrictions with reason logging

### BR-6: Customer Communication

**Description:** Automated emails and SMS notifications throughout booking lifecycle.

**Requirements:**
- Booking confirmation email (immediate)
- PDF itinerary attachment
- Reminder email (72 hours before tour)
- Reminder SMS (24 hours before tour) - optional
- Final payment confirmation
- Post-tour follow-up email with review request

**Email Templates:**
- Booking confirmation
- Payment receipt
- Booking modification
- Cancellation confirmation
- Final payment reminder
- Day-before reminder
- Driver assignment notification
- Post-tour thank you with review link

---

## User Stories

### Customer Stories

**US-1: Book a Tour**
> As a **wine enthusiast**, I want to **book a tour online** so that **I can secure my reservation without calling**.

**Acceptance Criteria:**
- [ ] I can select a date and party size
- [ ] I see available time slots in real-time
- [ ] I can choose my preferred wineries
- [ ] I receive instant pricing
- [ ] I can pay securely with credit card
- [ ] I receive immediate email confirmation

---

**US-2: Customize Itinerary**
> As a **customer**, I want to **customize my tour** so that **I can visit my preferred wineries**.

**Acceptance Criteria:**
- [ ] I can browse a list of wineries with photos and descriptions
- [ ] I can reorder my selected wineries
- [ ] I see estimated timing for each stop
- [ ] I can add special requests (birthday, anniversary, dietary needs)
- [ ] System validates my selections (max wineries, time constraints)

---

**US-3: Manage My Booking**
> As a **customer with a confirmed booking**, I want to **modify or cancel my tour** so that **I can adjust to changing plans**.

**Acceptance Criteria:**
- [ ] I can access my booking via email link or booking number
- [ ] I can change date/time (subject to availability)
- [ ] I can change party size (subject to vehicle capacity)
- [ ] I can cancel and receive appropriate refund
- [ ] I receive confirmation email for all changes

---

### Admin Stories

**US-4: View Daily Schedule**
> As a **supervisor**, I want to **see all bookings for a day** so that **I can plan operations**.

**Acceptance Criteria:**
- [ ] I see a chronological list of all bookings
- [ ] Each booking shows customer, vehicle, driver, time, status
- [ ] I can filter by vehicle or driver
- [ ] I can see unassigned bookings highlighted
- [ ] I can quickly identify conflicts

---

**US-5: Assign Driver and Vehicle**
> As a **supervisor**, I want to **assign drivers and vehicles to bookings** so that **tours can be fulfilled**.

**Acceptance Criteria:**
- [ ] I see available drivers for the booking time slot
- [ ] I see available vehicles for the booking time slot
- [ ] System prevents assignment if conflicts exist
- [ ] I can override conflicts with reason
- [ ] Customer receives driver assignment notification email

---

**US-6: Handle Phone Bookings**
> As a **supervisor**, I want to **create bookings manually** so that **I can accommodate phone reservations**.

**Acceptance Criteria:**
- [ ] I can create booking without payment requirement
- [ ] I can mark booking as "payment pending" or "paid offline"
- [ ] I can send booking confirmation to customer email
- [ ] Booking appears in calendar like online bookings

---

### Driver Stories

**US-7: View My Schedule**
> As a **driver**, I want to **see my assigned bookings** so that **I can prepare for tours**.

**Acceptance Criteria:**
- [ ] I see my upcoming bookings in workflow dashboard
- [ ] Each booking shows customer name, party size, pickup location, itinerary
- [ ] I can view customer special requests
- [ ] I can access customer contact information
- [ ] I receive notifications when assigned to new booking

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Public     │  │   Admin      │  │   Driver     │      │
│  │   Booking    │  │   Calendar   │  │   Schedule   │      │
│  │   Interface  │  │   Dashboard  │  │   View       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Booking    │  │  Availability│  │   Payment    │      │
│  │   API        │  │  Engine      │  │   API        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Calendar   │  │  Notification│  │   Customer   │      │
│  │   API        │  │  Service     │  │   API        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (PostgreSQL)                   │
│  • bookings           • customers          • pricing_rules   │
│  • booking_wineries   • availability_rules • payments        │
│  • booking_timeline   • blocked_dates      • refunds         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Third-Party Services                       │
│  • Stripe (Payments)  • SendGrid (Email)  • Twilio (SMS)    │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**1. Booking Engine**
- Manages booking creation, modification, cancellation
- Validates business rules
- Coordinates with availability engine
- Triggers payment processing
- Emits events for notifications

**2. Availability Engine**
- Calculates real-time availability
- Considers vehicle schedules, driver HOS, existing bookings
- Accounts for buffer times and maintenance
- Caches availability for performance
- Provides conflict detection

**3. Payment Processor**
- Stripe integration for card processing
- Handles deposit collection (50%)
- Schedules final payment (48 hours before tour)
- Processes refunds per cancellation policy
- Manages payment retries and failures

**4. Notification Service**
- Email generation and sending (SendGrid)
- SMS sending (Twilio)
- Template management
- Scheduling and queuing
- Delivery tracking

**5. Calendar Manager**
- Multi-view calendar rendering
- Drag-and-drop functionality
- Assignment interface
- Conflict visualization
- Export capabilities (iCal, Google Calendar)

---

## Database Schema

### New Tables

#### `bookings`

```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  booking_number VARCHAR(20) UNIQUE NOT NULL, -- e.g., "WWT-2025-10001"

  -- Customer Information
  customer_id INTEGER REFERENCES customers(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 14),

  -- Tour Details
  tour_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours DECIMAL(3,1) NOT NULL, -- 4.0, 6.0, or 8.0
  pickup_location VARCHAR(500) NOT NULL,
  dropoff_location VARCHAR(500),
  special_requests TEXT,

  -- Assignment
  driver_id INTEGER REFERENCES users(id),
  vehicle_id INTEGER REFERENCES vehicles(id),
  time_card_id INTEGER REFERENCES time_cards(id), -- Links to actual shift

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  gratuity DECIMAL(10,2) DEFAULT 0,
  taxes DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) NOT NULL,
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_paid_at TIMESTAMP,
  final_payment_amount DECIMAL(10,2) NOT NULL,
  final_payment_paid BOOLEAN DEFAULT FALSE,
  final_payment_paid_at TIMESTAMP,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- pending, confirmed, assigned, in_progress, completed, cancelled
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  cancelled_by INTEGER REFERENCES users(id),

  -- Source
  booking_source VARCHAR(50) DEFAULT 'online', -- online, phone, admin, api
  booked_by INTEGER REFERENCES users(id), -- For manual bookings

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  -- Indexes
  CONSTRAINT valid_party_size CHECK (party_size > 0),
  CONSTRAINT valid_duration CHECK (duration_hours IN (4.0, 6.0, 8.0)),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX idx_bookings_tour_date ON bookings(tour_date);
CREATE INDEX idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_driver ON bookings(driver_id);
CREATE INDEX idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX idx_bookings_booking_number ON bookings(booking_number);
```

#### `customers`

```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),

  -- Preferences
  preferred_wineries TEXT[], -- Array of winery names
  dietary_restrictions TEXT,
  accessibility_needs TEXT,
  vip_status BOOLEAN DEFAULT FALSE,

  -- Marketing
  email_marketing_consent BOOLEAN DEFAULT FALSE,
  sms_marketing_consent BOOLEAN DEFAULT FALSE,

  -- Statistics
  total_bookings INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(2,1),
  last_booking_date DATE,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Stripe
  stripe_customer_id VARCHAR(100)
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_vip ON customers(vip_status);
```

#### `booking_wineries`

```sql
CREATE TABLE booking_wineries (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  winery_id INTEGER NOT NULL REFERENCES wineries(id),
  visit_order INTEGER NOT NULL, -- 1, 2, 3, etc.
  estimated_arrival_time TIME,
  estimated_duration_minutes INTEGER DEFAULT 60,
  actual_arrival_time TIMESTAMP,
  actual_departure_time TIMESTAMP,
  notes TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(booking_id, visit_order)
);

CREATE INDEX idx_booking_wineries_booking ON booking_wineries(booking_id);
CREATE INDEX idx_booking_wineries_winery ON booking_wineries(winery_id);
```

#### `wineries`

```sql
CREATE TABLE wineries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  city VARCHAR(100) DEFAULT 'Walla Walla',
  state VARCHAR(2) DEFAULT 'WA',
  zip_code VARCHAR(10),

  -- Contact
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(500),

  -- Details
  description TEXT,
  specialties TEXT, -- Cabernet, Syrah, etc.
  tasting_fee DECIMAL(6,2),
  tasting_fee_waived_with_purchase BOOLEAN DEFAULT TRUE,
  reservation_required BOOLEAN DEFAULT FALSE,
  accepts_walkins BOOLEAN DEFAULT TRUE,

  -- Hours (JSON)
  hours_of_operation JSONB, -- {mon: "11-5", tue: "11-5", ...}

  -- Media
  logo_url VARCHAR(500),
  cover_photo_url VARCHAR(500),
  photos JSONB, -- Array of photo URLs

  -- Features
  features TEXT[], -- ["dog-friendly", "food-available", "outdoor-seating"]

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,

  -- Partnership
  commission_rate DECIMAL(4,2), -- 10.00 for 10%
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wineries_active ON wineries(is_active);
CREATE INDEX idx_wineries_featured ON wineries(is_featured);
```

#### `payments`

```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  customer_id INTEGER REFERENCES customers(id),

  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_type VARCHAR(50) NOT NULL, -- deposit, final_payment, refund
  payment_method VARCHAR(50) NOT NULL, -- card, cash, check

  -- Stripe
  stripe_payment_intent_id VARCHAR(100),
  stripe_charge_id VARCHAR(100),
  stripe_refund_id VARCHAR(100),

  -- Card Details (last 4 for reference)
  card_brand VARCHAR(20), -- visa, mastercard, amex
  card_last4 VARCHAR(4),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- pending, processing, succeeded, failed, refunded
  failure_reason TEXT,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  succeeded_at TIMESTAMP,
  failed_at TIMESTAMP,
  refunded_at TIMESTAMP,

  CONSTRAINT valid_payment_type CHECK (payment_type IN ('deposit', 'final_payment', 'refund')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded'))
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);
```

#### `pricing_rules`

```sql
CREATE TABLE pricing_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Conditions
  vehicle_type VARCHAR(50), -- sprinter, sedan, suv
  duration_hours DECIMAL(3,1), -- 4.0, 6.0, 8.0
  day_of_week INTEGER, -- 0=Sunday, 6=Saturday
  is_weekend BOOLEAN,
  is_holiday BOOLEAN,
  season VARCHAR(20), -- spring, summer, fall, winter

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  price_per_hour DECIMAL(10,2),
  price_per_person DECIMAL(10,2),
  minimum_price DECIMAL(10,2),
  maximum_price DECIMAL(10,2),

  -- Modifiers
  weekend_multiplier DECIMAL(4,2) DEFAULT 1.0, -- 1.2 for 20% increase
  holiday_multiplier DECIMAL(4,2) DEFAULT 1.0,

  -- Priority (higher priority rules override lower)
  priority INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_until DATE,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active);
CREATE INDEX idx_pricing_rules_priority ON pricing_rules(priority DESC);
```

#### `availability_rules`

```sql
CREATE TABLE availability_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- buffer_time, blackout_date, capacity_limit

  -- Buffer Time Rules
  buffer_minutes INTEGER, -- Minutes between bookings
  applies_to VARCHAR(50), -- vehicle, driver, all

  -- Blackout Date Rules
  blackout_date DATE,
  blackout_start_date DATE,
  blackout_end_date DATE,
  reason TEXT,

  -- Capacity Rules
  max_daily_bookings INTEGER,
  max_concurrent_bookings INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_rule_type CHECK (rule_type IN ('buffer_time', 'blackout_date', 'capacity_limit', 'maintenance_block'))
);

CREATE INDEX idx_availability_rules_type ON availability_rules(rule_type);
CREATE INDEX idx_availability_rules_active ON availability_rules(is_active);
```

#### `booking_timeline`

```sql
CREATE TABLE booking_timeline (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_description TEXT,
  event_data JSONB,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_timeline_booking ON booking_timeline(booking_id);
CREATE INDEX idx_booking_timeline_created_at ON booking_timeline(created_at);
```

---

## API Endpoints

### Public Booking API

#### `POST /api/bookings/check-availability`

Check availability for a specific date, time, and party size.

**Request:**
```json
{
  "date": "2025-11-15",
  "duration_hours": 6,
  "party_size": 8
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "available_times": [
      { "start": "09:00", "end": "15:00" },
      { "start": "10:00", "end": "16:00" },
      { "start": "11:00", "end": "17:00" }
    ],
    "suggested_vehicle": {
      "id": 1,
      "type": "sprinter",
      "capacity": 14,
      "name": "Mercedes-Benz Sprinter"
    },
    "pricing": {
      "base_price": 750.00,
      "estimated_gratuity": 112.50,
      "taxes": 67.50,
      "total": 930.00,
      "deposit_required": 465.00
    }
  }
}
```

#### `POST /api/bookings/create`

Create a new booking with payment.

**Request:**
```json
{
  "customer": {
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "+1-509-555-0123"
  },
  "booking": {
    "tour_date": "2025-11-15",
    "start_time": "10:00",
    "duration_hours": 6,
    "party_size": 8,
    "pickup_location": "Marcus Whitman Hotel, 6 West Rose Street, Walla Walla, WA 99362",
    "dropoff_location": "Same as pickup",
    "special_requests": "Celebrating anniversary, would love recommendations for red wines"
  },
  "wineries": [
    { "winery_id": 5, "visit_order": 1 },
    { "winery_id": 12, "visit_order": 2 },
    { "winery_id": 8, "visit_order": 3 },
    { "winery_id": 22, "visit_order": 4 }
  ],
  "payment": {
    "stripe_payment_method_id": "pm_1234567890",
    "save_payment_method": true
  },
  "marketing_consent": {
    "email": true,
    "sms": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 1234,
      "booking_number": "WWT-2025-10234",
      "status": "confirmed",
      "tour_date": "2025-11-15",
      "start_time": "10:00",
      "customer_name": "John Smith",
      "total_price": 930.00,
      "deposit_paid": true,
      "confirmation_sent": true
    },
    "payment": {
      "deposit_amount": 465.00,
      "payment_status": "succeeded",
      "stripe_payment_intent_id": "pi_1234567890"
    },
    "next_steps": [
      "Check your email for booking confirmation and itinerary",
      "Final payment of $465.00 will be processed 48 hours before tour",
      "You'll receive a reminder 72 hours before your tour"
    ]
  },
  "message": "Booking confirmed! We're excited to show you Walla Walla wine country."
}
```

#### `GET /api/bookings/:bookingNumber`

Retrieve booking details by booking number.

**Response:**
```json
{
  "success": true,
  "data": {
    "booking_number": "WWT-2025-10234",
    "status": "confirmed",
    "tour_date": "2025-11-15",
    "start_time": "10:00",
    "end_time": "16:00",
    "customer_name": "John Smith",
    "party_size": 8,
    "pickup_location": "Marcus Whitman Hotel",
    "wineries": [
      { "name": "Leonetti Cellar", "visit_order": 1, "estimated_time": "10:00" },
      { "name": "Cayuse Vineyards", "visit_order": 2, "estimated_time": "11:30" },
      { "name": "L'Ecole No. 41", "visit_order": 3, "estimated_time": "13:00" },
      { "name": "Woodward Canyon", "visit_order": 4, "estimated_time": "14:30" }
    ],
    "driver": {
      "name": "Eric Critchlow",
      "phone": "+1-509-555-0199",
      "vehicle": "Mercedes-Benz Sprinter (Sprinter 1)"
    },
    "pricing": {
      "total": 930.00,
      "deposit_paid": 465.00,
      "balance_due": 465.00,
      "balance_due_date": "2025-11-13"
    },
    "can_modify": true,
    "can_cancel": true,
    "cancellation_deadline": "2025-11-12T00:00:00Z"
  }
}
```

#### `PUT /api/bookings/:bookingNumber/modify`

Modify an existing booking.

**Request:**
```json
{
  "changes": {
    "tour_date": "2025-11-16",
    "party_size": 10,
    "special_requests": "Also celebrating birthday!"
  },
  "reason": "Date change requested by customer"
}
```

#### `POST /api/bookings/:bookingNumber/cancel`

Cancel a booking with optional refund.

**Request:**
```json
{
  "reason": "Customer request - schedule conflict",
  "refund_amount": 465.00
}
```

### Admin Booking API

#### `GET /api/admin/bookings`

Get all bookings with filters.

**Query Parameters:**
- `start_date`: Filter from date
- `end_date`: Filter to date
- `status`: Filter by status
- `driver_id`: Filter by driver
- `vehicle_id`: Filter by vehicle
- `page`, `limit`: Pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 145,
      "total_pages": 8
    },
    "stats": {
      "total_bookings": 145,
      "confirmed": 120,
      "pending": 15,
      "completed": 8,
      "cancelled": 2,
      "total_revenue": 125400.00
    }
  }
}
```

#### `POST /api/admin/bookings/manual`

Create manual booking (phone bookings).

#### `PUT /api/admin/bookings/:id/assign`

Assign driver and vehicle to booking.

**Request:**
```json
{
  "driver_id": 2,
  "vehicle_id": 1,
  "notify_driver": true,
  "notify_customer": true
}
```

### Calendar API

#### `GET /api/admin/calendar`

Get calendar view of all bookings.

**Query Parameters:**
- `view`: daily, weekly, monthly
- `date`: Focus date
- `driver_id`: Filter by driver
- `vehicle_id`: Filter by vehicle

### Pricing API

#### `POST /api/pricing/calculate`

Calculate price for booking parameters.

**Request:**
```json
{
  "date": "2025-11-15",
  "duration_hours": 6,
  "party_size": 8,
  "vehicle_type": "sprinter"
}
```

---

## User Interface Requirements

### Public Booking Flow

**Step 1: Tour Details**
- Date picker with disabled unavailable dates
- Party size selector (1-14)
- Duration selection (4, 6, or 8 hours)
- "Check Availability" button

**Step 2: Winery Selection**
- Grid/list of available wineries with photos
- Filter by: wine varietals, features (food, dog-friendly, etc.)
- Search functionality
- Drag to reorder selected wineries
- Map view showing selected route
- Estimated timeline preview

**Step 3: Customer Information**
- Name, email, phone (required)
- Pickup location (autocomplete address)
- Dropoff location (default: same as pickup)
- Special requests (textarea)
- Account creation option

**Step 4: Review & Payment**
- Booking summary
- Pricing breakdown
- Terms and conditions checkbox
- Stripe payment element
- "Confirm Booking" button
- Trust badges (secure payment, cancellation policy)

**Step 5: Confirmation**
- Success message
- Booking number prominently displayed
- Email confirmation sent
- Download PDF itinerary button
- Add to calendar links (Google, Apple, Outlook)
- Social sharing (optional)

### Admin Calendar Dashboard

**Calendar Views:**
- **Daily:** Hourly timeline with booking cards
- **Weekly:** 7-day grid with abbreviated booking info
- **Monthly:** Month grid with booking counts per day

**Booking Card Display:**
- Customer name
- Time range
- Party size icon
- Vehicle and driver (if assigned)
- Status badge (color-coded)
- Quick actions: view, edit, assign

**Filters & Search:**
- Date range picker
- Status filter (all, pending, confirmed, completed, cancelled)
- Driver filter
- Vehicle filter
- Text search (customer name, booking number)

**Actions:**
- Create manual booking
- Drag-and-drop to reschedule
- Bulk assign drivers/vehicles
- Export to CSV/Excel
- Print schedule

### Mobile Booking Experience

**Requirements:**
- Responsive design for screens 375px+
- Touch-friendly tap targets (minimum 44x44px)
- Simplified winery cards for mobile
- Sticky "Next Step" button
- Progress indicator (Step 1 of 5)
- One-tap phone dialing for support

---

## Third-Party Integrations

### Stripe Payment Processing

**Implementation:**
```javascript
// Client-side: Stripe Elements
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Server-side: Create PaymentIntent
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(depositAmount * 100), // Amount in cents
  currency: 'usd',
  customer: stripeCustomerId,
  metadata: {
    booking_id: booking.id,
    booking_number: booking.booking_number,
    payment_type: 'deposit'
  },
  description: `Wine tour deposit - ${booking.booking_number}`
});
```

**Webhook Events:**
- `payment_intent.succeeded` - Mark deposit as paid
- `payment_intent.payment_failed` - Send payment failure notification
- `charge.refunded` - Process refund in database

### SendGrid Email Service

**Templates:**
1. Booking Confirmation
2. Payment Receipt
3. Booking Modification
4. Cancellation Confirmation
5. 72-hour Reminder
6. Final Payment Reminder
7. Driver Assignment
8. Post-Tour Thank You

**Implementation:**
```javascript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: booking.customer_email,
  from: 'bookings@wallawallatravel.com',
  templateId: 'd-booking-confirmation',
  dynamicTemplateData: {
    customer_name: booking.customer_name,
    booking_number: booking.booking_number,
    tour_date: formatDate(booking.tour_date),
    start_time: formatTime(booking.start_time),
    total_price: formatCurrency(booking.total_price),
    wineries: booking.wineries,
    itinerary_pdf_url: booking.itinerary_pdf_url
  }
};

await sgMail.send(msg);
```

### Twilio SMS Notifications

**Use Cases:**
- 24-hour reminder
- Driver assignment notification
- Last-minute changes
- Day-of updates

**Implementation:**
```javascript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

await client.messages.create({
  body: `Reminder: Your Walla Walla wine tour is tomorrow at ${booking.start_time}! Your driver ${driver.name} will pick you up at ${booking.pickup_location}. Questions? Call ${SUPPORT_PHONE}`,
  from: process.env.TWILIO_PHONE_NUMBER,
  to: booking.customer_phone
});
```

---

## Implementation Sequence

### Week 1-2: Database & API Foundation

**Tasks:**
- [ ] Create database migrations for all new tables
- [ ] Seed winery database (50+ Walla Walla wineries)
- [ ] Implement availability engine
- [ ] Build pricing calculation engine
- [ ] Create booking API endpoints

**Deliverables:**
- Working availability checks
- Price calculation logic
- Database schema deployed

### Week 3-4: Public Booking Interface

**Tasks:**
- [ ] Build multi-step booking form
- [ ] Implement winery selection interface
- [ ] Add date/time picker with availability
- [ ] Create booking summary page
- [ ] Implement responsive mobile design

**Deliverables:**
- Functional booking flow (no payment)
- Mobile-responsive UI
- Winery selection working

### Week 5-6: Payment Integration

**Tasks:**
- [ ] Integrate Stripe Elements
- [ ] Implement deposit collection
- [ ] Build final payment scheduling
- [ ] Handle payment failures and retries
- [ ] Create refund processing

**Deliverables:**
- End-to-end payment flow
- Stripe webhook handling
- Payment error handling

### Week 7-8: Email & Notifications

**Tasks:**
- [ ] Design email templates (SendGrid)
- [ ] Implement booking confirmation emails
- [ ] Build reminder email scheduling
- [ ] Add SMS notifications (Twilio)
- [ ] Generate PDF itineraries

**Deliverables:**
- All email templates deployed
- Automated reminder system
- PDF generation working

### Week 9-10: Admin Calendar Dashboard

**Tasks:**
- [ ] Build multi-view calendar (daily, weekly, monthly)
- [ ] Implement drag-and-drop rescheduling
- [ ] Create driver/vehicle assignment interface
- [ ] Add manual booking creation
- [ ] Build conflict detection alerts

**Deliverables:**
- Functional admin calendar
- Assignment interface
- Manual booking capability

### Week 11-12: Testing, Polish & Launch

**Tasks:**
- [ ] End-to-end testing (booking flow)
- [ ] Payment testing (test mode)
- [ ] Performance optimization
- [ ] Load testing
- [ ] Security audit
- [ ] Documentation
- [ ] Beta testing with real customers
- [ ] Production deployment

**Deliverables:**
- Production-ready booking system
- Test coverage reports
- User documentation
- Beta feedback incorporated

---

## Testing Requirements

### Unit Tests

**Coverage Target:** 80%+

**Critical Test Cases:**
- Availability calculation (edge cases: overlapping bookings, buffer times)
- Pricing calculation (weekend rates, holidays, party size)
- Booking validation (party size limits, duration limits)
- Payment processing (success, failure, refunds)
- Email scheduling (correct timing, content)

### Integration Tests

- Stripe payment flow (test mode)
- SendGrid email delivery
- Twilio SMS sending
- Database transactions (booking creation, rollback on failure)

### End-to-End Tests

**User Flows:**
1. Complete booking from search to confirmation
2. Modify existing booking
3. Cancel booking and receive refund
4. Admin creates manual booking
5. Admin assigns driver and vehicle
6. Driver views assigned booking

**Tools:**
- Playwright for E2E browser testing
- Jest for unit/integration tests
- Supertest for API testing

### Performance Tests

**Load Testing:**
- 100 concurrent users booking
- 1000 availability checks per minute
- Calendar loading with 500+ bookings

**Benchmarks:**
- Availability check: < 500ms
- Booking creation: < 2s
- Calendar load: < 1s
- Payment processing: < 3s

---

## Security Considerations

### PCI DSS Compliance

- **Never store credit card numbers** - Use Stripe tokenization
- All payment data handled by Stripe (PCI Level 1 certified)
- Stripe.js loads directly from Stripe's servers
- Use HTTPS for all payment-related pages

### Data Protection

- **Booking data encryption:** Sensitive customer data encrypted at rest
- **PII handling:** Customer email, phone, address treated as PII
- **GDPR compliance:** Customer data export and deletion capabilities
- **Access control:** Admin-only access to customer payment history

### Fraud Prevention

- **Rate limiting:** Max 10 bookings per IP per hour
- **Payment verification:** 3D Secure for cards requiring authentication
- **Duplicate detection:** Prevent identical bookings within 5 minutes
- **Email verification:** Confirm customer email before final payment

### Input Validation

- **All inputs sanitized:** Prevent XSS and SQL injection
- **Zod schema validation:** Runtime type checking on all API inputs
- **Date validation:** Ensure tour_date is future date, within booking window
- **Party size validation:** 1-14 passengers, matches vehicle capacity

---

## Performance Requirements

### Response Time SLAs

- **Homepage load:** < 1.5s
- **Availability check:** < 500ms
- **Booking submission:** < 2s
- **Calendar load (month view):** < 1s
- **Admin dashboard:** < 2s

### Optimization Strategies

**Database:**
- Index all foreign keys and frequently queried columns
- Cache availability calculations (5-minute TTL)
- Use database connection pooling
- Optimize complex queries (booking with wineries, driver, vehicle)

**Frontend:**
- Code splitting for booking flow
- Lazy load winery images
- Prefetch next step in booking flow
- Service worker for offline capability (PWA)

**API:**
- Response compression (gzip)
- CDN for static assets (Cloudflare)
- Edge caching for winery data
- Debounce availability checks

---

## Appendix: Booking Number Generation

**Format:** `WWT-YYYY-NNNNN`
- `WWT`: Walla Walla Travel prefix
- `YYYY`: Year (2025)
- `NNNNN`: Sequential 5-digit number (padded with zeros)

**Examples:**
- `WWT-2025-00001` (first booking of 2025)
- `WWT-2025-10234` (10,234th booking of 2025)

**Implementation:**
```sql
CREATE SEQUENCE booking_number_seq_2025 START 1;

-- In booking creation:
booking_number = 'WWT-' + YEAR + '-' + LPAD(nextval('booking_number_seq_' + YEAR), 5, '0')
```

---

## Appendix: Email Templates

### Booking Confirmation Email

**Subject:** Your Walla Walla Wine Tour is Confirmed! [Booking #{{booking_number}}]

**Body:**
```
Hi {{customer_name}},

We're thrilled to confirm your Walla Walla wine tour!

BOOKING DETAILS:
Tour Date: {{tour_date_formatted}}
Start Time: {{start_time}}
Party Size: {{party_size}} guests
Pickup Location: {{pickup_location}}

YOUR ITINERARY:
1. {{winery_1}} - Estimated arrival {{time_1}}
2. {{winery_2}} - Estimated arrival {{time_2}}
3. {{winery_3}} - Estimated arrival {{time_3}}
4. {{winery_4}} - Estimated arrival {{time_4}}

PAYMENT:
Deposit Paid: ${{deposit_amount}}
Balance Due: ${{balance_amount}} (processed 48 hours before tour)

WHAT'S NEXT:
✓ Download your detailed itinerary (PDF attached)
✓ We'll send a reminder 72 hours before your tour
✓ Your driver will be assigned 7 days before your tour
✓ Need to make changes? Manage your booking: {{booking_url}}

Questions? Reply to this email or call us at {{support_phone}}.

Cheers to great wines and unforgettable experiences!

The Walla Walla Travel Team
```

---

**Document Version:** 1.0
**Last Updated:** October 17, 2025
**Next Review:** Development Kickoff (Q4 2025)
