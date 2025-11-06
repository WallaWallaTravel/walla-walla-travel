# Automated Testing Workflow
**Date:** October 31, 2025  
**Purpose:** Prevent "localhost refused to connect" issues

---

## 🎯 **The Problem You Just Hit:**

You tried to test the payment page, but got:
```
localhost refused to connect
ERR_CONNECTION_REFUSED
```

**Why?** The dev server wasn't actually running properly.

**This is EXACTLY what we need to prevent!** ✅

---

## 🛠️ **The Solution: Automated Pre-Flight System:**

### **What I Should Do BEFORE Asking You to Test:**

```
1. ✅ Check if server is running
2. ✅ If not, start it automatically
3. ✅ Wait for it to be ready
4. ✅ Test that it responds
5. ✅ Check database connection
6. ✅ Verify tables exist
7. ✅ Test API endpoints
8. ✅ ONLY THEN ask you to test
```

---

## 📋 **New Workflow Going Forward:**

### **Before I Say "Test This":**

**I will run:**
```bash
node scripts/pre-flight-check.js
```

**This automatically:**
- Checks if server is running
- Starts it if needed
- Verifies database connection
- Confirms tables exist
- Tests API endpoints
- Reports any issues

**Output Example:**
```
🛫 PRE-FLIGHT CHECK SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Checking development server...
✅ Server running on http://localhost:3000

2️⃣  Checking database connection...
✅ Database connected

3️⃣  Checking database tables...
⚠️  Missing tables: invoices, tour_offers
   Fix: Run database migration

4️⃣  Checking API endpoints...
✅ /api/admin/pending-invoices - Status 200

📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Database Tables
⚠️  SOME CHECKS FAILED

🔧 Quick Fix: Run migration
   node scripts/run-invoicing-migration.js
```

---

## 🤖 **AI Agent Protocol (For Me):**

### **NEVER Ask User to Test Without:**

1. **Running pre-flight check**
2. **Fixing any failures automatically**
3. **Confirming everything works**
4. **Providing working URLs**

### **Example Good Flow:**

```
AI: "Let me verify everything is working first..."

[Runs pre-flight check]
[Detects server not running]
[Starts server automatically]
[Waits for it to be ready]
[Tests endpoints]

AI: "✅ Everything is ready! 
     The payment page is working at: http://localhost:3000/payment/final/1
     I've verified it loads successfully."
```

### **Example Bad Flow (What Just Happened):**

```
AI: "Open http://localhost:3000/payment/final/1"

User: [Gets connection refused error]

AI: "Oh, the server isn't running..."
```

**This is what we're fixing!** ❌

---

## 🚀 **Implementation Steps:**

### **Step 1: Create Pre-Flight Check** ✅
**File:** `/scripts/pre-flight-check.js`
**Status:** Created!

### **Step 2: Auto-Start Server** 
**Add to pre-flight check:**
- Detect if server is down
- Run `npm run dev` automatically
- Wait for it to respond
- Verify it's working

### **Step 3: Auto-Run Migration**
**Add to pre-flight check:**
- Detect if tables are missing
- Run migration automatically
- Verify tables created
- Confirm APIs work

### **Step 4: Create Test Data**
**Add to pre-flight check:**
- Check if test bookings exist
- Create sample data if needed
- Verify payment page loads

---

## 💡 **Better Approach - Integration:**

### **Option A: Manual Pre-Flight (Current)**
```bash
# I run this before asking you to test
node scripts/pre-flight-check.js
```

### **Option B: Automated in npm scripts**
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:safe": "node scripts/pre-flight-check.js && next dev",
    "test:ready": "node scripts/pre-flight-check.js"
  }
}
```

### **Option C: CI/CD Style**
```bash
# Run automatically before every feature demo
npm run test:ready && echo "Ready for testing!"
```

---

## 🎯 **What We'll Do Right Now:**

### **Immediate Fix:**

1. **Start the server properly**
```bash
cd /Users/temp/walla-walla-final
npm run dev
```

2. **Wait 10 seconds for it to start**

3. **Test that it responds**
```bash
curl http://localhost:3000
```

4. **THEN ask you to test**

---

## 📊 **Success Criteria:**

**Feature is "ready for testing" when:**
- ✅ Server is running and responding
- ✅ Database is connected
- ✅ Required tables exist
- ✅ API endpoints return 200/404 (not 500)
- ✅ Test URLs load without errors
- ✅ Pre-flight check passes

**ONLY THEN** should I say "please test this"!

---

## 🔧 **For Next Features:**

### **Driver Tour Acceptance:**
Before asking you to test, I'll:
1. Run pre-flight check
2. Verify tour_offers table exists
3. Test the API endpoint
4. Confirm UI loads
5. THEN ask you to test

### **Lunch Ordering:**
Before asking you to test, I'll:
1. Run pre-flight check
2. Verify restaurants table has data
3. Test the ordering API
4. Confirm menu displays
5. THEN ask you to test

---

## 🎉 **Bottom Line:**

**You should NEVER see "connection refused" again!**

**I will:**
- ✅ Check everything first
- ✅ Fix issues automatically
- ✅ Verify it works
- ✅ Give you working URLs

**You will:**
- ✅ Only test when it's actually ready
- ✅ See working features
- ✅ Report real bugs (not setup issues)

---

**Status:** System designed - implementing now!

**Next:** Let me properly start the server and verify it works BEFORE asking you to test.


