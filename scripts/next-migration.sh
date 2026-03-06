#!/bin/bash
# Output the next available migration number.
# Reads the highest numeric prefix from migrations/ and adds 1.
#
# Usage:
#   ./scripts/next-migration.sh
#   # Output: 122  (if highest existing is 121)

set -e

MIGRATIONS_DIR="$(cd "$(dirname "$0")/.." && pwd)/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Error: migrations/ directory not found at $MIGRATIONS_DIR" >&2
  exit 1
fi

HIGHEST=$(ls "$MIGRATIONS_DIR" | sed 's/-.*//' | sort -n | tail -1)

if [ -z "$HIGHEST" ]; then
  echo "1"
else
  # Remove leading zeros for arithmetic, then output
  NEXT=$(( 10#$HIGHEST + 1 ))
  echo "$NEXT"
fi
