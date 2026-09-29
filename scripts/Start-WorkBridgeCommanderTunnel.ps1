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

$env:WORKBRIDGE_TUNNEL_AUTHORIZATION = "Bearer $env:WORKBRIDGE_CLIENT_TOKEN"

& $TunnelClient doctor --profile-file $ProfilePath --explain
if ($LASTEXITCODE -ne 0) { throw "tunnel-client doctor failed" }

& $TunnelClient run --profile-file $ProfilePath
exit $LASTEXITCODE
