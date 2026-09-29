param(
  [Parameter(Mandatory=$true)][string]$ServiceUrl,
  [Parameter(Mandatory=$true)][string]$DeviceId,
  [Parameter(Mandatory=$true)][string]$DeviceToken,
  [string]$InstallRoot = "C:\ProgramData\WorkBridgeMCP\DesktopCommanderMCP"
)

$ErrorActionPreference = "Stop"
$env:WORKBRIDGE_SERVICE_URL = $ServiceUrl
$env:WORKBRIDGE_DEVICE_ID = $DeviceId
$env:WORKBRIDGE_DEVICE_TOKEN = $DeviceToken
$env:WORKBRIDGE_INSTALL_ROOT = $InstallRoot

node (Join-Path $PSScriptRoot "..\dist\device-agent.js")
