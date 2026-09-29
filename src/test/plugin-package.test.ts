import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("plugin package is the initial WorkBridge Commander plugin and is intentionally unbound", async () => {
  const plugin = JSON.parse(await readFile("plugin.json", "utf8"));
  const mcp = JSON.parse(await readFile("mcp.json", "utf8"));
  const codex = JSON.parse(await readFile(".codex-plugin/plugin.json", "utf8"));

  assert.equal(plugin.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
  assert.equal(plugin.name, "workbridge-commander");
  assert.equal(plugin.version, "0.1.1");
  assert.equal(plugin.extensions?.["com.openai"]?.interface?.displayName, "WorkBridge Commander");
  assert.equal("mcpServers" in plugin, false);

  assert.equal(mcp.$schema, "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json");
  assert.deepEqual(mcp.mcpServers, {});

  assert.equal(codex.name, "workbridge-commander");
  assert.equal(codex.interface?.displayName, "WorkBridge Commander");
  assert.equal("mcpServers" in codex, false);
  assert.equal(JSON.stringify({ plugin, mcp, codex }).includes("V3"), false);
});

test("Secure MCP Tunnel profile keeps Commander private and secrets external", async () => {
  const profile = await readFile("deploy/tunnel-client.workbridge.example.yaml", "utf8");
  const launcher = await readFile("scripts/Start-WorkBridgeCommanderTunnel.ps1", "utf8");

  assert.match(profile, /url: http:\/\/127\.0\.0\.1:8787\/mcp/);
  assert.match(profile, /Authorization: env:WORKBRIDGE_TUNNEL_AUTHORIZATION/);
  assert.match(profile, /tunnel_id: env:OPENAI_MCP_TUNNEL_ID/);
  assert.match(profile, /api_key: env:OPENAI_TUNNEL_RUNTIME_API_KEY/);
  assert.equal(profile.includes("sk-"), false);
  assert.equal(profile.includes("Bearer "), false);

  assert.match(launcher, /CONTROL_PLANE_TUNNEL_ID/);\n  assert.match(launcher, /CONTROL_PLANE_API_KEY/);\n  assert.match(launcher, /MCP_EXTRA_HEADERS/);\n  assert.match(launcher, /Authorization: Bearer/);
  assert.match(launcher, /doctor --profile-file/);
  assert.match(launcher, /run --profile-file/);
});
