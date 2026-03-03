#!/bin/bash
# Velocity-Aware Review Reminder
#
# Checks if a code review is due based on commit velocity:
#   High velocity (10+/week):    review every 25 commits
#   Moderate velocity (3-9/week): review every 50 commits
#   Low velocity (<3/week):      review every 100 commits
#
# Usage:
#   ./scripts/check-review-due.sh          # Check if review is due
#   ./scripts/check-review-due.sh --json   # Output as JSON (for CI)

set -euo pipefail

# Find the last review tag
LAST_REVIEW_TAG=$(git tag -l 'review-*' --sort=-version:refname | head -1)

if [ -z "$LAST_REVIEW_TAG" ]; then
  echo "WARNING: No review tags found. Tag a baseline with: git tag review-$(date +%Y-%m-%d)"
  COMMITS_SINCE_REVIEW=$(git rev-list --count HEAD)
  LAST_REVIEW_DATE="(never)"
else
  COMMITS_SINCE_REVIEW=$(git rev-list --count "${LAST_REVIEW_TAG}..HEAD")
  LAST_REVIEW_DATE=$(echo "$LAST_REVIEW_TAG" | sed 's/review-//')
fi

# Count commits in last 7 days for velocity
COMMITS_LAST_7_DAYS=$(git rev-list --count --since="7 days ago" HEAD)

# Determine velocity tier and threshold
if [ "$COMMITS_LAST_7_DAYS" -ge 10 ]; then
  VELOCITY="high"
  THRESHOLD=25
elif [ "$COMMITS_LAST_7_DAYS" -ge 3 ]; then
  VELOCITY="moderate"
  THRESHOLD=50
else
  VELOCITY="low"
  THRESHOLD=100
fi

# Determine if review is due
REVIEW_DUE="false"
if [ "$COMMITS_SINCE_REVIEW" -ge "$THRESHOLD" ]; then
  REVIEW_DUE="true"
fi

# Output
if [ "${1:-}" = "--json" ]; then
  cat <<EOF
{
  "review_due": $REVIEW_DUE,
  "commits_since_review": $COMMITS_SINCE_REVIEW,
  "threshold": $THRESHOLD,
  "velocity_tier": "$VELOCITY",
  "commits_last_7_days": $COMMITS_LAST_7_DAYS,
  "last_review_tag": "${LAST_REVIEW_TAG:-none}",
  "last_review_date": "$LAST_REVIEW_DATE"
}
EOF
else
  echo ""
  echo "============================================"
  echo "  Review Reminder Check"
  echo "============================================"
  echo "  Last review:          $LAST_REVIEW_DATE (${LAST_REVIEW_TAG:-no tag})"
  echo "  Commits since review: $COMMITS_SINCE_REVIEW"
  echo "  Commits last 7 days:  $COMMITS_LAST_7_DAYS"
  echo "  Velocity tier:        $VELOCITY ($THRESHOLD-commit threshold)"
  echo "  Progress:             $COMMITS_SINCE_REVIEW / $THRESHOLD"
  echo "============================================"

  if [ "$REVIEW_DUE" = "true" ]; then
    echo ""
    echo "  REVIEW DUE: $COMMITS_SINCE_REVIEW commits since last review (velocity: $VELOCITY)"
    echo "  Run a review session, then: ./scripts/mark-review-complete.sh"
    exit 1
  else
    REMAINING=$((THRESHOLD - COMMITS_SINCE_REVIEW))
    echo ""
    echo "  OK: $REMAINING commits until next review is due"
    exit 0
  fi
fi
