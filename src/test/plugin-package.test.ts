import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("plugin package is WorkBridge Commander and binds one streamable-http MCP endpoint", async () => {
  const plugin = JSON.parse(await readFile("plugin.json", "utf8"));
  const dotMcp = JSON.parse(await readFile(".mcp.json", "utf8"));
  const portableMcp = JSON.parse(await readFile("mcp.json", "utf8"));
  const codex = JSON.parse(await readFile(".codex-plugin/plugin.json", "utf8"));

  assert.equal(plugin.name, "workbridge-commander");
  assert.equal(plugin.version, "0.1.0");
  assert.equal(plugin.extensions?.["com.openai"]?.interface?.displayName, "WorkBridge Commander");
  assert.equal(plugin.mcpServers, "./.mcp.json");
  assert.equal(codex.name, "workbridge-commander");
  assert.equal(codex.interface?.displayName, "WorkBridge Commander");
  assert.deepEqual(dotMcp, portableMcp);

  const servers = Object.values(dotMcp.mcpServers ?? {}) as Array<{ type?: string; url?: string }>;
  assert.equal(servers.length, 1);
  assert.equal(servers[0]?.type, "streamable-http");
  assert.match(servers[0]?.url ?? "", /^https:\/\//);
  assert.equal((servers[0]?.url ?? "").includes("V3"), false);
});
