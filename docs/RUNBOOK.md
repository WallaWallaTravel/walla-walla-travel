# Incident Response Runbook

Operational procedures for handling system incidents in the Walla Walla Travel application.

## Quick Reference

| Incident Type | Severity | First Response | Escalation |
|---------------|----------|----------------|------------|
| Database Down | Critical | Check Supabase status | Contact Supabase support |
| Payments Failing | High | Check Stripe status, circuit breaker | Reset circuit, contact Stripe |
| Email Not Sending | Medium | Check Postmark status, circuit breaker | Reset circuit, use alternative |
| Redis Unavailable | Low | System auto-falls back to memory | Monitor for distributed issues |
| High Error Rate | Varies | Check Sentry, identify pattern | Fix root cause |

---

## 1. Database Issues

### Symptoms
- API requests failing with 500 errors
- Health dashboard shows database as unhealthy
- Sentry reports database connection errors

### Diagnosis
1. Check health dashboard: `/admin/health`
2. Check database circuit breaker state
3. Check Supabase status page: https://status.supabase.com

### Resolution

**If circuit breaker is open:**
```bash
# Reset via health dashboard
POST /api/admin/health
{ "action": "reset_circuit_breaker", "service": "database" }
```

**If Supabase is down:**
1. Enable maintenance mode (if available)
2. Queue critical operations for retry
3. Notify users of degraded service
4. Monitor Supabase status for resolution

**If connection pool exhausted:**
- Check for long-running queries in Supabase dashboard
- Restart application to reset connections
- Review recent code changes for query issues

---

## 2. Payment Processing Issues

### Symptoms
- Customers cannot complete bookings
- Payment intent creation failing
- Stripe webhook errors in logs

### Diagnosis
1. Check health dashboard for Stripe status
2. Check Stripe dashboard: https://dashboard.stripe.com
3. Review Sentry for specific error patterns

### Resolution

**If circuit breaker is open:**
```bash
# Via health dashboard API
POST /api/admin/health
{ "action": "reset_circuit_breaker", "service": "stripe" }
```

**If Stripe is down:**
1. System automatically queues payments for retry
2. Check `/admin/health` for queued operations
3. Monitor operation queue for processing
4. Notify customers of payment delays

**If webhook failures:**
1. Check Stripe webhook signing secret is correct
2. Verify webhook endpoint is accessible
3. Replay failed webhooks from Stripe dashboard

### Customer Communication Template
```
We're experiencing temporary payment processing delays.
Your booking is saved and payment will be processed shortly.
No action is needed on your part.
```

---

## 3. Email Service Issues

### Symptoms
- Confirmation emails not being sent
- Health dashboard shows email as unhealthy
- Postmark API errors in logs

### Diagnosis
1. Check health dashboard for email status
2. Check Postmark status: https://status.postmarkapp.com
3. Verify API key in environment variables

### Resolution

**If circuit breaker is open:**
```bash
POST /api/admin/health
{ "action": "reset_circuit_breaker", "service": "email" }
```

**If Postmark is down:**
1. Emails are queued automatically for retry
2. Monitor queue for backlog
3. Consider manual notification for urgent messages

**If API key issues:**
1. Verify `POSTMARK_API_KEY` is set correctly
2. Check Postmark dashboard for key status
3. Regenerate key if compromised

---

## 4. Redis/Rate Limiting Issues

### Symptoms
- Rate limiting not working across instances
- Circuit breaker state not persisting
- Health dashboard shows Redis as unavailable

### Diagnosis
1. Check health dashboard for Redis status (mode: redis vs memory)
2. Check Upstash dashboard: https://console.upstash.com
3. Verify environment variables

### Resolution

**System automatically falls back to in-memory:**
- Rate limiting continues per-instance (less effective)
- Circuit breakers work per-instance
- No immediate action required

**To restore Redis:**
1. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
2. Check Upstash for service issues
3. Regenerate tokens if needed

**Impact of memory-only mode:**
- Rate limits are per Vercel instance (users may exceed limits)
- Circuit breaker state lost on cold starts
- Acceptable for short periods

---

## 5. High Error Rate

### Symptoms
- Sentry alerts for increased errors
- Users reporting issues
- Health dashboard shows degraded status

