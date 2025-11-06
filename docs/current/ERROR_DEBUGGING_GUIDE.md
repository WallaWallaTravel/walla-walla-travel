# Error Debugging System
**Date:** October 31, 2025  
**Purpose:** Automated error capture and viewing for AI agent debugging

---

## 🎯 **The Problem We Solved:**

**Before:**
- ❌ AI agent can't see browser console
- ❌ Manual copy/paste of errors required
- ❌ Slow debugging cycle

**Now:**
- ✅ Automatic error capture from browser
- ✅ Errors logged to file
- ✅ AI agent can read error logs
- ✅ Fast debugging cycle

---

## 🔧 **How It Works:**

### **1. Error Logger (Client-Side)**
**File:** `/lib/error-logger.ts`

**Captures:**
- JavaScript errors
- Unhandled promise rejections
- Console errors
- Failed API calls

**Sends to:** `/api/log-error` endpoint

### **2. Error API (Server-Side)**
**File:** `/app/api/log-error/route.ts`

**Actions:**
- Receives error from browser
- Writes to `logs/client-errors.log`
- Logs to terminal console
- Returns success

### **3. Error Viewer (Terminal)**
**File:** `/scripts/view-errors.sh`

**Usage:**
```bash
chmod +x scripts/view-errors.sh
./scripts/view-errors.sh
```

---

## 📋 **Usage Instructions:**

### **For You (Human):**

**Step 1: Browse the app normally**
```
http://localhost:3000/payment/final/1
```

**Step 2: If you see an error, just tell me:**
```
"There's an error on the payment page"
```

**Step 3: I'll check the logs:**
```bash
cat logs/client-errors.log
```

**Step 4: I'll fix it immediately!**

---

### **For Me (AI Agent):**

When you report an error, I'll:

1. **Read the error log:**
```bash
cat logs/client-errors.log | tail -50
```

2. **Identify the issue**

3. **Fix the code**

4. **Verify the fix**

---

## 🚀 **Quick Commands:**

### **View Recent Errors:**
```bash
cd /Users/temp/walla-walla-final
cat logs/client-errors.log | tail -20
```

### **Watch Errors Live:**
```bash
tail -f logs/client-errors.log
```

### **Clear Error Log:**
```bash
rm logs/client-errors.log
```

### **Count Errors:**
```bash
grep -c "━━━" logs/client-errors.log
```

---

## 📊 **Error Format:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2025-10-31T10:30:45.123Z] Console Error
URL: http://localhost:3000/payment/final/1
Message: Failed to fetch invoice
Stack: Error: Failed to fetch
    at loadInvoice (page.tsx:42)
    at useEffect (page.tsx:35)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🐛 **Example Debugging Session:**

### **You:**
> "The payment page shows a blank screen"

### **Me:**
```bash
cat logs/client-errors.log
```

**Output:**
```
[2025-10-31T10:30:45.123Z] Invoice Load Failed
Message: 404 Not Found
URL: http://localhost:3000/payment/final/1
```

**Analysis:** Invoice API returning 404 - booking doesn't exist

**Fix:** Create test booking or use existing ID

---

## ✅ **Benefits:**

1. **No Manual Copy/Paste** - Errors auto-captured
2. **Complete Stack Traces** - Full error details
3. **Timestamp Tracking** - Know when errors occurred
4. **AI Agent Visibility** - I can see what you see
5. **Faster Debugging** - Immediate error identification

---

## 🎯 **Current Status:**

**Installed On:**
- ✅ Payment page (`/app/payment/final/[booking_id]/page.tsx`)

**To Add To:**
- ⏳ Admin dashboard
- ⏳ Driver portal
- ⏳ Booking form
- ⏳ All other pages

---

## 📞 **How to Use Right Now:**

### **Test the Payment Page:**

1. **Open in browser:**
```
http://localhost:3000/payment/final/1
```

2. **If you see an error, just say:**
```
"There's an error"
```

3. **I'll automatically check:**
```bash
cat logs/client-errors.log
```

4. **I'll tell you what I found and fix it!**

---

## 🚨 **Common Errors & Fixes:**

### **Error: "Invoice not found"**
**Cause:** Booking ID doesn't exist or migration not run

**Fix:**
```sql
-- Check if invoices table exists
SELECT * FROM invoices LIMIT 1;

-- If not, run migration
heroku pg:psql < migrations/add-invoicing-system.sql
```

### **Error: "Failed to fetch"**
**Cause:** API endpoint not responding

**Fix:**
```bash
# Check if server is running
curl http://localhost:3000/api/invoices/1

# Restart server if needed
npm run dev
```

### **Error: "Stripe key undefined"**
**Cause:** Missing environment variable

**Fix:**
```bash
# Add to .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 💡 **Pro Tips:**

1. **Keep error log open in terminal:**
```bash
tail -f logs/client-errors.log
```

2. **Clear errors between tests:**
```bash
rm logs/client-errors.log
```

3. **Just tell me "there's an error"** - I'll handle the rest!

---

**Status:** ✅ Automated error capture system active!

**Next:** Test the payment page and let me know if you see any errors!


