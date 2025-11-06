# 🧪 Testing Guide - Proposal System

**Date:** November 1, 2025  
**Status:** ✅ Ready to test!

---

## ✅ **Setup Complete!**

- ✅ Database migrations run
- ✅ Test data created (4 proposals)
- ✅ Dev server running on port 3000
- ✅ All files in place

---

## 🎯 **Test Proposals Created**

### **1. Standard Leisure Proposal**
- **URL:** http://localhost:3000/proposals/TEST-2025-001
- **Client:** John & Jane Doe
- **Type:** Standard wine tour
- **Total:** $620.73
- **Features:** Basic proposal with gratuity enabled

### **2. Corporate Proposal**
- **URL:** http://localhost:3000/proposals/TEST-2025-002
- **Client:** Acme Corporation
- **Type:** Corporate team building
- **Total:** $914.76
- **Features:** Corporate module with PO number, company details

### **3. Multi-Day Proposal**
- **URL:** http://localhost:3000/proposals/TEST-2025-003
- **Client:** Smith Family
- **Type:** 3-day retreat
- **Total:** $1,361.25
- **Features:** Multi-day itinerary with day-by-day breakdown

### **4. Wedding/Special Event**
- **URL:** http://localhost:3000/proposals/TEST-2025-004
- **Client:** Sarah & Mike
- **Type:** Wedding celebration
- **Total:** $751.41
- **Features:** Special event module with VIP needs

---

## 📋 **Testing Checklist**

### **Phase 1: View Proposals** 👀

#### **Test 1.1: Standard Proposal**
```
URL: http://localhost:3000/proposals/TEST-2025-001

✅ Check:
- [ ] Page loads without errors
- [ ] Client name displays: "John & Jane Doe"
- [ ] Title shows: "Wine Country Experience"
- [ ] Service details visible
- [ ] Pricing breakdown shows $620.73
- [ ] "Accept Proposal" button visible
- [ ] Status shows as "sent"
- [ ] No expired warning
```

#### **Test 1.2: Corporate Proposal**
```
URL: http://localhost:3000/proposals/TEST-2025-002

✅ Check:
- [ ] Corporate module displays
- [ ] Company name: "Acme Corporation"
- [ ] Contact person: "Sarah Johnson"
- [ ] PO number: "PO-2025-12345"
- [ ] Professional styling
- [ ] All standard features work
```

#### **Test 1.3: Multi-Day Proposal**
```
URL: http://localhost:3000/proposals/TEST-2025-003

✅ Check:
- [ ] Multi-day itinerary displays
- [ ] Day 1, 2, 3 sections visible
- [ ] Activities listed for each day
- [ ] Accommodation info shows
- [ ] Meals listed
- [ ] Total for all days: $1,361.25
```

#### **Test 1.4: Wedding Proposal**
```
URL: http://localhost:3000/proposals/TEST-2025-004

✅ Check:
- [ ] Special event module displays
- [ ] Event type: "Wedding"
- [ ] Occasion: "Sarah & Mike's Wedding Celebration"
- [ ] Special requests visible
- [ ] VIP needs listed
- [ ] Romantic/elegant styling
```

---

### **Phase 2: Acceptance Flow** ✍️

#### **Test 2.1: Start Acceptance**
```
1. Go to: http://localhost:3000/proposals/TEST-2025-001
2. Click "Accept Proposal & Continue"
3. Should redirect to: /proposals/TEST-2025-001/accept

✅ Check:
- [ ] Redirects correctly
- [ ] Shows "Step 1 of 4"
- [ ] Progress bar at 25%
- [ ] Contact form displays
- [ ] Name pre-filled: "John & Jane Doe"
- [ ] Email pre-filled: "john.doe@example.com"
- [ ] Phone field empty
```

