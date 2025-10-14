# 🚨 FMCSA COMPLIANCE GUIDE - PASSENGER-CARRYING VEHICLES (9-15 SEATS)

**For:** Walla Walla Travel - Wine Tour Operations  
**Vehicle Type:** 9-15 Passenger Vans (Passenger-Carrying for Compensation)  
**Date:** October 13, 2025  
**UPDATED:** For passenger operations specifically

---

## 🎯 YOUR SPECIFIC SITUATION

**What You Operate:**
- Vans with 9-15 seat capacity
- Transport passengers for compensation (wine tours)
- Local and occasional long-distance tours
- Interstate commerce (may cross state lines)

**Key Finding:** You ARE subject to FMCSA regulations as a motor carrier of passengers because your vehicles transport 9 or more passengers (including the driver) for compensation.

---

## ⚠️ CRITICAL DIFFERENCES: PASSENGER VS. PROPERTY CARRIERS

### **❌ IMPORTANT: Different Rules Apply to You!**

Passenger-carrying vehicles have DIFFERENT hours of service rules than property-carrying vehicles:

| Rule | Property Carriers | **PASSENGER CARRIERS (YOU)** |
|------|------------------|------------------------------|
| **Max Driving Time** | 11 hours | **10 hours** |
| **Max On-Duty Time** | 14 hours | **15 hours** |
| **Required Off-Duty** | 10 hours | **8 hours** |
| **30-Minute Break** | After 8 hours driving | **NO requirement for passengers** |
| **Weekly Limit** | 60/70 hours | **60/70 hours** (same) |

---

## ✅ EXCELLENT NEWS: 150 AIR-MILE EXEMPTION APPLIES!

### **You CAN Use the Exemption!**

A driver is exempt from the logbook or record of duty status requirements if operating within a 150 air-mile radius of the normal work reporting location and is released from duty within 14 consecutive hours or less.

**How It Works for Wine Tours:**
- Within 150 air-miles: Use simple time cards (no ELD)
- Beyond 150 air-miles: Use paper logs for that day
- Same 8-day rule: If you exceed the radius more than 8 days in any 30-day period, must use ELD

**150 Air-Miles = 172.6 Road Miles**

---

## 📋 FEDERAL REGISTRATION REQUIREMENTS

### **What You MUST Have:**

1. **FMCSA Registration & USDOT Number**
   - Must register with FMCSA
   - Must display USDOT identification number on vehicles
   - Must display legal name or trade name on vehicles

2. **Operating Authority** (if for-hire)
   - Must obtain FMCSA operating authority registration
   - Applies to ALL for-hire passenger carriers in interstate commerce

3. **Insurance Requirements**
   - $1.5 million minimum liability insurance for vehicles carrying 15 or fewer passengers including the driver
   - Must file proof of insurance with FMCSA

4. **Process Agent**
   - Must designate a process agent in each state you operate
   - Representative who can receive legal documents

---

## 🚗 CDL REQUIREMENTS - CRITICAL!

### **Do Your Drivers Need CDL?**

**Federal Standard:**
A CMV is defined as designed or used to transport 9 or more passengers (including the driver) for compensation

**For CDL Requirement:**
- Drivers need CDL with P (Passenger) endorsement if transporting 16 or more passengers
- **For 9-15 passengers:** CDL may NOT be required federally

**⚠️ WASHINGTON STATE CHECK REQUIRED:**
Different states have different requirements! Washington may require CDL for 10+ passengers for hire. You MUST verify with Washington State Department of Licensing.

**Action Item:** Contact Washington State DOL to confirm if CDL required for your specific vehicles.

---

## ⏰ HOURS OF SERVICE RULES (PASSENGER CARRIERS)

### **Daily Limits:**


**10-Hour Driving Limit:**
- Cannot drive more than 10 hours following 8 consecutive hours off duty

**15-Hour On-Duty Limit:**
- Cannot drive after being on duty 15 hours following 8 consecutive hours off duty


**Example:**
```
Driver starts: 8:00 AM (after 8 hours off)
Max driving: 10 hours total
Must stop driving by: 11:00 PM (15 hours on-duty)
Next shift can start: 7:00 AM (after 8 hours off)
```

### **Weekly Limits:**


