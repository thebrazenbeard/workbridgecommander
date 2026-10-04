import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";

test("aborted HTTP request does not crash WorkBridge server", { timeout: 20_000 }, async () => {
  const port = 19787 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ["dist/server.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      WORKBRIDGE_CLIENT_TOKEN: "client-test",
      WORKBRIDGE_DEVICE_TOKEN: "device-test",
      WORKBRIDGE_DEFAULT_DEVICE: "fake"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  child.stderr.on("data", chunk => { stderr += chunk.toString(); });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server start timeout")), 8000);
    child.stdout.on("data", chunk => {
      if (chunk.toString().includes('"status":"listening"')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once("exit", code => reject(new Error("server exited early: " + code + "\n" + stderr)));
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host: "127.0.0.1", port }, () => {
        socket.write(
          [
            "POST /mcp HTTP/1.1",
            "Host: 127.0.0.1",
            "Authorization: Bearer client-test",
            "Content-Type: application/json",
            "Content-Length: 100000",
            "",
            '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":'
          ].join("\r\n")
        );
        setTimeout(() => {
          socket.destroy();
          resolve();
        }, 25);
      });
      socket.once("error", reject);
    });

    await new Promise(resolve => setTimeout(resolve, 250));

    assert.equal(child.exitCode, null, "server exited after aborted request: " + stderr);

    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);
    const payload = await health.json() as { status?: string };
    assert.equal(payload.status, "ok");
  } finally {
    child.kill();
  }
});
