# ChatGPT connection boundary

Observed 2026-09-29.

WorkBridge Commander is a remote MCP server surface. ChatGPT custom MCP apps are configured with a remote MCP endpoint and an authentication mechanism. Local MCP servers are not connected directly; OpenAI documents Secure MCP Tunnel as the path for private/on-premises/developer-machine servers.

This repository therefore keeps two deployment shapes separate:

1. Public/managed ingress: deploy the WorkBridge Commander service behind TLS, configure the resulting `/mcp` endpoint in ChatGPT, and connect workstation device agents outbound to the service.
2. Private ingress: keep the service private and use a supported Secure MCP Tunnel rather than exposing the workstation directly.

The repository's static bearer token is a service authentication primitive, not an assertion that a particular ChatGPT workspace has been configured to use it. OAuth/device pairing remains a separate deployment concern when the chosen ChatGPT app configuration requires user authorization.

## Verification before ChatGPT activation

A deployment is not ready merely because source CI is green. Verify the deployed endpoint with a real MCP client, verify tool discovery, verify authentication, verify a connected WorkBridge-qualified device, then test the draft app in ChatGPT before publishing it.

Source CI uses the official MCP TypeScript client against the ingress/device boundary. Windows qualification additionally builds the exact pinned DesktopCommander payload and sends MCP initialize/tools-list through the bridge.

No repository file proves deployment, tunnel activation, workspace publication, or live workstation effects.

## Plugin authentication boundary

The plugin package must not embed `WORKBRIDGE_CLIENT_TOKEN` or any other bearer secret. The current Commander service's static bearer token is suitable for source qualification and controlled service-to-service testing, but it is not a distributable ChatGPT plugin credential.

For a live ChatGPT connection, use one of two reviewed shapes:

1. a supported private MCP tunnel from ChatGPT to a private Commander service; or
2. a remote HTTPS Commander endpoint with a ChatGPT-supported authentication mechanism such as OAuth.

The repository must keep the MCP URL placeholder until one of those routes is actually deployed and verified. Replacing the placeholder is an activation effect, not a documentation edit.


## Private WorkBridge Commander profile

The preferred private-development path is:

`ChatGPT developer-mode app -> OpenAI Secure MCP Tunnel -> tunnel-client on Lappy -> http://127.0.0.1:8787/mcp -> WorkBridge Commander -> qualified DesktopCommander payload`.

The checked-in example profile is `deploy/tunnel-client.workbridge.example.yaml`. It deliberately references secrets through environment variables:

- `OPENAI_MCP_TUNNEL_ID`
- `OPENAI_TUNNEL_RUNTIME_API_KEY`
- `WORKBRIDGE_CLIENT_TOKEN`

`scripts/Start-WorkBridgeCommanderTunnel.ps1` derives the local `Authorization: Bearer ...` value at runtime and runs `tunnel-client doctor` before `run`. The bearer value is injected only on the tunnel-client-to-Commander loopback hop and is not stored in the plugin package.

The plugin package remains unbound until the ChatGPT app is created against the actual tunnel. That app identity is then a runtime/deployment binding; it must not be invented in repository source.
