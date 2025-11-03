#!/bin/bash
# Partnership API Testing Script

echo "================================"
echo "Partnership API Tests"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8000"

# You need to login first and get session cookie
# For now, we'll use Django's session from the browser

echo "${BLUE}Test 1: Get current partnership${NC}"
curl -s "${BASE_URL}/api/partnership/" \
  -H "Cookie: sessionid=YOUR_SESSION_ID" | python3 -m json.tool

echo ""
echo "${BLUE}Test 2: Create invitation${NC}"
curl -s -X POST "${BASE_URL}/api/partnership/invite/" \
  -H "Cookie: sessionid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" | python3 -m json.tool

echo ""
echo "${BLUE}Test 3: Accept invitation${NC}"
curl -s -X POST "${BASE_URL}/api/partnership/accept/" \
  -H "Cookie: sessionid=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"code":"ABC123"}' | python3 -m json.tool

echo ""
echo "${BLUE}Test 4: Dissolve partnership${NC}"
curl -s -X DELETE "${BASE_URL}/api/partnership/dissolve/" \
  -H "Cookie: sessionid=YOUR_SESSION_ID" | python3 -m json.tool

echo ""
echo "${GREEN}✓ Tests complete${NC}"
