[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot

Write-Host "=========================================" -ForegroundColor Green
Write-Host "Starting Backend Services (Docker)" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Start the backend using the existing dev-backend script
# -Once flag ensures it runs the docker compose up and exits, showing live container health status
& "$RepoRoot\scripts\dev-backend.ps1" -Once -Build

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "Select Frontend to Launch" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "1. Mobile App (Expo)"
Write-Host "2. Web App (Next.js)"
Write-Host "3. Exit"

$choice = Read-Host "`nEnter your choice (1-3)"

switch ($choice) {
    '1' {
        Write-Host "`n=========================================" -ForegroundColor Green
        Write-Host "Starting Mobile App (Expo)" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        Set-Location "$RepoRoot\android-app"
        
        Write-Host "Installing dependencies..." -ForegroundColor Cyan
        npm install
        
        Write-Host "Launching Expo..." -ForegroundColor Cyan
        npm start
    }
    '2' {
        Write-Host "`n=========================================" -ForegroundColor Green
        Write-Host "Starting Web App (Next.js)" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        Set-Location "$RepoRoot\web-app"
        
        Write-Host "Installing dependencies..." -ForegroundColor Cyan
        npm install
        
        Write-Host "Launching Next.js development server..." -ForegroundColor Cyan
        npm run dev
    }
    '3' {
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "Invalid choice. Exiting..." -ForegroundColor Red
        exit 1
    }
}
