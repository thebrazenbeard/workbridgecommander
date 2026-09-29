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
