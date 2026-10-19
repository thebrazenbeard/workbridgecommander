---
name: workbridge-commander-mcp
description: Operate or diagnose the connected Workbridge Commander MCP app. Use when Patrick selects this app, requests workstation commands through it, or asks to repair or verify its connection, stress behavior, or restart recovery.
---

# Workbridge Commander MCP

Use the connected Workbridge Commander MCP tools actually exposed in this session.
The app binding supplies the tools; this skill does not deploy a server or supply credentials.

## Execute the requested work

- Establish the intended workstation with a benign hostname/account command before changing it. An RDP session or browser location does not determine the app's target.
- Apply Patrick's existing authorization; do not repeatedly ask permission for the same repair or verification.
- Use another connector only when the task already authorizes that route. Preserve the target and disclose a material route change.
- Treat a timeout after dispatch as an unknown outcome. Read current state before retrying an effect.
- Verify command output and exit state. Read back file changes and confirm the intended runtime behavior.

## Diagnose connection failures

Keep these checks separate: tool availability, target identity, local MCP listener, authenticated device attachment, tunnel process/control-plane connection, and an actual command through this app.
A 429 or other connector error alone does not establish a quota limit or its cause.
Inspect the selected deployment's current configuration, process ownership, logs, and health before changing it.
A healthy local listener or tunnel readiness endpoint does not prove a remote command succeeded.
Preserve the existing App ID, tunnel identity, enrollment, trust anchors, and unrelated services during an authorized repair.
Do not rotate credentials or replace a trust anchor merely to suppress a startup failure.

## Verify stress and restart behavior

- Check unique response markers and host identity for every submitted request; report failed, timed-out, and unknown outcomes separately.
- Distinguish requests submitted concurrently from execution concurrency actually observed.
- Use disposable files for integrity tests and remove the test data.
- Distinguish an agent/service restart from a full computer reboot.
- For an authorized reboot test, capture boot time or boot ID before and after, verify automatic startup before manual intervention, then execute a command through this app.
- If manual repair was needed after boot, record the failed automatic-start test before repairing and retesting.
- Report the exact scope and remaining limits; a short test does not establish permanent reliability.