#### **Test 2.2: Step 1 - Contact Confirmation**
```
1. Fill in phone: (509) 555-1234
2. Click "Continue"

✅ Check:
- [ ] Validation works (try clicking without phone)
- [ ] Advances to Step 2
- [ ] Progress bar updates to 50%
```

#### **Test 2.3: Step 2 - Gratuity Selection**
```
✅ Test each option:

1. Click "15% Gratuity"
   - [ ] Total updates to: $713.84
   - [ ] Shows $93.11 gratuity

2. Click "20% Gratuity" (Most popular)
   - [ ] Total updates to: $744.88
   - [ ] Shows $124.15 gratuity
   - [ ] "Most popular" badge visible

3. Click "25% Gratuity"
   - [ ] Total updates to: $775.91
   - [ ] Shows $155.18 gratuity

4. Click "Custom Amount"
   - [ ] Input field appears
   - [ ] Type: 100
   - [ ] Total updates to: $720.73

5. Click "No Gratuity"
   - [ ] Total returns to: $620.73
   - [ ] No gratuity shown

6. Select 20% and click "Continue"
   - [ ] Advances to Step 3
   - [ ] Progress bar at 75%
```

#### **Test 2.4: Step 3 - Terms & Conditions**
```
✅ Check:
- [ ] Terms text displays in scrollable box
- [ ] Two checkboxes visible
- [ ] Try clicking "Continue" without checking
   - [ ] Should show validation error
- [ ] Check both boxes
- [ ] Click "Continue"
   - [ ] Advances to Step 4
   - [ ] Progress bar at 100%
```

#### **Test 2.5: Step 4 - Digital Signature**
```
✅ Check:
- [ ] Booking summary displays
- [ ] Shows tour total: $620.73
- [ ] Shows gratuity: $124.15
- [ ] Shows final total: $744.88
- [ ] Shows deposit (50%): $372.44
- [ ] Signature input field visible
- [ ] Try clicking "Accept & Pay Deposit" without signature
   - [ ] Should show validation error
- [ ] Type name: "John Doe"
- [ ] Click "Accept & Pay Deposit"
   - [ ] Shows loading spinner
   - [ ] Redirects to confirmation page
```

#### **Test 2.6: Confirmation Page**
```
URL: Should be /proposals/TEST-2025-001/confirmation

✅ Check:
- [ ] Success checkmark displays
- [ ] "Proposal Accepted! 🎉" heading
- [ ] Confirmation details show:
   - [ ] Proposal number: TEST-2025-001
   - [ ] Tour name
   - [ ] Guest name
   - [ ] Final total with gratuity
   - [ ] Deposit amount
- [ ] "What Happens Next?" section visible
- [ ] "Print Confirmation" button works
- [ ] "View Proposal Details" link works
- [ ] Contact info displayed
```

---

### **Phase 3: Edge Cases** 🔍

#### **Test 3.1: Invalid Proposal**
```
URL: http://localhost:3000/proposals/INVALID-123

✅ Check:
- [ ] Shows "Proposal Not Found" error
- [ ] Error message is clear
- [ ] "Return Home" button works
```

#### **Test 3.2: Already Accepted Proposal**
```
1. Accept TEST-2025-001 (if not already)
2. Try to view it again
3. Try to accept again

✅ Check:
- [ ] Shows "already accepted" banner
- [ ] "Accept" button hidden or disabled
- [ ] Shows acceptance date
- [ ] Can still view details
```

#### **Test 3.3: Back Navigation**
```
1. Start acceptance flow
2. Go to Step 2
3. Click "← Back"
4. Go to Step 3
5. Click "← Back" twice

✅ Check:
- [ ] Can navigate backwards
- [ ] Data persists when going back
- [ ] Progress bar updates correctly
- [ ] Can't go back from Step 1
```

#### **Test 3.4: Proposal Without Gratuity**
```
1. Update TEST-2025-002 to have gratuity_enabled = false
2. Try accepting it

✅ Check:
- [ ] Shows "Step 1 of 3" (not 4)
- [ ] Skips gratuity step
- [ ] Goes from contact → terms → signature
```

