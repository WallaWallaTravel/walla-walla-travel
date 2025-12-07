# 🧪 Testing Guide - All Features

**Date:** October 31, 2025  
**Status:** Ready to Test

---

## 🎯 **Quick Test Checklist**

- [ ] 1. Test Invoicing System
- [ ] 2. Test Lunch Ordering System
- [ ] 3. Test Driver Tour Acceptance

---

## 1️⃣ **Test Invoicing System**

### **Prerequisites:**
- ✅ Database migration complete
- ✅ Test booking #37 created
- ✅ Dev server running at `http://localhost:3000`

### **Test Steps:**

#### **A. Admin Dashboard - View Pending Invoices**

1. **Open Admin Dashboard:**
   ```
   http://localhost:3000/admin/invoices
   ```

2. **What You Should See:**
   - Pending invoice for "John & Sarah Smith"
   - Tour date: 3 days ago
   - Actual hours: 7.5
   - Calculated amount: $1,125.00
   - "Approve & Send Invoice" button

3. **Click "Approve & Send Invoice"**
   - Should show success message
   - Invoice status changes to "Sent"

#### **B. Customer Payment Page - Test Tips**

1. **Open Payment Page:**
   ```
   http://localhost:3000/payment/final/37
   ```

2. **What You Should See:**
   - Booking details for John & Sarah Smith
   - Service hours: 7.5 hours @ $150/hr
   - Subtotal: $1,125.00
   - **Tip Options:**
     - 15% ($168.75)
     - 20% ($225.00)
     - 25% ($281.25)
     - Custom amount input
   - Total with tip
   - Payment form

3. **Test Tip Selection:**
   - Click 15% button → Total should update to $1,293.75
   - Click 20% button → Total should update to $1,350.00
   - Click 25% button → Total should update to $1,406.25
   - Enter custom tip → Total should update accordingly

4. **Test Payment Flow:**
   - Fill in card details (use Stripe test card: 4242 4242 4242 4242)
   - Click "Pay Now"
   - Should process payment and show confirmation

### **✅ Success Criteria:**
- [x] Admin can view pending invoices
- [x] Admin can approve with one click
- [x] Customer sees tip options (15%, 20%, 25%)
- [x] Tip calculations are correct
- [x] Payment processes successfully

---

## 2️⃣ **Test Lunch Ordering System**

### **Prerequisites:**
- ✅ Restaurants loaded in database
- ✅ WCS Menu PDF in `/public/menus/`
- ✅ Test booking exists

### **Test Steps:**

#### **A. Client Portal - Order Lunch**

1. **Open Lunch Ordering Page:**
   ```
   http://localhost:3000/client-portal/37/lunch
   ```
   *(Replace 37 with your booking ID)*

2. **What You Should See:**
   - Booking details (customer name, tour date, party size)
   - Restaurant selection (3-5 restaurants)
   - WCS Menu categories:
     - Sandwiches (Turkey, Ham, Roast Beef, Veggie, Chicken Salad)
     - Salads (Caesar, Garden, Cobb)
     - Sides (Chips, Fruit, Pasta Salad)
     - Drinks (Water, Soda, Iced Tea)
     - Desserts (Cookie, Brownie)
   - Link to view full PDF menu

3. **Test Ordering:**
   - Select a restaurant (e.g., first one)
   - Add items:
     - 8x Turkey & Swiss ($14 each) = $112
     - 8x Caesar Salad ($12 each) = $96
     - 8x Chips ($3 each) = $24
     - 8x Water ($2 each) = $16
   - **Expected Total:** $248.00
   - Add dietary restriction: "2 guests are gluten-free"
   - Add special request: "Please pack separately for easy distribution"
   - Click "Submit Order for Approval"
   - Should show success message

#### **B. Admin Dashboard - Approve Lunch Order**

1. **Open Admin Lunch Orders:**
   ```
   http://localhost:3000/admin/lunch-orders
   ```

2. **What You Should See:**
   - Pending order for John & Sarah Smith
   - Restaurant name
   - Total: $248.00
   - Party size: 8
   - "View Details" and "Approve & Send" buttons

