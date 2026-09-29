# WorkBridge Commander Architecture V1

Status: SOURCE DESIGN / REMOTE SERVICE NOT CLAIMED DEPLOYED

## Commander orchestration profile

The repository description establishes the product-level concurrency target: **4 parallel execution lanes and 32 parallel logic lanes**.

These are separate layers:

- **Execution lanes (4):** at most four concurrently active workstation-effect lanes. Each lane needs an explicit target device/session, operation identity, lifecycle state, and result/error channel. Concurrency does not imply shared shell state.
- **Logic lanes (32):** up to 32 concurrent planning/reasoning/work-unit lanes above the effect boundary. Logic lanes may inspect, decompose, compare, or prepare work without automatically acquiring workstation execution authority.
- **Effect gate:** a logic lane must bind to one of the four execution lanes before causing workstation effects. Queueing/scheduling must preserve target, ordering requirements, cancellation, and result provenance.
- **No authority multiplication:** 32-way reasoning does not create 32-way workstation authority. The execution ceiling remains four unless the product contract is deliberately revised.

The remote service/orchestrator owns lane scheduling. DesktopCommanderMCP remains the workstation MCP payload; WorkBridgeMCP remains its qualification/package authority. Lane orchestration must wrap calls without changing the underlying Desktop Commander tool schemas or semantics.

## Separation of concerns

WorkBridge Commander follows a two-repository product split analogous to DesktopCommanderMCP and Remote Desktop Commander.

### WorkBridgeMCP

Owns workstation-side implementation and qualification material. For Commander mode, current source material binds the exact upstream DesktopCommanderMCP payload and requires its material workstation semantics to remain intact.

### workbridgecommander

Owns the public remote plugin surface: MCP registry/plugin manifests, client-facing setup documentation, remote architecture contract, security/trust documentation, and provenance.

It must not silently become a second workstation implementation.

### VeraMesh

Owns the secure MCP tunnel between the remote-facing service and the workstation payload. It is responsible for authenticating/binding the packaged runtime and exact Desktop Commander entrypoint before launch.

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

A complete remote product still requires a service layer for authenticated MCP ingress, device/account association, tunnel session establishment, device selection, lifecycle/revocation, and routing to VeraMesh.

This repository does not invent an endpoint or claim those pieces deployed. The manifests therefore contain an unmistakable endpoint placeholder until a deployed service exists.

## Evidence ladder

Keep source, build/package, installation, selected route, runtime consumption, observed behavior, external attestation, independent review, and production deployment distinct. A repository manifest proves only repository source.
