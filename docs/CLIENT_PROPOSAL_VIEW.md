# Client Proposal View - Flexible Modular System

**Date:** November 1, 2025  
**Status:** ✅ Built and ready to test

---

## 🎯 **Overview**

A **single, smart template** that adapts based on proposal complexity. Optional modules can be enabled for corporate events, multi-day tours, B2B partnerships, and special occasions.

---

## 🏗️ **Architecture**

### **Core Template (Always Shown):**
- ✅ Hero section with media
- ✅ Client information
- ✅ Service details with dates/pricing
- ✅ Media gallery
- ✅ Pricing breakdown
- ✅ Terms & conditions
- ✅ Accept/decline actions

### **Optional Modules (Toggle On/Off):**
- 🏢 **Corporate Module** - Company branding, PO fields, team info
- 📅 **Multi-Day Module** - Day-by-day itinerary, accommodation
- 🤝 **B2B Module** - Partnership details, commission structure
- 🎉 **Special Event Module** - Wedding, anniversary, milestone details
- 👥 **Group Coordination** - Attendee management, dietary restrictions

---

## 📊 **Database Schema**

### **New Fields Added to `proposals` Table:**

```sql
-- Module enablement flags
modules JSONB DEFAULT '{}'
-- Example: {"corporate": true, "multi_day": true, "special_event": false}

-- Corporate details
corporate_details JSONB
-- Example: {
--   "company_name": "Acme Corp",
--   "company_logo": "/media/logos/acme.png",
--   "contact_person": "John Smith",
--   "po_number": "PO-2025-001",
--   "billing_address": "123 Main St..."
-- }

-- Multi-day itinerary
multi_day_itinerary JSONB
-- Example: [
--   {
--     "day": 1,
--     "date": "2025-06-15",
--     "title": "Arrival & Welcome",
--     "activities": ["Airport pickup", "Hotel check-in", "Welcome dinner"],
--     "accommodation": "Marcus Whitman Hotel",
--     "meals": ["Dinner"]
--   }
-- ]

-- B2B partnership details
b2b_details JSONB
-- Example: {
--   "partner_name": "Travel Agency XYZ",
--   "commission_rate": 15,
--   "co_branding": true,
--   "referral_code": "PARTNER2025"
-- }

-- Special event details
special_event_details JSONB
-- Example: {
--   "event_type": "Wedding",
--   "occasion": "Sarah & Mike's Wedding",
--   "special_requests": "Champagne toast at sunset",
--   "vip_needs": ["Wheelchair accessible", "Gluten-free options"]
-- }

-- Group coordination
group_coordination JSONB
-- Example: {
--   "attendees": [
--     {"name": "John Doe", "email": "john@example.com", "dietary_restrictions": "Vegetarian"},
--     {"name": "Jane Smith", "email": "jane@example.com", "dietary_restrictions": "None"}
--   ],
--   "special_needs": ["One wheelchair accessible vehicle", "Early pickup requested"]
-- }
```

---

## 🎨 **Visual Design**

### **Standard Proposal:**
```
┌─────────────────────────────────────┐
│  [Hero Image with Overlay]         │
│  "Your Perfect Wine Country Escape" │
├─────────────────────────────────────┤
│  Service 1: Wine Tour               │
│  • Date, duration, party size       │
│  • Price                            │
├─────────────────────────────────────┤
│  [Photo Gallery]                    │
├─────────────────────────────────────┤
│  Pricing Breakdown                  │
│  • Subtotal, discount, tax, total   │
│  • Deposit required                 │
├─────────────────────────────────────┤
│  [Accept Proposal Button]           │
└─────────────────────────────────────┘
```

### **Corporate Proposal (with modules):**
```
┌─────────────────────────────────────┐
│  [Hero Image]                       │
│  "Team Building Wine Experience"    │
├─────────────────────────────────────┤
│  🏢 CORPORATE EVENT DETAILS         │
│  • Company: Acme Corp               │
│  • Contact: John Smith              │
│  • PO Number: PO-2025-001           │
├─────────────────────────────────────┤
│  Service 1: Wine Tour               │
│  Service 2: Team Building Activity  │
├─────────────────────────────────────┤
│  [Photo Gallery]                    │
├─────────────────────────────────────┤
│  Pricing with PO options            │
├─────────────────────────────────────┤
│  [Accept Proposal Button]           │
└─────────────────────────────────────┘
```

