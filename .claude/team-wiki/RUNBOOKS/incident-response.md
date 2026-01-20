# Incident Response Runbook

## Severity Levels

| Level | Definition | Response Time | Escalate to User |
|-------|------------|---------------|------------------|
| 🚨 **Critical** | Site down, data loss, security breach | Immediate | Yes, immediately |
| 🔴 **High** | Major feature broken, blocking users | Within 1 hour | Yes, after initial assessment |
| 🟡 **Medium** | Feature degraded, workaround exists | Same day | If not resolved quickly |
| 🟢 **Low** | Minor issue, cosmetic | When convenient | Only if recurring |

---

## Incident Response Steps

### 1. DETECT
- Alert received (Sentry, user report, monitoring)
- Initial symptom identified
- Severity assessed

### 2. ASSESS
```
📍 What: [symptom description]
⚡ Severity: [Critical/High/Medium/Low]
🎯 Impact: [who/what affected]
🕐 Started: [when first noticed]
```

### 3. COMMUNICATE
- Critical/High: Alert user immediately
- Document in incident log
- Update status if public-facing

### 4. MITIGATE
- Stop the bleeding first
- Rollback if deployment caused it
- Disable feature if it's the source
- Redirect traffic if needed

### 5. RESOLVE
- Identify root cause
- Implement fix
- Test thoroughly
- Deploy fix
- Verify resolution

### 6. POST-MORTEM
- Document what happened
- Identify root cause
- List preventive measures
- Update runbooks if needed

---

## Common Incidents

### Site Not Loading

**Symptoms**: 500 errors, blank page, timeout

**Quick Checks**:
1. Vercel status page - platform issue?
2. Supabase status - database issue?
3. Recent deploy - rollback candidate?
4. Vercel logs - specific errors?

**Actions**:
```
If recent deploy → Rollback
If database issue → Check Supabase dashboard
If API errors → Check function logs
If unknown → Escalate
```

### Authentication Broken

**Symptoms**: Can't login, session lost, auth errors

**Quick Checks**:
1. JWT configuration correct?
2. Supabase Auth service up?
3. Environment variables present?
4. CORS issues?

**Actions**:
```
Check Supabase Auth dashboard
Verify env variables
Check recent auth-related changes
Test login flow step-by-step
```

### Database Issues

**Symptoms**: Slow queries, connection errors, data missing

**Quick Checks**:
1. Supabase dashboard status
2. Connection pool exhausted?
3. Recent migration issues?
4. RLS blocking access?

**Actions**:
```
Check Supabase metrics
Review recent migrations
Test direct Supabase queries
Check RLS policies
```

### Payment Issues (Stripe)

**Symptoms**: Payments failing, webhooks not received

**Quick Checks**:
1. Stripe dashboard status
2. API keys correct?
3. Webhook endpoint accessible?
4. Recent Stripe changes?

**Actions**:
```
Check Stripe dashboard for failures
Verify webhook signatures
Test payment in Stripe test mode
Review webhook logs
```

### Third-Party Service Down

**Symptoms**: Feature using external service broken

**Services**: OpenAI, Deepgram, Resend, Stripe

**Actions**:
```
Check service status page
Implement graceful degradation if possible
Inform user of external dependency issue
Monitor for service recovery
```

---

## Escalation Matrix

| Situation | Action |
|-----------|--------|
| Can't resolve in 30 min | Escalate to user |
| Data loss suspected | Escalate immediately |
| Security breach suspected | Escalate immediately |
| Cost implications | Escalate before action |
| Unknown root cause | Document and escalate |

---

## Communication Templates

### Initial Alert to User
```
🚨 INCIDENT ALERT

📍 Issue: [brief description]
⚡ Severity: [level]
🎯 Impact: [who affected]
🔧 Status: Investigating

Will update in [X minutes].
```

### Update
```
📋 INCIDENT UPDATE

📍 Issue: [brief description]
🔧 Status: [investigating/mitigating/resolving]
🔍 Finding: [what we know]
⏭️ Next: [next steps]
```

### Resolution
```
✅ INCIDENT RESOLVED

📍 Issue: [brief description]
🔧 Resolution: [what fixed it]
📊 Duration: [how long]
🛡️ Prevention: [steps to prevent recurrence]
```

---

## Useful Commands

```bash
# Check Vercel logs
vercel logs [deployment-url]

# Check Supabase status
# Use Supabase dashboard

# Test database connection
npx prisma db pull

# Quick health check
curl -I https://wallawalla.travel
```

---

## Post-Incident Tasks

- [ ] Document in incident log
- [ ] Identify root cause
- [ ] Create fix if needed
- [ ] Update runbooks
- [ ] Implement preventive measures
- [ ] Inform user of prevention steps
