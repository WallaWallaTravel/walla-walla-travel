# 🔧 TROUBLESHOOTING GUIDE
**Purpose:** Quick solutions to common issues

---

## 🚨 **Critical Issues (Stop Development)**

### **Build Fails**

**Symptom:** `npm run build` fails with errors

**Diagnose:**
```bash
npm run build 2>&1 | tee build-errors.log
```

**Common Causes:**
1. **TypeScript Errors**
   - Look for: `Type 'X' is not assignable to type 'Y'`
   - Fix: Check type definitions, fix or use `@ts-ignore` temporarily
   
2. **Missing Dependencies**
   - Look for: `Cannot find module 'X'`
   - Fix: `npm install X` or check package.json
   
3. **Import Errors**
   - Look for: `Module not found: Can't resolve '@/X'`
   - Fix: Check tsconfig.json paths, verify file exists

**Solution:**
```bash
# Clean and rebuild
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

**Still Broken?**
- Read build-errors.log carefully
- Check recent commits: `git diff HEAD~1`
- Ask Claude: "Build fails with: [paste error]"

---

### **Login Redirects to 404**

**Symptom:** After login, page shows "404 Not Found"

**Cause:** Workflow pages don't exist

**Diagnose:**
```bash
ls -la app/workflow/
```

**Expected:** Should see `daily/` directory

**Fix:**
```bash
# Verify workflow pages exist
ls -la app/workflow/daily/page.tsx
```

**If missing:**
- Check git: `git status`
- Restore from backup: `git checkout app/workflow/`

---

### **"Failed to fetch" on Login**

**Symptom:** Login form shows "Failed to fetch" error

**Cause:** Environment variables not loading

**Diagnose:**
```bash
# Check env file exists
ls -la .env.local

# Check contents (redacted)
grep NEXT_PUBLIC .env.local
```

**Fix:**
1. Copy example: `cp env.local.example .env.local`
2. Restart dev server: Kill and `npm run dev`
3. Clear browser cache
4. Try incognito window

---

### **Tests Fail After Git Pull**

**Symptom:** Tests pass on main but fail on your branch

**Diagnose:**
```bash
# See what changed
git diff main..HEAD __tests__/

# Run specific failing test
npm test -- failing-test.test.ts
```

**Fix:**
```bash
# Reinstall dependencies (package.json may have changed)
rm -rf node_modules
npm install

# Clear Jest cache
npm test -- --clearCache

# Run tests again
npm test
```

---

## ⚠️ **Common Issues (Annoying but Not Blocking)**

### **Dev Server Won't Start**

**Symptom:** `npm run dev` hangs or errors

**Diagnose:**
```bash
# Check if port 3000 is in use
lsof -i :3000

# Check for zombie processes
ps aux | grep next
```

**Fix:**
```bash
# Kill process on port 3000
kill -9 $(lsof -t -i:3000)

# Or use different port
PORT=3001 npm run dev
```

---

### **Changes Not Showing Up**

**Symptom:** Edit code, but changes don't appear in browser

**Causes:**
1. **Hot reload failed** - Check terminal for errors
2. **Browser cache** - Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. **Wrong file** - Verify you're editing the right file

**Fix:**
```bash
# Restart dev server
# Kill terminal (Ctrl+C)
rm -rf .next
npm run dev
```

---

### **TypeScript Errors in IDE but Build Passes**

**Symptom:** VS Code shows red squiggles, but `npm run build` succeeds

**Causes:**
1. **IDE TypeScript version** ≠ Project TypeScript version
2. **IDE cache stale**

**Fix:**
```bash
# In VS Code:
# 1. Cmd+Shift+P (Ctrl+Shift+P on Windows)
# 2. Type: "TypeScript: Restart TS Server"
# 3. Select it

# Or reload window:
# Cmd+Shift+P → "Developer: Reload Window"
```

---

### **Mobile Testing Not Working**

**Symptom:** Can't access dev server from phone

**Diagnose:**
```bash
# Find your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1
# Or on Windows: ipconfig
```

**Requirements:**
- Phone and computer on **same Wi-Fi**
- Firewall allows port 3000
- Using IP address not localhost

**Fix:**
```bash
# Start dev server
npm run dev

# Note the port (usually 3000)
# On phone, visit: http://192.168.X.X:3000/login
```

**Still not working?**
- Check firewall settings
- Try different Wi-Fi network
- Use ngrok: `npx ngrok http 3000`

---

### **Database Connection Fails (Future)**

**Symptom:** "Connection refused" or timeout errors

**Diagnose:**
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**Common Causes:**
1. **Wrong DATABASE_URL** - Check Render/Railway dashboard
2. **IP not whitelisted** - Add your IP to firewall rules
3. **Database sleeping** - Free tier databases sleep after inactivity

**Fix:**
- Verify connection string
- Check database host is running
- Restart database service

---

## 📝 **Environment Variable Issues**

### **"process.env.X is undefined"**

**Symptom:** Code can't read environment variables

**Rules:**
- **Browser code:** Must start with `NEXT_PUBLIC_`
- **Server code:** Can use any name
- **Must restart dev server** after changing .env.local

**Fix:**
```typescript
// ❌ WRONG (won't work in browser)
const url = process.env.SUPABASE_URL

