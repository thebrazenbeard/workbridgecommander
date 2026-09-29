# WorkBridge Commander ChatGPT Plugin

The plugin name is **WorkBridge Commander**. The package version is ordinary semantic versioning; it is not a product-generation label such as V1/V2/V3.

## Package state

The portable Agent Plugins package consists of:

- `plugin.json` — Agent Plugins v1 identity and OpenAI interface metadata.
- `mcp.json` — portable MCP configuration. It remains empty until a stable public HTTPS MCP endpoint exists.
- `.codex-plugin/plugin.json` — Codex-facing metadata.
- `skills/workbridge-commander/SKILL.md` — operating and evidence rules.

A private ChatGPT plugin can also depend on a ChatGPT app through client-specific app metadata. That dependency must use the actual app identity returned by ChatGPT; repository source must not invent one.

## Preferred private connection

For Lappy, use OpenAI Secure MCP Tunnel rather than publishing Commander to the public internet:

`ChatGPT app -> Secure MCP Tunnel -> tunnel-client on Lappy -> http://127.0.0.1:8787/mcp -> WorkBridge Commander -> qualified DesktopCommander payload`

The checked-in tunnel profile keeps the Commander bearer credential on the final local HTTP hop using an environment-backed Authorization header. The plugin package contains no credential.

## Binding sequence

1. Run Commander on Lappy with `HOST=127.0.0.1`, a client token, a device token, and the independently trusted WorkBridge manifest SHA-256.
2. Run the Commander device agent against that loopback service and verify `/health` reports the intended device.
3. Create or select an OpenAI Secure MCP Tunnel and run `tunnel-client` with `deploy/tunnel-client.workbridge.example.yaml`.
4. Run `tunnel-client doctor`; do not proceed if the local MCP probe fails.
5. In ChatGPT, create the developer-mode app using **Tunnel** as the connection and select that tunnel.
6. Scan tools and verify the expected DesktopCommander tool surface.
7. Bind the resulting ChatGPT app identity into the private WorkBridge Commander plugin.
8. Test a bounded read, then a bounded reversible write/process effect, verifying the local result independently.

Steps 1, 3, 5, and 7 are activation/credential/application-binding effects. Source code and CI do not prove they have occurred.

## Public connection alternative

A stable public HTTPS endpoint can instead be placed in `mcp.json`, but it must use a ChatGPT-supported authentication flow. Never embed `WORKBRIDGE_CLIENT_TOKEN`, an OAuth token, an API key, or another secret in the plugin package.
