#!/bin/bash
# Session start hook — runs before every Claude Code session
# Keeps output minimal to save tokens

echo "📍 $(git branch --show-current) | $(git log -1 --format='%h %s' 2>/dev/null)"

# Quick health checks
if ! command -v npx &> /dev/null; then
  echo "⚠️  npx not found"
fi

# Flag uncommitted changes
CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$CHANGES" -gt 0 ]; then
  echo "⚠️  $CHANGES uncommitted changes"
fi