### **Multi-Day Proposal:**
```
┌─────────────────────────────────────┐
│  [Hero Image]                       │
│  "3-Day Wine Country Adventure"     │
├─────────────────────────────────────┤
│  📅 MULTI-DAY ITINERARY             │
│  ┌─ Day 1: Arrival & Welcome        │
│  │  • Airport pickup                │
│  │  • Hotel check-in                │
│  │  • Welcome dinner                │
│  │  Accommodation: Marcus Whitman   │
│  ├─ Day 2: Full Wine Tour           │
│  │  • 3 winery visits               │
│  │  • Lunch at vineyard             │
│  │  • Sunset tasting                │
│  └─ Day 3: Departure                │
│     • Breakfast                     │
│     • Airport transfer              │
├─────────────────────────────────────┤
│  [Photo Gallery]                    │
├─────────────────────────────────────┤
│  Total Investment                   │
└─────────────────────────────────────┘
```

---

## 🚀 **Usage**

### **Creating a Standard Proposal:**
```typescript
// In admin proposal builder
const proposal = {
  title: "Wine Country Tour",
  client_name: "John & Jane Doe",
  service_items: [...],
  // No modules needed - just core fields
};
```

### **Creating a Corporate Proposal:**
```typescript
const proposal = {
  title: "Team Building Wine Experience",
  client_name: "Acme Corporation",
  service_items: [...],
  
  // Enable corporate module
  modules: {
    corporate: true
  },
  
  // Add corporate details
  corporate_details: {
    company_name: "Acme Corporation",
    contact_person: "John Smith",
    po_number: "PO-2025-001",
    billing_address: "123 Main St, Seattle, WA 98101"
  }
};
```

### **Creating a Multi-Day Proposal:**
```typescript
const proposal = {
  title: "3-Day Wine Country Retreat",
  client_name: "Smith Family",
  service_items: [...],
  
  // Enable multi-day module
  modules: {
    multi_day: true
  },
  
  // Add day-by-day itinerary
  multi_day_itinerary: [
    {
      day: 1,
      date: "2025-06-15",
      title: "Arrival & Welcome",
      activities: [
        "Airport pickup at 2:00 PM",
        "Hotel check-in at Marcus Whitman",
        "Welcome dinner at Saffron Mediterranean Kitchen"
      ],
      accommodation: "Marcus Whitman Hotel & Conference Center",
      meals: ["Dinner"]
    },
    {
      day: 2,
      date: "2025-06-16",
      title: "Full Wine Tour",
      activities: [
        "Pickup at 10:00 AM",
        "Visit Leonetti Cellar",
        "Lunch at Dunham Cellars",
        "Visit L'Ecole No 41",
        "Sunset tasting at Waterbrook"
      ],
      meals: ["Breakfast", "Lunch"]
    },
    {
      day: 3,
      date: "2025-06-17",
      title: "Departure",
      activities: [
        "Breakfast at hotel",
        "Airport transfer at 11:00 AM"
      ],
      meals: ["Breakfast"]
    }
  ]
};
```

### **Creating a Special Event Proposal:**
```typescript
const proposal = {
  title: "Wedding Wine Tour",
  client_name: "Sarah & Mike",
  service_items: [...],
  
  // Enable special event module
  modules: {
    special_event: true
  },
  
  // Add event details
  special_event_details: {
    event_type: "Wedding",
    occasion: "Sarah & Mike's Wedding Celebration",
    special_requests: "Champagne toast at sunset, rose petals in vehicle, special playlist",
    vip_needs: ["Wheelchair accessible vehicle for grandmother", "Gluten-free lunch options"]
  }
};
```

---

## 📁 **Files Created**

### **Frontend:**
1. `/app/proposals/[proposal_id]/page.tsx` - Client proposal view

### **API:**
2. `/app/api/proposals/[proposal_id]/route.ts` - Get proposal details
3. `/app/api/proposals/[proposal_id]/media/route.ts` - Get proposal media

### **Database:**
4. `/migrations/add-proposal-modules.sql` - Add modular fields

