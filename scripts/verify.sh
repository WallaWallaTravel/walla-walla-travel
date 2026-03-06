#!/bin/bash
set -e

echo "=== Cleaning .next cache ==="
rm -rf .next

echo "=== Type Check ==="
npx tsc --noEmit

echo "=== Lint ==="
npx next lint

echo "=== Build ==="
npx next build --no-lint

echo "=== Tests ==="
npx jest --passWithNoTests

echo "✅ All checks passed"
