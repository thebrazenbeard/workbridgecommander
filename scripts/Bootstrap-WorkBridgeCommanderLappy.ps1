param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^tunnel_[A-Za-z0-9]+$')]
  [string]$TunnelId,
  [Parameter(Mandatory = $true)]
  [string]$ConfirmedInstalledAppTunnelId,
  [switch]$ReplaceExistingRuntime
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = "D:\VERA\tools\WorkBridgeCommander"
$SourceRoot = Join-Path $Root "source"
$BinRoot = Join-Path $Root "bin"
$LogRoot = Join-Path $Root "logs"
$ProfilePath = Join-Path $Root "tunnel-profile.yaml"
$HealthUrlFile = Join-Path $Root "tunnel-health-url.txt"
$StatePath = Join-Path $Root "runtime-state.json"
$CommanderCommit = "40e523f75771a83b4be666940c6fdec3f8ffe445"
$TrustedManifestSha256 = "0e2e80ae5acd26c04e0adb5ac21b453edbe5b7004505998d2692b7b948ae1e2f"
$InstallRoot = "C:\ProgramData\WorkBridgeMCP\DesktopCommanderMCP"
$ManifestPath = Join-Path $InstallRoot "workbridge-desktop-commander.manifest.json"

# Require a separate operator attestation of the installed ChatGPT app tunnel.
# Matching two caller arguments is NOT an authenticated plugin-binding readback.
# Refuse obvious mismatches before writing files or stopping any processes.
if ($TunnelId -cne $ConfirmedInstalledAppTunnelId) {
  throw "Tunnel identity mismatch: the requested tunnel is not the confirmed installed ChatGPT app binding"
}
if (Test-Path -LiteralPath $StatePath -PathType Leaf) {
  $existingState = Get-Content -Raw -Encoding UTF8 -LiteralPath $StatePath | ConvertFrom-Json
  if ([string]$existingState.tunnel_id -cne $TunnelId) {
    throw "Refusing to replace an existing runtime bound to a different tunnel"
  }
  if (-not $ReplaceExistingRuntime) {
    throw "Existing runtime found; explicit -ReplaceExistingRuntime is required before replacement"
  }
  foreach ($recorded in @(
    @{ Pid = [int]$existingState.tunnel_pid; Needle = "tunnel-client" },
    @{ Pid = [int]$existingState.device_pid; Needle = "dist/device-agent.js" },
    @{ Pid = [int]$existingState.server_pid; Needle = "dist/server.js" }
  )) {
    if ($recorded.Pid -le 0) { continue }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($recorded.Pid)" -ErrorAction Stop
    if ($process -and ([string]$process.CommandLine -notlike "*$($recorded.Needle)*")) {
      throw "Recorded PID $($recorded.Pid) no longer belongs to the expected runtime command"
    }
  }
}
else {
  $existingState = $null
}

# An untracked listener must never be overwritten. A stale runtime-state.json
# alone is not enough evidence that the current listener belongs to this run.
$listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop |
  Where-Object { [int]$_.LocalPort -eq 8787 })
if ($listeners.Count -gt 0) {
  if ($null -eq $existingState) {
    throw "Port 8787 has an untracked listener; refusing to bootstrap over a running service"
  }
  $ownedServerPid = [int]$existingState.server_pid
  if (@($listeners | Where-Object { [int]$_.OwningProcess -eq $ownedServerPid }).Count -ne $listeners.Count) {
    throw "Port 8787 is not exclusively owned by the recorded Commander server process"
  }
}
# A tunnel can remain active without a Commander listener. Even when a stale
# state file exists, refuse any tunnel process not owned by that state file.
$recordedTunnelPid = if ($null -ne $existingState) { [int]$existingState.tunnel_pid } else { 0 }
$tunnelProcesses = @(Get-CimInstance Win32_Process -Filter "Name = 'tunnel-client.exe'" -ErrorAction Stop)
if (@($tunnelProcesses | Where-Object { [int]$_.ProcessId -ne $recordedTunnelPid }).Count -gt 0) {
  throw "Untracked tunnel-client process exists; refusing to create a competing runtime"
}

New-Item -ItemType Directory -Force -Path $Root,$BinRoot,$LogRoot | Out-Null

function Require-Command([string]$Name) {
  return (Get-Command $Name -ErrorAction Stop).Source
}

function New-RandomToken([int]$Bytes = 32) {
  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($buffer)
  }
  finally {
    $rng.Dispose()
  }
  return -join ($buffer | ForEach-Object { $_.ToString("x2") })
}