### **Documentation:**
5. `/docs/CLIENT_PROPOSAL_VIEW.md` - This file

---

## 🎯 **Features**

### **✅ Core Features:**
- Beautiful, responsive design
- Hero image with overlay
- Service details with pricing
- Media gallery
- Pricing breakdown
- Status indicators (expired, accepted)
- Mobile-optimized

### **✅ Optional Modules:**
- Corporate event details
- Multi-day itineraries
- B2B partnership info
- Special event details
- Group coordination

### **✅ Smart Behavior:**
- Shows "Accept" button only if status = 'sent' and not expired
- Shows expiration warning if past valid_until date
- Shows success message if already accepted
- Logs views for analytics
- Responsive on all devices

---

## 🧪 **Testing**

### **1. Run Migration:**
```bash
psql $DATABASE_URL -f migrations/add-proposal-modules.sql
```

### **2. Create Test Proposal:**
```sql
INSERT INTO proposals (
  proposal_number,
  title,
  client_name,
  client_email,
  service_items,
  subtotal,
  tax,
  total,
  deposit_amount,
  valid_until,
  status,
  modules,
  corporate_details
) VALUES (
  'PROP-2025-001',
  'Corporate Team Building',
  'Acme Corporation',
  'john@acme.com',
  '[{"id":"1","service_type":"wine_tour","date":"2025-06-15","duration_hours":6,"party_size":12,"pricing_type":"calculated","price":1200}]'::jsonb,
  1200,
  106.80,
  1306.80,
  653.40,
  '2025-12-31',
  'sent',
  '{"corporate":true}'::jsonb,
  '{"company_name":"Acme Corporation","contact_person":"John Smith","po_number":"PO-2025-001"}'::jsonb
);
```

### **3. View Proposal:**
```
http://localhost:3000/proposals/PROP-2025-001
```

### **4. Test Scenarios:**
- ✅ Standard proposal (no modules)
- ✅ Corporate proposal (corporate module enabled)
- ✅ Multi-day proposal (multi_day module enabled)
- ✅ Special event (special_event module enabled)
- ✅ Expired proposal (valid_until in past)
- ✅ Accepted proposal (status = 'accepted')
- ✅ With media gallery
- ✅ Without media

---

## 🔄 **Next Steps**

### **Immediate:**
1. ⏳ Build acceptance flow (`/proposals/[id]/accept`)
2. ⏳ Add gratuity prompt during acceptance
3. ⏳ Digital signature capture
4. ⏳ Email notifications

### **Short Term:**
1. PDF generation for accepted proposals
2. Share via email/SMS
3. Proposal analytics dashboard
4. A/B testing different layouts

---

## 💡 **Benefits of This Approach**

### **✅ Flexibility:**
- One template handles all use cases
- Easy to add new modules
- No code duplication

### **✅ Maintainability:**
- Single codebase to update
- Consistent design across all types
- Easy to test

### **✅ Scalability:**
- Add new modules without touching core
- Database-driven configuration
- Easy to extend

### **✅ User Experience:**
- Consistent experience
- Only shows relevant information
- Clean, professional design

---

## 📊 **Module Combinations**

### **Common Scenarios:**

**1. Simple Leisure Tour:**
```json
{
  "modules": {}
}
```

**2. Corporate Event:**
```json
{
  "modules": {
    "corporate": true,
    "group_coordination": true
  }
}
```

**3. Multi-Day Corporate Retreat:**
```json
{
  "modules": {
    "corporate": true,
    "multi_day": true,
    "group_coordination": true
  }
}
```

**4. Wedding Package:**
```json
{
  "modules": {
    "special_event": true,
    "multi_day": true,
    "group_coordination": true
  }
}
```

**5. B2B Partnership Tour:**
```json
{
  "modules": {
    "b2b": true,
    "corporate": true
  }
}
```

---

## ✅ **Summary**

**You now have:**
- ✅ Flexible, modular proposal template
- ✅ Handles simple to complex scenarios
- ✅ Beautiful, responsive design
- ✅ Optional modules for special needs
- ✅ Easy to maintain and extend
- ✅ Database-driven configuration

**Ready to test and then build the acceptance flow!** 🚀

