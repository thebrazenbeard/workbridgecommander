# External donor research

Status: research record, not runtime dependency.

WorkBridge Commander should reuse proven protocol ideas without turning unrelated repositories into runtime dependencies.

## KaolaBrother/kaola-project-runner

Observed 2026-09-29. Its runner design strongly separates orchestrator decisions from mechanical transport. Useful patterns include explicit session identity, per-session connection holders, structured event receipts, cancellation confirmation, pending-permission tracking, mutation state that becomes unknown after holder loss, and refusal to infer successful completion from process disappearance.

Adopt as design principles where they fit. Do not import its ACP-specific platform machinery into the MCP device bridge.

## sparfenyuk/mcp-proxy

MIT licensed. Mature transport proxy with Streamable HTTP/SSE/stdio conversion, stateful/stateless modes, named servers, origin controls and OAuth client support.

Use as protocol-behavior reference. WorkBridge Commander still needs a remote workstation attachment rather than spawning the workstation MCP server beside the HTTP ingress, so it cannot simply be substituted unchanged.

## imajeure/mcp-stdio-bridge

Apache-2.0 licensed. Particularly useful acceptance-test donor: its tests use a real MCP SDK client to initialize over HTTP, list tools, call a tool, kill the child, verify readiness recovery, and test origin rejection before authentication.

Adopt the testing strategy. Do not claim its local child-supervisor model proves remote WorkBridge device behavior.

## Design consequences

1. 4 execution and 32 logic lanes are qualification floors/default capacities, not ceilings.
2. Runtime capacity is configurable and must expose whether the current configuration meets qualification floors.
3. Logic lanes are independently identified orchestration contexts, not HTTP concurrency counters.
4. Workstation effects remain separately capacity-controlled per device.
5. MCP compatibility must ultimately be verified by a real MCP SDK client, not by hand-shaped JSON alone.
6. Origin validation, cancellation, session lifecycle, reconnect disposition and readiness belong in acceptance evidence.
7. Donor repositories are evidence/design inputs only unless an exact dependency is deliberately admitted and licensed.


## 2026-09-29 donor expansion

### conductor-oss/conductor

Observed head: `f421832ed2b965720ada6efb74416fc6bd79d3fb`. Apache-2.0.

Highest-value donor for the orchestration layer. Useful patterns:
- durable execution identity distinct from transport connection identity;
- parent/child workflow linkage;
- explicit execution completion rather than inferring completion from transport/process disappearance;
- monotonic event IDs;
- bounded event replay on reconnect;
- heartbeat/liveness;
- resumable subscribers using a last-seen event ID;
- buffering under the same synchronization boundary used for subscriber registration, avoiding replay/subscribe gaps.

Adopt as orchestration/event semantics. Do not import the Java/Spring/Conductor runtime as a dependency merely to obtain these semantics.

### MemoriLabs/Memori

Observed head: `574b1ea3e876f100ef82c37817d603eb7e258e59`. Repository metadata does not assert a standard SPDX license, so code reuse is not admitted without separate license verification.

Useful patterns:
- session identity as persistent state rather than an HTTP request;
- agent execution/conversation converted into structured state;
- explicit retrieval and runtime-state layers;
- durable memory/session abstraction that can outlive a single transport connection.

Adopt only as design inspiration until licensing is resolved. WorkBridge logic contexts should be persistable/resumable without pretending transport requests are "logic lanes".

### raga-ai-hub/RagaAI-Catalyst

Observed head: `ab67893310891140211280a496402003e52cdab5`. Apache-2.0.

Useful patterns are observability-oriented:
- agent/tool/LLM/user-interaction tracing;
- execution graphs and timeline-oriented traces;
- explicit trace data structures and exporters;
- evaluation attached to recorded execution rather than ad-hoc logging.

Adopt as evidence-model inspiration: WorkBridge executions should emit structured lifecycle events that can later feed tracing/evaluation. Do not couple the commander runtime to RagaAI.

### phuryn/pm-skills

Observed head: `8607e3b077817f89bf4a9b623246219734ac3be0`. MIT.

Most useful as review methodology:
- compare documented intent to actual enforcement points;
- review agreements across boundaries, not files in isolation;
- force concurrency/reordering/failure executions;
- explicitly test authority reconciliation and identity/correlation;
- require an observable consequence and attempt refutation before calling something a defect.

Adopt this as qualification/review discipline. It is not a runtime dependency.

## Resulting WorkBridge requirements

1. Logic work must have durable execution IDs independent of HTTP/WebSocket connection IDs.
2. Event records need monotonic per-execution sequence numbers.
3. Reconnect/resume must use explicit last-seen sequence state; never silently replay workstation effects.
4. Parent/child logic contexts must preserve lineage.
5. Completion must be an explicit state transition; connection loss means UNKNOWN for in-flight effects unless separately reconciled.
6. Event buffering/replay and new subscription registration must not have a gap that can lose events.
7. Structured execution events should be suitable for later observability/evaluation export without requiring an observability vendor at runtime.
8. Qualification reviews must compare the architecture contract to concrete enforcement code and exercise overlap, reordering, disconnect, replacement, and stale-identity cases.
