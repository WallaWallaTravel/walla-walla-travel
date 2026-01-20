# Common Fixes Runbook

## Build & Type Errors

### TypeScript Compilation Errors

**Symptom**: `npm run type-check` fails

**Common Fixes**:
```bash
# Check specific error location
npm run type-check 2>&1 | head -50

# Common issues:
# 1. Missing type imports - add import type { X } from 'y'
# 2. Null safety - add optional chaining ?. or null checks
# 3. Type mismatch - verify expected vs actual types
```

### ESLint Errors

**Symptom**: `npm run lint` fails

**Common Fixes**:
```bash
# Auto-fix what's possible
npm run lint -- --fix

# Common issues:
# 1. Unused imports - remove them
# 2. Missing dependencies in useEffect - add to array
# 3. Prefer const - change let to const
```

### Build Failures

**Symptom**: `npm run build` fails

**Check Order**:
1. TypeScript errors (fix first)
2. Lint errors (fix second)
3. Import errors (missing dependencies)
4. Environment variables (missing in build)

---

## Console Errors

### Hydration Mismatch

**Symptom**: "Text content does not match server-rendered HTML"

**Fixes**:
- Ensure server and client render same content
- Use `useEffect` for client-only content
- Check for browser-only APIs used during SSR
- Wrap client-only components in `<ClientOnly>`

### Missing Key Prop

**Symptom**: "Each child in a list should have a unique key"

**Fix**:
```tsx
// Add unique key to list items
{items.map((item) => (
  <Item key={item.id} {...item} />
))}
```

### Unhandled Promise Rejection

**Symptom**: "Unhandled promise rejection"

**Fix**:
```tsx
// Add try-catch to async operations
try {
  await someAsyncOperation();
} catch (error) {
  console.error('Operation failed:', error);
  // Handle error appropriately
}
```

---

## Database Issues

### Connection Refused

**Symptom**: "Connection refused" or "ECONNREFUSED"

**Checks**:
1. DATABASE_URL correct?
2. Supabase project running?
3. IP allowed in Supabase?
4. Connection string format correct?

### Query Returns Empty

**Symptom**: Expected data not returned

**Checks**:
1. RLS policies blocking?
2. Correct user context?
3. Filter conditions correct?
4. Data actually exists?

```sql
-- Debug query in Supabase SQL Editor
SELECT * FROM table WHERE condition;
-- Check RLS with auth.uid()
```

### Migration Issues

**Symptom**: Schema mismatch, missing columns

**Fix**:
```bash
# Check migration status
npx prisma migrate status

# Reset if needed (CAUTION: data loss)
npx prisma migrate reset

# Apply pending migrations
npx prisma migrate deploy
```

---

## Authentication Issues

### JWT Invalid

**Symptom**: "Invalid JWT" or auth failures

**Checks**:
1. JWT secret correct?
2. Token not expired?
3. Token format valid?
4. Auth header format: `Bearer <token>`

### Session Lost

**Symptom**: User logged out unexpectedly

**Checks**:
1. Token storage working?
2. Token refresh working?
3. Cookie settings correct?
4. CORS allowing credentials?

---

## API Issues

### 404 Not Found

**Symptom**: API endpoint returns 404

**Checks**:
1. Route file exists?
2. File named correctly? (`route.ts`)
3. Method exported? (`export async function GET`)
4. Path correct?

### 500 Internal Server Error

**Symptom**: API returns 500

**Debug**:
1. Check Vercel function logs
2. Add try-catch and log error
3. Verify environment variables
4. Check database connection

### CORS Errors

**Symptom**: "Cross-Origin Request Blocked"

**Fix**:
- Verify API allows frontend origin
- Check headers configuration
- Ensure credentials mode matches

---

## Styling Issues

### Tailwind Classes Not Working

**Symptom**: Styles not applying

**Checks**:
1. Class name spelled correctly?
2. File included in Tailwind config content?
3. Build cache stale? Try `rm -rf .next`
4. Custom class defined?

### Contrast Issues

**Remember**: From user's requirements, minimum contrast 4.5:1

**Forbidden**:
- text-gray-300, text-gray-400
- placeholder-gray-400
- Any text lighter than gray-500

**Use instead**:
- Placeholder: gray-600 (#4b5563)
- Body text: gray-700 (#374151)
- Labels: gray-900 (#111827)

---

## Performance Issues

### Slow Page Load

**Checks**:
1. Large bundle? Check with `npm run build`
2. Too many API calls? Batch or cache
3. Large images? Optimize
4. N+1 queries? Use joins

### Slow API Response

**Checks**:
1. Database query optimized?
2. Missing indexes?
3. Too much data returned?
4. External service slow?

---

## Quick Fix Commands

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules && npm install

# Reset Prisma client
npx prisma generate

# Check for type errors
npm run type-check

# Fix lint issues
npm run lint -- --fix

# Full rebuild
rm -rf .next node_modules && npm install && npm run build
```

---

## Existing Slash Commands for Fixes

| Command | Purpose |
|---------|---------|
| `/fix-console` | Replace console.* with logger |
| `/security-check` | Security audit |
| `/quality-check` | Code quality analysis |
| `/test-status` | Test coverage analysis |

---

## When to Escalate

| Situation | Action |
|-----------|--------|
| Fix unclear | Research more, then escalate |
| Fix risky | Escalate before applying |
| Fix doesn't work after 3 attempts | Escalate |
| Business logic involved | Escalate to Domain Expert |
| Security implications | Escalate to Quality Engineer |
