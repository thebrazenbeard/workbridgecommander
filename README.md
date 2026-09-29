# WorkBridge Commander

**Remote workstation control for AI clients, built on the WorkBridge stack.**

WorkBridge Commander is the public plugin and connector surface for reaching a workstation through a remote MCP connection, with a product-level orchestration target of **4 parallel execution lanes and 32 parallel logic lanes**. It follows the same repository split used by Desktop Commander: the workstation implementation and packaging live in the implementation repository; this repository carries the remote-plugin manifests, architecture contract, setup guidance, security boundary, and provenance.

## Architecture

```text
AI client
   |
   | Streamable HTTP / MCP
   v
WorkBridge Commander remote endpoint
   |
   v
VeraMesh secure MCP tunnel
   |
   +-- optional VeraRelay routing/currentness layer
   |
   v
WorkBridge-qualified DesktopCommanderMCP payload
   |
   v
workstation
```

The Commander path intentionally preserves the DesktopCommanderMCP workstation tool semantics qualified by WorkBridgeMCP. It is not the bounded native WorkBridge Go tool surface.

WorkBridgeMCP owns the exact source pin, build/package procedure, integrity manifest, qualification cases, and workstation payload. VeraMesh owns authenticated remote transport. VeraRelay may participate in routing, but must not rename, filter, narrow, or reinterpret the workstation MCP tool surface.

## Parallel work model

WorkBridge Commander separates reasoning concurrency from workstation-effect concurrency. Up to 32 logic lanes can decompose and prepare work; no more than 4 execution lanes may concurrently carry workstation effects. Logic concurrency does not multiply authority: effect-bearing work must be admitted to an execution lane with its target and operation identity preserved.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the lane contract.

## Intended capabilities

The qualified Commander payload includes filesystem read/write/edit operations, progressive search, arbitrary command-string process launch, interactive process sessions, OS process inspection/control, local recent tool history, and upstream document/configuration tools present in the pinned DesktopCommanderMCP source.

Multiple-machine selection, account/device lifecycle, and the public remote endpoint are transport/product concerns and are not claimed implemented merely because these manifests exist.

## Repository role

This repository is deliberately thin. It does **not** fork DesktopCommanderMCP or duplicate WorkBridgeMCP's build logic. That avoids a second implementation lineage.

Source material:

- WorkBridgeMCP: implementation, qualification, packaging and exact-source ownership
- DesktopCommanderMCP: workstation behavior reference/payload
- Remote Desktop Commander: reference for the separate remote-plugin repository pattern

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/SETUP.md](docs/SETUP.md), [SECURITY.md](SECURITY.md), and [PROVENANCE.md](PROVENANCE.md).

## Current status

Repository/plugin implementation: **implemented and CI-verified on the feature branch**. The repository now contains the remote MCP ingress service, authenticated device bridge, WorkBridge manifest/hash verification, 4-execution/32-logic lane enforcement, runnable device agent, Docker packaging, and tests.

Production deployment, public endpoint assignment, workstation installation/activation, and live AI-to-workstation effects require separate runtime evidence. The service currently uses explicit bearer/device tokens; OAuth/device-code UX is not yet implemented. Placeholder endpoint values in manifests are intentionally explicit and must be replaced only when an actual service endpoint is deployed and verified.

## Run the implementation

Build and test:

```bash
npm install --ignore-scripts
npm test
```

Run the remote service after setting `WORKBRIDGE_CLIENT_TOKEN` and `WORKBRIDGE_DEVICE_TOKEN`:

```bash
npm run build
npm start
```

On a workstation that already has the WorkBridge-qualified DesktopCommander duplicate installed, set `WORKBRIDGE_SERVICE_URL`, `WORKBRIDGE_DEVICE_ID`, `WORKBRIDGE_DEVICE_TOKEN`, and optionally `WORKBRIDGE_INSTALL_ROOT`, then run:

```powershell
.\\scripts\\Start-WorkBridgeCommanderDevice.ps1 -ServiceUrl https://your-service.example -DeviceId lappy -DeviceToken <token>
```

The device agent verifies the packaged Node and DesktopCommander entrypoint SHA-256 values from `workbridge-desktop-commander.manifest.json` before launching it.
