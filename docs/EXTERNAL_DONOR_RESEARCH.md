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


### windmill-labs/windmill

Observed head: `cf5c49c3dca2201f739fb872d68bcd6c0c7665f7`. Repository metadata does not assert a standard SPDX license, so direct code reuse is not admitted without license verification.

Useful patterns:
- explicit concurrency limits stored with executable/workflow definitions;
- concurrency keys that serialize only work sharing a resource identity;
- worker grouping/versioning and queue priority;
- resume/cancel state modeled separately from completion;
- observability for concurrency pressure rather than treating queueing as invisible.

Adopt the resource-keyed concurrency concept: WorkBridge should eventually support an optional concurrency key above raw device capacity so callers can prevent overlapping effects against the same shell/session/file/resource without globally reducing device parallelism.

### rocketride-org/rocketride-server

Observed head: `5a21c9c784ebee8f09cff59cb4acfcf5dbe77465`. MIT.

Useful patterns:
- scheduler identity is a tuple of resource owners, not a display label;
- re-read authoritative deployment state at fire time so stale queued work does not override disable/pause/change;
- reserve an overlap slot before asynchronous dispatch to close check-then-act races;
- explicit placeholder state during dispatch startup;
- manual and scheduled paths share the same overlap guard;
- failed start releases only the placeholder, not a later valid run token.

Adopt the authority-reconciliation and reservation pattern for WorkBridge effect admission. A queued request must be revalidated against the currently connected device generation before dispatch; a "device ID existed when queued" observation is not sufficient authority.

### argoproj/argo-workflows

Observed head: `dadd69141c570fa678f7d51ee6decfe3fa77f109`. Apache-2.0.

Useful patterns:
- layered parallelism limits (global, namespace/resource scope, task/workflow scope);
- priority-aware queueing;
- semaphores/mutexes in addition to raw parallelism;
- retry policy distinguishes failure, error, and transient error;
- exponential backoff has explicit limit/factor/max duration.

Adopt the layered-capacity vocabulary, not Kubernetes machinery. WorkBridge needs separate service logic capacity, device effect capacity, and optional resource-key concurrency. Retry must remain effect-safe: transport/errors may be retryable only when effect disposition is known, never simply because a request failed to return.


## 2026-09-29 instrumentation and acquisition triage

### microsoft/Qcodes

Observed head: `ea03eb25055e6ca7ca0610294f9fc56324e13b19`. MIT.

Useful pattern: connected instruments carry stable identity, parameters and snapshot/metadata rather than being represented only by a transport handle. WorkBridge applies this narrowly as a generation-bound device attachment descriptor. Qcodes is not a runtime dependency.

### bluesky/bluesky

Observed head: `8721c829d4a96054c89e6e4b98e4e11dc59b9782`. BSD-3-Clause.

Highest-value donor in this batch. Its RunEngine separates pause/suspend/resume/stop/abort/halt and treats checkpoints/replayability as explicit execution semantics. WorkBridge adopts the underlying rule: transport loss after effect dispatch is `OUTCOME_UNKNOWN`, not an ordinary retryable failure; replay safety must be explicit.

### PyMoDAQ/PyMoDAQ and intake/intake

Observed PyMoDAQ head: `22ddc34bf02a33d33776456f47c0f5a8e77694a0` (MIT). Observed Intake head: `68a6d127f290df1e60c0c0c7c194bc507ec36b1e` (BSD-2-Clause).

Both reinforce separation of device/source discovery metadata from acquisition/execution implementation. WorkBridge keeps its device registry descriptive and generation-bound rather than turning registry records into a workflow engine.

### BerriAI/litellm

Observed head: `b0e62571e4b8f3414883faca22bc1a19e23d09b0` (MIT).

Its routing, health, cooldown and fallback machinery is useful mainly as a negative boundary. Workstations are not interchangeable model providers: Commander must not silently fail over an effect from one machine to another unless an operation explicitly establishes that substitution as safe.

### LeechCore, WinPmem, LiME, and Scada-LTS

Observed heads respectively: `824e88a7dfed4a8f1c37c2e83fdf98f89470d12a`, `e7c80927f52a6b86338f7453c2139c10a9384f5a`, `48a925fc4191d36e9f9a91d60e5ebd5d87a3614c`, and `cfca7d9a7c8b151a9b542d282e8b914a356aaf42`.

These are not direct Commander implementation donors. Memory acquisition/forensics reinforce provenance and exact target identity; SCADA reinforces explicit device status and control-state visibility. Their domain machinery does not belong in Commander. No source from these projects is imported.

## Triage conclusion

The donor set narrows Commander rather than expanding it. The surviving concepts are generation-bound device identity, explicit effect disposition, replay safety, layered capacity/backpressure, structured evidence, and end-to-end qualification. General DAG execution, agent memory, model-provider fallback, SCADA abstractions, and acquisition-framework machinery remain outside the Commander core.
