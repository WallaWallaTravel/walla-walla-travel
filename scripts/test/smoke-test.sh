#!/bin/bash
set -e

BASE_URL="${1:-http://localhost:3000}"
FAILED=0

echo "Running smoke tests against $BASE_URL"
echo ""

# Critical pages to test
PAGES=(
  "/"
  "/login"
  "/admin/marketing"
  "/admin/marketing/ai-generator"
  "/partner-portal/dashboard"
  "/partner-portal/media"
  "/partner-portal/listing"
  "/partner-portal/story"
  "/partner-portal/tips"
  "/partner-portal/preview"
  "/wineries"
)

for page in "${PAGES[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL$page" 2>/dev/null || echo "000")

  if [ "$status" = "200" ] || [ "$status" = "307" ] || [ "$status" = "302" ]; then
    echo "  $page ($status)"
  else
    echo "  FAIL: $page ($status)"
    FAILED=1
  fi
done

echo ""
if [ $FAILED -eq 1 ]; then
  echo "Smoke tests FAILED"
  exit 1
else
  echo "All smoke tests passed"
  exit 0
fi
