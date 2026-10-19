# Lappy Commander recovery

The recovery scripts supervise an existing Windows Commander deployment. They do
not provision an App ID, tunnel, credential, or trusted Desktop Commander payload.

First preview the patch against the deployed launcher:

~~~powershell
.\scripts\lappy-recovery\Install-WorkBridgeCommanderRecovery.ps1 -Root D:\VERA\tools\WorkBridgeCommander
~~~

Then apply it with -Install under the account that runs that deployment. The
default payload root is C:\ProgramData\WorkBridgeMCP\DesktopCommanderMCP; pass
-InstallRoot if yours differs. The installer rejects unexpected launcher
structure before writing files or task settings. It backs up the launcher and
the payload package.json ACL, adds partial process-ownership records after each
spawn, and grants the current user ReadAndExecute on that exact metadata file.
It verifies that file's content hash remains unchanged.

The WorkBridge Commander Recovery task runs with the current user's highest
available token at sign-in, without a duration cutoff, with three restart
attempts. Its action passes the selected deployment root to the supervisor.
This is sign-in startup; it is not a pre-login system service.

The supervisor polls every ten seconds. Two unhealthy probes can trigger the
existing launcher, with at least ninety seconds between attempts. It checks the
recorded process command lines, one attached lappy device on localhost:8787, and
tunnel readiness. Recovery outcomes are appended to logs/supervisor.jsonl.
Use -ProbeOnly to inspect local readiness without restarting anything.
Local readiness does not verify a command through the remote app.

The device agent also sends WebSocket pings every fifteen seconds and terminates
an unresponsive connection at the following interval, allowing its existing
reconnect logic to run.

npm test covers responsive/silent real WebSocket peers and a Windows installer
dry run that leaves runtime files unchanged and rejects an unexpected launcher.
CI parses nested PowerShell scripts. Tests of the source tree and an installed
runtime are distinct: verify an actual app command after a service restart,
tunnel recovery, or OS reboot, and record which kind of restart was performed.