function Wait-Until([scriptblock]$Probe,[int]$Seconds,[string]$Failure) {
  $deadline = [DateTime]::UtcNow.AddSeconds($Seconds)
  do {
    try { if (& $Probe) { return } } catch {}
    Start-Sleep -Milliseconds 500
  } while ([DateTime]::UtcNow -lt $deadline)
  throw $Failure
}

function Stop-RecordedProcess([int]$ProcessId,[string]$CommandNeedle) {
  if ($ProcessId -le 0) { return }
  $record = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  if (-not $record) { return }
  $commandLine = [string]$record.CommandLine
  if ($commandLine -notlike "*$CommandNeedle*") {
    throw "Refusing to replace runtime: PID $ProcessId no longer matches recorded command $CommandNeedle"
  }
  Stop-Process -Id $ProcessId -Force -ErrorAction Stop
}

function Assert-RecordedProcess([int]$ProcessId,[string]$CommandNeedle) {
  if ($ProcessId -le 0) { return }
  $record = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  if ($record -and ([string]$record.CommandLine -notlike "*$CommandNeedle*")) {
    throw "Refusing to replace runtime: PID $ProcessId no longer matches recorded command $CommandNeedle"
  }
}

function Stop-PriorRuntime {
  if (-not (Test-Path -LiteralPath $StatePath -PathType Leaf)) { return }
  $state = Get-Content -Raw -Encoding UTF8 $StatePath | ConvertFrom-Json
  # Validate all recorded PIDs before terminating any of them to avoid partial
  # shutdown when a PID has been reused by an unrelated process.
  Assert-RecordedProcess ([int]$state.tunnel_pid) "tunnel-client"
  Assert-RecordedProcess ([int]$state.device_pid) "dist/device-agent.js"
  Assert-RecordedProcess ([int]$state.server_pid) "dist/server.js"
  Stop-RecordedProcess ([int]$state.tunnel_pid) "tunnel-client"
  Stop-RecordedProcess ([int]$state.device_pid) "dist/device-agent.js"
  Stop-RecordedProcess ([int]$state.server_pid) "dist/server.js"
  Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 750
}

$git = Require-Command "git"
$node = Require-Command "node"
$npm = Require-Command "npm"

if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
  throw "WorkBridge-qualified DesktopCommander manifest is missing: $ManifestPath"
}
$actualManifestHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ManifestPath).Hash.ToLowerInvariant()
if ($actualManifestHash -ne $TrustedManifestSha256) {
  throw "WorkBridge manifest trust-anchor mismatch. Expected $TrustedManifestSha256, got $actualManifestHash"
}

$manifest = Get-Content -Raw -Encoding UTF8 $ManifestPath | ConvertFrom-Json
if ($manifest.schema -ne "WORKBRIDGE_DESKTOP_COMMANDER_DUPLICATE_V1") { throw "Unexpected WorkBridge manifest schema" }
if ($manifest.upstream_commit -ne "550a0b3e31da18b7cf25e87ed840e3d953b6da42") { throw "Unexpected DesktopCommander upstream commit" }
if ($manifest.upstream_version -ne "0.2.51") { throw "Unexpected DesktopCommander upstream version" }

