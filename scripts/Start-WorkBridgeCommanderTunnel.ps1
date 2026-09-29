param(
  [string]$TunnelClient = "tunnel-client",
  [string]$ProfilePath = (Join-Path $PSScriptRoot "..\deploy\tunnel-client.workbridge.example.yaml")
)

$ErrorActionPreference = "Stop"
$required = @(
  "OPENAI_MCP_TUNNEL_ID",
  "OPENAI_TUNNEL_RUNTIME_API_KEY",
  "WORKBRIDGE_CLIENT_TOKEN"
)
foreach ($name in $required) {
  if (-not [Environment]::GetEnvironmentVariable($name)) {
    throw "$name is required"
  }
}

$health = Invoke-RestMethod -Uri "http://127.0.0.1:8787/health" -Method Get
if ($health.status -ne "ok") { throw "WorkBridge Commander is not healthy on loopback" }

$env:CONTROL_PLANE_TUNNEL_ID = $env:OPENAI_MCP_TUNNEL_ID
$env:CONTROL_PLANE_API_KEY = $env:OPENAI_TUNNEL_RUNTIME_API_KEY
$env:MCP_EXTRA_HEADERS = "Authorization: Bearer $env:WORKBRIDGE_CLIENT_TOKEN"

& $TunnelClient doctor --profile-file $ProfilePath --explain
if ($LASTEXITCODE -ne 0) { throw "tunnel-client doctor failed" }

& $TunnelClient run --profile-file $ProfilePath
exit $LASTEXITCODE
