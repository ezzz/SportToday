[CmdletBinding()]
param(
  [switch]$Install,
  [switch]$AllowFirewall,
  [switch]$RefreshEvents,
  [switch]$FetchEpg,
  [ValidateSet("xmltvfr", "xmltvfree")]
  [string]$Source = "xmltvfr",
  [string]$Date = "",
  [int]$Port = 4173
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$ingestRoot = Join-Path $repoRoot "services\ingest"
$envPath = Join-Path $ingestRoot ".env"
$envExamplePath = Join-Path $ingestRoot ".env.example"

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
  throw "Node.js 22.5 ou supérieur est requis. Installez la version LTS depuis https://nodejs.org/ puis relancez le script."
}

$nodeVersionText = (& node.exe --version).Trim()
$nodeVersion = [version]$nodeVersionText.TrimStart("v")
if ($nodeVersion -lt [version]"22.5.0") {
  throw "Node.js $nodeVersionText est trop ancien. Node.js 22.5 ou supérieur est requis."
}

if (-not (Test-Path $ingestRoot)) {
  throw "Répertoire du service introuvable : $ingestRoot"
}

$nodeModulesPath = Join-Path $ingestRoot "node_modules"
if ($Install -or -not (Test-Path $nodeModulesPath)) {
  Write-Host "Installation des dépendances npm..."
  Push-Location $ingestRoot
  try {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci a échoué." }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $envPath)) {
  Copy-Item $envExamplePath $envPath
  throw "Le fichier services\ingest\.env vient d'être créé. Renseignez API_FOOTBALL_KEY, puis relancez ce script."
}

if ($AllowFirewall) {
  try {
    $ruleName = "SportToday POC4 TCP $Port"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
      New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private -ErrorAction Stop | Out-Null
      Write-Host "Règle pare-feu privée ajoutée pour le port TCP $Port."
    }
  } catch {
    Write-Warning "Impossible d'ajouter automatiquement la règle pare-feu. Relancez PowerShell en administrateur ou autorisez manuellement le port TCP $Port sur le profil Privé."
  }
}

Push-Location $ingestRoot
try {
  Write-Host "Compilation du POC..."
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw "La compilation a échoué." }

  $sqlitePath = Join-Path $ingestRoot "data\sporttoday.sqlite"
  if ($FetchEpg -or -not (Test-Path $sqlitePath)) {
    Write-Host "Base SQLite absente ou actualisation demandée : récupération XMLTVFr..."
    & npm.cmd run xmltv:fetch -- --source=xmltvfr
    if ($LASTEXITCODE -ne 0) { throw "La récupération XMLTVFr a échoué." }
  }

  $arguments = @("dist/cli.js", "poc4:web", "--source=$Source", "--limit=10", "--port=$Port", "--host=0.0.0.0")
  if ($Date) { $arguments += "--date=$Date" }
  if ($RefreshEvents) { $arguments += "--refresh-events" }

  $lanIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -First 1 -ExpandProperty IPAddress
  if (-not $lanIp) { $lanIp = "adresse-IP-du-PC" }

  Write-Host ""
  Write-Host "SportToday est prêt pour le réseau local :" -ForegroundColor Green
  Write-Host "  PC :     http://127.0.0.1:$Port"
  Write-Host "  Téléphone : http://${lanIp}:$Port" -ForegroundColor Green
  Write-Host "Même Wi-Fi requis. Ctrl+C arrête le serveur."
  Write-Host ""

  & node.exe @arguments
  if ($LASTEXITCODE -ne 0) { throw "Le serveur SportToday s'est arrêté avec le code $LASTEXITCODE." }
} finally {
  Pop-Location
}
