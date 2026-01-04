#!/bin/bash

# Production Build Mobile Testing Script
# Use this instead of npm run dev for mobile device testing

set -e

echo ""
echo "🏗️  Building production version..."
echo "This may take 30-60 seconds..."
echo ""

npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 Starting production server on all network interfaces..."
echo ""

# Get local IP address (works on macOS)
if command -v ipconfig &> /dev/null; then
    IP=$(ipconfig getifaddr en0 2>/dev/null || echo "Unable to detect IP")
elif command -v hostname &> /dev/null; then
    IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "Unable to detect IP")
else
    IP="YOUR_COMPUTER_IP"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ✅  PRODUCTION SERVER READY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  📱  Test on your mobile device:"
echo ""
echo "      http://$IP:3000"
echo ""
echo "  🌐  Or on this computer:"
echo ""
echo "      http://localhost:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ℹ️   IMPORTANT:"
echo "      - Make sure mobile device is on same WiFi"
echo "      - This is a PRODUCTION build (no hot reload)"
echo "      - Make code changes? Stop (Ctrl+C) and re-run this script"
echo ""
echo "  🧪  Test URLs:"
echo "      - Home: http://$IP:3000"
echo "      - Static Test: http://$IP:3000/test-static.html"
echo "      - Voice Test: http://$IP:3000/test/voice-inspector"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Press Ctrl+C to stop server"
echo ""

# Run production server with network binding
npm run start -- --hostname 0.0.0.0

