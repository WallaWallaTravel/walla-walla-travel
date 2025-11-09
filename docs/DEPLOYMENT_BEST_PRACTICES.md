# Deployment & Development Best Practices
**Created:** November 8, 2025  
**Purpose:** Establish processes to prevent deployment issues

---

## The Problem We're Solving

**Current Issues:**
- Discovering bugs during mobile testing (too late)
- API endpoints failing in production
- Database connection issues not caught early
- Hydration errors only visible on mobile
- No systematic testing before deployment

**Result:** Frustrated users, wasted time, low confidence in deployments

---

## Recommended Development Workflow

### Phase 1: Local Development (Current)

```bash
# 1. Make code changes
# 2. Test in dev mode
npm run dev

# 3. Manual testing on desktop browser
# Visit http://localhost:3000
```

**Problems with this approach:**
- Dev mode behaves differently than production
- Mobile-specific issues not caught
- Database errors might not surface
- No automated checks

---

### Phase 2: Pre-Deployment Checks (RECOMMENDED)

Before committing code, run these checks:

#### A. TypeScript Type Check
```bash
npm run type-check
# Or add to package.json:
# "type-check": "tsc --noEmit"
```

**Catches:** Type errors, missing imports, incorrect API calls

#### B. Linting
```bash
npm run lint
```

**Catches:** Code style issues, unused variables, potential bugs

#### C. Unit Tests
```bash
npm run test
```

**Catches:** Logic errors, API contract violations

#### D. Production Build Test
```bash
npm run build
```

**Catches:** Build errors, missing dependencies, import issues

#### E. Production Server Test
```bash
npm run build && npm run start
```

**Catches:** Runtime errors, API failures, database connection issues

---

### Phase 3: Mobile Testing (CRITICAL)

After production build succeeds:

```bash
# Start production server for mobile testing
./scripts/test-mobile.sh

# Or manually:
npm run build
npm run start -- --hostname 0.0.0.0

# Then test on mobile device:
# http://YOUR_IP:3000
```

**Test checklist:**
- [ ] Login works
- [ ] Navigation doesn't hang
- [ ] Forms submit properly
- [ ] No console errors
- [ ] Offline mode works
- [ ] Voice features work (Chrome) or show appropriate errors (Safari)

---

## Automated CI/CD Pipeline (Future)

### GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Test production build
        run: |
          npm run start &
          sleep 5
          curl -f http://localhost:3000 || exit 1

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

**Benefits:**
- Automatic testing on every commit
- Prevents broken code from reaching production
- Catch errors before manual testing
- Build confidence in deployments

---

## Error Handling Patterns

### API Routes Should Always:

```typescript
// ❌ BAD - No error handling
export async function GET(request: Request) {
  const data = await query('SELECT * FROM users')
  return NextResponse.json(data.rows)
}

// ✅ GOOD - Comprehensive error handling
export async function GET(request: Request) {
  try {
    // 1. Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Validate inputs
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID' },
        { status: 400 }
      )
    }

    // 3. Database query with error handling
    const data = await query('SELECT * FROM users WHERE id = $1', [id])
    
    if (data.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // 4. Success response
    return NextResponse.json({
      success: true,
      data: data.rows[0]
    })

  } catch (error) {
    // 5. Log error for debugging
    console.error('API Error:', error)
    
    // 6. Return generic error to client
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Client-Side API Calls Should:

```typescript
// ❌ BAD - No error handling
async function loadData() {
  const response = await fetch('/api/users')
  const data = await response.json()
  setUsers(data.users)
}

// ✅ GOOD - Comprehensive error handling
async function loadData() {
  try {
    setLoading(true)
    setError(null)
    
    const response = await fetch('/api/users', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    // Check HTTP status
    if (!response.ok) {
      if (response.status === 401) {
        router.push('/login')
        return
      }
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    // Check API response format
    if (!data.success) {
      throw new Error(data.error || 'Request failed')
    }
    
    setUsers(data.data || [])
    
  } catch (error) {
    console.error('Failed to load data:', error)
    setError(error instanceof Error ? error.message : 'Failed to load data')
    
    // Show user-friendly message
    toast.error('Unable to load data. Please try again.')
    
  } finally {
    setLoading(false)
  }
}
```

---

## Database Connection Best Practices

### Current Issues:
- Connections not always released
- No connection pooling limits enforced
- No health checks

### Improved Pattern:

```typescript
// lib/db.ts
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail fast if can't connect
  maxUses: 7500,              // Recycle connections periodically
  allowExitOnIdle: true,      // Clean shutdown
})

