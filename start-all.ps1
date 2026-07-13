[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot

Write-Host "=========================================" -ForegroundColor Green
Write-Host "Starting Backend Services (Docker)" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
# Start the backend using the existing dev-backend script
# -Once flag ensures it runs the docker compose up and exits, rather than looping
& "$RepoRoot\scripts\dev-backend.ps1" -Once

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "Starting Expo Android App" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Set-Location "$RepoRoot\android-app"

# Ensure dependencies are installed (if node_modules is missing)
if (-not (Test-Path "$PWD\node_modules")) {
    Write-Host "Installing Android App dependencies..." -ForegroundColor Cyan
    npm install
}

# Start the Expo Metro Bundler for Android
Write-Host "Launching Expo..." -ForegroundColor Cyan
npm run android
