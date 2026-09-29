$ErrorActionPreference = "Stop"
$root = Join-Path $env:RUNNER_TEMP ("wbc-real-" + [Guid]::NewGuid().ToString("N"))
$dc = Join-Path $root "DesktopCommanderMCP"
$server = $null
$device = $null
try {
  git init $dc
  if ($LASTEXITCODE -ne 0) { throw "git init failed" }
  Push-Location $dc
  git remote add origin https://github.com/wonderwhy-er/DesktopCommanderMCP.git
  git fetch --depth 1 origin 550a0b3e31da18b7cf25e87ed840e3d953b6da42
  if ($LASTEXITCODE -ne 0) { throw "pinned upstream fetch failed" }
  git checkout --detach FETCH_HEAD
  if ($LASTEXITCODE -ne 0) { throw "checkout failed" }
  if ((git rev-parse HEAD).Trim() -ne "550a0b3e31da18b7cf25e87ed840e3d953b6da42") { throw "upstream head mismatch" }
  npm ci --ignore-scripts
  if ($LASTEXITCODE -ne 0) { throw "DesktopCommander npm ci failed" }
  npm rebuild "@vscode/ripgrep"
  if ($LASTEXITCODE -ne 0) { throw "ripgrep rebuild failed" }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "DesktopCommander build failed" }
  Pop-Location

  $runtime = Join-Path $dc "workbridge-runtime"
  New-Item -ItemType Directory -Force $runtime | Out-Null
  $nodeSource = (Get-Command node).Source
  Copy-Item $nodeSource (Join-Path $runtime "node.exe")
  $manifest = [ordered]@{
    schema = "WORKBRIDGE_DESKTOP_COMMANDER_DUPLICATE_V1"
    upstream_repository = "https://github.com/wonderwhy-er/DesktopCommanderMCP.git"
    upstream_commit = "550a0b3e31da18b7cf25e87ed840e3d953b6da42"
    upstream_version = "0.2.51"
    node_executable_relative = "workbridge-runtime\node.exe"
    node_sha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $runtime "node.exe")).Hash.ToLowerInvariant()
    entrypoint_relative = "dist\index.js"
    entrypoint_sha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $dc "dist\index.js")).Hash.ToLowerInvariant()
    mcp_args = @("dist\index.js", "--no-onboarding")
    unrestricted_command_string_shell = $true
  }
  $manifest | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 (Join-Path $dc "workbridge-desktop-commander.manifest.json")

  $env:PORT = "18991"
  $env:HOST = "127.0.0.1"
  $env:WORKBRIDGE_CLIENT_TOKEN = "qualification-client"
  $env:WORKBRIDGE_DEVICE_TOKEN = "qualification-device"
  $env:WORKBRIDGE_DEFAULT_DEVICE = "qualification"
  $env:WORKBRIDGE_SERVICE_URL = "http://127.0.0.1:18991"
  $env:WORKBRIDGE_DEVICE_ID = "qualification"
  $env:WORKBRIDGE_INSTALL_ROOT = $dc

  $server = Start-Process node -ArgumentList "dist/server.js" -PassThru -NoNewWindow
  for ($i=0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 250
    try { $health = Invoke-RestMethod "http://127.0.0.1:18991/health"; break } catch {}
  }
  if (-not $health) { throw "server did not become healthy" }

  $device = Start-Process node -ArgumentList "dist/device-agent.js" -PassThru -NoNewWindow
  $connected = $false
  for ($i=0; $i -lt 80; $i++) {
    Start-Sleep -Milliseconds 250
    $health = Invoke-RestMethod "http://127.0.0.1:18991/health"
    if ($health.connectedDeviceCount -eq 1) { $connected = $true; break }
  }
  if (-not $connected) { throw "qualified device did not connect" }

  $headers = @{ Authorization = "Bearer qualification-client"; "x-workbridge-device" = "qualification" }
  $initBody = @{ jsonrpc="2.0"; id=1; method="initialize"; params=@{ protocolVersion="2025-06-18"; capabilities=@{}; clientInfo=@{name="workbridge-real-qualification";version="1.0.0"} } } | ConvertTo-Json -Depth 8
  $init = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:18991/mcp" -Headers $headers -ContentType "application/json" -Body $initBody
  if (-not $init.result.serverInfo.name) { throw "initialize failed through bridge" }

  $notice = @{ jsonrpc="2.0"; method="notifications/initialized"; params=@{} } | ConvertTo-Json -Depth 4
  $null = Invoke-WebRequest -Method Post -Uri "http://127.0.0.1:18991/mcp" -Headers $headers -ContentType "application/json" -Body $notice

  $listBody = @{ jsonrpc="2.0"; id=2; method="tools/list"; params=@{} } | ConvertTo-Json -Depth 4
  $listed = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:18991/mcp" -Headers $headers -ContentType "application/json" -Body $listBody
  $names = @($listed.result.tools | ForEach-Object { $_.name })
  if ($names -notcontains "start_process") { throw "exact DesktopCommander start_process missing through bridge" }
  Write-Output (@{status="PASS"; tool_count=$names.Count; upstream_commit="550a0b3e31da18b7cf25e87ed840e3d953b6da42"} | ConvertTo-Json -Compress)
}
finally {
  if ($device -and -not $device.HasExited) { Stop-Process -Id $device.Id -Force -ErrorAction SilentlyContinue }
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
  if (Test-Path $root) { Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue }
}
