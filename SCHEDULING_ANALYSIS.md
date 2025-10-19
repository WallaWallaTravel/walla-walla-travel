# SCHEDULING SYSTEM - DATABASE ANALYSIS

**Date:** October 19, 2025
**Status:** 🎉 DATABASE SCHEMA COMPLETE!

---

## ✅ WHAT WE ALREADY HAVE

### **Database Tables - FULLY BUILT:**

#### 1. **bookings** table
```
Core Fields:
✅ id, booking_number, customer info
✅ tour_date, start_time, end_time, duration_hours
✅ party_size (1-14 validated)
✅ pickup_location, dropoff_location
✅ driver_id, vehicle_id, time_card_id
✅ pricing (base, gratuity, taxes, total)
✅ deposits (amount, paid, paid_at)
✅ final_payment (amount, paid, paid_at)
✅ status (pending/confirmed/cancelled/completed)
✅ timestamps (created_at, updated_at, completed_at)

Indexes: ✅ tour_date, driver_id, vehicle_id, status
```

#### 2. **itineraries** table
```
Core Fields:
✅ id, booking_id (FK to bookings)
✅ template_name, is_template (for reusable routes)
✅ pickup_location, pickup_time
✅ dropoff_location, estimated_dropoff_time
✅ total_drive_time_minutes
✅ internal_notes, driver_notes
✅ timestamps

Relations: → itinerary_stops (one-to-many)
```

#### 3. **itinerary_stops** table
```
Core Fields:
✅ id, itinerary_id, winery_id
✅ stop_order (sequencing)
✅ arrival_time, departure_time, duration_minutes
✅ drive_time_to_next_minutes
✅ stop_type (winery/lunch/other)
✅ reservation_confirmed (boolean)
✅ special_notes

Indexes: ✅ itinerary_id, winery_id
```

#### 4. **wineries** table
```
Sample Data:
✅ Leonetti Cellar (leonetti-cellar)
✅ Cayuse Vineyards (cayuse-vineyards)
✅ L'Ecole No 41 (lecole-no-41)
✅ Woodward Canyon (woodward-canyon)
✅ Walla Walla Vintners (walla-walla-vintners)
```

---

## 🚧 WHAT WE NEED TO BUILD

### **Frontend Components Only!**

All the data structures exist. We just need UI:

#### 1. **Calendar View** (Priority: HIGH)
```
GET /api/calendar/bookings?month=2025-10
→ Display bookings on calendar grid
→ Color code by status
→ Click date to see day details
→ Filter by driver/vehicle/status
```

#### 2. **Itinerary Builder** (Priority: HIGH)
```
GET /api/itineraries/:booking_id
POST /api/itineraries (create new)
PUT /api/itineraries/:id (update)

Features:
→ Drag-and-drop winery ordering
→ Set arrival/departure times
→ Calculate drive times
→ Add lunch stops
→ Save as template
→ Assign to booking
```

#### 3. **Driver Scheduling** (Priority: MEDIUM)
```
GET /api/bookings/unassigned
PUT /api/bookings/:id/assign-driver

Features:
→ View available drivers
→ Check HOS compliance
→ Assign driver + vehicle
→ Send notifications
```

---

## 📋 API ENDPOINTS NEEDED

### **Calendar API:**
```typescript
GET /api/calendar/bookings
  ?start_date=2025-10-01
  &end_date=2025-10-31
  &driver_id=1 (optional)
  &status=confirmed (optional)

Response: {
  bookings: [
    {
      id, booking_number, tour_date, start_time, end_time,
      customer_name, party_size, status,
      driver: { id, name },
      vehicle: { id, name, license_plate }
    }
  ]
}
```

### **Itinerary API:**
```typescript
GET /api/itineraries/:booking_id
Response: {
  itinerary: {
    id, booking_id, pickup_location, pickup_time,
    total_drive_time_minutes,
    stops: [
      {
        id, stop_order, winery: { name, address },
        arrival_time, departure_time, duration_minutes,
        drive_time_to_next_minutes, reservation_confirmed
      }
    ]
  }
}

POST /api/itineraries
Body: {
  booking_id, pickup_location, pickup_time,
  stops: [
    { winery_id, stop_order, duration_minutes }
  ]
}

PUT /api/itineraries/:id/reorder
Body: {
  stops: [
    { id: 1, stop_order: 1 },
    { id: 2, stop_order: 2 }
  ]
}
```

### **Driver Assignment API:**
```typescript
GET /api/bookings/unassigned
Response: {
  bookings: [...pending assignments]
}

PUT /api/bookings/:id/assign
Body: {
  driver_id: 1,
  vehicle_id: 2
}

GET /api/drivers/availability?date=2025-10-25
Response: {
  drivers: [
    {
      id, name, available: true,
      current_hos_hours: 8.5,
      bookings_today: [...]
    }
  ]
}
```

---

## 🎯 RECOMMENDED BUILD ORDER

### **Week 1: Calendar View**
- [ ] Create `/api/calendar/bookings` endpoint
- [ ] Build calendar component (react-big-calendar)
- [ ] Add filtering (status, driver, vehicle)
- [ ] Click to view booking details

### **Week 2: Itinerary Builder**
- [ ] Create `/api/itineraries` CRUD endpoints
- [ ] Build drag-and-drop interface
- [ ] Time calculation logic
- [ ] Template save/load

### **Week 3: Driver Scheduling**
- [ ] Create `/api/drivers/availability` endpoint
- [ ] Build assignment interface
- [ ] HOS compliance checking
- [ ] Notification system

---

## 💡 KEY INSIGHTS

### **Schema is Production-Ready:**
✅ All foreign keys exist (booking_id, driver_id, vehicle_id)
✅ Indexes on critical fields (tour_date, driver_id, status)
✅ Validation constraints (party_size 1-14, duration 4/6/8 hours)
✅ Template support built-in (is_template, template_name)
✅ Timeline tracking (booking_timeline table exists)

### **What's Working:**
✅ Bookings can be created via `/api/bookings/create`
✅ Payments integrated with Stripe
✅ Database transactions safe (BEGIN/COMMIT/ROLLBACK)

### **What's Missing:**
❌ Calendar UI to visualize bookings
❌ Itinerary builder UI for route planning
❌ Driver assignment UI
❌ API endpoints for calendar/itinerary operations

---

## 🚀 NEXT STEPS

**Which should we build first?**

**Option 1: Calendar View** (Recommended)
- Most visible impact
- Immediate business value
- See all bookings at a glance
- Foundation for other features

**Option 2: Itinerary Builder**
- Critical for customer experience
- Route planning & optimization
- Winery coordination

**Option 3: Driver Scheduling**
- Operational necessity
- HOS compliance
- Efficient assignment

**Your call! Type 1, 2, or 3.** 📊