### Diagnosis
1. Check Sentry for error patterns: https://sentry.io
2. Identify correlation IDs from user reports
3. Check recent deployments

### Resolution

**Identify the source:**
1. Group errors by endpoint in Sentry
2. Check if errors correlate with specific deployment
3. Review correlation IDs for common patterns

**If deployment-related:**
1. Rollback to previous version in Vercel
2. Fix issues in development
3. Deploy fix

**If external service:**
1. Check which service circuit breakers are open
2. Enable graceful degradation
3. Monitor for service recovery

---

## 6. Performance Degradation

### Symptoms
- Slow page loads
- Health dashboard shows high latency
- Users reporting timeouts

### Diagnosis
1. Check response time metrics in health dashboard
2. Check database query performance in Supabase
3. Review Vercel function logs

### Resolution

**If database slow:**
1. Check for missing indexes in Supabase
2. Review slow query log
3. Consider query optimization

**If external service slow:**
1. Circuit breaker will trip after threshold
2. System gracefully degrades
3. Monitor for recovery

**If Vercel cold starts:**
- Normal for serverless
- Consider keeping functions warm for critical paths

---

## 7. Security Incident

### Symptoms
- Unusual traffic patterns
- Suspicious API activity
- Rate limit breaches

### Immediate Actions
1. **Do NOT discuss publicly**
2. Enable stricter rate limiting
3. Review access logs
4. Check for unauthorized data access

### Resolution
1. Identify attack vector
2. Block malicious IPs/patterns
3. Rotate any compromised credentials
4. Review and patch vulnerability
5. Document incident

---

## Circuit Breaker Management

### States
- **CLOSED**: Normal operation, requests flow through
- **OPEN**: Service failing, requests blocked (returns cached/fallback)
- **HALF-OPEN**: Testing if service recovered

### Thresholds
| Service | Failures to Open | Reset Timeout |
|---------|-----------------|---------------|
| All | 5 consecutive | 30 seconds |

### Manual Reset
Via Admin Health Dashboard or API:
```bash
POST /api/admin/health
Content-Type: application/json

{ "action": "reset_circuit_breaker", "service": "stripe" }
```

### Services Monitored
- `stripe` - Payment processing
- `database` - PostgreSQL/Supabase
- `email` - Postmark email service
- `supabase` - Supabase services

---

## Operation Queue

Failed operations are automatically queued for retry.

### Queue Location
Database table: `operation_queue`

### Retry Strategy
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Max retries: 5
- Dead letter after exhaustion

### Manual Processing
```sql
-- View pending operations
SELECT * FROM operation_queue
WHERE status = 'pending'
ORDER BY created_at;

-- Requeue failed operation
UPDATE operation_queue
SET status = 'pending', attempts = 0
WHERE id = 'operation_id';
```

---

## Monitoring Endpoints

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `/api/admin/health` | Full system health | Admin |
| `/api/system/health` | Basic health check | None |

### Health Dashboard
Admin UI: `/admin/health`

Features:
- Real-time service status
- Circuit breaker states with reset buttons
- Response time metrics
- Issue summary

---

## Environment Variables

Critical variables for reliability features:

```bash
# Database (Required)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Redis (Optional - falls back to memory)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Required for notifications)
POSTMARK_API_KEY=...

# Sentry (Required for error tracking)
SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=...
```

---

## Escalation Contacts

| Service | Status Page | Support |
|---------|-------------|---------|
| Supabase | status.supabase.com | support@supabase.io |
| Stripe | status.stripe.com | stripe.com/support |
| Postmark | status.postmarkapp.com | support@postmarkapp.com |
| Vercel | vercel-status.com | vercel.com/help |
| Upstash | status.upstash.com | support@upstash.com |

---

## Post-Incident Checklist

After resolving any incident:

- [ ] Verify all services healthy in dashboard
- [ ] Check no queued operations pending
- [ ] Review Sentry for lingering errors
- [ ] Document incident timeline
- [ ] Identify root cause
- [ ] Create ticket for preventive measures
- [ ] Update runbook if needed
- [ ] Communicate resolution to affected users

---

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-02 | Initial runbook creation | Claude Code |
