# WorkBridge Commander — Chat Continuation 2026-09-29

Repository: `thebrazenbeard/workbridgecommander`
Canonical branch: `main`
Observed main head at handoff: `e189de040092a36830b5984f1d31f1baaf8cf8bb`

Active repair branch: `feat/workbridge-commander-chatgpt-plugin`
Observed exact branch head before this continuation commit: `259ab629370fed1570fb5dcb4d965e883683b65b`
Head message: `ops: persist exact Lappy WorkBridge Commander bootstrap`
Draft PR #3: `Fix tunnel MCP session boundary`
PR #3 is open/draft and MUST NOT be merged without Patrick's explicit authority.
Push + PR CI at `259ab629...` are green.

## Identity
Product/plugin name: **WorkBridge Commander**. Do not call it V1/V2/V3.
Private plugin ID: `plugins_6abc032f339081918b470a486dd02553`
Last private package revision: `0.1.2`
The plugin skill loads, but the live tunnel-backed ChatGPT app is not yet bound into the plugin.

## Secure MCP Tunnel
Tunnel ID: `tunnel_6abc08e792448191bb33223bdba84c4d`
Observed tunnel name: `Workbridge Commander`
Observed description: `Workbridge Commander MCP`
Runtime API key is secret, entered locally on Lappy, and must never be pasted into chat or committed.

## Lappy WorkBridge payload
Installed exact payload:
`C:\ProgramData\WorkBridgeMCP\DesktopCommanderMCP`

Manifest:
`C:\ProgramData\WorkBridgeMCP\DesktopCommanderMCP\workbridge-desktop-commander.manifest.json`

Trusted manifest SHA-256:
`0e2e80ae5acd26c04e0adb5ac21b453edbe5b7004505998d2692b7b948ae1e2f`

Pinned upstream:
- `wonderwhy-er/DesktopCommanderMCP`
- commit `550a0b3e31da18b7cf25e87ed840e3d953b6da42`
- version `0.2.51`

Lappy bootstrap:
`D:\VERA\tools\WorkBridgeCommander\Start-WorkBridgeCommander.ps1`
The exact bootstrap source is persisted on the active repair branch.

## Qualification
Session-boundary implementation at `1692c54595ee2974c48719ad5e7de528089a70ff` passed Linux and Windows build/tests/audit, exact pinned DesktopCommander qualification, 26 tools, and the real 8-call concurrency probe with `maxActive=8`.
The later branch head `259ab629...` is also green.

## Live tunnel history
First generated bootstrap failed on Windows PowerShell because static `RandomNumberGenerator.Fill()` was unavailable. Fixed to `RandomNumberGenerator.Create().GetBytes()` plus PowerShell-compatible hex formatting.

Next run authenticated tunnel-client and started Commander/device, but MCP startup probe timed out with startup `target_count=0`. This exposed a real architecture bug: upstream MCP clients were forwarding their `initialize` into one long-lived downstream DesktopCommander stdio session.

Repair implemented:
- device agent initializes exact DesktopCommander exactly once before attachment;
- device hello carries downstream initialize metadata;
- Commander terminates upstream `initialize`, `notifications/initialized`, and `ping` locally;
- upstream clients no longer reinitialize DesktopCommander;
- integration regression connects two separate official MCP clients against one ready downstream device session.

Latest live bootstrap run with repaired source:
- checked out `1692c545...`;
- build succeeded;
- `tunnel-client doctor` passed;
- local MCP target reachable;
- MCP session DID initialize successfully;
- bootstrap then failed only on a SECOND readiness gate that expected non-empty Harpoon `target_count`.

Latest error:
`tunnel-client initialized MCP but did not publish a non-empty tool target catalog.`

Working hypothesis: bootstrap verification bug, not an MCP failure. `target_count` is likely not the correct readiness signal for the main MCP channel in tunnel-client v0.0.15.

## Immediate next work
1. Fresh-read repo main, active branch, PR #3, and exact CI.
2. Use **Lappy Desktop Commander V2**, not the broken legacy wrapper.
3. Read current:
   - `D:\VERA\tools\WorkBridgeCommander\logs\tunnel-client.err.log`
   - `runtime-state.json` if present
   - current bootstrap script.
4. Inspect `openai/tunnel-client` v0.0.15 source for the correct post-initialize/tool-discovery readiness signal.
5. Patch the false `target_count` gate.
6. Do not ask Patrick to rerun until the bootstrap is corrected and read back.
7. Rerun bootstrap once.
8. Verify Commander health, one device, local tools/list = exact tool surface, tunnel MCP initialized, and main channel usable.
9. Create/select the ChatGPT developer-mode app using Connection = Tunnel and tunnel ID.
10. Copy the resulting app technical ID (normally `asdk_app_...`) and bind it into WorkBridge Commander via `.app.json`.
11. Test a bounded read-only call through WorkBridge Commander itself before claiming live functionality.

## ChatGPT / API tunnel binding
Official ChatGPT flow: Plugins -> + -> developer-mode app -> Connection = Tunnel -> select or paste:
`tunnel_6abc08e792448191bb33223bdba84c4d`

For a **Responses API MCP tool JSON** field, use:
```json
{
  "type": "mcp",
  "server_label": "workbridge_commander",
  "tunnel_id": "tunnel_6abc08e792448191bb33223bdba84c4d"
}
```

Do not use the OpenAI-hosted tunnel endpoint as `server_url` for a tunnel-backed Responses API call.

## Protected effects
Patrick remains sole authority for merging/direct-main mutation, credential/permission/trust changes, destructive changes, paid compute, and other protected effects. Do not merge PR #3 without explicit authority.

## Interaction behavior
Continue working through ordinary source/runtime fixes instead of stopping at CI or narrating status. Do not substitute Remote Desktop Commander, Lappy legacy, or VeraPort for final WorkBridge Commander validation.
