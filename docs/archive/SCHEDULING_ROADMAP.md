# SCHEDULING & CALENDAR SYSTEM - ROADMAP

**Priority:** HIGH - Needed for immediate business use  
**Started:** October 19, 2025

---

## 🎯 BUSINESS REQUIREMENTS

### Core Features Needed:
1. **Booking Calendar** - View all tours by date
2. **Itinerary Builder** - Plan tour routes & winery visits
3. **Schedule Management** - Assign drivers to tours
4. **Availability Checking** - Prevent double-booking
5. **Integration Points:**
   - Compliance system (driver hours)
   - Invoicing system (billing)
   - Payment system (deposits)

---

## 📅 PHASE 1: CALENDAR VIEW (Week 1)

### Features:
- [ ] Monthly calendar display
- [ ] Daily tour list view
- [ ] Click date to see tours
- [ ] Color coding by status (pending/confirmed/completed)
- [ ] Quick filters (driver, vehicle, status)

### Tech Stack:
- React Big Calendar or FullCalendar
- Existing bookings table
- Real-time updates

---

## 🗺️ PHASE 2: ITINERARY BUILDER (Week 2)

### Features:
- [ ] Drag-and-drop winery ordering
- [ ] Time slot allocation per stop
- [ ] Distance/drive time calculation
- [ ] Lunch/break scheduling
- [ ] Print/export itinerary PDF

### Integration:
- Wineries database table
- Google Maps API (optional)
- Booking confirmation emails

---

## 👥 PHASE 3: DRIVER SCHEDULING (Week 3)

### Features:
- [ ] Assign driver to booking
- [ ] View driver availability
- [ ] Prevent HOS violations
- [ ] Vehicle assignment
- [ ] Driver notifications

### Compliance Checks:
- Hours of Service limits
- Required rest periods
- Inspection completion
- License expiration

---

## 🔄 PHASE 4: INTEGRATIONS (Week 4)

### Connect Systems:
- [ ] Booking → Payment (deposit tracking)
- [ ] Booking → Compliance (HOS tracking)
- [ ] Booking → Invoicing (billing)
- [ ] Calendar → Driver Portal (notifications)
- [ ] Itinerary → Customer Portal (view tour)

---

## 🚀 IMMEDIATE NEXT STEPS

**Let's start with what you need FIRST:**

1. **Calendar View** - See all your bookings at a glance?
2. **Itinerary Builder** - Plan winery routes?
3. **Driver Assignment** - Schedule who drives what?

**Which should we build first?** 📊

---

## 💡 QUESTIONS TO ANSWER:

1. Do you currently track bookings in a spreadsheet?
2. How do you plan winery routes now?
3. Do you need customer-facing calendar (book online)?
4. How many bookings per day typically?
5. Peak season vs off-season volume?

**Answer these and we'll build exactly what you need!** 🎯
