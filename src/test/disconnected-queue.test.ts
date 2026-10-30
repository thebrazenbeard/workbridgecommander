import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";

type Forwarded = { requestId: string; payload: { id?: number; method: string } };

async function waitFor<T>(read: () => Promise<T>, ready: (value: T) => boolean, label: string): Promise<T> {
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    const value = await read();
    if (ready(value)) return value;
    await delay(15);
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function start(capacity: { upstream: number; execution: number }) {
  const child = spawn(process.execPath, ["dist/server.js"], {
    env: {
      ...process.env, PORT: "0", HOST: "127.0.0.1",
      WORKBRIDGE_CLIENT_TOKEN: "client-test", WORKBRIDGE_DEVICE_TOKEN: "device-test",
      WORKBRIDGE_DEFAULT_DEVICE: "fake", WORKBRIDGE_UPSTREAM_CONTEXT_CAPACITY: String(capacity.upstream),
      WORKBRIDGE_EXECUTION_CAPACITY: String(capacity.execution)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const port = await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Commander startup timed out")), 8000);
    child.stdout.on("data", chunk => {
      for (const line of chunk.toString().split("\n")) {
        if (!line.includes('"status":"listening"')) continue;
        clearTimeout(timer);
        resolve((JSON.parse(line) as { port: number }).port);
      }
    });
    child.once("error", reject);
    child.once("exit", code => reject(new Error(`Commander exited before listen: ${code}`)));
  });
  const ws = new WebSocket(`ws://127.0.0.1:${port}/device`);
  const forwarded: Forwarded[] = [];
  await new Promise<void>((resolve, reject) => {
    ws.once("open", () => ws.send(JSON.stringify({ type: "hello", deviceId: "fake", token: "device-test" })));
    ws.on("message", raw => {
      const message = JSON.parse(raw.toString()) as { type: string; requestId: string; payload: Forwarded["payload"] };
      if (message.type === "ready") return resolve();
      if (message.type === "request") forwarded.push({ requestId: message.requestId, payload: message.payload });
    });
    ws.once("error", reject);
  });
  const headers = { authorization: "Bearer client-test", "content-type": "application/json", "x-workbridge-device": "fake" };
  const health = async () => (await (await fetch(`http://127.0.0.1:${port}/health`)).json()) as {
    upstreamContextQueued: number; executionQueued: number
  };
  const effects = async () => (await (await fetch(`http://127.0.0.1:${port}/effects`, { headers })).json()) as {
    effects: Array<{ disposition: string }>
  };
  const send = (id: number, resourceKey?: string) => fetch(`http://127.0.0.1:${port}/mcp`, {
    method: "POST", headers: { ...headers, ...(resourceKey ? { "x-workbridge-resource-key": resourceKey } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id, method: "test/operation", params: {} })
  });
  const abandon = async (id: number, resourceKey?: string) => {
    const body = JSON.stringify({ jsonrpc: "2.0", id, method: "test/operation", params: {} });
    const req = http.request({ host: "127.0.0.1", port, path: "/mcp", method: "POST", headers: {
      ...headers, "content-length": Buffer.byteLength(body),
      ...(resourceKey ? { "x-workbridge-resource-key": resourceKey } : {})
    } });
    req.on("error", () => {});
    req.on("response", res => res.resume());
    req.end(body);
    await once(req, "finish");
    return () => req.destroy();
  };
  const complete = (id: number) => {
    const entry = forwarded.find(item => item.payload.id === id);
    if (!entry) throw new Error(`request ${id} was not dispatched`);
    ws.send(JSON.stringify({ type: "response", requestId: entry.requestId, payload: {
      jsonrpc: "2.0", id, result: { done: id }
    } }));
  };
  const close = async () => {
    ws.close();
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
  };
  return { child, forwarded, health, effects, send, abandon, complete, close };
}

test("disconnect after complete body cancels an upstream-queued effect without harming neighbors", { timeout: 15_000 }, async () => {
  const host = await start({ upstream: 1, execution: 4 });
  try {
    const first = host.send(1).then(response => ({ response }), error => ({ error }));
    await waitFor(async () => host.forwarded.length, n => n === 1, "first dispatch");
    const disconnect = await host.abandon(2);
    await waitFor(async () => (await host.health()).upstreamContextQueued, n => n === 1, "queued request");
    disconnect();
    await waitFor(async () => (await host.health()).upstreamContextQueued, n => n === 0, "cancellation drainage");
    host.complete(1);
    const firstResult = await first;
    assert.ok("response" in firstResult, "unrelated active request must complete");
    assert.equal(firstResult.response.status, 200);
    const neighbor = host.send(3);
    await waitFor(async () => host.forwarded.length, n => n === 2, "neighbor dispatch");
    assert.deepEqual(host.forwarded.map(item => item.payload.id), [1, 3], "abandoned effect must not reach device");
    host.complete(3);
    assert.equal((await neighbor).status, 200);
    assert.ok((await host.effects()).effects.some(effect => effect.disposition === "CANCELLED"));
  } finally { await host.close(); }
});

test("disconnect while waiting for a resource key never dispatches the abandoned effect", { timeout: 15_000 }, async () => {
  const host = await start({ upstream: 4, execution: 4 });
  try {
    const first = host.send(11, "shell:shared").then(response => ({ response }), error => ({ error }));
    await waitFor(async () => host.forwarded.length, n => n === 1, "first resource dispatch");
    const disconnect = await host.abandon(12, "shell:shared");
    await waitFor(async () => (await host.effects()).effects,
      rows => rows.length >= 2 && rows.some(row => row.disposition === "ADMITTED"), "resource-key admission");
    disconnect();
    await waitFor(async () => (await host.effects()).effects,
      rows => rows.some(row => row.disposition === "CANCELLED"), "resource-key cancellation");
    host.complete(11);
    const firstResult = await first;
    assert.ok("response" in firstResult);
    assert.equal(firstResult.response.status, 200);
    const neighbor = host.send(13, "shell:shared");
    await waitFor(async () => host.forwarded.length, n => n === 2, "next resource dispatch");
    assert.deepEqual(host.forwarded.map(item => item.payload.id), [11, 13]);
    host.complete(13);
    assert.equal((await neighbor).status, 200);
  } finally { await host.close(); }
});

test("disconnect while waiting for a device execution slot never sends a WebSocket effect", { timeout: 15_000 }, async () => {
  const host = await start({ upstream: 4, execution: 1 });
  try {
    const first = host.send(21).then(response => ({ response }), error => ({ error }));
    await waitFor(async () => host.forwarded.length, n => n === 1, "first device dispatch");
    const disconnect = await host.abandon(22);
    await waitFor(async () => (await host.health()).executionQueued, n => n === 1, "device-slot queue");
    disconnect();
    await waitFor(async () => (await host.health()).executionQueued, n => n === 0, "device-slot cancellation");
    host.complete(21);
    const firstResult = await first;
    assert.ok("response" in firstResult);
    assert.equal(firstResult.response.status, 200);
    const neighbor = host.send(23);
    await waitFor(async () => host.forwarded.length, n => n === 2, "next device dispatch");
    assert.deepEqual(host.forwarded.map(item => item.payload.id), [21, 23]);
    host.complete(23);
    assert.equal((await neighbor).status, 200);
    assert.ok((await host.effects()).effects.some(effect => effect.disposition === "CANCELLED"));
  } finally { await host.close(); }
});

test("disconnect after WebSocket dispatch preserves the real outcome rather than claiming cancellation", { timeout: 15_000 }, async () => {
  const host = await start({ upstream: 2, execution: 2 });
  try {
    const disconnect = await host.abandon(31);
    await waitFor(async () => host.forwarded.length, n => n === 1, "effect already sent to device");
    disconnect();
    await waitFor(async () => (await host.effects()).effects,
      rows => rows.some(row => row.disposition === "DISPATCHED"), "dispatched effect ledger");
    host.complete(31);
    await waitFor(async () => (await host.effects()).effects,
      rows => rows.some(row => row.disposition === "COMPLETED"), "real downstream completion");
    assert.equal((await host.effects()).effects.some(effect => effect.disposition === "CANCELLED"), false,
      "disconnect cannot undo an effect already sent to the workstation");
    const neighbor = host.send(32);
    await waitFor(async () => host.forwarded.length, n => n === 2, "post-disconnect neighbor");
    host.complete(32);
    assert.equal((await neighbor).status, 200);
  } finally { await host.close(); }
});
