param(
  [string]$Message = "Update BarberStudio",
  [string]$HostName = "barberstudio-vps",
  [string]$User = "root",
  [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$webDir = Join-Path $repoRoot "apps/web"

Push-Location $webDir
try {
  npm run lint
  npm run build
}
finally {
  Pop-Location
}

Push-Location $repoRoot
try {
  git add -A

  $changes = git status --short
  if ($changes) {
    git commit -m $Message
    git push origin main
  }
  else {
    Write-Host "No hay cambios nuevos para guardar en Git."
  }

  if (-not $SkipDeploy) {
    powershell -ExecutionPolicy Bypass -File ".\scripts\vps-sync.ps1" -HostName $HostName -User $User
    ssh "$User@$HostName" "bash /var/www/barberstudio-v2/scripts/deploy.sh"
  }
}
finally {
  Pop-Location
}
