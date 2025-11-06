# Pricing Management System

## Overview
Complete pricing management system with per-proposal overrides and global rate administration.

## Features Implemented

### 1. **Per-Proposal Pricing Override** ✅
Allows you to negotiate and adjust pricing for individual proposals without affecting global rates.

#### How to Use:
1. When creating/editing a proposal, expand any service item
2. Find the **"Override Pricing (for negotiation)"** checkbox
3. Check it to enable custom pricing
4. Enter your negotiated price
5. Add an internal note explaining why (e.g., "Repeat customer discount")

#### What You'll See:
- **Standard Price:** Shows the calculated price based on global rates
- **Custom Price:** Your negotiated price
- **Discount/Premium Indicator:** Automatically calculates and shows the difference
  - Green = Discount given
  - Blue = Premium charged
- **Reason Field:** Internal note (not visible to client)

#### Example:
```
Standard Price: $750.00
Custom Price: $650.00
✓ Discount: $100.00 (13% off)
Reason: "Corporate client - negotiated rate to secure booking"
```

---

### 2. **Global Rate Management** ✅
Admin dashboard to update base pricing rates that apply to all new proposals.

#### Access:
Navigate to `/admin/rates` in your browser

#### Rate Categories:

##### 🍷 **Wine Tours**
- Base Hourly Rate
- Per Person Charge (after threshold)
- Per Person Threshold
- Minimum Hours
- Weekend Multiplier
- Holiday Multiplier

##### 🚐 **Transfers**
- SeaTac ↔ Walla Walla
- Pasco ↔ Walla Walla
- Local Transfer (base + per mile)

##### ⏱️ **Wait Time**
- Hourly Rate
- Minimum Hours

##### 💳 **Deposits & Fees**
- Deposit Percentage
- Tax Rate
- Cancellation Window (days)
- Cancellation Fee Percentage

##### 💰 **Gratuity**
- Default Percentage
- Quick Select Options

#### How to Update Rates:
1. Go to `/admin/rates`
2. Click **"Edit Rates"** on any category
3. Modify the values
4. **IMPORTANT:** Enter a reason for the change (required for audit trail)
5. Click **"Save Changes"**

#### Change Tracking:
Every rate change is logged with:
- Old value
- New value
- Who made the change
- Reason for change
- Timestamp

---

## Database Schema

### `rate_config` Table
Stores all current rate configurations.

```sql
- id: Primary key
- config_key: Category identifier (wine_tours, transfers, etc.)
- config_value: JSON object with all rates
- description: Human-readable description
- last_updated_by: Who last changed it
- updated_at: When it was last changed
- created_at: When it was created
```

### `rate_change_log` Table
Audit trail of all rate changes.

```sql
- id: Primary key
- config_key: Which category was changed
- old_value: Previous rates (JSON)
- new_value: New rates (JSON)
- changed_by: Who made the change
- change_reason: Why it was changed
- changed_at: When it was changed
```

---

## API Endpoints

### `GET /api/admin/rates`
Fetch all current rate configurations.

**Response:**
```json
{
  "success": true,
  "rates": [
    {
      "id": 1,
      "config_key": "wine_tours",
      "config_value": {
        "minimum_hours": 5,
        "base_rate": 125,
        ...
      },
      "description": "Wine tour pricing configuration",
      "last_updated_by": "admin",
      "updated_at": "2025-11-02T10:30:00Z"
    }
  ]
}
```

### `PATCH /api/admin/rates`
Update a specific rate configuration.

**Request Body:**
```json
{
  "config_key": "wine_tours",
  "config_value": {
    "minimum_hours": 5,
    "base_rate": 135,
    ...
  },
  "changed_by": "admin",
  "change_reason": "Annual price increase for 2026"
}
```

**Response:**
```json
{
  "success": true,
  "rate": { ... },
  "message": "Rate configuration updated successfully"
}
```

---

## Use Cases

### Use Case 1: Negotiating with a Corporate Client
**Scenario:** A corporate client wants a wine tour but needs a discount to fit their budget.

