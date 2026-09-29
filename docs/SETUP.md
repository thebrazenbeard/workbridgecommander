# Setup

Status: PRE-DEPLOYMENT PLUGIN DOCUMENTATION

WorkBridge Commander is designed to be connected by MCP clients over Streamable HTTP. The current source implementation reaches a WorkBridge-qualified workstation payload through its authenticated device attachment bridge; VeraMesh remains the intended secure transport/integration boundary where an exact adapter is separately verified.

## Before client connection

A usable deployment needs all of the following:

1. a WorkBridgeMCP-qualified DesktopCommanderMCP package on the target workstation;
2. an authenticated Commander device-attachment route to the exact packaged payload (and, when used, a separately verified VeraMesh transport adapter);
3. a deployed WorkBridge Commander remote endpoint;
4. authentication and device/account binding for that endpoint;
5. a verified route from the endpoint to the intended workstation, with any claimed VeraMesh segment verified rather than inferred.

Do not substitute the native bounded WorkBridge Go server if the intended product is Commander parity; the two surfaces deliberately have different process semantics.

## Client manifest

After a real endpoint exists, replace the placeholder URL in `.mcp.json` and `server.json` with the verified Streamable HTTP MCP endpoint.

Example shape:

```json
{
  "mcpServers": {
    "workbridge-commander": {
      "type": "http",
      "url": "https://your-service.example/mcp"
    }
  }
}
```

The example is a shape, not a deployed URL.

## Verification

Before describing a client as connected, verify the remote MCP initialize handshake and `tools/list`. Before describing workstation control as working, execute a bounded probe against the intended paired workstation and verify the resulting local effect independently.

The WorkBridgeMCP duplicate acceptance suite is the source-level baseline for the workstation payload and includes exact pin/build, tools-list, command-string execution, interactive-process tools, filesystem/search/process-control/history presence, integrity binding, and relay transparency.

## Transport hardening

Use HTTPS for every non-loopback service URL. Plain HTTP is accepted by the device agent only for loopback development. Set `WORKBRIDGE_ALLOWED_ORIGINS` to a comma-separated exact allowlist when browser-origin traffic is expected; absent Origin headers remain valid for non-browser MCP clients. WebSocket messages are capped at 2 MB.
