#!/bin/bash
# Mark a review as complete
#
# - Tags the current commit as review-YYYY-MM-DD
# - Closes any open "Review Due" GitHub Issues
# - Pushes the tag to origin
#
# Usage:
#   ./scripts/mark-review-complete.sh              # Tag with today's date
#   ./scripts/mark-review-complete.sh 2026-03-03   # Tag with specific date

set -euo pipefail

DATE="${1:-$(date +%Y-%m-%d)}"
TAG="review-${DATE}"

# Check if tag already exists
if git tag -l "$TAG" | grep -q "$TAG"; then
  echo "Tag $TAG already exists. Use a different date or delete the existing tag."
  exit 1
fi

# Create and push the tag
echo "Tagging current commit as $TAG..."
git tag "$TAG"
echo "Pushing tag to origin..."
git push origin "$TAG"

# Close open "Review Due" issues on GitHub (requires gh CLI)
if command -v gh &> /dev/null; then
  echo "Checking for open 'Review Due' issues..."

  OPEN_ISSUES=$(gh issue list --label "review-due" --state open --json number,title --jq '.[].number' 2>/dev/null || true)

  if [ -n "$OPEN_ISSUES" ]; then
    for ISSUE_NUM in $OPEN_ISSUES; do
      echo "  Closing issue #${ISSUE_NUM}..."
      gh issue close "$ISSUE_NUM" --comment "Review completed. Tagged as \`${TAG}\`." 2>/dev/null || true
    done
    echo "Closed $(echo "$OPEN_ISSUES" | wc -l | tr -d ' ') issue(s)."
  else
    echo "No open 'Review Due' issues found."
  fi
else
  echo "gh CLI not installed — skipping GitHub issue cleanup."
  echo "Manually close any open 'Review Due' issues."
fi

echo ""
echo "Review marked complete: $TAG"
echo "Next review will be triggered based on commit velocity."
