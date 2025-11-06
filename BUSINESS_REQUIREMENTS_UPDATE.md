# Business Requirements Update
**Date:** October 31, 2025  
**Source:** Owner Requirements Session  
**Priority:** HIGH - Core Revenue Features

---

## 🎯 Critical Business Requirements

### 1. **Invoicing Workflow** (HIGH PRIORITY)

#### **Current Requirement:**
- **Final invoice sent 48 hours AFTER tour completion** (not before)
- Allows time to update actual client service hours
- Many tours are charged hourly (not flat rate)

#### **Workflow:**
```
Tour Completes →
  Driver logs actual hours in time clock →
  System syncs hours to booking →
  System auto-calculates final invoice →
  Admin reviews and approves (one-click) →
  Final invoice sent to client
```

#### **Key Features:**
1. **Automatic Hour Sync**
   - Driver's time clock data → Booking record
   - Actual service hours replace estimated hours
   - Real-time price recalculation

2. **Admin Approval Dashboard**
   - View all pending final invoices
   - See: estimated vs actual hours
   - One-click approve & send
   - Manual adjustment option

3. **Customer Tip System**
   - Tip field on final invoice
   - Auto-calculate suggestions: 15%, 20%, 25%
   - Display in info box
   - Optional (customer can skip or enter custom amount)

4. **Invoice Timeline**
   ```
   Booking Created → Deposit Invoice (50%)
   Tour Date → Tour Happens
   Tour + 48 hours → Final Invoice (50% + adjustments + tip)
   ```

---

### 2. **Interactive Lunch Ordering System** (HIGH PRIORITY)

#### **Workflow:**
```
Client logs into portal →
  Views their itinerary →
  Clicks "Order Lunch" →
  System pulls partner restaurant menus →
  Client selects items for group →
  System generates pre-filled email →
  Admin reviews and approves (one-click) →
  Email sent to restaurant
```

#### **Key Features:**
1. **Itinerary Integration**
   - Pull tour date, party size, timing
   - Show restaurants near wineries
   - Suggest lunch timing based on stops

2. **Menu Display**
   - Partner restaurant menus
   - Pricing visible
   - Dietary restrictions/preferences
   - Group ordering (multiple people)

3. **Email Generation**
   - Pre-filled with all details
   - Restaurant contact info
   - Party size, date, time
   - Food selections
   - Special requests

4. **Admin Approval**
   - Review order before sending
   - One-click send to restaurant
   - Track confirmation status
   - Commission tracking (10-15%)

---

### 3. **Driver Tour Acceptance System** (MEDIUM PRIORITY)

#### **Workflow:**
```
Admin creates booking →
  Admin offers tour to driver(s) →
  Driver sees pending offers in portal →
  Driver accepts or declines →
  System auto-assigns driver + vehicle →
  Updates all systems automatically →
  Notifications sent
```

#### **Key Features:**
1. **Offer Management**
   - Admin can offer to multiple drivers
   - First to accept gets the tour
   - Automatic withdrawal of other offers
   - Expiration timer (e.g., 24 hours)

2. **Driver Portal Updates**
   - "Pending Offers" section
   - Tour details visible
   - Accept/Decline buttons
   - Conflict warnings (HOS limits)

3. **Auto-Assignment**
   - Driver_id updated in bookings
   - Vehicle_id assigned based on party size
   - Calendar updated
   - Itinerary linked to driver

4. **Notifications**
   - Driver: "New tour offered"
   - Admin: "Driver accepted/declined"
   - Customer: "Driver assigned" (with name/photo)

---

### 4. **Advanced Client Portal** (PHASE 3)

#### **Immersive Trip Page Features:**

1. **AI-Assisted Winery Directory**
   - Hosted on site
   - Rich winery profiles
   - AI recommendations based on preferences
   - Tasting notes, photos, videos
   - Real-time availability

2. **Interactive Elements**
   - Live itinerary updates
   - Driver tracking (real-time)
   - In-app messaging
   - Photo sharing
   - Group chat

3. **Personalization**
   - Wine preference learning
   - Dietary restrictions saved
   - Favorite wineries
   - Past tour history
   - Rebooking suggestions

4. **Post-Tour Features**
   - Wine purchase tracking
   - Shipment coordination
   - Tasting notes saved
   - Review system
   - Referral incentives

---

## 📊 Updated Priority Matrix

### **Immediate (Next 2 Weeks):**
1. ✅ Driver tour acceptance system
2. ✅ Invoicing workflow with hour sync
3. ✅ Admin approval dashboard
4. ✅ Customer tip system

### **Short-Term (Weeks 3-4):**
5. ✅ Interactive lunch ordering
6. ✅ Email generation system
7. ✅ Restaurant partner management
8. ✅ Commission tracking

### **Medium-Term (Months 2-3):**
9. ✅ Advanced client portal UI
10. ✅ AI winery directory integration
11. ✅ Real-time driver tracking
12. ✅ In-app messaging

---

## 🔧 Technical Implementation Notes

