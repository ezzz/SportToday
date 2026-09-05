[CmdletBinding()]
param(
  [ValidateRange(1, 1440)]
  [int]$IntervalMinutes = 15,
  [string]$Branch = "poc/data-sources",
  [switch]$Install,
  [switch]$AllowFirewall,
  [switch]$RefreshEvents,
  [switch]$FetchEpg,
  [ValidateRange(0, 168)]
  [int]$RefreshHours = 6,
  [ValidateSet("xmltvfr", "xmltvfree")]
  [string]$Source = "xmltvfr",
  [string]$Date = "",
  [int]$Port = 4173
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$runScript = Join-Path $repoRoot "scripts\run-poc4-windows.ps1"
$ingestRoot = Join-Path $repoRoot "services\ingest"
$logRoot = Join-Path $ingestRoot "data"
$stdoutLog = Join-Path $logRoot "watch-poc4-server.log"
$stderrLog = Join-Path $logRoot "watch-poc4-server-error.log"
$serverProcess = $null
$installOnNextStart = [bool]$Install

function Invoke-GitText {
  param([Parameter(Mandatory)][string[]]$GitArguments)
  $output = & git.exe @GitArguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArguments -join ' ') a échoué : $($output -join ' ')"
  }
  return ($output | Out-String).Trim()
}

function Stop-SportToday {
  if ($null -eq $script:serverProcess -or $script:serverProcess.HasExited) {
    $script:serverProcess = $null
    return
  }
  Write-Host "Arrêt du serveur SportToday (PID $($script:serverProcess.Id))..."
  & taskkill.exe /PID $script:serverProcess.Id /T /F *> $null
  $script:serverProcess = $null
}

function Start-SportToday {
  if ($null -ne $script:serverProcess -and -not $script:serverProcess.HasExited) {
    return
  }
  New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
  $arguments = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", ('"{0}"' -f $runScript)
  )
  if ($script:installOnNextStart) { $arguments += "-Install" }
  if ($AllowFirewall) { $arguments += "-AllowFirewall" }
  if ($RefreshEvents) { $arguments += "-RefreshEvents" }
  if ($FetchEpg) { $arguments += "-FetchEpg" }
  $arguments += @("-RefreshHours", $RefreshHours, "-Source", $Source, "-Port", $Port)
  if ($Date) { $arguments += @("-Date", $Date) }

  Write-Host "Lancement du serveur SportToday..."
  $script:serverProcess = Start-Process -FilePath "powershell.exe" `
    -ArgumentList $arguments `
    -WorkingDirectory $repoRoot `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -WindowStyle Hidden `
    -PassThru
  $script:installOnNextStart = $false
  Write-Host "Serveur lancé (PID $($script:serverProcess.Id)). Logs : $stdoutLog"
}

function Show-AccessUrl {
  $lanIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -First 1 -ExpandProperty IPAddress
  if ($lanIp) {
    Write-Host "Téléphone : http://${lanIp}:$Port"
  } else {
    Write-Host "Adresse téléphone : voir l'adresse IP locale de ce PC, port $Port"
  }
}

function Sync-Repository {
  Push-Location $repoRoot
  try {
    Invoke-GitText @("fetch", "origin", $Branch, "--quiet") | Out-Null
    $localCommit = Invoke-GitText @("rev-parse", "HEAD")
    $remoteCommit = Invoke-GitText @("rev-parse", "origin/$Branch")
    if ($localCommit -eq $remoteCommit) {
      Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Aucun changement ($localCommit)."
      return $false
    }

    $changedFiles = Invoke-GitText @("diff", "--name-only", $localCommit, $remoteCommit)
    $script:installOnNextStart = $changedFiles -match "(^|\r?\n)services/ingest/package(-lock)?\.json(\r?$|\r?\n)"
    Write-Host "Mise à jour détectée : $localCommit -> $remoteCommit"
    Stop-SportToday
    Invoke-GitText @("pull", "--ff-only", "origin", $Branch) | Write-Host
    return $true
  } finally {
    Pop-Location
  }
}

if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
  throw "Git est requis. Installez Git for Windows puis relancez ce script."
}
if (-not (Test-Path $runScript)) {
  throw "Script de lancement introuvable : $runScript"
}

Push-Location $repoRoot
try {
  $activeBranch = Invoke-GitText @("branch", "--show-current")
  if ($activeBranch -ne $Branch) {
    $localBranch = & git.exe show-ref --verify --quiet "refs/heads/$Branch"
    if ($LASTEXITCODE -eq 0) {
      Invoke-GitText @("switch", $Branch) | Write-Host
    } else {
      Invoke-GitText @("fetch", "origin", $Branch, "--quiet") | Out-Null
      Invoke-GitText @("switch", "--track", "-c", $Branch, "origin/$Branch") | Write-Host
    }
  }
} finally {
  Pop-Location
}

Write-Host "Surveillance Git active : branche '$Branch', vérification toutes les $IntervalMinutes minute(s)."
Write-Host "Pour arrêter la surveillance et le serveur : Ctrl+C."
Show-AccessUrl
Write-Host ""

try {
  Sync-Repository | Out-Null
  Start-SportToday
  while ($true) {
    Start-Sleep -Seconds ($IntervalMinutes * 60)
    try {
      if ($null -eq $script:serverProcess -or $script:serverProcess.HasExited) {
        Write-Warning "Le serveur SportToday n'est plus actif ; relance automatique."
        Start-SportToday
      }
      if (Sync-Repository) {
        Start-SportToday
      }
    } catch {
      Write-Warning "Vérification Git impossible : $($_.Exception.Message)"
      if ($null -eq $script:serverProcess -or $script:serverProcess.HasExited) {
        try { Start-SportToday } catch { Write-Warning "Relance impossible : $($_.Exception.Message)" }
      }
    }
  }
} finally {
  Stop-SportToday
}