3. **Click "View Details":**
   - Should open modal with full email preview
   - Shows:
     - Customer information
     - Restaurant details
     - Order items with quantities
     - Dietary restrictions
     - Special requests
     - Total amount

4. **Click "Approve & Send":**
   - Should show success message
   - Order status changes to "Sent"
   - Email would be sent to restaurant (logged in console if no API key)

### **✅ Success Criteria:**
- [x] Client can view WCS menu
- [x] Client can add items with quantities
- [x] Client can add dietary restrictions
- [x] Order total calculates correctly
- [x] Admin can view order details
- [x] Admin can approve with one click
- [x] Email preview is formatted correctly

---

## 3️⃣ **Test Driver Tour Acceptance**

### **Prerequisites:**
- ✅ Tour offers table created
- ✅ Drivers exist in database
- ✅ Unassigned bookings available

### **Test Steps:**

#### **A. Admin - Create Tour Offer**

1. **Open Tour Offers Page:**
   ```
   http://localhost:3000/admin/tour-offers
   ```

2. **What You Should See:**
   - List of unassigned bookings (left side)
   - Offer creation form (right side, appears after selecting booking)

3. **Create an Offer:**
   - Click on an unassigned booking
   - Select a driver from dropdown
   - (Optional) Select a vehicle
   - Set expiration: 48 hours (default)
   - Add notes: "VIP client - please arrive 15 min early"
   - Click "Send Offer"
   - Should show success message

#### **B. Driver Portal - View Offers**

1. **Open Driver Offers Page:**
   ```
   http://localhost:3000/driver-portal/offers
   ```
   *(Note: Currently uses driver_id=1 as placeholder)*

2. **What You Should See:**
   - Pending offer card with:
     - Customer name
     - Tour date and time
     - Party size
     - Pickup location
     - Vehicle assigned
     - **Your Pay:** $XXX.XX (in large blue box)
     - Duration in hours
     - Notes from dispatch
     - Expiration countdown
   - "Decline" and "Accept Tour" buttons

3. **Test Accept:**
   - Click "Accept Tour" button
   - Confirm in dialog
   - Should show: "✅ Tour accepted! You have been assigned to this booking."
   - Offer moves to "Recent Responses" section
   - Status shows "✓ Accepted"

4. **Verify Auto-Assignment:**
   - Check booking in database:
     ```sql
     SELECT driver_id, status FROM bookings WHERE id = [booking_id];
     ```
   - Should show driver assigned
   - Status should be "confirmed"

5. **Test Decline:**
   - Create another offer
   - Click "Decline" button
   - Enter reason (optional)
   - Should show: "Tour declined."
   - Offer moves to "Recent Responses"
   - Status shows "Declined"

#### **C. Verify Competing Offers Withdrawn**

1. **Create Multiple Offers:**
   - Create 2-3 offers for the same booking to different drivers
   - Have one driver accept
   - Check other offers:
     ```sql
     SELECT status, response_notes FROM tour_offers WHERE booking_id = [booking_id];
     ```
   - Other offers should be "withdrawn"
   - Response notes: "Automatically withdrawn - booking accepted by another driver"

### **✅ Success Criteria:**
- [x] Admin can create tour offers
- [x] Driver can view pending offers
- [x] Driver can see pay amount prominently
- [x] Driver can accept tours
- [x] Driver can decline tours
- [x] Acceptance auto-assigns driver to booking
- [x] Acceptance auto-assigns vehicle
- [x] Competing offers are withdrawn automatically
- [x] Booking status updates to "confirmed"

---

## 🔍 **Database Verification Queries**

### **Check Invoicing Data:**
```sql
-- View pending invoices
SELECT * FROM pending_final_invoices;

-- View all invoices
SELECT * FROM invoices ORDER BY created_at DESC LIMIT 5;

-- Check booking invoice status
SELECT 
  booking_number,
  actual_hours,
  hourly_rate,
  ready_for_final_invoice,
  final_invoice_sent
FROM bookings 
WHERE id = 37;
```

### **Check Lunch Orders:**
```sql
-- View all lunch orders
SELECT 
  lo.id,
  b.customer_name,
  r.name as restaurant,
  lo.total,
  lo.status
FROM lunch_orders lo
JOIN bookings b ON lo.booking_id = b.id
JOIN restaurants r ON lo.restaurant_id = r.id
ORDER BY lo.created_at DESC;

-- View order details
SELECT * FROM lunch_orders WHERE id = [order_id];
```