**Steps:**
1. Create proposal as normal
2. Enable "Override Pricing" on the wine tour service
3. Enter negotiated price: $600 (down from $750)
4. Add reason: "Corporate discount - 20+ employee company"
5. Save proposal
6. Client sees $600 (they never see the $750 standard price)

---

### Use Case 2: Annual Price Increase
**Scenario:** It's January and you're raising rates by 5% for the new year.

**Steps:**
1. Go to `/admin/rates`
2. Click "Edit Rates" on Wine Tours
3. Update base rate from $125 to $131.25
4. Enter reason: "2026 annual price increase - 5%"
5. Save changes
6. All NEW proposals will use $131.25
7. Existing proposals keep their original pricing

---

### Use Case 3: Competitor Price Match
**Scenario:** A competitor drops their SeaTac transfer price and you need to match.

**Steps:**
1. Go to `/admin/rates`
2. Click "Edit Rates" on Transfers
3. Update SeaTac rate from $650 to $625
4. Enter reason: "Price match - Competitor X offering $625"
5. Save changes
6. New proposals automatically use $625

---

### Use Case 4: Premium Pricing for Peak Season
**Scenario:** You want to charge more during harvest season without changing base rates.

**Steps:**
1. Create proposal as normal
2. Enable "Override Pricing" on services
3. Enter premium price: $900 (up from $750)
4. Add reason: "Peak harvest season - high demand"
5. Client sees $900 as the price

---

## Important Notes

### ⚠️ Rate Changes Only Affect New Proposals
- Existing proposals keep their original pricing
- This prevents confusion and maintains agreed-upon prices
- Override pricing is saved with each proposal

### 📊 Audit Trail
- Every rate change is logged
- You can see who changed what and why
- Useful for tracking pricing strategy over time

### 🔒 Pricing Override is Internal Only
- Clients never see the "standard" price when you override
- They only see the final price you set
- The override reason is internal and not visible to clients

### 💡 Best Practices
1. **Always provide a reason** when changing rates
2. **Use overrides for negotiations**, not permanent changes
3. **Update global rates** for annual increases or market adjustments
4. **Document competitor pricing** in change reasons for future reference

---

## Testing

### Test Per-Proposal Override:
1. Go to `/admin/proposals/new`
2. Add a wine tour service
3. Enable "Override Pricing"
4. Set custom price and reason
5. Verify discount/premium calculation shows correctly
6. Save and check that proposal uses override price

### Test Global Rate Management:
1. Go to `/admin/rates`
2. Note current wine tour base rate
3. Click "Edit Rates"
4. Change base rate
5. Enter reason and save
6. Create a new proposal
7. Verify new proposal uses updated rate
8. Check that old proposals still use old rate

---

## Future Enhancements (Optional)

- **Rate History Viewer:** See all past rate changes in a timeline
- **Seasonal Rate Rules:** Automatically adjust rates based on date ranges
- **Bulk Pricing Tools:** Apply discounts to multiple services at once
- **Rate Templates:** Save common pricing overrides for quick application
- **Competitor Price Tracking:** Integration with competitor monitoring system

---

## Files Modified/Created

### Created:
- `/migrations/add-rate-management-system.sql` - Database schema
- `/app/api/admin/rates/route.ts` - API endpoints
- `/app/admin/rates/page.tsx` - Admin UI
- `/docs/PRICING_MANAGEMENT_SYSTEM.md` - This documentation

### Modified:
- `/app/admin/proposals/new/page.tsx` - Added pricing override UI
- `ServiceItem` interface - Added `pricing_override` field
- `calculateServicePrice()` - Respects override pricing

---

## Summary

You now have complete control over pricing:
- **Negotiate deals** with per-proposal overrides
- **Manage global rates** through an easy admin interface
- **Track all changes** with automatic audit logging
- **Maintain pricing integrity** - existing proposals never change

This system gives you the flexibility to compete on price while maintaining professional rate management and historical tracking.

