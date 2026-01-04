#!/bin/bash

echo "================================"
echo "Travel Suite Integration Test"
echo "================================"

# Configuration
API_URL="${1:-https://travel-suite-api.onrender.com}"
echo "Testing API at: $API_URL"
echo ""

# Test 1: Health Check
echo "1. Testing API Health..."
HEALTH_RESPONSE=$(curl -s "$API_URL/api/health")
if [[ $HEALTH_RESPONSE == *"\"status\":\"ok\""* ]]; then
  echo "✅ API is healthy"
else
  echo "❌ API health check failed"
  echo "Response: $HEALTH_RESPONSE"
  exit 1
fi

# Test 2: Login
echo ""
echo "2. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "driver@example.com", "pin": "1234"}')

if [[ $LOGIN_RESPONSE == *"access_token"* ]]; then
  echo "✅ Login successful"
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  echo "   Token received: ${TOKEN:0:20}..."
else
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

# Test 3: Protected Endpoint
echo ""
echo "3. Testing Protected Endpoint..."
PROFILE_RESPONSE=$(curl -s "$API_URL/api/drivers/me" \
  -H "Authorization: Bearer $TOKEN")

if [[ $PROFILE_RESPONSE == *"email"* ]]; then
  echo "✅ Protected endpoint working"
  echo "   Driver: $(echo $PROFILE_RESPONSE | grep -o '"name":"[^"]*' | cut -d'"' -f4)"
else
  echo "❌ Protected endpoint failed"
  echo "Response: $PROFILE_RESPONSE"
fi

# Test 4: React Frontend
echo ""
echo "4. Checking React Frontend..."
if [ -f ".env.local" ]; then
  echo "✅ .env.local configured"
  cat .env.local
else
  echo "❌ .env.local not found"
fi

if [ -f "app/login/page.tsx" ]; then
  if grep -q "import { login } from '@/lib/api'" app/login/page.tsx; then
    echo "✅ Login page using Python API"
  else
    echo "❌ Login page not updated"
  fi
fi

echo ""
echo "================================"
echo "Integration Test Complete!"
echo "================================"
echo ""
echo "Next Steps:"
echo "1. Start your React app: npm run dev"
echo "2. Visit: http://localhost:3000/login"
echo "3. Login with: driver@example.com / 1234"
echo ""
echo "API Documentation available at:"
echo "$API_URL/docs"