$tunnelExe = Join-Path $BinRoot "tunnel-client.exe"
if (-not (Test-Path -LiteralPath $tunnelExe -PathType Leaf)) {
  Write-Host "Downloading official OpenAI tunnel-client Windows amd64 release..."
  $release = Invoke-RestMethod -Headers @{ "User-Agent" = "WorkBridgeCommanderBootstrap" } -Uri "https://api.github.com/repos/openai/tunnel-client/releases/latest"
  $asset = $release.assets | Where-Object { $_.name -match '^tunnel-client-v.*-windows-amd64\.zip$' } | Select-Object -First 1
  $sumAsset = $release.assets | Where-Object { $_.name -eq 'SHA256SUMS.txt' } | Select-Object -First 1
  if (-not $asset -or -not $sumAsset) { throw "Official tunnel-client Windows asset or checksum manifest not found" }

  $zipPath = Join-Path $env:TEMP $asset.name
  $sumPath = Join-Path $env:TEMP ("tunnel-client-" + [Guid]::NewGuid().ToString("N") + "-SHA256SUMS.txt")
  $extract = Join-Path $env:TEMP ("tunnel-client-" + [Guid]::NewGuid().ToString("N"))
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath
  Invoke-WebRequest -Uri $sumAsset.browser_download_url -OutFile $sumPath
  $line = Get-Content $sumPath | Where-Object { $_ -match ("\s+" + [regex]::Escape($asset.name) + "$") } | Select-Object -First 1
  if (-not $line) { throw "Checksum for $($asset.name) not found" }
  $expected = ($line -split '\s+')[0].ToLowerInvariant()
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { throw "tunnel-client release checksum mismatch" }

  Expand-Archive -LiteralPath $zipPath -DestinationPath $extract -Force
  $found = Get-ChildItem -LiteralPath $extract -Filter "tunnel-client.exe" -Recurse | Select-Object -First 1
  if (-not $found) { throw "tunnel-client.exe missing from verified archive" }
  Copy-Item -LiteralPath $found.FullName -Destination $tunnelExe -Force
  Remove-Item -LiteralPath $zipPath,$sumPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $extract -Recurse -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath (Join-Path $SourceRoot ".git"))) {
  if (Test-Path -LiteralPath $SourceRoot) {
    throw "Refusing to overwrite an existing non-Git source directory: $SourceRoot"
  }
  & $git clone --no-tags "https://github.com/thebrazenbeard/workbridgecommander.git" $SourceRoot
  if ($LASTEXITCODE -ne 0) { throw "WorkBridge Commander clone failed" }
}
Push-Location $SourceRoot
try {
  & $git fetch origin $CommanderCommit --depth=1
  if ($LASTEXITCODE -ne 0) { throw "WorkBridge Commander fetch failed" }
  & $git checkout --detach $CommanderCommit
  if ($LASTEXITCODE -ne 0) { throw "WorkBridge Commander checkout failed" }
  if ((& $git rev-parse HEAD).Trim() -ne $CommanderCommit) { throw "Commander source head mismatch" }

  & $npm install --ignore-scripts
  if ($LASTEXITCODE -ne 0) { throw "Commander npm install failed" }
  & $npm run build
  if ($LASTEXITCODE -ne 0) { throw "Commander build failed" }
}
finally { Pop-Location }

$runtimeKeySecure = Read-Host "Paste the OpenAI tunnel runtime API key (input is hidden)" -AsSecureString
$runtimeKey = ([System.Net.NetworkCredential]::new("", $runtimeKeySecure)).Password
if ([string]::IsNullOrWhiteSpace($runtimeKey)) { throw "Tunnel runtime API key is required" }

Stop-PriorRuntime

$clientToken = New-RandomToken
$deviceToken = New-RandomToken

$env:HOST = "127.0.0.1"
$env:PORT = "8787"
$env:WORKBRIDGE_CLIENT_TOKEN = $clientToken
$env:WORKBRIDGE_DEVICE_TOKEN = $deviceToken
$env:WORKBRIDGE_DEFAULT_DEVICE = "lappy"
$env:WORKBRIDGE_EXECUTION_CAPACITY = "8"
$env:WORKBRIDGE_UPSTREAM_CONTEXT_CAPACITY = "64"
$env:WORKBRIDGE_ALLOWED_ORIGINS = "https://chatgpt.com"

$serverOut = Join-Path $LogRoot "commander-server.out.log"
$serverErr = Join-Path $LogRoot "commander-server.err.log"
$server = Start-Process -FilePath $node -ArgumentList "dist/server.js" -WorkingDirectory $SourceRoot -PassThru -WindowStyle Hidden -RedirectStandardOutput $serverOut -RedirectStandardError $serverErr

Wait-Until {
  $h = Invoke-RestMethod -Uri "http://127.0.0.1:8787/health" -Method Get -TimeoutSec 2
  return ($h.status -eq "ok")
} 30 "WorkBridge Commander server did not become healthy"

$env:WORKBRIDGE_SERVICE_URL = "http://127.0.0.1:8787"
$env:WORKBRIDGE_DEVICE_ID = "lappy"
$env:WORKBRIDGE_INSTALL_ROOT = $InstallRoot
$env:WORKBRIDGE_TRUSTED_MANIFEST_SHA256 = $TrustedManifestSha256

$deviceOut = Join-Path $LogRoot "commander-device.out.log"
$deviceErr = Join-Path $LogRoot "commander-device.err.log"
$device = Start-Process -FilePath $node -ArgumentList "dist/device-agent.js" -WorkingDirectory $SourceRoot -PassThru -WindowStyle Hidden -RedirectStandardOutput $deviceOut -RedirectStandardError $deviceErr

Wait-Until {
  $h = Invoke-RestMethod -Uri "http://127.0.0.1:8787/health" -Method Get -TimeoutSec 2
  return ([int]$h.connectedDeviceCount -ge 1)
} 30 "WorkBridge Commander device agent did not attach"


