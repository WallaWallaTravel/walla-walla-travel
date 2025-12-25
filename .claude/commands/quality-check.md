# Code Quality Check Command

Run comprehensive code quality analysis and generate improvement recommendations.

## Instructions

### 1. TypeScript Analysis

```bash
# Full type check
echo "=== TypeScript Check ==="
npx tsc --noEmit 2>&1 | tee /tmp/tsc-output.txt

# Count errors
TSC_ERRORS=$(grep -c "error TS" /tmp/tsc-output.txt 2>/dev/null || echo "0")
echo "TypeScript errors: $TSC_ERRORS"

# Show unique error types
echo "=== Error Types ==="
grep "error TS" /tmp/tsc-output.txt 2>/dev/null | sed 's/.*\(TS[0-9]*\).*/\1/' | sort | uniq -c | sort -rn | head -10
```

### 2. ESLint Analysis

```bash
# Full lint check
echo "=== ESLint Check ==="
npm run lint 2>&1 | tee /tmp/lint-output.txt

# Count issues by severity
echo "Errors:" $(grep -c "error" /tmp/lint-output.txt 2>/dev/null || echo "0")
echo "Warnings:" $(grep -c "warning" /tmp/lint-output.txt 2>/dev/null || echo "0")
```

### 3. Code Complexity Analysis

```bash
# Find complex files (high line count)
echo "=== Large Files (>300 lines) ==="
find app lib components -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs wc -l 2>/dev/null | sort -rn | head -20

# Find deeply nested code
echo "=== Potential Complexity Issues ==="
grep -rn "if.*if.*if\|else.*else.*else" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null | head -10
```

### 4. Dependency Analysis

```bash
# Check for outdated packages
echo "=== Outdated Dependencies ==="
npm outdated 2>/dev/null | head -20

# Check for security vulnerabilities
echo "=== Security Vulnerabilities ==="
npm audit 2>/dev/null | tail -20

# Check for unused dependencies
echo "=== Potentially Unused Dependencies ==="
npx depcheck 2>/dev/null | head -30 || echo "Install depcheck: npm install -g depcheck"
```

### 5. Code Pattern Analysis

```bash
# Check for anti-patterns
echo "=== Anti-Pattern Check ==="

# Any type usage
echo "Any types:" $(grep -r ": any" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null | grep -v node_modules | wc -l)

# Console statements in production code
echo "Console statements:" $(grep -r "console\." --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null | grep -v node_modules | wc -l)

# TODO/FIXME comments
echo "TODO comments:" $(grep -r "TODO\|FIXME" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null | grep -v node_modules | wc -l)

# Empty catch blocks
echo "Empty catch blocks:" $(grep -rn "catch.*{.*}" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null | grep -v node_modules | wc -l)

# Hardcoded strings (potential i18n issues)
echo "Hardcoded URLs:" $(grep -r "http://\|https://" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null | grep -v node_modules | grep -v "localhost\|example.com" | wc -l)
```

### 6. Test Quality Analysis

```bash
# Test file analysis
echo "=== Test Quality ==="

# Tests without assertions
echo "Tests without expect:" $(grep -rL "expect\|assert" --include="*.test.ts" --include="*.test.tsx" . 2>/dev/null | grep -v node_modules | wc -l)

# Tests with only one assertion
echo "Single assertion tests (check for thoroughness):"
grep -rn "expect(" --include="*.test.ts" . 2>/dev/null | grep -v node_modules | cut -d: -f1-2 | uniq -c | sort -n | head -10

# Skipped tests
echo "Skipped tests:" $(grep -r "\.skip\|it\.skip\|describe\.skip\|test\.skip" --include="*.test.ts" . 2>/dev/null | grep -v node_modules | wc -l)
```

### 7. Generate Quality Report

```markdown
## 📊 CODE QUALITY REPORT

**Date:** [Current Date]
**Overall Grade:** [A-F]

### Summary Metrics
| Metric | Count | Target | Status |
|--------|-------|--------|--------|
| TypeScript Errors | [X] | 0 | [🔴/🟡/🟢] |
| ESLint Errors | [X] | 0 | [🔴/🟡/🟢] |
| ESLint Warnings | [X] | <10 | [🔴/🟡/🟢] |
| `any` Type Usage | [X] | <5 | [🔴/🟡/🟢] |
| Console Statements | [X] | 0 | [🔴/🟡/🟢] |
| TODO Comments | [X] | <10 | [🔴/🟡/🟢] |
| Security Vulns | [X] | 0 | [🔴/🟡/🟢] |

### 🔴 Critical Issues (Fix Immediately)
1. [Issue with file location and fix]
2. [Issue with file location and fix]

### 🟡 High Priority (Fix This Week)
1. [Issue description]
2. [Issue description]

### 🟢 Improvements (Nice to Have)
1. [Improvement suggestion]
2. [Improvement suggestion]

### 📁 Files Needing Attention
| File | Issues | Priority |
|------|--------|----------|
| [path/to/file.ts] | [issue count] | [High/Medium/Low] |

### 🔧 Recommended Fixes

**Quick Wins (< 30 min each):**
1. [Specific fix with command or code]
2. [Specific fix with command or code]

**Medium Effort (1-2 hours):**
1. [Specific improvement]
2. [Specific improvement]

**Larger Refactors (Half day+):**
1. [Refactoring suggestion]

### 📈 Quality Trend
- Previous check: [Grade]
- Current: [Grade]
- Trend: [Improving/Stable/Declining]

### 🎯 Next Quality Target
[Specific, measurable goal for next check]
```

### 8. Auto-Fix Suggestions

If there are auto-fixable issues:

```bash
# ESLint auto-fix
echo "=== Auto-fixable issues ==="
npm run lint -- --fix --dry-run 2>&1 | head -20

# Suggest running:
echo "To auto-fix: npm run lint -- --fix"
```

### 9. Prioritization Matrix

Based on findings, create prioritized action list:

| Priority | Type | Effort | Impact | Action |
|----------|------|--------|--------|--------|
| 1 | Security | Low | High | Fix vulnerabilities |
| 2 | Types | Medium | High | Remove `any` types |
| 3 | Logging | Low | Medium | Replace console.* |
| 4 | Complexity | High | Medium | Refactor large files |