- **60 hours** in 7 consecutive days (if you don't operate every day)
- **70 hours** in 8 consecutive days (if you operate every day)


---

## 📏 150 AIR-MILE EXEMPTION (DETAILED)

### **Qualification Requirements:**

To qualify for exemption from detailed logs:
1. Operate within 150 air-mile radius of normal work reporting location
2. Released from duty within 14 consecutive hours or less


### **What You're Exempt From:**
- Electronic Logging Devices (ELD)
- Detailed Records of Duty Status (paper logs)
- Only need simple time cards

### **What You MUST Still Do:**
```
Time Card Requirements:
✓ Driver name
✓ Date  
✓ Start time (report to work)
✓ End time (released from work)
✓ Total hours on duty
✓ Work reporting location
✓ Driver signature
```

### **The 8-Day Rule:**

Exception: Drivers who are required to prepare a record of duty status no more than 8 days during any 30-day period may continue using paper logs

**What This Means:**
- Days 1-8 beyond 150 miles: Use paper logs for those days only
- Day 9+ beyond 150 miles in 30-day period: Must install and use ELD

---

## 🗺️ DISTANCE CALCULATIONS FOR WINE TOURS

### **From Walla Walla - Within 150 Air-Miles (✅ Exemption OK):**

```
Walla Walla Valley Wineries: 0-30 miles ✅
Milton-Freewater, OR: ~20 miles ✅
Tri-Cities: ~50 miles ✅
Columbia Valley: ~75 miles ✅
Horse Heaven Hills: ~90 miles ✅
Red Mountain: ~120 miles ✅
Yakima Valley: ~140 miles ✅
```

### **Beyond 150 Air-Miles (⚠️ Paper Logs Required):**

```
Spokane: ~140 miles (borderline - measure actual)
Seattle: ~280 miles ⚠️ (paper logs)
Portland: ~240 miles ⚠️ (paper logs)
```

---

## 🔍 INSPECTION REQUIREMENTS

### **Pre-Trip Inspection - ALWAYS REQUIRED**

Subject to safety standards in parts 390 through 396 of Federal Motor Carrier Safety Regulations

**Required Items to Check:**
1. **Service brakes** (including air hose couplings if applicable)
2. **Parking brake**
3. **Steering mechanism**
4. **Lights and reflectors**
5. **Tires** (front wheels cannot have recapped or regrooved tires)
6. **Horn**
7. **Windshield wipers**
8. **Rear-view mirrors**
9. **Coupling devices** (if present)
10. **Wheels and rims**
11. **Emergency equipment**
    - Fire extinguishers (required by law)
    - Emergency reflectors
    - Spare electrical fuses (unless circuit breakers)

### **Post-Trip Inspection - ALWAYS REQUIRED**

**If defects found:**
- Must complete Driver Vehicle Inspection Report (DVIR)
- Vehicle cannot be used until repaired
- Mechanic must sign off on repairs

---

## 📱 WHAT YOUR APP MUST TRACK

### **Priority 1: Daily Time Cards** ⭐⭐⭐

**For Days Within 150 Miles:**
```typescript
interface TimeCard {
  driver_id: number;
  date: Date;
  work_reporting_location: string;
  start_time: Time;
  end_time: Time;
  total_hours: number;
  driver_signature: string; // base64 image
  created_at: Timestamp;
}
```

**Display Example:**
```
═══════════════════════════════
      DAILY TIME CARD
═══════════════════════════════
Driver: John Doe
Date: October 13, 2025
Location: Walla Walla Travel
         123 Main St

Start: 8:00 AM
End: 5:30 PM
Total: 9.5 hours

[Signature area]

✅ Within 150 miles
───────────────────────────────
```

### **Priority 2: Distance Tracking** ⭐⭐⭐

**Auto-Calculate Air-Miles:**
```typescript
function calculateAirMileDistance(
  baseLat: number,
  baseLng: number,
  tripLat: number,
  tripLng: number
): number {
  const R = 3440.065; // Earth radius in nautical miles
  // Haversine formula implementation
  return airMiles;
}

// Check exemption status
function checkExemptionStatus(trip): {
  withinExemption: boolean;
  maxDistance: number;
  requiresPaperLogs: boolean;
  daysThisMonth: number; // Days beyond 150 miles
} {
  const maxDist = calculateMaxDistance(trip);
  const exceeded = maxDist > 150;
  const monthCount = countExceedancesThisMonth();
  
  return {
    withinExemption: !exceeded,
    maxDistance: maxDist,
    requiresPaperLogs: exceeded,
    daysThisMonth: monthCount,
    approachingLimit: monthCount >= 7 // Alert at 7 days
  };
}
```

**Alert System:**
```
⚠️  ALERT: Trip Exceeds 150 Air-Miles

Furthest point: Seattle (280 miles)
Action required: Driver must use paper logs today

Days this month beyond 150 miles: 3/8
Status: ✅ Still within exemption
```

### **Priority 3: Inspections** ⭐⭐⭐

**Pre-Trip Checklist (Passenger Vehicle Specific):**
```
PASSENGER VEHICLE PRE-TRIP INSPECTION

Vehicle: Van #3 (Toyota Sienna)
Driver: John Doe
Date: October 13, 2025 - 7:45 AM
Location: GPS captured

EXTERIOR:
☐ Tires (all) - Pass/Fail/NA
☐ Lights (all) - Pass/Fail/NA  
☐ Reflectors - Pass/Fail/NA
☐ Body damage check - Pass/Fail/NA
☐ Windows/windshield - Pass/Fail/NA
☐ Mirrors (both sides) - Pass/Fail/NA
☐ Wipers - Pass/Fail/NA

INTERIOR:
☐ Seats (all) - Pass/Fail/NA
☐ Seat belts (all) - Pass/Fail/NA
☐ Emergency exits - Pass/Fail/NA
☐ Fire extinguisher - Pass/Fail/NA
☐ First aid kit - Pass/Fail/NA
☐ Emergency reflectors - Pass/Fail/NA
☐ Horn - Pass/Fail/NA

MECHANICAL:
☐ Service brakes - Pass/Fail/NA
☐ Parking brake - Pass/Fail/NA
☐ Steering - Pass/Fail/NA
☐ Fluid levels - Pass/Fail/NA

DEFECTS FOUND:
[Text area for notes]
[Photo upload capability]

[Digital signature]

✅ Inspection Complete
Vehicle Status: Serviceable / Out of Service
```

### **Priority 4: Hours of Service Limits** ⭐⭐

**Daily Limit Tracking:**
```
TODAY'S HOURS
═══════════════════════════════

Driving Time: 7.5 / 10 hours
⚠️ 2.5 hours remaining

On-Duty Time: 9.5 / 15 hours  
✅ 5.5 hours remaining

Must be off-duty by: 11:00 PM
(Started at 8:00 AM)

Next shift earliest start: 7:00 AM
(After 8 hours off-duty)
───────────────────────────────
```

**Weekly Limit Tracking:**
```
THIS WEEK'S HOURS
═══════════════════════════════

Total: 45.5 / 60 hours
(Operating 5 days/week)

✅ 14.5 hours remaining this week

Days worked: 5
Days remaining: 2
───────────────────────────────
```

---

## 📊 DATABASE SCHEMA UPDATES

### **New Tables Needed:**

```sql
-- Daily time cards (for exemption days)
CREATE TABLE time_cards (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES users(id),
  date DATE NOT NULL,
  work_reporting_location TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_hours DECIMAL(4,2) NOT NULL,
  driver_signature TEXT, -- base64 PNG
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(driver_id, date)
);

-- Distance tracking
CREATE TABLE daily_trips (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES users(id),
  vehicle_id INTEGER REFERENCES vehicles(id),
  date DATE NOT NULL,
  base_location_lat DECIMAL(10,8) NOT NULL,
  base_location_lng DECIMAL(11,8) NOT NULL,
  furthest_point_lat DECIMAL(10,8),
  furthest_point_lng DECIMAL(11,8),
  max_air_miles DECIMAL(10,2),
  exceeded_150_miles BOOLEAN DEFAULT false,
  route_points JSONB, -- Array of GPS coordinates
  created_at TIMESTAMP DEFAULT NOW()
);

-- HOS tracking (passenger carrier limits)
CREATE TABLE daily_hos (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES users(id),
  date DATE NOT NULL,
  driving_hours DECIMAL(4,2) DEFAULT 0, -- Max 10
  on_duty_hours DECIMAL(4,2) DEFAULT 0, -- Max 15
  off_duty_hours DECIMAL(4,2) DEFAULT 0, -- Min 8 consecutive
  violation_driving BOOLEAN DEFAULT false, -- Exceeded 10 hours
  violation_on_duty BOOLEAN DEFAULT false, -- Exceeded 15 hours
  violation_off_duty BOOLEAN DEFAULT false, -- Less than 8 hours
  notes TEXT,
  UNIQUE(driver_id, date)
);

-- Weekly HOS limits
CREATE TABLE weekly_hos (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES users(id),
  week_start_date DATE NOT NULL,
  total_hours DECIMAL(5,2) DEFAULT 0,
  limit_type VARCHAR(10) DEFAULT '60', -- '60' or '70'
  violation_flag BOOLEAN DEFAULT false,
  UNIQUE(driver_id, week_start_date)
);

-- Monthly exemption tracking
CREATE TABLE monthly_exemption_status (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES users(id),
  month_start_date DATE NOT NULL,
  days_exceeded_150_miles INTEGER DEFAULT 0,
  requires_eld BOOLEAN DEFAULT false, -- True if >8 days
  UNIQUE(driver_id, month_start_date)
);
```

---

## 🎯 IMPLEMENTATION PRIORITY

### **Week 1: Core Compliance** ⭐⭐⭐

**Day 1-2: Time Card System**
- [ ] Daily time card entry
- [ ] Digital signature
- [ ] GPS location capture (work reporting location)
- [ ] Calculate total hours
- [ ] Store for 6 months
- [ ] PDF export for DOT inspections

**Day 3-4: Distance Tracking**
- [ ] GPS tracking during trips
- [ ] Calculate air-mile distance from base
- [ ] Auto-detect when exceeding 150 miles
- [ ] Alert driver to use paper logs
- [ ] Count monthly exceedances
- [ ] Alert at 7 days (before 8-day trigger)

**Day 5: HOS Tracking**
- [ ] Track daily driving hours (max 10)
- [ ] Track daily on-duty hours (max 15)
- [ ] Alert approaching limits
- [ ] Calculate required off-duty time (8 hours)
- [ ] Track weekly totals (60/70 hours)

### **Week 2: Inspections** ⭐⭐⭐

**Day 1-3: Pre-Trip Inspection**
- [ ] Passenger vehicle specific checklist
- [ ] Pass/Fail/NA buttons (48px)
- [ ] Photo upload for defects
- [ ] Digital signature
- [ ] GPS + timestamp
- [ ] Mark vehicle out-of-service if critical defects

**Day 4-5: Post-Trip & DVIR**
- [ ] Post-trip checklist
- [ ] Auto-generate DVIR if defects
- [ ] Mechanic sign-off workflow
- [ ] Track repair status

### **Week 3: Document Management** ⭐⭐

**Day 1-3: Registration Documents**
- [ ] Store USDOT number
- [ ] Store operating authority
- [ ] Store insurance certificate ($1.5M)
- [ ] Store process agent info
- [ ] Expiration tracking

**Day 4-5: Driver Documents**
- [ ] Medical certificates
- [ ] Driver licenses (check if CDL needed)
- [ ] Training records
- [ ] Upload/view system

### **Week 4: Dashboard & Alerts** ⭐

**Day 1-3: Unified Dashboard**
- [ ] Today's status (time card, hours, distance)
- [ ] Current exemption status
- [ ] Days this month beyond 150 miles
- [ ] Inspection history
- [ ] Document expirations

**Day 4-5: Alert System**
- [ ] Approaching 8-day limit warning
- [ ] HOS limit warnings (10hr driving, 15hr on-duty)
- [ ] Document expiration alerts
- [ ] Vehicle out-of-service alerts

---

## ✅ COMPLIANCE CHECKLIST

### **Federal Registration (One-Time):**
- [ ] Register with FMCSA
- [ ] Obtain USDOT number
- [ ] Apply for operating authority
- [ ] File insurance ($1.5M)
- [ ] Designate process agent
- [ ] Mark vehicles with USDOT number & company name

### **Washington State (Verify):**
- [ ] Confirm CDL requirements for 9-15 passenger vans
- [ ] Obtain appropriate licenses
- [ ] State-specific registrations

### **Daily (Every Driver, Every Day):**
- [ ] Pre-trip inspection
- [ ] Time card: Clock in with GPS location
- [ ] Monitor distance from base
- [ ] Track driving hours (max 10)
- [ ] Track on-duty hours (max 15)
- [ ] Time card: Clock out
- [ ] Post-trip inspection
- [ ] DVIR if defects found

### **Weekly:**
- [ ] Verify weekly hour totals under limit
- [ ] Review all inspections
- [ ] Check for violations

### **Monthly:**
- [ ] Count days beyond 150 miles
- [ ] Verify under 8-day limit
- [ ] Review document expirations
- [ ] Check insurance current

---

## 🆘 DOT ROADSIDE INSPECTION PREPARATION

**What Inspector Will Ask For:**

**For Driver:**
1. Valid driver's license (CDL if required by state)
2. Current medical certificate
3. Time cards (past 7 days if within exemption)
4. Paper logs (if any days exceeded 150 miles)
5. Pre-trip inspection report (today's)

**For Vehicle:**
1. Current registration
2. Insurance certificate ($1.5M)
3. USDOT number visible on vehicle
4. Last inspection report
5. DVIR (if defects were found recently)

**In Your App:**
- [ ] Export time cards to PDF
- [ ] Show current exemption status
- [ ] Display today's inspection
- [ ] Show insurance certificate
- [ ] Provide carrier info (USDOT, authority)

---

## ⚠️ COMMON VIOLATIONS TO AVOID

1. **No USDOT Number on Vehicle** - $1,000+ fine
2. **No Operating Authority** - Out of service order
3. **Insufficient Insurance** - Cannot operate
4. **HOS Violation** - $1,000+ fine per violation
   - Driving over 10 hours
   - On-duty over 15 hours
   - Less than 8 hours off
5. **No Pre-Trip Inspection** - $500+ fine
6. **Using ELD When Not Required** - Okay, but:
7. **Not Using ELD When Required** - $1,000+ fine
   - If exceeded 8 days in 30-day period

---

## 💰 ESTIMATED COSTS

**One-Time Setup:**
- FMCSA Registration: ~$300
- Operating Authority: ~$300
- Process Agent: ~$100/year
- **Total: ~$700 + ongoing $100/year**

**Insurance:**
- $1.5M Passenger Liability: ~$3,000-$8,000/year
- (Varies by fleet size, driver records, location)

**Per Vehicle:**
- USDOT Number Decals: ~$30
- Emergency Equipment (extinguisher, reflectors, first aid): ~$100

**If ELD Required (after 8 days/month):**
- ELD Device: ~$500-$800 per vehicle
- ELD Service: ~$40-$70/month per vehicle
- **Only needed if consistently exceeding 150 miles**

---

## 🎯 BOTTOM LINE

### **Good News! ✅**

1. **150-mile exemption applies** - most wine tours will qualify
2. **Simple time cards** - no ELD for typical local tours
3. **Occasional long trips are fine** - won't lose exemption permanently
4. **8-day buffer** - can go beyond 150 miles up to 8 times per month

### **Action Items:**

1. **Immediately:**
   - Confirm USDOT registration status
   - Verify operating authority
   - Check insurance meets $1.5M requirement
   - Confirm USDOT number on vehicles

2. **This Week:**
   - Verify Washington State CDL requirements
   - Start building time card system
   - Start building distance tracking

3. **Within 30 Days:**
   - Complete inspection system
   - Implement HOS tracking
   - Test full workflow

---

**CRITICAL:** You must comply with Parts 385 and 390-396 of Federal Motor Carrier Safety Regulations as a motor carrier operating 9-15 passenger vehicles for direct compensation.

---

**END OF PASSENGER VEHICLE COMPLIANCE GUIDE**  
**Created:** October 13, 2025  
**Vehicle Type:** 9-15 Passenger Vans  
**Operation:** Wine Tours (For-Hire Passenger Transport)

## 📞 NEXT STEPS

**Tell me:**
1. Do you have USDOT registration already?
2. Do your drivers currently have CDL? (Need to verify Washington requirements)
3. What vehicles do you have? (Make/model/seat capacity)
4. Ready to start building the time card system?

Once you provide this info, I'll help you with the first feature! 🚀