// Health check endpoint
export async function healthCheck(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// Wrapper function with automatic cleanup
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await pool.connect()
  
  try {
    const result = await client.query(text, params)
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0
    }
  } catch (error) {
    console.error('Database query error:', {
      query: text,
      params,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  } finally {
    // ALWAYS release the client
    client.release()
  }
}

// Transaction wrapper
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

---

## Testing Strategy

### Unit Tests (Fast, Many)
```typescript
// Test pure functions and utilities
describe('calculateProposalTotal', () => {
  it('should calculate total correctly', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 }
    ]
    expect(calculateTotal(items)).toBe(250)
  })
})
```

### Integration Tests (Medium Speed, Some)
```typescript
// Test API routes with mocked database
describe('GET /api/users', () => {
  it('should return user list', async () => {
    const response = await fetch('http://localhost:3000/api/users')
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })
})
```

### E2E Tests (Slow, Few)
```typescript
// Test critical user flows
describe('Booking flow', () => {
  it('should complete full booking', async () => {
    // 1. Login
    // 2. Select date
    // 3. Choose options
    // 4. Submit booking
    // 5. Verify confirmation
  })
})
```

---

## Monitoring & Observability

### Add Error Tracking

```typescript
// lib/monitoring.ts
export function logError(error: Error, context?: any) {
  // Development: log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: error.message,
      stack: error.stack,
      context
    })
    return
  }

  // Production: send to error tracking service
  // Examples: Sentry, Bugsnag, Rollbar
  // sentry.captureException(error, { extra: context })
}

export function logPerformance(metric: string, duration: number) {
  if (duration > 1000) {
    console.warn(`Slow operation: ${metric} took ${duration}ms`)
  }
  
  // Send to analytics
  // analytics.track('performance', { metric, duration })
}
```

### Add Health Check Endpoint

```typescript
// app/api/health/route.ts
import { healthCheck as dbHealth } from '@/lib/db'

export async function GET() {
  const checks = {
    database: await dbHealth(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  }

  const healthy = Object.values(checks).every(v => 
    typeof v === 'boolean' ? v : true
  )

  return NextResponse.json(
    { healthy, checks },
    { status: healthy ? 200 : 503 }
  )
}
```

---

## Deployment Checklist

Before deploying to production:

### Code Quality
- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)

### Testing
- [ ] Tested on desktop browser (Chrome)
- [ ] Tested on mobile device (iOS & Android)
- [ ] Tested in production mode locally
- [ ] Tested critical user flows
- [ ] Tested offline functionality

### Database
- [ ] Migrations applied
- [ ] Seed data updated
- [ ] Connection pool configured
- [ ] Health check endpoint works

### Configuration
- [ ] Environment variables set
- [ ] API keys configured
- [ ] Feature flags reviewed
- [ ] CORS settings correct

### Documentation
- [ ] README updated
- [ ] API docs updated
- [ ] Changelog updated
- [ ] Migration notes added

### Post-Deployment
- [ ] Verify production URL loads
- [ ] Check error logs (first 30 minutes)
- [ ] Monitor performance metrics
- [ ] Test critical features in production

---

## Tools & Services to Consider

### Error Tracking
- **Sentry** - Real-time error tracking
- **Bugsnag** - Error monitoring
- **Rollbar** - Exception tracking

### Performance Monitoring
- **Vercel Analytics** - Built-in for Vercel
- **Google Lighthouse** - Performance auditing
- **WebPageTest** - Detailed performance analysis

### CI/CD
- **GitHub Actions** - Free for public repos
- **Vercel** - Automatic deployments
- **CircleCI** - Advanced pipelines

### Testing
- **Jest** - Unit testing (already using)
- **Playwright** - E2E testing
- **Cypress** - Integration testing

---

## Summary

### Current State (Reactive)
```
Code → Commit → Deploy → Mobile Test → Find Bugs → Fix → Repeat
```

### Desired State (Proactive)
```
Code → Test Locally → Build Check → Mobile Test → Automated CI
  → Manual Review → Deploy → Monitor → Success
```

### Immediate Actions
1. ✅ Use production builds for mobile testing
2. ✅ Create automated test script (`test-mobile.sh`)
3. ⏳ Add comprehensive error handling
4. ⏳ Set up GitHub Actions CI/CD
5. ⏳ Add error tracking (Sentry)
6. ⏳ Create deployment checklist

### Long-term Goals
- Automated testing on every commit
- < 5% error rate in production
- Zero database connection leaks
- 99.9% uptime
- Confident, fast deployments

---

**Remember:** The goal isn't perfection, it's **continuous improvement**. Start with the basics, then iterate.

