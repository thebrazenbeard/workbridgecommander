import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("plugin package is the initial WorkBridge Commander plugin and is intentionally unbound", async () => {
  const plugin = JSON.parse(await readFile("plugin.json", "utf8"));
  const mcp = JSON.parse(await readFile("mcp.json", "utf8"));
  const codex = JSON.parse(await readFile(".codex-plugin/plugin.json", "utf8"));

  assert.equal(plugin.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
  assert.equal(plugin.name, "workbridge-commander");
  assert.equal(plugin.version, "0.1.0");
  assert.equal(plugin.extensions?.["com.openai"]?.interface?.displayName, "WorkBridge Commander");
  assert.equal("mcpServers" in plugin, false);

  assert.equal(mcp.$schema, "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json");
  assert.deepEqual(mcp.mcpServers, {});

  assert.equal(codex.name, "workbridge-commander");
  assert.equal(codex.interface?.displayName, "WorkBridge Commander");
  assert.equal("mcpServers" in codex, false);
  assert.equal(JSON.stringify({ plugin, mcp, codex }).includes("V3"), false);
});
