# Test Coverage Status Command

Analyze current test coverage and provide actionable recommendations based on TESTING_STRATEGY.md

## Instructions

### 1. Discover Current Test State

```bash
# Find all test files
find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" 2>/dev/null | grep -v node_modules | sort

# Count test files by category
echo "=== Test File Distribution ==="
echo "Unit tests:" && find . -path "*/__tests__/*" -name "*.test.*" 2>/dev/null | grep -v node_modules | wc -l
echo "Integration tests:" && find . -path "*/integration/*" -name "*.test.*" 2>/dev/null | grep -v node_modules | wc -l
echo "E2E tests:" && find . -path "*/e2e/*" -o -name "*.e2e.*" 2>/dev/null | grep -v node_modules | wc -l

# List untested services
echo "=== Services Without Tests ==="
for service in lib/services/*.ts; do
  basename="${service##*/}"
  testfile="${basename%.ts}.test.ts"
  if ! find . -name "$testfile" 2>/dev/null | grep -q .; then
    echo "Missing: $basename"
  fi
done
```

### 2. Run Test Suite

```bash
# Run tests with coverage
npm test -- --coverage --silent 2>&1 | tail -50

# If Jest not configured, check for test script
npm run test 2>&1 || echo "Test script not found or failing"
```

### 3. Analyze Coverage Gaps

Review the TESTING_STRATEGY.md and identify:
- Which phase we're currently in (1-6 of 6-week plan)
- What tests should exist by now
- Priority gaps based on commercial readiness

### 4. Generate Test Status Report

```markdown
## 🧪 TEST COVERAGE STATUS

**Date:** [Current Date]
**Current Coverage:** [X]%
**Target Coverage:** 60%
**Testing Phase:** [1-6] of 6

### Coverage by Category
| Category | Files | Tests | Coverage | Target |
|----------|-------|-------|----------|--------|
| Services | [X] | [X] | [X]% | 80% |
| API Routes | [X] | [X] | [X]% | 70% |
| Components | [X] | [X] | [X]% | 50% |
| Utilities | [X] | [X] | [X]% | 90% |

### 🔴 Critical Gaps (Test Immediately)
These are untested critical paths:
1. **[Service/Route Name]** - [Why critical]
2. **[Service/Route Name]** - [Why critical]

### 📝 Tests to Write This Week
Based on TESTING_STRATEGY.md Phase [X]:

**Priority 1 - Services:**
- [ ] `booking.service.test.ts` - [X] test cases needed
- [ ] `auth.service.test.ts` - [X] test cases needed

**Priority 2 - API Routes:**
- [ ] `api/bookings/route.test.ts` - CRUD operations
- [ ] `api/auth/login/route.test.ts` - Auth flow

**Priority 3 - Integration:**
- [ ] Booking workflow end-to-end
- [ ] Payment processing flow

### 🎯 Quick Wins (< 30 min each)
1. [Simple test to add]
2. [Simple test to add]
3. [Simple test to add]

### 📊 Test Health Metrics
- Passing: [X] tests
- Failing: [X] tests
- Skipped: [X] tests
- Duration: [X]s

### 🚀 Next Milestone
**Target:** [Description]
**Tests Needed:** [X]
**Estimated Effort:** [X] hours
```

### 5. Generate Test Skeletons

If requested, generate test file skeletons for the most critical untested files.
