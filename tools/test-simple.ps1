# Zengineer Test Suite - PowerShell Version
Write-Host "Starting Zengineer Test Suite..." -ForegroundColor Cyan

$TestsPassed = 0
$TestsFailed = 0

function Test-File {
    param([string]$FilePath, [string]$TestName)
    
    if (Test-Path $FilePath) {
        Write-Host "PASS: $TestName" -ForegroundColor Green
        $script:TestsPassed++
    } else {
        Write-Host "FAIL: $TestName" -ForegroundColor Red
        $script:TestsFailed++
    }
}

function Test-Content {
    param([string]$FilePath, [string]$Pattern, [string]$TestName)
    
    if ((Test-Path $FilePath) -and ((Get-Content $FilePath -Raw) -match $Pattern)) {
        Write-Host "PASS: $TestName" -ForegroundColor Green
        $script:TestsPassed++
    } else {
        Write-Host "FAIL: $TestName" -ForegroundColor Red
        $script:TestsFailed++
    }
}

Write-Host "`nEnvironment Configuration Tests:" -ForegroundColor Yellow
Test-File "frontend/src/environments/environment.ts" "Development environment file exists"
Test-File "frontend/src/environments/environment.prod.ts" "Production environment file exists"
Test-Content "frontend/src/environments/environment.prod.ts" "eiktdiiziwesatueiyht.supabase.co" "Supabase URL configured"

Write-Host "`nBuild Configuration Tests:" -ForegroundColor Yellow
Test-File "frontend/tsconfig.lenient.json" "Lenient TypeScript config exists"
Test-File "frontend/Dockerfile.lenient" "Lenient Dockerfile exists"
Test-Content "frontend/angular.json" "lenient" "Angular lenient configuration"

Write-Host "`nDocker Configuration Tests:" -ForegroundColor Yellow
Test-File "infrastructure/docker-compose.yml" "Docker Compose file exists"
Test-Content "infrastructure/docker-compose.yml" "Dockerfile.lenient" "Docker Compose uses lenient build"

Write-Host "`nFile Structure Tests:" -ForegroundColor Yellow
Test-File "frontend/src/app/core/services/auth.service.ts" "Auth service exists"
Test-File "frontend/src/app/core/services/quiz.service.ts" "Quiz service exists"
Test-File "email-templates/verification-email.html" "Email template exists"

Write-Host "`nTest Results:" -ForegroundColor Cyan
Write-Host "Passed: $TestsPassed" -ForegroundColor Green
Write-Host "Failed: $TestsFailed" -ForegroundColor Red

if ($TestsFailed -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed!" -ForegroundColor Red
    exit 1
}
