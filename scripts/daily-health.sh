#!/bin/bash
# Daily Health Check — quick local version of the CI health check
# Runs checks A-F (skips build — use ./scripts/verify.sh for that)

PASS=0
WARN=0
FAIL=0

print_header() {
  echo ""
  echo "============================================"
  echo "  $1"
  echo "============================================"
}

mark_pass() {
  echo "  ✅ $1"
  PASS=$((PASS + 1))
}

mark_warn() {
  echo "  ⚠️  $1"
  WARN=$((WARN + 1))
}

mark_fail() {
  echo "  ❌ $1"
  FAIL=$((FAIL + 1))
}

# ── Check A: Routes missing auth wrappers ─────────────────────────

print_header "A. Routes Missing Auth Wrappers"

MISSING_AUTH=""
while IFS= read -r f; do
  if ! grep -qE 'withAdminAuth|withAuth|withOptionalAuth|withDriverAuth|withErrorHandling|withCronAuth' "$f"; then
    MISSING_AUTH="${MISSING_AUTH}    ${f}"$'\n'
  fi
done < <(find app/api -name "route.ts" \
  -not -path "*/webhooks/*" \
  -not -path "*/cron/*" \
  -not -path "*/auth/*" \
  -not -path "*/.well-known/*" \
  -not -path "*/health*")

MISSING_AUTH="${MISSING_AUTH%$'\n'}"

if [ -z "$MISSING_AUTH" ]; then
  mark_pass "All routes have auth/error-handling wrappers"
else
  COUNT=$(echo "$MISSING_AUTH" | wc -l | tr -d ' ')
  mark_fail "$COUNT routes missing auth wrappers:"
  echo "$MISSING_AUTH"
fi

# ── Check B: Routes missing Zod validation ────────────────────────

print_header "B. Routes Missing Zod Validation"

MISSING_ZOD=""
while IFS= read -r f; do
  if ! grep -qE "from 'zod'|from \"zod\"|validateBody|safeParse|\.parse\(" "$f"; then
    MISSING_ZOD="${MISSING_ZOD}    ${f}"$'\n'
  fi
done < <(grep -rl 'request\.json()' app/api/ --include="route.ts")

MISSING_ZOD="${MISSING_ZOD%$'\n'}"

if [ -z "$MISSING_ZOD" ]; then
  mark_pass "All routes using request.json() have Zod validation"
else
  COUNT=$(echo "$MISSING_ZOD" | wc -l | tr -d ' ')
  mark_fail "$COUNT routes with request.json() but no Zod validation:"
  echo "$MISSING_ZOD"
fi

# ── Check C: Mutations missing CSRF ───────────────────────────────

print_header "C. Mutations Missing CSRF"

MISSING_CSRF=""
while IFS= read -r f; do
  if grep -qE 'export (const|async function) (POST|PUT|PATCH|DELETE)' "$f"; then
    if ! grep -q 'withCSRF' "$f"; then
      MISSING_CSRF="${MISSING_CSRF}    ${f}"$'\n'
    fi
  fi
done < <(find app/api -name "route.ts" \
  -not -path "*/webhooks/*" \
  -not -path "*/cron/*" \
  -not -path "*/auth/*")

MISSING_CSRF="${MISSING_CSRF%$'\n'}"

if [ -z "$MISSING_CSRF" ]; then
  mark_pass "All mutation routes have CSRF protection"
else
  COUNT=$(echo "$MISSING_CSRF" | wc -l | tr -d ' ')
  mark_fail "$COUNT mutation routes missing withCSRF:"
  echo "$MISSING_CSRF"
fi

# ── Check D: Oversized files ──────────────────────────────────────

print_header "D. Oversized Files (>500 lines)"

OVERSIZED=$(find app/ lib/ \( -name "*.ts" -o -name "*.tsx" \) -print0 \
  | xargs -0 wc -l 2>/dev/null \
  | awk '$1 > 500 && !/total$/' \
  | sort -rn \
  | head -20)

if [ -z "$OVERSIZED" ]; then
  mark_pass "No files exceed 500 lines"
else
  COUNT=$(echo "$OVERSIZED" | wc -l | tr -d ' ')
  mark_warn "$COUNT files exceed 500 lines:"
  echo "$OVERSIZED" | sed 's/^/    /'
fi

# ── Check E: Dependency vulnerabilities ───────────────────────────

print_header "E. Dependency Vulnerabilities"

AUDIT_OUTPUT=$(npm audit --audit-level=high 2>&1 || true)
if echo "$AUDIT_OUTPUT" | grep -q "found 0 vulnerabilities"; then
  mark_pass "No high/critical vulnerabilities"
else
  mark_warn "npm audit found issues:"
  echo "$AUDIT_OUTPUT" | tail -10 | sed 's/^/    /'
fi

# ── Check F: Test coverage ratio ──────────────────────────────────

print_header "F. Test Coverage Ratio"

TEST_COUNT=$(find __tests__ lib/ \( -name "*.test.ts" -o -name "*.test.tsx" \) 2>/dev/null | wc -l | tr -d ' ')
ROUTE_COUNT=$(find app/api -name "route.ts" | wc -l | tr -d ' ')

if [ "$ROUTE_COUNT" -gt 0 ]; then
  RATIO=$(awk "BEGIN {printf \"%.0f\", ($TEST_COUNT / $ROUTE_COUNT) * 100}")
else
  RATIO=0
fi

echo "  Test files:  $TEST_COUNT"
echo "  Route files: $ROUTE_COUNT"
echo "  Ratio:       ${RATIO}%"

if [ "$RATIO" -lt 10 ]; then
  mark_warn "Low test coverage ratio (${RATIO}%)"
else
  mark_pass "Coverage ratio acceptable (${RATIO}%)"
fi

# ── Summary ───────────────────────────────────────────────────────

echo ""
echo "============================================"
echo "  SUMMARY"
echo "============================================"
echo "  ✅ Passed: $PASS"
echo "  ⚠️  Warnings: $WARN"
echo "  ❌ Failed: $FAIL"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "  Fix failures before committing."
  exit 1
else
  echo ""
  echo "  Health check complete."
  exit 0
fi
