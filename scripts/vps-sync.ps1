param(
  [string]$HostName = "177.7.52.248",
  [string]$User = "root",
  [string]$RemoteDir = "/var/www/barberstudio-v2"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$archive = Join-Path $env:TEMP "barberstudio-v2-vps.tar.gz"

Push-Location $repoRoot
try {
  if (Test-Path $archive) {
    Remove-Item -LiteralPath $archive -Force
  }

  tar --exclude-from=".deployignore" -czf $archive .
}
finally {
  Pop-Location
}

ssh "$User@$HostName" "mkdir -p '$RemoteDir'"
scp $archive "$User@$HostName:/tmp/barberstudio-v2-vps.tar.gz"
ssh "$User@$HostName" "tar -xzf /tmp/barberstudio-v2-vps.tar.gz -C '$RemoteDir' && rm /tmp/barberstudio-v2-vps.tar.gz && chmod +x '$RemoteDir/scripts/'*.sh"

Write-Host "Synced to $User@$HostName:$RemoteDir"

