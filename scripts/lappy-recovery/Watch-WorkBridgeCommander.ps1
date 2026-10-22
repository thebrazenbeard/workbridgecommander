param([switch]$Once,[switch]$ProbeOnly,[ValidateRange(1,3600)][int]$PollSeconds=10,[string]$Root='D:\VERA\tools\WorkBridgeCommander')
$ErrorActionPreference='Stop'
$StatePath=Join-Path $Root 'runtime-state.json'
$LogPath=Join-Path $Root 'logs\supervisor.jsonl'
function Test-CommanderRuntime {
  try {
    $state=Get-Content -Raw $StatePath | ConvertFrom-Json
    foreach($item in @(@($state.server_pid,'dist/server.js'),@($state.device_pid,'dist/device-agent.js'),@($state.tunnel_pid,'tunnel-client'))) {
      $p=Get-CimInstance Win32_Process -Filter ("ProcessId="+[int]$item[0]) -ErrorAction Stop
      if(-not $p -or [string]$p.CommandLine -notlike ('*'+$item[1]+'*')){return $false}
      if($item[1] -eq 'tunnel-client' -and [string]$p.CommandLine -notlike ('*'+(Join-Path $Root 'tunnel-profile.yaml')+'*')){return $false}
    }
    $h=Invoke-RestMethod 'http://127.0.0.1:8787/health' -TimeoutSec 3
    if($h.status -ne 'ok' -or [int]$h.connectedDeviceCount -ne 1 -or @($h.devices | Where-Object deviceId -eq 'lappy').Count -ne 1){return $false}
    $r=Invoke-WebRequest -UseBasicParsing -Uri ($state.tunnel_health_url.TrimEnd('/')+'/readyz') -TimeoutSec 3
    return ($r.StatusCode -eq 200)
  } catch {return $false}
}
if($ProbeOnly){[pscustomobject]@{local_runtime_ready=(Test-CommanderRuntime);remote_effect_verified=$false}|ConvertTo-Json;return}
$mutex=New-Object Threading.Mutex($false,'Local\WorkBridgeCommanderSupervisor')
$locked=$false
try {
  try{$locked=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$locked=$true}
  if(-not $locked){Write-Output 'SUPERVISOR_ALREADY_RUNNING';return}
  $failures=0;$lastAttempt=[datetime]::MinValue
  do {
    if(Test-CommanderRuntime){$failures=0}else{$failures++}
    if($failures -ge 2 -and ([datetime]::UtcNow-$lastAttempt).TotalSeconds -ge 90) {
      $lastAttempt=[datetime]::UtcNow
      try {
        & (Join-Path $Root 'Start-WorkBridgeCommander.ps1')
        if(-not(Test-CommanderRuntime)){throw 'Startup returned without healthy local runtime'}
        $failures=0
        @{at=[datetime]::UtcNow.ToString('o');event='runtime-recovered'}|ConvertTo-Json -Compress|Add-Content $LogPath
      } catch {
        @{at=[datetime]::UtcNow.ToString('o');event='recovery-failed';error=$_.Exception.Message}|ConvertTo-Json -Compress|Add-Content $LogPath
      }
    }
    if(-not $Once){Start-Sleep -Seconds $PollSeconds}
  } while(-not $Once)
} finally {if($locked){$mutex.ReleaseMutex()};$mutex.Dispose()}