// ✅ CORRECT
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
```

---

### **Production Env Vars Not Working**

**Symptom:** Works locally, fails in production

**Diagnose:**
```bash
# Check Railway env vars
railway variables

# Pull env to local
railway run printenv > .env.production
```

**Fix:**
```bash
# Add missing var in Railway dashboard
# Go to: https://railway.app/dashboard → Your Project → Variables

# Or via CLI:
railway variables set NEXT_PUBLIC_SUPABASE_URL=your_value

# Redeploy
railway up
```

---

## 🧪 **Testing Issues**

### **Tests Pass Locally, Fail in CI**

**Common Causes:**
1. **Different Node versions** - Check CI uses Node 20
2. **Missing env vars** - CI needs test env vars
3. **Timezone differences** - Use UTC in tests

**Fix:**
```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v3
        with:
          node-version: '20'  # ← Match local version
      - run: npm ci  # ← Use ci instead of install
      - run: npm test
```

---

### **Mock Not Working**

**Symptom:** Test tries to make real API calls

**Fix:**
```typescript
// __tests__/setup.ts or test file
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/test',
}))
```

---

## 🚀 **Deployment Issues**

### **Railway Build Fails**

**Symptom:** Build works locally but fails in Railway

**Diagnose:**
1. Check Railway build logs in dashboard
2. Look for error messages
3. Note which file failed

**Common Causes:**
1. **Build command wrong** - Should be: `npm run build`
2. **Node version mismatch** - Set in nixpacks.toml or package.json engines
3. **Missing env vars** - Add via Railway dashboard or `railway variables set`

**Fix:**
```bash
# Test production build locally
npm run build
npm start

# If that works, issue is in Railway config
# Check: railway.json or Railway dashboard settings
```

---

### **"Failed to Load Resource" in Production**

**Symptom:** Works in preview, fails in production

**Cause:** Usually CORS or CSP headers

**Fix:**
```typescript
// next.config.ts
const config = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}
```

---

## 📱 **Mobile-Specific Issues**

### **Touch Targets Too Small on iOS**

**Symptom:** Hard to tap buttons on iPhone

**Diagnose:**
```typescript
// Check button height
const button = document.querySelector('button')
console.log(getComputedStyle(button).height) // Should be ≥48px
```

**Fix:**
```tsx
// Use mobile components
import { MobileButton } from '@/components/mobile'

// All mobile components have min-height: 48px
<MobileButton>Click Me</MobileButton>
```

---

### **Haptic Feedback Not Working**

**Symptom:** No vibration on button press

**Cause:** iOS requires user interaction before allowing haptics

**Fix:**
```typescript
// Haptics only work after user has interacted
// Test by clicking a button first, then trying haptics
```

---

## 🔍 **Debugging Strategies**

### **When Stuck:**

1. **Read the error message carefully**
   - Don't skim - read every word
   - Google the exact error text
   
2. **Check recent changes**
   ```bash
   git diff HEAD~1
   git log --oneline -5
   ```

3. **Isolate the problem**
   - Comment out code until it works
   - Narrow down which line causes issue

4. **Check the docs**
   - This file (TROUBLESHOOTING.md)
   - ARCHITECTURE.md for design decisions
   - CODE_REVIEW.md for known issues

5. **Ask Claude**
   ```
   Read: /Users/temp/walla-walla-final/MASTER_STATUS.md
   
   Issue: [describe problem]
   What I tried: [list attempts]
   Error message: [paste exact error]
   
   What should I do?
   ```

---

## 🆘 **Emergency Contacts**

### **When All Else Fails:**

1. **Revert to last working state**
   ```bash
   git log --oneline  # Find last good commit
   git reset --hard abc123  # Replace abc123 with commit hash
   ```

2. **Start fresh**
   ```bash
   # Nuclear option - only if truly stuck
   git clean -fdx
   npm install
   npm run build
   ```

3. **Check project status**
   - Read: `MASTER_STATUS.md`
   - What was last working?
   - What changed since then?

---

## 📊 **Health Checks**

### **Before Starting Work:**
```bash
# ✅ Everything should pass
npm install     # No errors
npm run build   # Compiles successfully
npm test        # All tests pass
npm run dev     # Starts on port 3000
```

### **Before Committing:**
```bash
npm run build   # ✅ Must pass
npm test        # ✅ Must pass
# No uncommitted package.json changes without package-lock.json
```

### **Before Deploying:**
```bash
npm run build   # ✅ Must pass in production mode
npm test        # ✅ All tests pass
# Env vars set in Railway
# MASTER_STATUS.md updated
```

---

## 📝 **Report New Issues**

Found an issue not listed here?

1. **Document it**
   - What's the symptom?
   - What causes it?
   - How to fix it?

2. **Add to this file**
   ```bash
   # Edit this file
   vim docs/TROUBLESHOOTING.md
   
   # Add section under appropriate category
   # Commit with descriptive message
   git commit -m "docs: add solution for [issue]"
   ```

3. **Update CHANGELOG.md**
   - Note the fix in CHANGELOG

---

**Last Updated:** October 12, 2025  
**Next Review:** When new issue found
