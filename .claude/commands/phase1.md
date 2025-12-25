# Phase 1: Critical Fixes Execution

Execute Phase 1 critical fixes from COMMERCIAL_READINESS_ROADMAP.md

## Phase 1 Objective
Fix all critical security and stability issues that block production deployment.

**Timeline:** Week 1
**Priority:** 🔴 CRITICAL

## Tasks to Execute

### 1.1 Remove Test Routes from Production

```bash
# Identify test routes
find app -type d -name "test*" -o -name "*-test" 2>/dev/null

# Remove test directories (confirm with user first)
# rm -rf app/test app/test-mobile app/security-test
```

**Action:** Delete these directories after confirming they're not needed:
- `app/test/`
- `app/test-mobile/`  
- `app/security-test/`

### 1.2 Remove Secrets from Version Control

```bash
# Check for committed secrets
git ls-files | xargs grep -l "VERCEL_OIDC\|sk_live\|sk_test" 2>/dev/null

# Check .env files in git
git ls-files | grep "\.env"
```

**Action:** 
1. Remove `.env.production` from git: `git rm .env.production`
2. Add to `.gitignore`: `.env*.local`, `.env.production`
3. Rotate any exposed credentials immediately

### 1.3 Implement Environment Validation

Create `lib/config/env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Environment validation failed:');
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration');
    }
  }
  
  return result.data;
}

export const env = validateEnv();
```

### 1.4 Implement Structured Logging

Create `lib/logging/logger.ts`:

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private formatEntry(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      };
    }

    const output = this.formatEntry(entry);
    
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log('error', message, context, error);
  }
}

export const logger = new Logger();
```

### 1.5 Fix Session Secret Fallback

Find and fix the session configuration:

```bash
# Find session config
grep -r "SESSION_SECRET\|session.*secret" --include="*.ts" lib/ app/ 2>/dev/null | head -20
```

**Action:** Remove any fallback/placeholder secrets. The app should fail to start if SESSION_SECRET is not set.

### 1.6 Add Rate Limiting to Auth Endpoints

Check current rate limiting:
```bash
grep -r "rateLimit\|rate-limit" --include="*.ts" lib/ app/ 2>/dev/null
```

If using in-memory rate limiting, flag for Phase 2 upgrade to Redis.

## Verification Checklist

After completing Phase 1, verify:

```bash
# No test routes
[ -z "$(find app -type d -name 'test*' 2>/dev/null)" ] && echo "✅ Test routes removed" || echo "❌ Test routes still exist"

# No secrets in git
[ -z "$(git ls-files | xargs grep -l 'sk_live\|VERCEL_OIDC' 2>/dev/null)" ] && echo "✅ No secrets in git" || echo "❌ Secrets found in git"

# Env validation exists
[ -f "lib/config/env.ts" ] && echo "✅ Env validation exists" || echo "❌ Env validation missing"

# Logger exists
[ -f "lib/logging/logger.ts" ] && echo "✅ Logger exists" || echo "❌ Logger missing"
```

## Completion Report

When Phase 1 is complete, generate a report:

```markdown
## ✅ PHASE 1 COMPLETION REPORT

**Completed:** [Date]
**Duration:** [X] hours

### Tasks Completed
- [x] Test routes removed
- [x] Secrets removed from version control
- [x] Environment validation implemented
- [x] Structured logging implemented
- [x] Session secret fallback removed
- [x] Rate limiting verified

### Files Changed
- [List of files]

### Breaking Changes
- [Any breaking changes]

### Ready for Phase 2
[Yes/No - with blockers if No]
```
