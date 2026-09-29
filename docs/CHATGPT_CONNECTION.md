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
