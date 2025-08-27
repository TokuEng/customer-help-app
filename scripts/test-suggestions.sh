#!/bin/bash

echo "🔍 Testing Suggestions Endpoint"
echo "=============================="

APP_URL="https://customer-help-center-ouv8b.ondigitalocean.app"

echo -e "\n1️⃣ Testing suggestions for 'how':"
curl -X POST "$APP_URL/api/suggestions" \
  -H "Content-Type: application/json" \
  -d '{"q": "how", "limit": 5}' \
  -s | jq . || echo "Failed"

echo -e "\n2️⃣ Testing suggestions for 'token':"
curl -X POST "$APP_URL/api/suggestions" \
  -H "Content-Type: application/json" \
  -d '{"q": "token", "limit": 5}' \
  -s | jq . || echo "Failed"

echo -e "\n3️⃣ Testing direct Meilisearch:"
curl -X POST "http://147.182.245.91:7700/indexes/articles/search" \
  -H "Authorization: Bearer NzEzYTdkNjQ0N2FiYjFkODg0NzdjNzNk" \
  -H "Content-Type: application/json" \
  -d '{"q": "how", "limit": 5}' \
  -s | jq '.hits[].title' || echo "Meilisearch query failed"
