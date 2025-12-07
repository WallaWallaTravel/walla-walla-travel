# 🚀 Proposal System Enhancements - Specification

## New Features to Implement:

### **1. Multiple Date Options**
- Admin can add multiple proposed dates for same service
- Client sees all options and can choose preferred date
- Or admin can create multiple services on different dates

### **2. Service Types**
Beyond just wine tours, support:
- **Wine Tour** - Full day tour with wineries
- **Transfer** - Point A to Point B
- **Airport Transfer** - Airport pickup/dropoff
- **Wait Time** - Hourly waiting charge
- **Custom Service** - Any other service

### **3. Flexible Pricing**
Each service can have:
- **Hourly Rate** - $X per hour × duration
- **Flat Rate** - Fixed price for service
- Admin chooses which pricing model per service

### **4. Adjustable Gratuity**
- **Admin Side:**
  - Checkbox: "Include gratuity request"
  - If checked, set suggested percentage (15%, 18%, 20%, custom)
  - Option: "Gratuity optional" or "Gratuity required"
  
- **Client Side (During Acceptance):**
  - If gratuity enabled, show after main acceptance
  - Client can:
    - Accept suggested amount
    - Enter custom amount
    - Decline (if optional)
  - Gratuity added to final total

### **5. Service Item Structure**

```typescript
interface ServiceItem {
  id: string;
  service_type: 'wine_tour' | 'transfer' | 'airport_transfer' | 'wait_time' | 'custom';
  name: string;
  description: string;
  date: string;
  start_time?: string;
  duration_hours?: number;
  
  // IMPORTANT: Each service has its own party size!
  party_size: number; // Required for all services
  
  pickup_location?: string;
  dropoff_location?: string;
  
  // Flexible Pricing
  pricing_type: 'hourly' | 'flat' | 'calculated';
  hourly_rate?: number;  // If hourly
  flat_rate?: number;    // If flat
  calculated_price: number; // Final price (includes party_size for calculated pricing)
  
  // Wine Tour Specific
  selected_wineries?: Array<{
    id: number;
    name: string;
    city: string;
  }>;
  
  // Vehicle assignment (optional, can be auto-assigned based on party_size)
  vehicle_type?: 'sedan' | 'sprinter' | 'luxury';
}
```

### **6. Proposal Flow**

**Admin Creates Proposal:**
1. Enter client info
2. **Add Service Items:**
   - Click "+ Add Service"
   - Choose service type
   - Fill in details (date, time, location, etc.)
   - Choose pricing: Hourly or Flat
   - Set rate
   - Price calculates automatically
   - Can add multiple services!
3. Add optional add-ons
4. Set discount (if any)
5. **Gratuity Settings:**
   - Check "Include gratuity request"
   - Set suggested % (default 18%)
   - Choose optional or required
6. Review total
7. Create & send

**Client Accepts Proposal:**
1. Views proposal with all services
2. Clicks "Accept Proposal"
3. **Step 1: Review & Sign**
   - Type name to sign
   - Confirm acceptance
4. **Step 2: Gratuity (if enabled)**
   - See suggested gratuity
   - Options:
     - "Add 18% ($X.XX)" - suggested
     - "Add 15% ($X.XX)"
     - "Add 20% ($X.XX)"
     - "Add 25% ($X.XX)"
     - "Custom amount: $____"
     - "No gratuity" (if optional)
   - Shows updated total
5. **Step 3: Confirmation**
   - Final total shown
   - "Confirm Acceptance"
   - Done!

---

## UI/UX Design:

### **Service Item Builder:**

```
┌─────────────────────────────────────────────────┐
│ Service Items                                    │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Service #1: Wine Tour                       │ │
│ │ Date: June 15, 2025                         │ │
│ │ Duration: 6 hours                           │ │
│ │ Party: 6 guests                             │ │
│ │ Pricing: $1,089.00                          │ │
│ │ [Edit] [Remove]                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Service #2: Airport Transfer                │ │
│ │ Date: June 15, 2025                         │ │
│ │ From: SeaTac Airport                        │ │
│ │ To: Walla Walla Hotel                       │ │
│ │ Pricing: $350.00 (flat rate)                │ │
│ │ [Edit] [Remove]                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ [+ Add Another Service]                          │
└─────────────────────────────────────────────────┘
```

### **Gratuity Settings:**

