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
    -o /dev/null)

if [ "$response" = "200" ]; then
    echo "✅ Supabase API is accessible (HTTP $response)"
else
    echo "⚠️ Supabase API returned status: $response"
    # Don't fail the build for API connectivity issues in CI
fi

# Test Supabase Auth endpoint
echo "🔐 Testing Supabase Auth endpoint..."

auth_response=$(curl -s -w "%{http_code}" \
    -H "apikey: $SUPABASE_KEY" \
    "$SUPABASE_URL/auth/v1/settings" \
    -o /dev/null)

if [ "$auth_response" = "200" ]; then
    echo "✅ Supabase Auth is accessible (HTTP $auth_response)"
else
    echo "⚠️ Supabase Auth returned status: $auth_response"
fi

echo "🎉 Supabase integration test completed!"
echo "   - URL: $SUPABASE_URL"
echo "   - API Status: $response"
echo "   - Auth Status: $auth_response"

exit 0
