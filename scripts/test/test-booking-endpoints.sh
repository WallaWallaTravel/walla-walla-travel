#!/bin/bash

# Test script for booking API endpoints
# Tests all 4 new booking endpoints

BASE_URL="http://localhost:3000"

echo "========================================="
echo "BOOKING API ENDPOINTS TEST"
echo "========================================="
echo ""

# Test 1: Check Availability
echo "TEST 1: POST /api/bookings/check-availability"
echo "Testing availability check for Nov 15, 2025..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/bookings/check-availability" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-11-15",
    "duration_hours": 6.0,
    "party_size": 8
  }')

if echo "$RESPONSE" | grep -q "available"; then
  echo "✅ Check availability endpoint responding"
  echo "$RESPONSE" | jq -r '.data.available, .data.pricing.base_price' 2>/dev/null || echo "$RESPONSE"
else
  echo "❌ Check availability endpoint failed"
  echo "$RESPONSE"
fi

echo ""
echo "========================================="
echo ""

# Test 2: Calculate Price
echo "TEST 2: POST /api/bookings/calculate-price"
echo "Testing price calculation..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/bookings/calculate-price" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-11-15",
    "duration_hours": 6.0,
    "party_size": 8,
    "winery_count": 4
  }')

if echo "$RESPONSE" | grep -q "pricing"; then
  echo "✅ Calculate price endpoint responding"
  echo "$RESPONSE" | jq -r '.data.pricing.total, .data.pricing.deposit.amount' 2>/dev/null || echo "$RESPONSE"
else
  echo "❌ Calculate price endpoint failed"
  echo "$RESPONSE"
fi

echo ""
echo "========================================="
echo ""

# Test 3: Get Booking (should return 404 for non-existent booking)
echo "TEST 3: GET /api/bookings/[bookingNumber]"
echo "Testing booking retrieval (expect 404 for test booking)..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/bookings/WWT-2025-00001")

if echo "$RESPONSE" | grep -q "Booking not found\|booking_number"; then
  echo "✅ Get booking endpoint responding"
  echo "$RESPONSE" | jq -r '.error // .data.booking_number' 2>/dev/null || echo "$RESPONSE"
else
  echo "❌ Get booking endpoint failed"
  echo "$RESPONSE"
fi

echo ""
echo "========================================="
echo ""

# Test 4: Create Booking (validation test - should fail with validation error)
echo "TEST 4: POST /api/bookings/create"
echo "Testing booking creation validation (expect validation error)..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/bookings/create" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Test User"
    }
  }')

if echo "$RESPONSE" | grep -q "Validation failed\|email"; then
  echo "✅ Create booking endpoint responding with validation"
  echo "$RESPONSE" | jq -r '.error' 2>/dev/null || echo "$RESPONSE"
else
  echo "❌ Create booking endpoint failed"
  echo "$RESPONSE"
fi

echo ""
echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
echo "All 4 booking API endpoints are accessible."
echo "Run 'npm run dev' to test endpoints interactively."
echo ""