```
┌─────────────────────────────────────────────────┐
│ Gratuity Settings                                │
│                                                  │
│ ☑ Include gratuity request in proposal          │
│                                                  │
│ Suggested Percentage:                            │
│ ○ 15%  ● 18%  ○ 20%  ○ 25%  ○ Custom: [__]%    │
│                                                  │
│ ☑ Gratuity is optional (client can decline)     │
│ ☐ Gratuity is required                          │
└─────────────────────────────────────────────────┘
```

### **Client Acceptance Flow:**

**Step 1: Sign**
```
┌─────────────────────────────────────────────────┐
│ Accept Proposal                                  │
│                                                  │
│ By signing below, you agree to:                  │
│ • Total investment: $1,439.00                    │
│ • Terms and conditions                           │
│                                                  │
│ Your Name: [John Smith_______________]           │
│ Email: [john@example.com______________]          │
│ Signature: [John Smith_______________]           │
│                                                  │
│ [Cancel] [Continue to Gratuity →]               │
└─────────────────────────────────────────────────┘
```

**Step 2: Gratuity (if enabled)**
```
┌─────────────────────────────────────────────────┐
│ Add Gratuity? (Optional)                         │
│                                                  │
│ Your service total: $1,439.00                    │
│                                                  │
│ Would you like to add a gratuity for your       │
│ driver/guide?                                    │
│                                                  │
│ ○ 15% - $215.85                                 │
│ ● 18% - $259.02 (Suggested)                     │
│ ○ 20% - $287.80                                 │
│ ○ 25% - $359.75                                 │
│ ○ Custom: $[_______]                            │
│ ○ No gratuity                                   │
│                                                  │
│ New Total: $1,698.02                            │
│                                                  │
│ [← Back] [Confirm Acceptance]                   │
└─────────────────────────────────────────────────┘
```

---

## Database Changes:

```sql
ALTER TABLE proposals ADD COLUMN service_items JSONB;
ALTER TABLE proposals ADD COLUMN include_gratuity_request BOOLEAN DEFAULT FALSE;
ALTER TABLE proposals ADD COLUMN suggested_gratuity_percentage DECIMAL(5,2) DEFAULT 18.00;
ALTER TABLE proposals ADD COLUMN gratuity_optional BOOLEAN DEFAULT TRUE;
ALTER TABLE proposals ADD COLUMN client_gratuity_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE proposals ADD COLUMN client_gratuity_percentage DECIMAL(5,2);
```

---

## Implementation Plan:

### **Phase 1: Service Items**
1. Create ServiceItemBuilder component
2. Support multiple service types
3. Flexible pricing (hourly/flat)
4. Add/Edit/Remove services

### **Phase 2: Gratuity System**
1. Admin gratuity settings
2. Client gratuity selection modal
3. Multi-step acceptance flow
4. Total recalculation

### **Phase 3: Enhanced Proposal View**
1. Display multiple services
2. Show service details per item
3. Gratuity acceptance UI
4. Updated pricing sidebar

---

## Pricing Examples:

### **Example 1: Multi-Day Wine Tour Package**
- Service 1: Wine Tour (June 15) - **6 guests** - $1,089
- Service 2: Wine Tour (June 16) - **6 guests** - $1,089
- Service 3: Airport Transfer (June 17) - **6 guests** - $350
- Subtotal: $2,528
- Tax: $225
- **Total: $2,753**
- Gratuity (18%): $495.54
- **Grand Total: $3,248.54**

### **Example 2: Corporate Transfer Package (Variable Party Sizes)**
- Service 1: Airport Transfer (arrive) - **8 guests** - $350 flat
- Service 2: Wait Time (3 hours) - **8 guests** - $150/hr = $450
- Service 3: Airport Transfer (depart) - **4 guests** (half group left early) - $200 flat
- Subtotal: $1,000
- Tax: $89
- **Total: $1,089**
- Gratuity (20%): $217.80
- **Grand Total: $1,306.80**

**Note:** Each service has its own party_size, allowing flexibility for:
- Guests joining/leaving mid-trip
- Split groups (some go to winery, others to hotel)
- Different vehicle sizes needed
- Accurate pricing per service

---

## Benefits:

✅ **Flexibility** - Handle any type of service  
✅ **Multiple Dates** - Package deals, multi-day tours  
✅ **Clear Pricing** - Hourly or flat, client's choice  
✅ **Gratuity Control** - Admin decides if/how to request  
✅ **Professional** - Comprehensive, detailed proposals  
✅ **Conversion** - Easier for clients to say yes  

---

**Ready to implement!** 🚀

