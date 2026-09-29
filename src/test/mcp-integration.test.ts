import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import WebSocket from "ws";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

test("official MCP client initializes and lists tools through a remote device", { timeout: 30_000 }, async () => {
  const port = 18787 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ["dist/server.js"], {
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", WORKBRIDGE_CLIENT_TOKEN: "client-test", WORKBRIDGE_DEVICE_TOKEN: "device-test", WORKBRIDGE_DEFAULT_DEVICE: "fake" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server start timeout")), 8000);
    child.stdout.on("data", chunk => { if (chunk.toString().includes('"status":"listening"')) { clearTimeout(timer); resolve(); } });
    child.once("exit", code => reject(new Error("server exited early: " + code)));
  });

  const ws = new WebSocket(`ws://127.0.0.1:${port}/device`);
  await new Promise<void>((resolve, reject) => {
    ws.once("open", () => ws.send(JSON.stringify({ type: "hello", deviceId: "fake", token: "device-test" })));
    ws.on("message", raw => {
      const m = JSON.parse(raw.toString());
      if (m.type === "ready") return resolve();
      if (m.type !== "request") return;
      const p = m.payload;
      let result: unknown = {};
      if (p.method === "initialize") result = { protocolVersion: p.params?.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "fake-workbridge-device", version: "1.0.0" } };
      if (p.method === "tools/list") result = { tools: [{ name: "echo", description: "fake", inputSchema: { type: "object", properties: {} } }] };
      if (p.id !== undefined) ws.send(JSON.stringify({ type: "response", requestId: m.requestId, payload: { jsonrpc: "2.0", id: p.id, result } }));
    });
    ws.once("error", reject);
  });

  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
    requestInit: { headers: { authorization: "Bearer client-test", "x-workbridge-device": "fake" } }
  });
  const client = new Client({ name: "workbridge-acceptance", version: "1.0.0" });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.equal(listed.tools.some(t => t.name === "echo"), true);
    const response = await fetch(`http://127.0.0.1:${port}/mcp`, { method: "POST", headers: { authorization: "Bearer client-test", "content-type": "application/json", "x-workbridge-device": "fake" }, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) });
    assert.equal(response.status, 202);
    assert.equal(await response.text(), "");
    const badDevice = await fetch(`http://127.0.0.1:${port}/mcp`, { method: "POST", headers: { authorization: "Bearer client-test", "content-type": "application/json", "x-workbridge-device": "../bad device" }, body: JSON.stringify({ jsonrpc: "2.0", id: 91, method: "tools/list", params: {} }) });
    assert.equal(badDevice.status, 400);
    const badResource = await fetch(`http://127.0.0.1:${port}/mcp`, { method: "POST", headers: { authorization: "Bearer client-test", "content-type": "application/json", "x-workbridge-device": "fake", "x-workbridge-resource-key": "bad resource key" }, body: JSON.stringify({ jsonrpc: "2.0", id: 92, method: "tools/list", params: {} }) });
    assert.equal(badResource.status, 400);
    const badParent = await fetch(`http://127.0.0.1:${port}/mcp`, { method: "POST", headers: { authorization: "Bearer client-test", "content-type": "application/json", "x-workbridge-device": "fake", "x-workbridge-parent-execution": "bad parent" }, body: JSON.stringify({ jsonrpc: "2.0", id: 93, method: "tools/list", params: {} }) });
    assert.equal(badParent.status, 400);
  } finally {
    await client.close().catch(() => {});
    ws.close();
    child.kill();
  }
});
