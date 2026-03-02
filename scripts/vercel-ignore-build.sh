#!/bin/bash
# Skip Vercel builds when only non-app files changed.
# Exit 0 = skip build, Exit 1 = proceed with build.

# Always build on production
if [ "$VERCEL_ENV" = "production" ]; then
  # Check if commit message contains [skip deploy]
  if echo "$VERCEL_GIT_COMMIT_MESSAGE" | grep -q "\[skip deploy\]"; then
    echo "⏭ Skipping: commit message contains [skip deploy]"
    exit 0
  fi

  # Check if only non-app files changed
  CHANGED=$(git diff HEAD^ HEAD --name-only 2>/dev/null || echo "UNKNOWN")

  if [ "$CHANGED" = "UNKNOWN" ]; then
    echo "🔨 Building: cannot determine changed files"
    exit 1
  fi

  # If ALL changed files match these patterns, skip the build
  APP_CHANGES=$(echo "$CHANGED" | grep -E '^(app/|lib/|components/|hooks/|public/|next\.config|package\.json|package-lock\.json|prisma/|middleware\.ts)')

  if [ -z "$APP_CHANGES" ]; then
    echo "⏭ Skipping: only non-app files changed:"
    echo "$CHANGED"
    exit 0
  fi

  echo "🔨 Building: app files changed:"
  echo "$APP_CHANGES"
  exit 1
fi

# Always build preview deployments (if they're enabled)
exit 1