$localHeaders = @{
  Authorization = "Bearer $clientToken"
  "x-workbridge-device" = "lappy"
}
$toolsBody = @{ jsonrpc = "2.0"; id = 9001; method = "tools/list"; params = @{} } | ConvertTo-Json -Depth 6
$toolsResponse = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8787/mcp" -Headers $localHeaders -ContentType "application/json" -Body $toolsBody
$localToolNames = @($toolsResponse.result.tools | ForEach-Object { $_.name })
if ($localToolNames.Count -lt 20) {
  throw "WorkBridge Commander local tools/list returned only $($localToolNames.Count) tools"
}
if ($localToolNames -notcontains "start_process") {
  throw "WorkBridge Commander local tools/list is missing start_process"
}

$healthUrlPath = $HealthUrlFile.Replace("\","/")
@"
config_version: 1
mcp:
  server_urls:
    - channel: main
      url: http://127.0.0.1:8787/mcp
  startup_wait_timeout: 60s
  max_concurrent_requests: 32
health:
  listen_addr: 127.0.0.1:0
  url_file: $healthUrlPath
admin_ui:
  open_browser: false
"@ | Set-Content -LiteralPath $ProfilePath -Encoding UTF8

$env:CONTROL_PLANE_TUNNEL_ID = $TunnelId
$env:CONTROL_PLANE_API_KEY = $runtimeKey
$env:WORKBRIDGE_TUNNEL_AUTHORIZATION = "Bearer $clientToken"
$env:MCP_EXTRA_HEADERS = "Authorization: env:WORKBRIDGE_TUNNEL_AUTHORIZATION"

& $tunnelExe doctor --profile-file $ProfilePath --explain
if ($LASTEXITCODE -ne 0) { throw "tunnel-client doctor failed" }

Remove-Item -LiteralPath $HealthUrlFile -Force -ErrorAction SilentlyContinue
$tunnelOut = Join-Path $LogRoot "tunnel-client.out.log"
$tunnelErr = Join-Path $LogRoot "tunnel-client.err.log"
Remove-Item -LiteralPath $tunnelOut,$tunnelErr -Force -ErrorAction SilentlyContinue
$tunnel = Start-Process -FilePath $tunnelExe -ArgumentList @("run","--profile-file",$ProfilePath) -PassThru -WindowStyle Hidden -RedirectStandardOutput $tunnelOut -RedirectStandardError $tunnelErr

Wait-Until { Test-Path -LiteralPath $HealthUrlFile } 20 "tunnel-client did not publish its health URL"
$healthBase = (Get-Content -Raw -LiteralPath $HealthUrlFile).Trim()
Wait-Until {
  $ready = Invoke-WebRequest -UseBasicParsing -Uri ($healthBase.TrimEnd("/") + "/readyz") -TimeoutSec 2
  return ($ready.StatusCode -eq 200)
} 30 "tunnel-client did not become process-ready"

Wait-Until {
  if (-not (Test-Path -LiteralPath $tunnelErr -PathType Leaf)) { return $false }
  return [bool](Select-String -LiteralPath $tunnelErr -SimpleMatch "mcp session initialized" -Quiet)
} 60 "tunnel-client started but did not initialize the WorkBridge Commander MCP session. See $tunnelErr"

[pscustomobject]@{
  schema = "WORKBRIDGE_COMMANDER_LOCAL_RUNTIME_V1"
  tunnel_id = $TunnelId
  commander_commit = $CommanderCommit
  trusted_manifest_sha256 = $TrustedManifestSha256
  server_pid = $server.Id
  device_pid = $device.Id
  tunnel_pid = $tunnel.Id
  tunnel_health_url = $healthBase
  mcp_session_verified = $true
  local_tool_count = $localToolNames.Count
  local_start_process_verified = $false
  started_utc = [DateTime]::UtcNow.ToString("o")
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $StatePath -Encoding UTF8

$runtimeKey = $null
$runtimeKeySecure.Dispose()
$env:CONTROL_PLANE_API_KEY = $null
$env:WORKBRIDGE_TUNNEL_AUTHORIZATION = $null
$env:MCP_EXTRA_HEADERS = $null

Write-Host ""
Write-Host "WORKBRIDGE COMMANDER READY"
Write-Host "Tunnel: $TunnelId"
Write-Host "Commander: http://127.0.0.1:8787"
Write-Host "Device: lappy"
Write-Host "Tools: $($localToolNames.Count) (start_process listed; execution not verified)"
Write-Host "State: $StatePath"
Write-Host "Logs: $LogRoot"
