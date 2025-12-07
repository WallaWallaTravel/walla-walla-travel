# 🚀 START LOCAL SERVER - TROUBLESHOOTING GUIDE

## ✅ QUICK START

### **Step 1: Open Terminal**
```bash
cd /Users/temp/walla-walla-final
```

### **Step 2: Start the Development Server**
```bash
npm run dev
```

You should see:
```
   ▲ Next.js 14.x.x
   - Local:        http://localhost:3000
   - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.3s
```

### **Step 3: Open Browser**
Visit: **http://localhost:3000**

---

## 🔧 TROUBLESHOOTING

### **Problem 1: Port 3000 Already in Use**

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
# Then visit: http://localhost:3001
```

---

### **Problem 2: Database Connection Error**

**Error:**
```
Error: Can't reach database server
```

**Solution:**
Check your `.env.local` file has a valid `DATABASE_URL`:

```bash
# View your current DATABASE_URL (without showing password)
grep DATABASE_URL .env.local
```

If you don't have a database yet, you can:

**Option A: Use Railway Postgres (Recommended)**
1. Go to Railway.app
2. Create new project
3. Add PostgreSQL
4. Copy connection string to `.env.local`

**Option B: Local PostgreSQL**
```bash
# If you have PostgreSQL installed locally
DATABASE_URL=postgresql://localhost:5432/walla_walla
```

---

### **Problem 3: Missing Environment Variables**

**Check your `.env.local` has these minimum required variables:**

```bash
# Required for development
DATABASE_URL=your_database_url
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your-dev-secret-key-here

# Optional (for full functionality)
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

---

### **Problem 4: Build Errors**

**If you see TypeScript or build errors:**

```bash
# Clear everything and rebuild
rm -rf .next node_modules
npm install
npm run dev
```

---

### **Problem 5: Module Not Found Errors**

```bash
# Reinstall dependencies
npm install
npm run dev
```

---

## 🎯 VERIFY IT'S WORKING

Once the server starts, test these URLs:

### **1. Home Page**
http://localhost:3000
- Should show the main website

### **2. Admin Dashboard**
http://localhost:3000/admin/dashboard
- Should show admin interface (may require login)

### **3. API Health Check**
http://localhost:3000/api/health
- Should return: `{"status":"ok"}`

### **4. API Documentation**
http://localhost:3000/api/openapi
- Should show OpenAPI spec (JSON)

---

## 📋 WHAT TO DO IF IT STILL DOESN'T WORK

### **Step 1: Check the Error Message**
When you run `npm run dev`, what error do you see?

Common errors:
- Port in use → Kill port 3000 process
- Database error → Check DATABASE_URL
- Module not found → Run `npm install`
- Build error → Clear `.next` and rebuild

### **Step 2: Run Diagnostics**

```bash
# Check Node/NPM versions
node --version  # Should be v18+ or v22+
npm --version   # Should be v9+

# Check if dependencies are installed
ls node_modules | wc -l  # Should show 800+ packages

# Check if .env.local exists
ls -la .env.local

# Try to build
npm run build
```

### **Step 3: Minimal Test**

If nothing works, try this minimal test:

```bash
# Create a minimal .env.local
cat > .env.local << EOF
DATABASE_URL=postgresql://test:test@localhost:5432/test
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=test-secret-key
EOF

# Start server
npm run dev
```

---

## 🆘 STILL STUCK?

### **Share This Information:**

1. **What command did you run?**
   ```
   npm run dev
   ```

2. **What error message did you see?**
   ```
   (Copy the full error here)
   ```

3. **Check these:**
   ```bash
   node --version
   npm --version
   ls node_modules > /dev/null && echo "Dependencies: OK" || echo "Dependencies: MISSING"
   ls .env.local && echo ".env.local: EXISTS" || echo ".env.local: MISSING"
   ```

---

## ✅ EXPECTED RESULT

When everything works, you should see:

```bash
$ npm run dev

> travel-suite@0.1.0 dev
> next dev

   ▲ Next.js 14.2.15
   - Local:        http://localhost:3000
   - Environments: .env.local

 ✓ Ready in 2.3s
 ○ Compiling / ...
 ✓ Compiled / in 1.2s
```

Then visit **http://localhost:3000** in your browser! 🎉

---

## 🎯 QUICK COMMANDS REFERENCE

```bash
# Start dev server
npm run dev

# Start on different port
PORT=3001 npm run dev

# Kill port 3000
lsof -ti:3000 | xargs kill -9

# Clear and rebuild
rm -rf .next && npm run dev

# Check database connection
psql $DATABASE_URL -c "SELECT 1"
```

---

**Your A+ codebase is ready to run! Just need to get the server started.** 🚀




