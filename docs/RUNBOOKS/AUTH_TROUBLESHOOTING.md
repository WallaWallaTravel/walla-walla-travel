# Auth Troubleshooting Runbook

Operational guide for diagnosing and resolving authentication issues.

---

## Quick Reference

| Symptom | Likely Cause | Jump to |
|---------|-------------|---------|
| "Unauthorized" on all requests | Invalid/expired SESSION_SECRET | [Session Secret Issues](#session-secret-issues) |
| Can't log in (valid credentials) | User inactive or password hash mismatch | [Login Failures](#login-failures) |
| Session lost after login | Cookie not being set | [Cookie Issues](#cookie-issues) |
| Infinite redirect loop | Middleware misconfiguration | [Redirect Loops](#redirect-loops) |
| 403 Forbidden | Role mismatch | [Role Access Issues](#role-access-issues) |

---

## Diagnostic Commands

### Check Session Cookie (Browser DevTools)
```javascript
// In browser console
document.cookie.split(';').find(c => c.trim().startsWith('session='))
// Should show: "session=eyJhbGciOiJIUzI1NiIs..."
```

### Decode JWT (without verification)
```bash
# Extract payload from JWT token
echo "eyJhbGciOiJIUzI1NiIs..." | cut -d. -f2 | base64 -d 2>/dev/null | jq .
```

### Check User in Database
```sql
SELECT id, email, name, role, is_active, last_login_at
FROM users
WHERE email = 'user@example.com';
```

### View Recent Login Activity
```sql
SELECT u.email, a.action, a.details, a.created_at
FROM user_activity_logs a
JOIN users u ON u.id = a.user_id
WHERE a.action = 'login'
ORDER BY a.created_at DESC
LIMIT 20;
```

---

## Session Secret Issues

### Symptoms
- All authenticated requests return 401 Unauthorized
- Session verification fails silently
- Works in dev, fails in production

### Diagnosis
```bash
# Check if SESSION_SECRET is set in production
vercel env ls | grep SESSION

# Verify secret length (must be 32+ chars)
echo -n "$SESSION_SECRET" | wc -c
```

### Resolution

1. **Generate new secret:**
   ```bash
   openssl rand -base64 32
   ```

2. **Set in Vercel:**
   ```bash
   vercel env add SESSION_SECRET production
   # Paste the generated secret
   ```

3. **Redeploy:**
   ```bash
   vercel --prod
   ```

4. **Note:** All existing sessions will be invalidated

---

## Login Failures

### Symptoms
- "Invalid email or password" for known-valid credentials
- Login works for some users, not others

### Diagnosis

1. **Check user exists and is active:**
   ```sql
   SELECT id, email, is_active, password_hash IS NOT NULL as has_password
   FROM users
   WHERE email = 'user@example.com';
   ```

2. **Verify password hash format:**
   ```sql
   -- Should start with $2a$ or $2b$ (bcrypt)
   SELECT LEFT(password_hash, 4) as hash_prefix
   FROM users
   WHERE email = 'user@example.com';
   ```

3. **Check for rate limiting:**
   ```sql
   SELECT COUNT(*) as attempts, MAX(created_at) as last_attempt
   FROM user_activity_logs
   WHERE action = 'login_failed'
     AND details->>'email' = 'user@example.com'
     AND created_at > NOW() - INTERVAL '15 minutes';
   ```

### Resolution

1. **Reset password:**
   ```typescript
   import { hashPassword } from '@/lib/auth/passwords';
   const hash = await hashPassword('newPassword123');
   // Update in database
   ```

2. **Reactivate user:**
   ```sql
   UPDATE users SET is_active = true WHERE email = 'user@example.com';
   ```

3. **Clear rate limit (if implemented):**
   ```sql
   DELETE FROM rate_limits WHERE identifier = 'login:user@example.com';
   ```

---

## Cookie Issues

### Symptoms
- Login succeeds but immediately logged out on next request
- Session works on localhost but not production
- Session works on main domain but not subdomains

### Diagnosis

1. **Check response headers after login:**
   ```bash
   curl -v -X POST https://wallawalla.travel/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"..."}' \
     2>&1 | grep -i "set-cookie"
   ```

2. **Expected cookie attributes:**
   ```
   Set-Cookie: session=...; Path=/; HttpOnly; Secure; SameSite=Lax
   ```

### Resolution

1. **HTTPS required in production:**
   - Cookies with `Secure` flag only sent over HTTPS
   - Ensure SSL certificate is valid

2. **Check cookie domain setting:**
   ```typescript
   // In lib/auth/session.ts, getCookieDomain() should return:
   // - undefined for single domain (default)
   // - '.wallawalla.travel' for cross-subdomain
   ```

3. **SameSite issues with redirects:**
   - If login redirects to different origin, cookie may not be sent
   - Use `SameSite=None; Secure` only if cross-site needed

---

## Redirect Loops

### Symptoms
- Browser shows "too many redirects"
- Alternating between /login and protected page

### Diagnosis

1. **Check middleware matcher config:**
   ```typescript
   // middleware.ts - ensure login page is excluded
   export const config = {
     matcher: [
       '/((?!api|_next/static|_next/image|favicon.ico|login|public).*)',
     ],
   };
   ```

2. **Test session validation:**
   ```bash
   # With valid session cookie
   curl -v https://wallawalla.travel/admin/dashboard \
     -H "Cookie: session=..." \
     2>&1 | grep "location:"
   ```

### Resolution

1. **Add login page to matcher exclusion:**
   ```typescript
   // Ensure login is excluded from auth check
   matcher: ['/((?!login|api/auth).*']
   ```

2. **Check redirect logic in middleware:**
   ```typescript
   // Prevent redirect to current page
   if (url.pathname === '/login') {
     return NextResponse.next();
   }
   ```

---

## Role Access Issues

### Symptoms
- User can log in but gets 403 on certain pages
- "You don't have permission" errors

### Diagnosis

1. **Check user's role:**
   ```sql
   SELECT id, email, role FROM users WHERE email = 'user@example.com';
   ```

2. **Check page's required role:**
   ```typescript
   // Look for requireAuth calls in the page
   await requireAuth(['admin', 'geology_admin']); // Only these roles allowed
   ```

3. **Verify role in session:**
   ```javascript
   // In browser console, decode current session
   const token = document.cookie.match(/session=([^;]+)/)?.[1];
   if (token) console.log(JSON.parse(atob(token.split('.')[1])));
   ```

### Resolution

1. **Update user role:**
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
   ```

2. **User must log out and log in again** for role change to take effect

---

## Production Checklist

Before deploying auth changes:

- [ ] `SESSION_SECRET` set in production (32+ chars, random)
- [ ] HTTPS enabled (required for Secure cookies)
- [ ] Login page excluded from auth middleware
- [ ] Test login → protected page → logout flow
- [ ] Verify role-based access for each role
- [ ] Check cross-subdomain auth if applicable
- [ ] Review user_activity_logs for issues

---

## Emergency Procedures

### All Users Locked Out

1. **Direct database access:**
   ```sql
   -- Create emergency admin
   INSERT INTO users (email, name, password_hash, role, is_active)
   VALUES (
     'emergency@wallawalla.travel',
     'Emergency Admin',
     '$2a$12$...', -- bcrypt hash of known password
     'admin',
     true
   );
   ```

2. **Bypass auth (temporary):**
   ```typescript
   // In middleware.ts, add temporary bypass
   if (request.headers.get('X-Emergency-Access') === process.env.EMERGENCY_TOKEN) {
     return NextResponse.next();
   }
   ```

### Session Secret Compromised

1. **Immediately rotate secret:**
   ```bash
   # Generate new secret
   openssl rand -base64 32

   # Update in Vercel
   vercel env rm SESSION_SECRET production
   vercel env add SESSION_SECRET production

   # Redeploy
   vercel --prod
   ```

2. **All sessions invalidated** - users must log in again

3. **Audit logs:**
   ```sql
   SELECT * FROM user_activity_logs
   WHERE created_at > '2025-01-01'
   ORDER BY created_at DESC;
   ```

---

**Last Updated:** January 30, 2026
