import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

test("an aborted MCP upload cannot terminate the Commander server", { timeout: 15_000 }, async () => {
  const child = spawn(process.execPath, ["dist/server.js"], {
    env: {
      ...process.env,
      PORT: "0",
      HOST: "127.0.0.1",
      WORKBRIDGE_CLIENT_TOKEN: "client-test",
      WORKBRIDGE_DEVICE_TOKEN: "device-test"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    const port = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Commander startup timed out")), 8_000);
      child.stdout.on("data", chunk => {
        for (const line of chunk.toString().split("\n")) {
          if (!line.includes('"status":"listening"')) continue;
          const value = JSON.parse(line) as { port: number };
          clearTimeout(timer);
          resolve(value.port);
        }
      });
      child.once("error", error => { clearTimeout(timer); reject(error); });
      child.once("exit", code => { clearTimeout(timer); reject(new Error(`Commander exited before listening: ${code}`)); });
    });

    const request = http.request({
      hostname: "127.0.0.1",
      port,
      path: "/mcp",
      method: "POST",
      headers: {
        authorization: "Bearer client-test",
        "content-type": "application/json",
        "content-length": "1000000",
        expect: "100-continue"
      }
    });
    request.on("error", () => {});
    await new Promise<void>((resolve, reject) => {
      request.once("continue", () => {
        request.write(Buffer.alloc(1024, "x"));
        setTimeout(() => { request.destroy(); resolve(); }, 30);
      });
      request.once("error", reject);
      request.flushHeaders();
    });

    await delay(100);
    assert.equal(child.exitCode, null, "an aborted request body must not crash the MCP ingress process");
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200, "the server must still answer health after an aborted upload");
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
  }
});
