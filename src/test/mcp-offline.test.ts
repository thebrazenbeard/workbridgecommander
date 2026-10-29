import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import WebSocket from "ws";

test("MCP housekeeping remains available without a workstation and forwards only after attachment", { timeout: 30_000 }, async () => {
  const port = 19878 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ["dist/server.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      WORKBRIDGE_CLIENT_TOKEN: "client-test",
      WORKBRIDGE_DEVICE_TOKEN: "device-test",
      WORKBRIDGE_DEFAULT_DEVICE: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let ws: WebSocket | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("server start timeout")), 8000);
      child.stdout.on("data", chunk => {
        if (chunk.toString().includes('"status":"listening"')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.once("exit", code => {
        clearTimeout(timer);
        reject(new Error(`server exited before listening: ${code}`));
      });
    });

    const call = (method: string, id?: number, authorization = "Bearer client-test") => fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", ...(id === undefined ? {} : { id }), method,
        ...(method === "initialize" ? { params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "offline-test", version: "1" } } } : {}) })
    });

    const unauthorized = await call("initialize", 0, "Bearer wrong");
    assert.equal(unauthorized.status, 401);

    const initialize = await call("initialize", 1);
    assert.equal(initialize.status, 200);
    const initialized = await initialize.json();
    assert.equal(initialized.id, 1);
    assert.equal(initialized.result.protocolVersion, "2025-06-18");
    assert.equal(initialized.result.serverInfo.name, "workbridge-commander");
    assert.deepEqual(initialized.result.capabilities.tools, {});

    const ping = await call("ping", 2);
    assert.equal(ping.status, 200);
    assert.deepEqual((await ping.json()).result, {});
    const notify = await call("notifications/initialized");
    assert.equal(notify.status, 202);

    const offlineTools = await call("tools/list", 3);
    assert.equal(offlineTools.status, 200);
    assert.deepEqual((await offlineTools.json()).result, { tools: [] });

    const offlineEffect = await call("tools/call", 31);
    assert.equal(offlineEffect.status, 503);
    assert.match((await offlineEffect.json()).error.message, /no workstation connected/i);

    const effects = await fetch(`http://127.0.0.1:${port}/effects`, { headers: { authorization: "Bearer client-test" } });
    assert.deepEqual((await effects.json()).effects, []);

    ws = new WebSocket(`ws://127.0.0.1:${port}/device`);
    await new Promise<void>((resolve, reject) => {
      ws!.once("open", () => ws!.send(JSON.stringify({
        type: "hello", deviceId: "fake", token: "device-test",
        initializeResult: { protocolVersion: "2025-06-18", capabilities: { tools: {} } }
      })));
      ws!.on("message", raw => {
        const m = JSON.parse(raw.toString());
        if (m.type === "ready") return resolve();
        if (m.type === "request" && m.payload.method === "tools/list") {
          ws!.send(JSON.stringify({ type: "response", requestId: m.requestId,
            payload: { jsonrpc: "2.0", id: m.payload.id, result: { tools: [{ name: "online" }] } } }));
        }
      });
      ws!.once("error", reject);
    });
    const onlineTools = await call("tools/list", 4);
    assert.equal(onlineTools.status, 200);
    assert.equal((await onlineTools.json()).result.tools[0].name, "online");

    await new Promise<void>(resolve => { ws!.once("close", resolve); ws!.close(); });
    const disconnectedTools = await call("tools/list", 5);
    assert.equal(disconnectedTools.status, 200);
    assert.deepEqual((await disconnectedTools.json()).result, { tools: [] });
    const disconnectedPing = await call("ping", 6);
    assert.equal(disconnectedPing.status, 200);

    // An explicitly selected, unavailable workstation is a configuration
    // error, not an empty discovery result.
    const explicitMissing = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: { authorization: "Bearer client-test", "content-type": "application/json", "x-workbridge-device": "fake" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tools/list" })
    });
    assert.equal(explicitMissing.status, 404);
  } finally {
    ws?.close();
    child.kill();
  }
});
