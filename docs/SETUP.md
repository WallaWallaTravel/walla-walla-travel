# ⚙️ SETUP GUIDE
**Last Updated:** October 12, 2025  
**Verified Working:** Yes ✅

---

## 🎯 PREREQUISITES

### **Required:**
- Node.js 20+ (check: `node --version`)
- npm 10+ (check: `npm --version`)
- Git (check: `git --version`)

### **Optional:**
- VS Code (recommended editor)
- iPhone/Android device for mobile testing

---

## 🚀 INSTALLATION

### **Step 1: Clone/Navigate to Project**
```bash
cd /Users/temp/walla-walla-final
```

### **Step 2: Install Dependencies**
```bash
npm install
```

**Expected output:**
```
added 868 packages in 36s
found 0 vulnerabilities
```

### **Step 3: Verify Installation**
```bash
npm run build
```

**Expected output:**
```
✓ Compiled successfully in 4.5s
✓ Generating static pages (18/18)
```

---

## 🏃 RUNNING LOCALLY

### **Start Development Server:**
```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 15.5.2
- Local:    http://localhost:3000
- Network:  http://192.168.1.18:3000

✓ Ready in 1822ms
```

**Access the app:**
- Computer: http://localhost:3000
- Phone: http://192.168.1.18:3000 (use your actual IP)

---

## 📱 MOBILE TESTING

### **Step 1: Get Your Computer's IP**

**Mac/Linux:**
```bash
ipconfig getifaddr en0
```

**Windows:**
```bash
ipconfig
```

### **Step 2: Ensure Same Network**
- Computer and phone must be on same WiFi
- Disable VPN if connection fails

### **Step 3: Access on Phone**
```
http://YOUR_IP:3000/login
```

### **Step 4: Test Login**
- Email: driver@test.com
- Password: test123456

**Expected:** Redirect to workflow success page

---

## 🔑 TEST CREDENTIALS

```
Email: driver@test.com
Password: test123456
```

**Note:** These are the only credentials that work (hardcoded in `lib/auth.ts`)

---

## 🧪 RUNNING TESTS

### **All Tests:**
```bash
npm test
```

### **Watch Mode (Recommended):**
```bash
npm run test:watch
```

### **Coverage Report:**
```bash
npm run test:coverage
```

### **Security Tests Only:**
```bash
npm run test:security
```

---

## 🏗️ BUILDING FOR PRODUCTION

### **Create Production Build:**
```bash
npm run build
```

### **Test Production Build Locally:**
```bash
npm run start
```

**Expected output:**
```
▲ Next.js 15.5.2
- Local:    http://localhost:3000

✓ Ready in 500ms
```

---

## 📂 PROJECT STRUCTURE (Simplified)

```
/Users/temp/walla-walla-final/
├── app/                    ← Pages & routes
├── components/             ← Reusable components
├── lib/                    ← Utilities
├── __tests__/              ← Tests
├── docs/                   ← Documentation
├── package.json            ← Dependencies
└── MASTER_STATUS.md        ← Current state
```

---

## 🔧 ENVIRONMENT VARIABLES

### **Current Setup:**
No environment variables needed for local development!

### **Future (When Database Added):**
Create `.env.local`:
```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

---

## 🚨 TROUBLESHOOTING

### **Problem: Port 3000 in use**
```
⚠ Port 3000 is in use, using port 3001 instead
```

**Solution:** Use whatever port Next.js assigns:
```
http://localhost:3001
```

### **Problem: Can't access from phone**
**Solutions:**
1. Check same WiFi network
2. Disable VPN
3. Check firewall settings
4. Use computer's IP, not `localhost`

### **Problem: Build fails**
```bash
# Clean install
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

### **Problem: Login doesn't work**
**Check:**
1. Using correct credentials (driver@test.com / test123456)
2. Server is running
3. Check terminal for errors
4. Clear browser cookies

### **Problem: Tests fail**
```bash
# Clean and reinstall
rm -rf node_modules
npm install
npm test
```

---

## 📋 COMMON COMMANDS

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Run production build

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:security    # Security tests only

# Linting
npm run lint             # Run ESLint

# Clean slate
rm -rf .next             # Clear build cache
rm -rf node_modules      # Clear dependencies
npm install              # Reinstall
```

---

## 🎯 QUICK START (TL;DR)

```bash
# 1. Install
cd /Users/temp/walla-walla-final
npm install

# 2. Run
npm run dev

# 3. Test
# Visit: http://localhost:3000/login
# Login: driver@test.com / test123456
```

---

## ✅ VERIFICATION CHECKLIST

After setup, verify:
- [ ] `npm install` completes without errors
- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts server
- [ ] Can access http://localhost:3000/login
- [ ] Can login with test credentials
- [ ] Redirects to workflow page
- [ ] `npm test` passes all tests
- [ ] Can access from phone (mobile testing)

---

## 🆘 GETTING HELP

### **Build Issues:**
1. Read error message carefully
2. Check MASTER_STATUS.md for known issues
3. Run `npm run build` to see all errors at once

### **Can't Find Answer:**
1. Check `/docs/ARCHITECTURE.md` for system design
2. Check `/docs/TROUBLESHOOTING.md` for solutions
3. Read MASTER_STATUS.md for current state

---

## 📊 SYSTEM REQUIREMENTS

### **Minimum:**
- Node.js 20
- 2GB RAM
- 500MB disk space

### **Recommended:**
- Node.js 22
- 4GB RAM
- 1GB disk space
- SSD

---

**Last Updated:** October 12, 2025  
**Verified:** All steps tested and working