---

### **Phase 4: Mobile Testing** 📱

#### **Test 4.1: Responsive Design**
```
1. Open in mobile browser or resize window
2. Test all proposals
3. Test acceptance flow

✅ Check:
- [ ] Layout adjusts for mobile
- [ ] Text is readable
- [ ] Buttons are tappable
- [ ] Forms are usable
- [ ] Images scale properly
- [ ] No horizontal scrolling
```

---

### **Phase 5: Automated Tests** 🤖

#### **Test 5.1: Run Jest Tests**
```bash
npm test
```

✅ Check:
- [ ] All 19 tests pass
- [ ] Rate configuration tests pass
- [ ] No errors in console

#### **Test 5.2: Type Checking**
```bash
npm run type-check
```

✅ Check:
- [ ] No TypeScript errors
- [ ] All types valid

#### **Test 5.3: Linting**
```bash
npm run lint
```

✅ Check:
- [ ] No linting errors
- [ ] Code follows standards

---

## 🐛 **Known Issues to Watch For**

### **Potential Issues:**
1. **Missing deposit_amount calculation** - Should be 50% of final_total
2. **Tax calculation** - Not in database, needs to be calculated
3. **Media not displaying** - Need to link media to proposals
4. **Email not sending** - TODO: Implement email service
5. **Payment not processing** - TODO: Integrate Stripe

---

## 📊 **Database Verification**

### **Check Accepted Proposals:**
```sql
SELECT 
  proposal_number,
  client_name,
  status,
  accepted_at,
  accepted_by_name,
  gratuity_amount,
  final_total,
  signature
FROM proposals 
WHERE status = 'accepted'
ORDER BY accepted_at DESC;
```

### **Check Activity Log:**
```sql
SELECT 
  p.proposal_number,
  pal.activity_type,
  pal.details,
  pal.created_at
FROM proposal_activity_log pal
JOIN proposals p ON p.id = pal.proposal_id
ORDER BY pal.created_at DESC
LIMIT 10;
```

---

## ✅ **Success Criteria**

### **Minimum Viable:**
- [ ] All 4 test proposals load
- [ ] Can view proposal details
- [ ] Can start acceptance flow
- [ ] Can complete all 4 steps
- [ ] Can see confirmation page
- [ ] Database updates correctly

### **Full Success:**
- [ ] All edge cases handled
- [ ] Mobile responsive
- [ ] No console errors
- [ ] All automated tests pass
- [ ] Activity logging works
- [ ] Back navigation works
- [ ] Validation works properly

---

## 🎯 **Quick Test Script**

```bash
# 1. View standard proposal
open http://localhost:3000/proposals/TEST-2025-001

# 2. View corporate proposal
open http://localhost:3000/proposals/TEST-2025-002

# 3. View multi-day proposal
open http://localhost:3000/proposals/TEST-2025-003

# 4. View wedding proposal
open http://localhost:3000/proposals/TEST-2025-004

# 5. Run automated tests
npm test

# 6. Check database
psql $DATABASE_URL -c "SELECT proposal_number, status, total FROM proposals WHERE proposal_number LIKE 'TEST-%'"
```

---

## 📝 **Bug Reporting Template**

```
**Bug:** [Short description]

**Steps to Reproduce:**
1. Go to...
2. Click...
3. See error...

**Expected:** [What should happen]
**Actual:** [What actually happened]
**URL:** [Full URL]
**Proposal:** [TEST-2025-XXX]
**Browser:** [Chrome/Safari/etc]
**Console Errors:** [Any errors in console]
```

---

## 🎉 **Ready to Test!**

**Start here:**
1. Open http://localhost:3000/proposals/TEST-2025-001
2. Click through the acceptance flow
3. Report any issues
4. Test the other 3 proposals
5. Run automated tests

**Good luck!** 🚀

