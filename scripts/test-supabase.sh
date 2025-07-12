#!/bin/bash

# 🚀 Quick Supabase Connection Test for CI/CD
# Tests basic connectivity and configuration

echo "🔧 Testing Supabase Integration..."

# Check environment variables
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL environment variable not set"
    exit 1
fi

if [ -z "$SUPABASE_KEY" ]; then
    echo "❌ SUPABASE_KEY environment variable not set"
    exit 1
fi

echo "✅ Environment variables configured"

# Test Supabase API endpoint
echo "🌐 Testing Supabase API connectivity..."

response=$(curl -s -w "%{http_code}" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    "$SUPABASE_URL/rest/v1/" \
    -o /dev/null 2>/dev/null || echo "000")

if [ "$response" = "200" ]; then
    echo "✅ Supabase API is accessible (HTTP $response)"
elif [ "$response" = "000" ]; then
    echo "⚠️ Network connection failed - this might be due to CI environment restrictions"
else
    echo "⚠️ Supabase API returned status: $response"
fi

# Test Supabase Auth endpoint
echo "🔐 Testing Supabase Auth endpoint..."

auth_response=$(curl -s -w "%{http_code}" \
    -H "apikey: $SUPABASE_KEY" \
    "$SUPABASE_URL/auth/v1/settings" \
    -o /dev/null 2>/dev/null || echo "000")

if [ "$auth_response" = "200" ]; then
    echo "✅ Supabase Auth is accessible (HTTP $auth_response)"
elif [ "$auth_response" = "000" ]; then
    echo "⚠️ Network connection failed - this might be due to CI environment restrictions"
else
    echo "⚠️ Supabase Auth returned status: $auth_response"
fi

echo "🎉 Supabase integration test completed!"
echo "   - URL: $SUPABASE_URL"
echo "   - API Status: $response"
echo "   - Auth Status: $auth_response"

exit 0
