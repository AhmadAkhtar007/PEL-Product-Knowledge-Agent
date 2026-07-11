[CmdletBinding()]
param(
    [switch]$Once,
    [switch]$Build,
    [int]$IntervalSeconds = 15
)

$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Get-ContainerState {
    param([string]$ContainerName)

    $state = & docker inspect $ContainerName --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>$null
    if ($LASTEXITCODE -ne 0) {
        return "missing"
    }

    return ($state | Select-Object -First 1).Trim()
}

function Start-BackendStack {
    $composeArgs = @("compose", "up", "-d")
    if ($Build) {
        $composeArgs += "--build"
    } else {
        $composeArgs += "--no-build"
    }

    & docker @composeArgs
    return $LASTEXITCODE -eq 0
}

function Ensure-BackendStack {
    $dbState = Get-ContainerState "pel-postgres"
    $apiState = Get-ContainerState "pel-api"
    $timestamp = Get-Date -Format "HH:mm:ss"

    Write-Host "[$timestamp] postgres=$dbState api=$apiState"

    if ($dbState -in @("missing", "exited", "dead") -or $apiState -in @("missing", "exited", "dead")) {
        Start-BackendStack | Out-Null
        return
    }

    if ($dbState -eq "unhealthy") {
        & docker compose restart db | Out-Null
        & docker compose restart api | Out-Null
        return
    }

    if ($apiState -eq "unhealthy") {
        & docker compose restart api | Out-Null
    }
}

do {
    Ensure-BackendStack

    if ($Once) {
        break
    }

    Start-Sleep -Seconds $IntervalSeconds
} while ($true)
