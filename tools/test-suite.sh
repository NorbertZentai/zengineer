#!/bin/bash

# 🧪 Zengineer Test Suite
# Simple integration tests for CI/CD

echo "🧪 Starting Zengineer Test Suite..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run tests
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n🔍 Testing: ${test_name}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASS: ${test_name}${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL: ${test_name}${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Environment Tests
echo -e "\n📋 Environment Configuration Tests"
echo "=================================="

run_test "Environment files exist" "[ -f frontend/src/environments/environment.ts ] && [ -f frontend/src/environments/environment.prod.ts ]"

run_test "Supabase URL configured" "grep -q 'eiktdiiziwesatueiyht.supabase.co' frontend/src/environments/environment.prod.ts"

run_test "Supabase key configured" "grep -q 'eyJhbGciOiJIUzI1NiIs' frontend/src/environments/environment.prod.ts"

# Build Configuration Tests
echo -e "\n🏗️ Build Configuration Tests"
echo "============================="

run_test "Lenient TypeScript config exists" "[ -f frontend/tsconfig.lenient.json ]"

run_test "Lenient Dockerfile exists" "[ -f frontend/Dockerfile.lenient ]"

run_test "Angular lenient configuration" "grep -q 'lenient' frontend/angular.json"

run_test "Package.json has lenient build script" "grep -q 'build:lenient' frontend/package.json"

# Docker Configuration Tests
echo -e "\n🐳 Docker Configuration Tests"
echo "=============================="

run_test "Docker Compose file exists" "[ -f docker-compose.yml ]"

run_test "Docker Compose uses lenient build" "grep -q 'Dockerfile.lenient' docker-compose.yml"

run_test "Docker Compose has Supabase env vars" "grep -q 'SUPABASE_URL' docker-compose.yml"

# File Structure Tests
echo -e "\n📁 File Structure Tests"
echo "======================="

run_test "Core service files exist" "[ -f frontend/src/app/services/auth.service.ts ] && [ -f frontend/src/app/services/quiz.service.ts ]"

run_test "Safe access utility exists" "[ -f frontend/src/app/utils/safe-access.ts ]"

run_test "Email template exists" "[ -f email-templates/verification-email.html ]"

run_test "Email template has confirmation URL" "grep -q '{{ .ConfirmationURL }}' email-templates/verification-email.html"

# Dependencies Test
echo -e "\n📦 Dependencies Tests"
echo "===================="

run_test "Frontend dependencies can be installed" "cd frontend && npm ci --silent && cd .."

# TypeScript Compilation Test
echo -e "\n📝 TypeScript Compilation Tests"
echo "==============================="

run_test "TypeScript compiles without errors (lenient)" "cd frontend && npx tsc --noEmit --project tsconfig.lenient.json && cd .."

# Summary
echo -e "\n📊 Test Results Summary"
echo "======================="
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Ready for deployment.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please check the output above.${NC}"
    exit 1
fi
