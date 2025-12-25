# Daily Standup Command

Generate a daily standup report and set focus for the day's work.

## Instructions

### 1. Gather Yesterday's Progress

Check git history for recent changes:
```bash
# Get yesterday's commits
git log --since="yesterday" --until="today" --oneline --author="$(git config user.name)" 2>/dev/null || echo "No commits yesterday"

# Get today's commits so far
git log --since="today" --oneline 2>/dev/null || echo "No commits today yet"

# Check for uncommitted changes
git status --short
```

### 2. Review Current Phase Status

```bash
# Quick phase checks
echo "=== Quick Status ==="

# Test routes
TEST_ROUTES=$(find app -type d -name "test*" 2>/dev/null | wc -l)
[ $TEST_ROUTES -eq 0 ] && echo "✅ Test routes: Removed" || echo "⚠️ Test routes: $TEST_ROUTES remaining"

# Environment validation
[ -f "lib/config/env.ts" ] && echo "✅ Env validation: Done" || echo "⏳ Env validation: Pending"

# Logger
[ -f "lib/logging/logger.ts" ] && echo "✅ Logger: Done" || echo "⏳ Logger: Pending"

# Sentry
[ -f "sentry.client.config.ts" ] && echo "✅ Sentry: Done" || echo "⏳ Sentry: Pending"

# Redis rate limiting
[ -f "lib/rate-limit/redis-limiter.ts" ] && echo "✅ Redis rate limit: Done" || echo "⏳ Redis rate limit: Pending"

# Test count
TEST_COUNT=$(find . -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | grep -v node_modules | wc -l)
echo "📊 Tests: $TEST_COUNT files"

# Console statements
CONSOLE_COUNT=$(grep -r "console\." --include="*.ts" app/api/ lib/ 2>/dev/null | grep -v node_modules | wc -l)
echo "📊 Console statements: $CONSOLE_COUNT"
```

### 3. Check Blockers

Review for any blocking issues:
- Failing tests
- Build errors
- Missing dependencies
- Environment issues

```bash
# Quick build check
npm run build 2>&1 | tail -20

# Type check
npx tsc --noEmit 2>&1 | tail -10
```

### 4. Generate Standup Report

```markdown
## 📋 DAILY STANDUP - [Date]

### ✅ Yesterday's Accomplishments
- [Completed task 1]
- [Completed task 2]
- [Completed task 3]

### 🎯 Today's Focus
**Primary:** [Main task for today]
**Secondary:** [Backup task if primary blocked]

### Phase Progress
- **Current Phase:** [1-4]
- **Phase Progress:** [X]%
- **Overall Progress:** [X]%

### 🚧 Blockers
- [Blocker 1 or "None"]

### 📊 Quick Metrics
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Test Files | [X] | 100+ | [🔴/🟡/🟢] |
| Console Statements | [X] | 0 | [🔴/🟡/🟢] |
| TypeScript Errors | [X] | 0 | [🔴/🟡/🟢] |

### 🎲 Risk Level
[Low/Medium/High] - [Brief explanation]

### 📝 Notes
[Any additional context or decisions needed]
```

### 5. Set Today's Priorities

Based on the current phase and status, recommend:

1. **If Phase 1 incomplete:** Focus on critical security fixes
2. **If Phase 2 incomplete:** Focus on observability and infrastructure
3. **If Phase 3 incomplete:** Focus on test coverage
4. **If Phase 4 incomplete:** Focus on documentation and polish

### 6. Time Boxing Suggestion

```markdown
### ⏰ Suggested Time Blocks

**Morning (2-3 hours)**
- [ ] [Primary task - specific deliverable]

**Afternoon (2-3 hours)**
- [ ] [Secondary task - specific deliverable]

**End of Day (30 min)**
- [ ] Run tests and verify changes
- [ ] Commit work in progress
- [ ] Update documentation if needed
```

### 7. Create TodoWrite Items

If the user wants, create a TodoWrite with today's tasks for tracking.
