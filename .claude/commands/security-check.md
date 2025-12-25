# Security Audit Command

Run a comprehensive security audit against the SECURITY_HARDENING_CHECKLIST.md

## Instructions

Perform automated security checks and generate an actionable security report.

### 1. Critical Security Checks

Run these checks and report any findings:

```bash
# Check for secrets in code
grep -r "sk_live\|sk_test\|password\s*=\s*['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.env*" . 2>/dev/null | grep -v node_modules | head -20

# Check for .env files that shouldn't be committed
find . -name ".env*" -not -path "./node_modules/*" 2>/dev/null

# Check for test routes in production paths
find app -type d -name "test*" -o -name "*-test" 2>/dev/null

# Check for TODO/FIXME security comments
grep -r "TODO.*security\|FIXME.*auth\|HACK" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | head -10

# Check for unsafe patterns
grep -r "dangerouslySetInnerHTML\|eval(\|innerHTML" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules

# Check for console statements in API routes
grep -r "console\." --include="*.ts" app/api/ 2>/dev/null | wc -l
```

### 2. Authentication & Session Security

Review these files for security issues:
- `lib/auth/` - Authentication implementation
- `middleware.ts` - Route protection
- `app/api/auth/` - Auth endpoints

Check for:
- [ ] Session secret properly configured (not fallback)
- [ ] Secure cookie settings (httpOnly, secure, sameSite)
- [ ] Password hashing with bcrypt (cost factor >= 12)
- [ ] Rate limiting on auth endpoints
- [ ] CSRF protection enabled

### 3. API Security

Review API routes for:
- [ ] Input validation with Zod schemas
- [ ] SQL injection prevention (parameterized queries)
- [ ] Authorization checks on protected routes
- [ ] Rate limiting implementation
- [ ] Error messages don't leak sensitive info

### 4. Generate Security Report

```markdown
## 🛡️ SECURITY AUDIT REPORT

**Date:** [Current Date]
**Severity Summary:**
- 🔴 Critical: [count]
- 🟡 High: [count]
- 🟢 Medium: [count]
- ⚪ Low: [count]

### 🔴 Critical Issues (Fix Immediately)
| Issue | Location | Remediation |
|-------|----------|-------------|
| [description] | [file:line] | [fix] |

### 🟡 High Priority Issues
| Issue | Location | Remediation |
|-------|----------|-------------|
| [description] | [file:line] | [fix] |

### ✅ Security Checks Passed
- [x] [Check description]
- [x] [Check description]

### 📋 Recommended Actions (Priority Order)
1. [Most urgent action]
2. [Second priority]
3. [Third priority]

### 🔒 Security Posture Score
[X]/10 - [Assessment: Poor/Fair/Good/Excellent]
```

### 5. Cross-Reference with Checklist

Compare findings against `SECURITY_HARDENING_CHECKLIST.md` and mark completed items.
