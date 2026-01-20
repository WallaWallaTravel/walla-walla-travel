# Health Checks Runbook

## Quick Health Check

Run these checks to verify system health:

### 1. Application Status

| Check | Command/Action | Expected |
|-------|----------------|----------|
| WWT loads | Visit https://wallawalla.travel | 200, page renders |
| Console clean | Browser DevTools → Console | No errors |
| Build status | Vercel dashboard | Last deploy successful |

### 2. Database Status

| Check | How | Expected |
|-------|-----|----------|
| Connection | Supabase dashboard → Database | Active |
| Query response | Test a simple query | < 100ms |
| Storage | Dashboard → Database → Usage | Within limits |

### 3. Auth Status

| Check | How | Expected |
|-------|-----|----------|
| Login works | Test login flow | Success |
| Session persists | Refresh page | Still logged in |
| Logout works | Test logout | Session cleared |

### 4. Key Flows

| Flow | Steps | Expected |
|------|-------|----------|
| View wineries | Navigate to winery list | Data loads |
| Start booking | Begin booking flow | Form loads |
| Admin login | Login as admin | Dashboard loads |

---

## Detailed Health Check

### Frontend Health

```bash
# Local build test
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Tests
npm test
```

**Browser Checks:**
- [ ] Homepage loads
- [ ] Navigation works
- [ ] Images load
- [ ] Forms submit
- [ ] Responsive on mobile

### Backend Health

**API Endpoints:**
- [ ] Public endpoints respond
- [ ] Authenticated endpoints require auth
- [ ] Error responses are proper format
- [ ] Rate limiting works (if enabled)

**Database:**
```bash
# Prisma check
npx prisma validate
npx prisma migrate status
```

### Third-Party Services

| Service | Check | Dashboard |
|---------|-------|-----------|
| Supabase | Query response | supabase.com/dashboard |
| Vercel | Deploy status | vercel.com/dashboard |
| Stripe | API status | dashboard.stripe.com |
| Sentry | Error rate | sentry.io |

---

## Monitoring Dashboards

### Vercel
- Deployment status
- Function invocations
- Edge function metrics
- Analytics

### Supabase
- Database connections
- Query performance
- Storage usage
- Auth metrics

### Sentry
- Error rate
- Error trends
- Unhandled exceptions
- Performance metrics

---

## Health Check Commands

### Walla Walla Travel

```bash
cd /Users/temp/walla-walla-final

# Full validation suite
npm run type-check && npm run lint && npm test && npm run build

# Quick checks
npm run type-check  # TypeScript
npm run lint        # Linting
npm test           # Tests

# Dev server
npm run dev        # http://localhost:3000
```

### Auditor's Dream

```bash
cd /Users/temp/walla-walla-final/auditors-dream/apps/operator

# Validation
npm run type-check && npm run lint && npm test

# Dev server
npm run dev        # http://localhost:5173
```

---

## Automated Checks

### What Should Be Monitored

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Uptime | Vercel/external | < 99.9% |
| Error rate | Sentry | > 1% of requests |
| Response time | Vercel analytics | > 2 seconds |
| Database CPU | Supabase | > 80% |
| Storage | Supabase | > 80% capacity |

### Setting Up Alerts

1. **Sentry**: Configure alert rules for error spikes
2. **Vercel**: Enable analytics notifications
3. **Supabase**: Set up usage alerts

---

## Periodic Health Tasks

### Daily
- [ ] Check Sentry for new errors
- [ ] Verify production is accessible

### Weekly
- [ ] Review Sentry error trends
- [ ] Check database metrics
- [ ] Review performance analytics
- [ ] Update dependencies (if safe)

### Monthly
- [ ] Security audit
- [ ] Database optimization review
- [ ] Backup verification
- [ ] Cost review

---

## Troubleshooting Quick Reference

| Symptom | First Check | Second Check |
|---------|-------------|--------------|
| Page won't load | Vercel status | Browser console |
| Slow response | Database metrics | API logs |
| Auth failing | Supabase Auth | JWT config |
| Data missing | RLS policies | Query logs |
| Build failing | Type errors | Dependencies |

---

## Health Check Report Template

```
🏥 HEALTH CHECK REPORT
Date: [date]
Performed by: [agent]

📊 SUMMARY
Overall Status: [Healthy/Degraded/Unhealthy]

✅ PASSING
- [list of healthy systems]

⚠️ CONCERNS
- [list of issues found]

🔧 ACTIONS TAKEN
- [fixes applied]

📋 RECOMMENDATIONS
- [suggested improvements]
```