### **Check Tour Offers:**
```sql
-- View all tour offers
SELECT 
  to.id,
  b.booking_number,
  u.name as driver_name,
  to.status,
  to.offered_at,
  to.expires_at,
  to.response_at
FROM tour_offers to
JOIN bookings b ON to.booking_id = b.id
JOIN users u ON to.driver_id = u.id
ORDER BY to.offered_at DESC;

-- Check driver assignment
SELECT 
  booking_number,
  driver_id,
  status
FROM bookings
WHERE driver_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
```

---

## 🐛 **Troubleshooting**

### **Issue: Page Not Loading**

**Check Dev Server:**
```bash
# In terminal, verify server is running
curl http://localhost:3000
```

**Restart Server if Needed:**
```bash
cd /Users/temp/walla-walla-final
npm run dev
```

### **Issue: No Test Data**

**Re-run Seed Script:**
```bash
cd /Users/temp/walla-walla-final
node scripts/seed-test-invoice.js
```

### **Issue: Database Errors**

**Check Connection:**
```bash
cd /Users/temp/walla-walla-final
node scripts/check-db-schema.js
```

**Re-run Migration:**
```bash
cd /Users/temp/walla-walla-final
node scripts/run-invoicing-migration.js
```

### **Issue: Email Not Sending**

**Expected Behavior:**
- Without `RESEND_API_KEY`: Emails logged to console
- With `RESEND_API_KEY`: Emails sent via Resend

**Check Console:**
```bash
# Look for email logs in terminal running dev server
⚠️  RESEND_API_KEY not configured. Email would be sent: [subject]
```

---

## 📊 **Test Results Template**

Copy this and fill in as you test:

```
## Test Results - [Your Name] - [Date]

### 1. Invoicing System
- [ ] Admin dashboard loads
- [ ] Can view pending invoice
- [ ] Can approve invoice
- [ ] Payment page loads
- [ ] Tip options display correctly
- [ ] Tip calculations correct
- [ ] Payment processes
**Status:** ✅ PASS / ❌ FAIL
**Notes:**

### 2. Lunch Ordering
- [ ] Client portal loads
- [ ] Can select restaurant
- [ ] Menu displays correctly
- [ ] Can add items
- [ ] Total calculates correctly
- [ ] Can submit order
- [ ] Admin can view order
- [ ] Admin can approve
- [ ] Email preview correct
**Status:** ✅ PASS / ❌ FAIL
**Notes:**

### 3. Driver Tour Acceptance
- [ ] Admin can create offer
- [ ] Driver portal loads
- [ ] Offer displays correctly
- [ ] Can accept tour
- [ ] Auto-assignment works
- [ ] Can decline tour
- [ ] Competing offers withdrawn
**Status:** ✅ PASS / ❌ FAIL
**Notes:**

### Overall
**All Tests Passed:** YES / NO
**Issues Found:** [List any issues]
**Recommendations:** [Any suggestions]
```

---

## 🎯 **Quick Test Script**

Run this to test all APIs at once:

```bash
cd /Users/temp/walla-walla-final

# Test invoicing API
echo "Testing invoicing API..."
curl -s http://localhost:3000/api/admin/pending-invoices | head -20

# Test restaurants API
echo "\nTesting restaurants API..."
curl -s http://localhost:3000/api/restaurants | head -20

# Test lunch orders API
echo "\nTesting lunch orders API..."
curl -s http://localhost:3000/api/admin/lunch-orders | head -20

# Test driver offers API
echo "\nTesting driver offers API..."
curl -s "http://localhost:3000/api/driver/offers?driver_id=1" | head -20

echo "\n✅ API tests complete!"
```

---

## ✅ **Final Checklist**

Before marking complete:

- [ ] All 3 systems tested
- [ ] All features working as expected
- [ ] No console errors
- [ ] Database queries return correct data
- [ ] UI is responsive and looks good
- [ ] Error handling works
- [ ] Documentation is clear

---

**Happy Testing! 🎉**

If you find any issues, check the troubleshooting section or review the console logs for error details.

