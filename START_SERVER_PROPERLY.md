# How to Start Server Properly
**Date:** October 31, 2025  
**Issue:** Connection refused errors

---

## 🚨 **Current Problem:**

The AI agent (me) **cannot reliably start the dev server** through the sandbox because:
- Background processes have limitations
- Network restrictions apply
- Can't monitor server startup properly

**This means YOU need to start it manually in a separate terminal.**

---

## ✅ **The Correct Way to Start the Server:**

### **Step 1: Open a NEW Terminal Window**
- Don't use the Cursor integrated terminal
- Open a standalone terminal app (Terminal.app or iTerm)

### **Step 2: Navigate to Project**
```bash
cd /Users/temp/walla-walla-final
```

### **Step 3: Start the Server**
```bash
npm run dev
```

### **Step 4: Wait for This Message:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

### **Step 5: Leave That Terminal Open!**
**Do NOT close it** - the server needs to keep running.

---

## 🎯 **Once Server is Running:**

### **Verify It Works:**
Open browser to: http://localhost:3000

**You should see:**
- ✅ The Walla Walla Travel homepage
- ✅ NO "connection refused" error

---

## 🤖 **New Workflow with AI Agent:**

### **From Now On:**

**1. You start the server first:**
```bash
# In your own terminal
cd /Users/temp/walla-walla-final
npm run dev
```

**2. Tell me it's running:**
```
"Server is running"
```

**3. I'll verify and test:**
```bash
# I'll check that it responds
curl http://localhost:3000
```

**4. Then I'll ask you to test features**

---

## 📋 **Checklist Before Testing ANY Feature:**

- [ ] Server running in separate terminal?
- [ ] See "ready started server" message?
- [ ] http://localhost:3000 loads in browser?
- [ ] No "connection refused" errors?

**If ALL checked** ✅ → Ready to test!

---

## 🔧 **Troubleshooting:**

### **Error: "Port 3000 already in use"**
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Then start again
npm run dev
```

### **Error: "Module not found"**
```bash
# Reinstall dependencies
npm install

# Then start
npm run dev
```

### **Error: "Database connection failed"**
```bash
# Check .env.local exists
ls -la .env.local

# Verify DATABASE_URL is set
grep DATABASE_URL .env.local
```

---

## 🎯 **Current Status:**

**What needs to happen RIGHT NOW:**

1. **You:** Open a new terminal
2. **You:** Run `cd /Users/temp/walla-walla-final && npm run dev`
3. **You:** Wait for "ready started server" message
4. **You:** Tell me "server is running"
5. **Me:** I'll verify it works
6. **Me:** Then we can test the invoicing system

---

## 💡 **Why This is Important:**

**Without a running server:**
- ❌ Can't test any features
- ❌ APIs don't respond
- ❌ Pages show "connection refused"
- ❌ Waste time debugging

**With a running server:**
- ✅ Can test features immediately
- ✅ APIs respond correctly
- ✅ Pages load properly
- ✅ Productive development

---

## 🚀 **Next Steps:**

**Please do this now:**

1. Open Terminal.app (or iTerm)
2. Run:
```bash
cd /Users/temp/walla-walla-final
npm run dev
```
3. Wait for "ready started server" message
4. Tell me "server is running"

**Then I'll:**
1. Verify it's responding
2. Run database migration if needed
3. Test the invoicing system
4. Give you working URLs to test

---

**Status:** ⏳ Waiting for you to start the server

**Action Required:** Start `npm run dev` in a separate terminal


