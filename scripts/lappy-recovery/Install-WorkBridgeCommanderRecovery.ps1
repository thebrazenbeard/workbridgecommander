param(
 [string]$Root='D:\VERA\tools\WorkBridgeCommander',
 [string]$InstallRoot='C:\ProgramData\WorkBridgeMCP\DesktopCommanderMCP',
 [switch]$Install
)
$ErrorActionPreference='Stop'
$launcher=Join-Path $Root 'Start-WorkBridgeCommander.ps1'
$supervisorSource=Join-Path $PSScriptRoot 'Watch-WorkBridgeCommander.ps1'
$supervisorTarget=Join-Path $Root 'Watch-WorkBridgeCommander.ps1'
$backup=Join-Path $Root ('backups\recovery-'+[datetime]::UtcNow.ToString('yyyyMMdd-HHmmss'))
$raw=[IO.File]::ReadAllText($launcher)
$needle='$server = Start-Process -FilePath $node'
if(-not $raw.Contains('function Write-PartialRuntimeState')) {
 $function=@'
function Write-PartialRuntimeState([int]$ServerPid,[int]$DevicePid,[int]$TunnelPid) {
  [pscustomobject]@{
    schema='WORKBRIDGE_COMMANDER_STARTING_V1'
    server_pid=$ServerPid;device_pid=$DevicePid;tunnel_pid=$TunnelPid
    started_utc=[datetime]::UtcNow.ToString('o')
  } | ConvertTo-Json | Set-Content -LiteralPath $StatePath -Encoding UTF8
}

'@
 $raw=$raw.Replace('function Stop-PriorRuntime {',$function+'function Stop-PriorRuntime {')
 $lines=$raw -split "\r?\n"
 $new=foreach($line in $lines) {
  $line
  if($line.StartsWith('$server = Start-Process ')){'Write-PartialRuntimeState $server.Id 0 0'}
  if($line.StartsWith('$device = Start-Process ')){'Write-PartialRuntimeState $server.Id $device.Id 0'}
  if($line.StartsWith('$tunnel = Start-Process ')){'Write-PartialRuntimeState $server.Id $device.Id $tunnel.Id'}
 }
 $raw=$new -join [Environment]::NewLine
 $raw=$raw.Replace('} 120 "WorkBridge Commander device agent did not attach"','} 240 "WorkBridge Commander device agent did not attach"')
}
$errors=$null;$tokens=$null
[Management.Automation.Language.Parser]::ParseInput($raw,[ref]$tokens,[ref]$errors)|Out-Null
if($errors.Count){throw ($errors|Out-String)}
if(-not $Install){'INSTALLER_DRY_RUN_PARSE_PASS';return}
New-Item -ItemType Directory -Force $backup|Out-Null
Copy-Item $launcher (Join-Path $backup 'Start-WorkBridgeCommander.before.ps1')
[IO.File]::WriteAllText($launcher,$raw,(New-Object Text.UTF8Encoding($false)))
Copy-Item $supervisorSource $supervisorTarget -Force
$package=Join-Path $InstallRoot 'package.json'
$beforeHash=(Get-FileHash $package -Algorithm SHA256).Hash
$acl=Get-Acl $package
$acl.Sddl|Set-Content (Join-Path $backup 'package-json.before.sddl')
$user=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$rule=New-Object Security.AccessControl.FileSystemAccessRule($user,'ReadAndExecute','Allow')
$acl.AddAccessRule($rule)
Set-Acl $package $acl
if((Get-FileHash $package -Algorithm SHA256).Hash -ne $beforeHash){throw 'Payload package content changed'}
$action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+$supervisorTarget+'"')
$trigger=New-ScheduledTaskTrigger -AtLogOn -User $user
$principal=New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Highest
$settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries
Register-ScheduledTask -TaskName 'WorkBridge Commander Recovery' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Start and supervise Workbridge Commander at user sign-in; recover failed local runtime.' -Force | Out-Null
Start-ScheduledTask -TaskName 'WorkBridge Commander Recovery'
[pscustomobject]@{installed=$true;task='WorkBridge Commander Recovery';startup='user-logon';backup=$backup;payload_content_preserved=$true}|ConvertTo-Json
