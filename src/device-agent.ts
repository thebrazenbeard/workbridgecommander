import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import WebSocket from "ws";
import type { DeviceRequest, JsonRpc } from "./protocol.js";

const serviceUrl = process.env.WORKBRIDGE_SERVICE_URL ?? "";
const token = process.env.WORKBRIDGE_DEVICE_TOKEN ?? "";
const deviceId = process.env.WORKBRIDGE_DEVICE_ID ?? "";
const installRoot = process.env.WORKBRIDGE_INSTALL_ROOT ?? (process.platform === "win32"
  ? "C:\\ProgramData\\WorkBridgeMCP\\DesktopCommanderMCP"
  : "/opt/workbridge/DesktopCommanderMCP");

if (!serviceUrl || !token || !deviceId) {
  throw new Error("WORKBRIDGE_SERVICE_URL, WORKBRIDGE_DEVICE_TOKEN and WORKBRIDGE_DEVICE_ID are required");
}

const manifestPath = path.join(installRoot, "workbridge-desktop-commander.manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
  node_executable_relative: string;
  node_sha256: string;
  entrypoint_relative: string;
  entrypoint_sha256: string;
  mcp_args: string[];
};

async function sha256(file: string) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

const nodeExe = path.resolve(installRoot, manifest.node_executable_relative);
const entrypoint = path.resolve(installRoot, manifest.entrypoint_relative);
if (await sha256(nodeExe) !== manifest.node_sha256.toLowerCase()) throw new Error("packaged Node hash mismatch");
if (await sha256(entrypoint) !== manifest.entrypoint_sha256.toLowerCase()) throw new Error("Desktop Commander entrypoint hash mismatch");

const expectedEntryArg = path.normalize(manifest.entrypoint_relative);
if (!manifest.mcp_args.length || path.normalize(manifest.mcp_args[0]) !== expectedEntryArg) {
  throw new Error("manifest mcp_args do not bind the qualified entrypoint");
}

const child = spawn(nodeExe, manifest.mcp_args, {
  cwd: installRoot,
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, DC_REMOTE_DEVICE: "true" },
  windowsHide: true
});

let buffer = "";
const pendingOutbound = new Map<string | number, { requestId: string; originalId: JsonRpc["id"] }>();
let localId = 1;
let ws: WebSocket;

function connect() {
  const url = new URL(serviceUrl);
  url.pathname = "/device";
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(url);

  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "hello", deviceId, token }));
  });

  ws.on("message", raw => {
    const message = JSON.parse(raw.toString()) as Partial<DeviceRequest> & { type?: string };
    if (message.type === "request" && typeof message.requestId === "string" && message.payload) {
      if (message.payload.id === undefined) {
        child.stdin.write(JSON.stringify(message.payload) + "\n");
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "response",
            requestId: message.requestId,
            payload: { jsonrpc: "2.0", result: null }
          }));
        }
        return;
      }
      const bridgeId = localId++;
      pendingOutbound.set(bridgeId, { requestId: message.requestId, originalId: message.payload.id });
      child.stdin.write(JSON.stringify({ ...message.payload, id: bridgeId }) + "\n");
    }
  });

  ws.on("close", () => {
    setTimeout(connect, 2000);
  });
}

child.stdout.on("data", chunk => {
  buffer += chunk.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let payload: JsonRpc;
    try { payload = JSON.parse(line); } catch { continue; }
    if (payload.id === undefined) continue;
    const marker = pendingOutbound.get(payload.id as string | number);
    if (!marker) continue;
    pendingOutbound.delete(payload.id as string | number);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "response",
        requestId: marker.requestId,
        payload: { ...payload, id: marker.originalId }
      }));
    }
  }
});

child.on("exit", code => {
  console.error(JSON.stringify({ status: "desktop-commander-exited", code }));
  process.exit(code ?? 1);
});

connect();
