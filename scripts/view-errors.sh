#!/bin/bash

# View Client Errors Log
# Shows the last 50 errors captured from the browser

LOG_FILE="logs/client-errors.log"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 CLIENT-SIDE ERRORS LOG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -f "$LOG_FILE" ]; then
  echo "✅ No errors logged yet!"
  echo ""
  echo "Errors will appear here when:"
  echo "  - JavaScript errors occur in browser"
  echo "  - API calls fail"
  echo "  - Unhandled promise rejections happen"
  echo ""
  exit 0
fi

echo "Last 50 errors:"
echo ""
tail -n 200 "$LOG_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "To clear errors: rm logs/client-errors.log"
echo "To watch live: tail -f logs/client-errors.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


