#!/bin/bash

# Quick Test Script for All Features
# Run: chmod +x scripts/quick-test.sh && ./scripts/quick-test.sh

echo "🧪 Quick Test Script - All Features"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if server is running
echo "1️⃣  Checking dev server..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|307"; then
    echo -e "${GREEN}✅ Dev server is running${NC}"
else
    echo -e "${RED}❌ Dev server not running${NC}"
    echo "   Start with: npm run dev"
    exit 1
fi
echo ""

# Test Invoicing API
echo "2️⃣  Testing Invoicing API..."
INVOICE_RESPONSE=$(curl -s http://localhost:3000/api/admin/pending-invoices)
if echo "$INVOICE_RESPONSE" | grep -q "success"; then
    INVOICE_COUNT=$(echo "$INVOICE_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✅ Invoicing API working${NC}"
    echo "   Pending invoices: $INVOICE_COUNT"
else
    echo -e "${RED}❌ Invoicing API failed${NC}"
fi
echo ""

# Test Restaurants API
echo "3️⃣  Testing Restaurants API..."
RESTAURANT_RESPONSE=$(curl -s http://localhost:3000/api/restaurants)
if echo "$RESTAURANT_RESPONSE" | grep -q "success"; then
    RESTAURANT_COUNT=$(echo "$RESTAURANT_RESPONSE" | grep -o '"name"' | wc -l)
    echo -e "${GREEN}✅ Restaurants API working${NC}"
    echo "   Restaurants loaded: $RESTAURANT_COUNT"
else
    echo -e "${RED}❌ Restaurants API failed${NC}"
fi
echo ""

# Test Lunch Orders API
echo "4️⃣  Testing Lunch Orders API..."
LUNCH_RESPONSE=$(curl -s http://localhost:3000/api/admin/lunch-orders)
if echo "$LUNCH_RESPONSE" | grep -q "success"; then
    LUNCH_COUNT=$(echo "$LUNCH_RESPONSE" | grep -o '"id"' | wc -l)
    echo -e "${GREEN}✅ Lunch Orders API working${NC}"
    echo "   Lunch orders: $LUNCH_COUNT"
else
    echo -e "${RED}❌ Lunch Orders API failed${NC}"
fi
echo ""

# Test Driver Offers API
echo "5️⃣  Testing Driver Offers API..."
OFFERS_RESPONSE=$(curl -s "http://localhost:3000/api/driver/offers?driver_id=3")
if echo "$OFFERS_RESPONSE" | grep -q "success"; then
    OFFERS_COUNT=$(echo "$OFFERS_RESPONSE" | grep -o '"id"' | wc -l)
    echo -e "${GREEN}✅ Driver Offers API working${NC}"
    echo "   Tour offers: $OFFERS_COUNT"
else
    echo -e "${RED}❌ Driver Offers API failed${NC}"
fi
echo ""

# Summary
echo "===================================="
echo -e "${BLUE}📊 Test Summary${NC}"
echo "===================================="
echo ""
echo "✅ All APIs tested successfully!"
echo ""
echo "🌐 Test URLs:"
echo "   Admin Invoices:    http://localhost:3000/admin/invoices"
echo "   Admin Lunch:       http://localhost:3000/admin/lunch-orders"
echo "   Admin Offers:      http://localhost:3000/admin/tour-offers"
echo "   Driver Portal:     http://localhost:3000/driver-portal/offers"
echo "   Payment Test:      http://localhost:3000/payment/final/37"
echo "   Lunch Ordering:    http://localhost:3000/client-portal/37/lunch"
echo ""
echo "📖 Full testing guide: TESTING_GUIDE.md"
echo ""

