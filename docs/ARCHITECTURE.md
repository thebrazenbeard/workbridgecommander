# WorkBridge Commander Architecture V1

Status: SOURCE DESIGN / REMOTE SERVICE NOT CLAIMED DEPLOYED

## Commander orchestration profile

The repository description establishes a baseline concurrency target of **at least 4 parallel execution lanes per device and at least 32 parallel upstream work contexts**. These are qualification defaults/floors, not hard product maxima.

These are separate layers:

- **Execution lanes (default 4 per device):** the scheduler admits up to the configured per-device workstation-effect capacity; 4 is the qualification floor/default, and operators may raise it. Each lane needs an explicit target device/session, operation identity, lifecycle state, and result/error channel. Concurrency does not imply shared shell state.
- **Upstream work contexts (default 32):** the scheduler admits up to the configured concurrent work-unit capacity; 32 is the qualification floor/default, and operators may raise it. Upstream work contexts may inspect, decompose, compare, or prepare work without automatically acquiring workstation execution authority.
- **Effect gate:** a upstream work context must bind to one of the four execution lanes before causing workstation effects. Queueing/scheduling must preserve target, ordering requirements, cancellation, and result provenance.
- **No authority multiplication:** raising scheduling capacity does not create new workstation permissions. Authority remains whatever the authenticated workstation payload and operator have granted.

The remote service/orchestrator owns lane scheduling. DesktopCommanderMCP remains the workstation MCP payload; WorkBridgeMCP remains its qualification/package authority. Lane orchestration must wrap calls without changing the underlying Desktop Commander tool schemas or semantics.

## Separation of concerns

WorkBridge Commander follows a two-repository product split analogous to DesktopCommanderMCP and Remote Desktop Commander.

### WorkBridgeMCP

Owns workstation-side implementation and qualification material. For Commander mode, current source material binds the exact upstream DesktopCommanderMCP payload and requires its material workstation semantics to remain intact.

### workbridgecommander

Owns the public remote plugin surface: MCP registry/plugin manifests, client-facing setup documentation, remote architecture contract, security/trust documentation, and provenance.

It must not silently become a second workstation implementation.

### VeraMesh

Is the intended secure transport/integration boundary. The Commander source currently contains and qualifies its own authenticated WebSocket device attachment, so VeraMesh transport consumption is not claimed unless an exact adapter/runtime route is separately verified. WorkBridge manifest/hash verification remains the payload identity boundary in the current Commander device agent.

### VeraRelay

May provide relay, discovery, fallback, or currentness functions. If selected, it is transparent with respect to the Desktop Commander MCP API: tool names, schemas, arguments and results are not semantically narrowed.

## Workstation semantics

The Commander path targets the Desktop Commander duplicate contract already carried by WorkBridgeMCP. Material capabilities include:

- arbitrary command strings via `start_process(command=...)`;
- interactive sessions via `read_process_output`, `interact_with_process`, `force_terminate`, and `list_sessions`;
- process inspection/control via `list_processes` and `kill_process`;
- filesystem read/write/multi-read/list/create/move/info/edit operations;
- progressive search;
- recent local tool-call history;
- document and configuration tools present in the pinned upstream subject.

These semantics are intentionally different from the bounded native WorkBridge Go server, whose process API uses configured executable grants.

## Integrity boundary

WorkBridgeMCP's duplicate contract requires exact-source pinning and verification of the packaged Node executable and DesktopCommanderMCP entrypoint. Integrity binding proves which payload is launched; it does not itself constrain the payload's workstation authority.

## Remote service boundary

This repository now contains a source-level service implementation for authenticated MCP ingress, device attachment, device selection, generation fencing, lifecycle handling, and effect routing. It does not claim a public deployment, production account/device lifecycle, or an active VeraMesh route merely from that source. The manifests therefore contain an unmistakable endpoint placeholder until a deployed service exists.

## Evidence ladder

Keep source, build/package, installation, selected route, runtime consumption, observed behavior, external attestation, independent review, and production deployment distinct. A repository manifest proves only repository source.
