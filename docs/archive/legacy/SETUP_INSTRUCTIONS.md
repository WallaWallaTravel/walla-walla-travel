# 🚀 Setup Instructions - Winery Addresses & Hotels

## ✅ What's Been Added

### 1. **Winery Addresses** (50+ wineries)
All wineries in the database now have real Walla Walla addresses for Google Maps integration.

**File**: `migrations/014-add-winery-addresses.sql`

### 2. **Hotels & Lodging Table** (18 locations)
New table with hotels, inns, B&Bs, vacation rentals, and common pickup points.

**File**: `migrations/015-add-hotels-lodging.sql`

### 3. **Hotels API Endpoint**
New API to fetch hotels for dropdown selection in itinerary builder.

**File**: `app/api/hotels/route.ts`

---

## 🔧 To Apply These Changes:

### **Run These Migrations:**

```bash
# Add winery addresses (if not already run)
psql $DATABASE_URL -f migrations/014-add-winery-addresses.sql

# Add hotels table
psql $DATABASE_URL -f migrations/015-add-hotels-lodging.sql

# Optional: Run the lunch stop field migration
psql $DATABASE_URL -f migrations/013-add-lunch-stop-field.sql
```

---

## 📍 **Google Maps Integration - How It Works**

### **Itinerary Builder**
The "📍 Google Maps" button generates a complete route:

```
Origin: Pickup Location (from itinerary)
  ↓
Waypoint 1: Winery Address (from database)
  ↓
Waypoint 2: Winery Address (from database)
  ↓
Waypoint 3: Winery Address (from database)
  ↓
Destination: Dropoff Location (from itinerary)
```

**URL Format:**
```
https://www.google.com/maps/dir/?api=1
  &origin=Marcus%20Whitman%20Hotel
  &destination=Marcus%20Whitman%20Hotel
  &waypoints=41%20Lowden%20School%20Rd|1111%20Lowden%20School%20Rd|32%20E%20Main%20St
```

### **Driver Portal**
Same Google Maps button exists in:
- `/driver-portal/dashboard` (tour cards)
- Generates full route for the driver's daily tours

---

## 🏨 **Hotels Added**

### **Downtown Hotels**
- Marcus Whitman Hotel (6 W Rose St)
- Finch & Barley (123 E Main St)
- Hampton Inn & Suites
- Courtyard by Marriott

### **Luxury Inns**
- Inn at Abeja (winery property)
- Eritage Resort (luxury resort + winery)
- The Weinhard Hotel (Dayton)

### **Bed & Breakfasts**
- Green Gables Inn
- Stone Creek Inn

### **Budget Options**
- Best Western Plus
- La Quinta Inn
- Comfort Inn

### **Vacation Rentals**
- Airbnb/VRBO Downtown
- Airbnb/VRBO Wine Country
- Private Residence (custom address)

### **Pickup Locations**
- Downtown Walla Walla - Main Street
- Walla Walla Airport
- Walla Walla Train Station

---

## 🍷 **Wineries with Addresses** (Sample)

All 50+ wineries now have addresses, including:

| Winery | Address |
|--------|---------|
| L'Ecole No 41 | 41 Lowden School Rd, Lowden |
| Long Shadows | 1111 Lowden School Rd, Lowden |
| Kontos Cellars | 32 E Main St, Walla Walla |
| Cayuse Vineyards | 17 E Main St, Walla Walla |
| Woodward Canyon | 1920 JB George Rd, Lowden |

---

## 📊 **Database Schema**

### **Wineries Table** (Updated)
```sql
address VARCHAR(500)      -- Full street address
city VARCHAR(100)         -- City name
state VARCHAR(2)          -- State code (WA/OR)
zip_code VARCHAR(10)      -- ZIP code
```

### **Hotels Table** (New)
```sql
id SERIAL PRIMARY KEY
name VARCHAR(255)         -- Hotel name
slug VARCHAR(255)         -- URL-friendly identifier
address VARCHAR(500)      -- Full address
city VARCHAR(100)         -- City
phone VARCHAR(20)         -- Contact phone
website VARCHAR(500)      -- Hotel website
type VARCHAR(50)          -- hotel, inn, bnb, vacation_rental, etc.
description TEXT          -- Details
amenities TEXT[]          -- Array of amenities
is_active BOOLEAN         -- Active status
display_order INTEGER     -- Sort order
```

---

## 🎯 **Next Steps (Optional Enhancements)**

### **1. Hotel Dropdown in Itinerary Builder**
Add autocomplete dropdown for pickup/dropoff selection:
```typescript
// Fetch hotels
const hotels = await fetch('/api/hotels').then(r => r.json());

// Replace text input with select/autocomplete
<select onChange={(e) => setItinerary({
  ...itinerary, 
  pickup_location: hotels.find(h => h.id == e.target.value)?.address
})}>
  {hotels.map(h => <option value={h.id}>{h.name}</option>)}
</select>
```

### **2. Auto-Calculate All Travel Times**
Add a "Calculate All Travel Times" button that loops through all stops and calls the Google Distance Matrix API for each.

### **3. Save Favorite Routes**
Allow saving common itineraries as templates (e.g., "Classic 3-Winery Tour", "Southside Tour").

---

## ✅ **Current Features Working**

1. ✅ Editable arrival/departure times with cascade
2. ✅ "Set as Lunch" toggle (90 min duration)
3. ✅ Auto-calculate travel time button
4. ✅ Google Maps full route generation
5. ✅ Winery search with smart prioritization
6. ✅ Horizontal scroll winery browser
7. ✅ "Add New Winery" button
8. ✅ Driver Notes section
9. ✅ Save Itinerary functionality
10. ✅ Driver Portal with Google Maps

---

## 🔗 **Useful URLs**

- **Itinerary Builder**: `http://localhost:3000/itinerary-builder/[booking_id]`
- **Driver Portal**: `http://localhost:3000/driver-portal/dashboard`
- **Admin Bookings**: `http://localhost:3000/admin/bookings`
- **Hotels API**: `http://localhost:3000/api/hotels`
- **Wineries API**: `http://localhost:3000/api/wineries`

---

## 📝 **Testing Checklist**

- [ ] Run both migrations (014 and 015)
- [ ] Refresh itinerary builder page
- [ ] Add 3 wineries to a tour
- [ ] Click "📍 Google Maps" button
- [ ] Verify route opens in Google Maps with all stops
- [ ] Test "Set as Lunch" toggle
- [ ] Test "Auto-Calculate" travel time
- [ ] Check Driver Portal for Google Maps button
- [ ] Verify winery search prioritizes correctly

---

**Need help?** All migrations are ready to run. Just execute the SQL files against your database!




