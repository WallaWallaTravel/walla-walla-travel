# Fix Console Statements Command

Systematically replace console.* statements with structured logger calls.

## Instructions

### 1. Find All Console Statements

```bash
# Count by type
echo "=== Console Statement Analysis ==="
echo "console.log:" $(grep -r "console\.log" --include="*.ts" app/ lib/ 2>/dev/null | grep -v node_modules | wc -l)
echo "console.error:" $(grep -r "console\.error" --include="*.ts" app/ lib/ 2>/dev/null | grep -v node_modules | wc -l)
echo "console.warn:" $(grep -r "console\.warn" --include="*.ts" app/ lib/ 2>/dev/null | grep -v node_modules | wc -l)
echo "console.info:" $(grep -r "console\.info" --include="*.ts" app/ lib/ 2>/dev/null | grep -v node_modules | wc -l)

# List all occurrences
echo "=== All Console Statements ==="
grep -rn "console\." --include="*.ts" app/ lib/ 2>/dev/null | grep -v node_modules | head -50
```

### 2. Verify Logger Exists

```bash
[ -f "lib/logging/logger.ts" ] && echo "✅ Logger exists" || echo "❌ Create logger first (see /phase1)"
```

### 3. Replacement Patterns

**Replace `console.error` with `logger.error`:**
```typescript
// Before
console.error('Error processing booking:', error);

// After
import { logger } from '@/lib/logging/logger';
logger.error('Error processing booking', error as Error, { bookingId });
```

**Replace `console.log` with `logger.info` or `logger.debug`:**
```typescript
// Before
console.log('Booking created:', bookingId);

// After
logger.info('Booking created', { bookingId });

// For development-only logs
logger.debug('Debug info', { data });
```

**Replace `console.warn` with `logger.warn`:**
```typescript
// Before
console.warn('Deprecated function called');

// After
logger.warn('Deprecated function called', { function: 'oldFunction' });
```

### 4. Files to Process (Priority Order)

Process in this order for maximum impact:

1. **API Routes** (highest priority - production traffic)
   ```bash
   grep -rln "console\." --include="*.ts" app/api/ 2>/dev/null | grep -v node_modules
   ```

2. **Services** (business logic errors)
   ```bash
   grep -rln "console\." --include="*.ts" lib/services/ 2>/dev/null | grep -v node_modules
   ```

3. **Middleware** (auth/validation errors)
   ```bash
   grep -rln "console\." --include="*.ts" lib/api/middleware/ 2>/dev/null | grep -v node_modules
   ```

4. **Utilities** (helper functions)
   ```bash
   grep -rln "console\." --include="*.ts" lib/utils/ 2>/dev/null | grep -v node_modules
   ```

### 5. Bulk Replacement Strategy

For each file:

1. Add logger import at top
2. Replace console statements
3. Add context objects where helpful
4. Verify no regressions

**Import to add:**
```typescript
import { logger } from '@/lib/logging/logger';
```

### 6. Verification

After replacements:
```bash
# Should be 0 in production code
REMAINING=$(grep -r "console\." --include="*.ts" app/api/ lib/ 2>/dev/null | grep -v node_modules | grep -v "\.test\." | wc -l)
echo "Remaining console statements: $REMAINING"

# Run tests to verify no regressions
npm test
```

### 7. Progress Tracking

Update this as you work:

```markdown
## Console Statement Removal Progress

| Directory | Before | After | Status |
|-----------|--------|-------|--------|
| app/api/ | [X] | [X] | [🔴/🟡/🟢] |
| lib/services/ | [X] | [X] | [🔴/🟡/🟢] |
| lib/api/middleware/ | [X] | [X] | [🔴/🟡/🟢] |
| lib/utils/ | [X] | [X] | [🔴/🟡/🟢] |
| **Total** | [X] | [X] | [🔴/🟡/🟢] |
```

### 8. Exceptions

These are OK to keep:
- Test files (`*.test.ts`)
- Development scripts in `scripts/`
- Console statements wrapped in `if (process.env.NODE_ENV !== 'production')`