### **Hour Sync Architecture:**
```typescript
// When driver clocks out
POST /api/time-clock/clock-out
  → Calculate actual hours
  → Find associated booking (by driver_id + date)
  → Update booking.actual_hours
  → Recalculate booking.total_price
  → Set booking.ready_for_final_invoice = true
  → Trigger admin notification
```

### **Invoice Approval Flow:**
```typescript
// Admin dashboard
GET /api/admin/pending-invoices
  → Returns bookings where:
    - tour_date + 48 hours < now
    - ready_for_final_invoice = true
    - final_invoice_sent = false

POST /api/admin/approve-invoice/{booking_id}
  → Generate final invoice PDF
  → Send email to customer
  → Update booking.final_invoice_sent = true
  → Log in audit trail
```

### **Lunch Order System:**
```typescript
// Client portal
GET /api/client/restaurants?booking_id={id}
  → Returns restaurants near tour route
  → Includes menus, pricing, hours

POST /api/client/lunch-order
  → Saves order to database
  → Generates pre-filled email
  → Sets status = 'pending_admin_approval'

POST /api/admin/approve-lunch-order/{order_id}
  → Sends email to restaurant
  → Updates status = 'sent'
  → Tracks commission
```

---

## 💰 Revenue Impact

### **Invoicing Improvements:**
- **Accurate billing** = No revenue leakage
- **Hourly rate capture** = Proper charging for overtime
- **Tip system** = Additional 15-25% revenue per tour
- **Estimated impact:** +$75-150 per tour

### **Lunch Ordering:**
- **Commission revenue** = 10-15% of lunch orders
- **Average lunch order** = $400 (8 people × $50)
- **Commission per tour** = $40-60
- **Estimated monthly** = $1,600-2,400 (40 tours/month)

### **Better Client Experience:**
- **Repeat bookings** = +40% (from 25% to 35%)
- **Referrals** = +35% (from 20% to 27%)
- **Premium pricing** = +15-25% justified by service level

---

## 📋 Database Schema Updates Needed

### **New Tables:**

```sql
-- Tour offers for driver acceptance
CREATE TABLE tour_offers (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  driver_id INTEGER REFERENCES users(id),
  offered_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, expired
  response_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lunch orders
CREATE TABLE lunch_orders (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  restaurant_id INTEGER REFERENCES restaurants(id),
  order_date DATE,
  party_size INTEGER,
  items JSONB, -- Array of menu items
  special_requests TEXT,
  total_amount DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'draft', -- draft, pending_approval, sent, confirmed
  email_sent_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Restaurant partners
CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  contact_person VARCHAR(255),
  menu_url TEXT,
  commission_rate DECIMAL(5,2) DEFAULT 12.50,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoice tracking
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  invoice_number VARCHAR(50) UNIQUE,
  invoice_type VARCHAR(20), -- deposit, final
  amount DECIMAL(10,2),
  tip_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, overdue
  sent_at TIMESTAMP,
  paid_at TIMESTAMP,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Bookings Table Updates:**

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ready_for_final_invoice BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_invoice_sent BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_invoice_sent_at TIMESTAMP;
```

---

## 🎯 Next Actions

### **This Session:**
1. ✅ Document requirements (this file)
2. ✅ Update PRD and technical specs
3. ⏳ Choose first feature to implement

### **Recommended Build Order:**

#### **Sprint 1 (Week 1): Invoicing System**
- [ ] Add database columns to bookings
- [ ] Build hour sync from time clock
- [ ] Create admin pending invoices dashboard
- [ ] Build invoice approval API
- [ ] Add customer tip UI to final invoice
- [ ] Test end-to-end workflow

#### **Sprint 2 (Week 2): Driver Tour Acceptance**
- [ ] Create tour_offers table
- [ ] Build admin "offer tour" interface
- [ ] Add "pending offers" to driver portal
- [ ] Build accept/decline APIs
- [ ] Auto-assignment logic
- [ ] Notification system

#### **Sprint 3 (Week 3): Lunch Ordering**
- [ ] Create restaurants and lunch_orders tables
- [ ] Build restaurant management UI
- [ ] Create client lunch ordering interface
- [ ] Build email generation system
- [ ] Add admin approval dashboard
- [ ] Test with partner restaurants

---

## 📞 Questions for Owner

1. **Hourly Rate:**
   - Is there a standard hourly rate or does it vary by tour type?
   - Do you charge for drive time + service time, or just service time?

2. **Tip Processing:**
   - Should tips go through Stripe or collected separately?
   - Do tips get split with drivers or go to company?

3. **Lunch Ordering:**
   - Do you have existing restaurant partners?
   - Should we import their menus or link to external menus?
   - How do you currently handle lunch orders?

4. **Invoice Timing:**
   - 48 hours after tour - is this business days or calendar days?
   - What happens if customer doesn't pay final invoice?

5. **Driver Acceptance:**
   - Should drivers see offered tours from all admins or just their supervisor?
   - Can drivers negotiate/counter-offer?
   - What happens if no driver accepts?

---

**Status:** Requirements documented, ready to implement! 🚀


