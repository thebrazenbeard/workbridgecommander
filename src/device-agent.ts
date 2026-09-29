import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import WebSocket from "ws";
import type { DeviceRequest, JsonRpc } from "./protocol.js";
import { assertSafeDeviceServiceUrl, resolveInsideRoot, trustedSha256Matches } from "./security.js";

const serviceUrl = process.env.WORKBRIDGE_SERVICE_URL ?? "";
const token = process.env.WORKBRIDGE_DEVICE_TOKEN ?? "";
const deviceId = process.env.WORKBRIDGE_DEVICE_ID ?? "";
const trustedManifestHash = process.env.WORKBRIDGE_TRUSTED_MANIFEST_SHA256 ?? "";
const installRoot = process.env.WORKBRIDGE_INSTALL_ROOT ?? (process.platform === "win32"
  ? "C:\\ProgramData\\WorkBridgeMCP\\DesktopCommanderMCP"
  : "/opt/workbridge/DesktopCommanderMCP");

if (!serviceUrl || !token || !deviceId || !trustedManifestHash) throw new Error("WORKBRIDGE_SERVICE_URL, WORKBRIDGE_DEVICE_TOKEN, WORKBRIDGE_DEVICE_ID and WORKBRIDGE_TRUSTED_MANIFEST_SHA256 are required");

const manifestPath = path.join(installRoot, "workbridge-desktop-commander.manifest.json");
const rawManifest = await readFile(manifestPath, "utf8");
const manifestText = rawManifest.charCodeAt(0) === 0xfeff ? rawManifest.slice(1) : rawManifest;
const manifest = JSON.parse(manifestText) as {
  schema: string;
  upstream_commit: string;
  upstream_version: string;
  node_executable_relative: string;
  node_sha256: string;
  entrypoint_relative: string;
  entrypoint_sha256: string;
  mcp_args: string[];
};

if (manifest.schema !== "WORKBRIDGE_DESKTOP_COMMANDER_DUPLICATE_V1") throw new Error("unsupported WorkBridge duplicate manifest schema");
if (manifest.upstream_commit !== "550a0b3e31da18b7cf25e87ed840e3d953b6da42") throw new Error("unqualified Desktop Commander upstream commit");
if (manifest.upstream_version !== "0.2.51") throw new Error("unqualified Desktop Commander upstream version");

async function sha256(file: string) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

if (!trustedSha256Matches(await sha256(manifestPath), trustedManifestHash)) throw new Error("WorkBridge manifest trust-anchor hash mismatch");

const nodeExe = resolveInsideRoot(installRoot, manifest.node_executable_relative);
const entrypoint = resolveInsideRoot(installRoot, manifest.entrypoint_relative);
if (await sha256(nodeExe) !== manifest.node_sha256.toLowerCase()) throw new Error("packaged Node hash mismatch");
if (await sha256(entrypoint) !== manifest.entrypoint_sha256.toLowerCase()) throw new Error("Desktop Commander entrypoint hash mismatch");
if (!manifest.mcp_args.length || path.normalize(manifest.mcp_args[0]) !== path.normalize(manifest.entrypoint_relative)) throw new Error("manifest mcp_args do not bind the qualified entrypoint");

const child = spawn(nodeExe, manifest.mcp_args, {
  cwd: installRoot,
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, DC_REMOTE_DEVICE: "true" },
  windowsHide: true
});

const LF = String.fromCharCode(10);
let buffer = "";
const pendingOutbound = new Map<string | number, { requestId: string; originalId: JsonRpc["id"] }>();
let localId = 1;
let ws: WebSocket | undefined;
let reconnectAttempt = 0;
let stopped = false;

function connect() {
  const url = new URL(serviceUrl);
  assertSafeDeviceServiceUrl(url);
  url.pathname = "/device";
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(url, { maxPayload: 2_000_000 });
  ws = socket;

  socket.on("open", () => {
    reconnectAttempt = 0;
    socket.send(JSON.stringify({ type: "hello", deviceId, token }));
  });

  socket.on("message", raw => {
    let message: Partial<DeviceRequest> & { type?: string };
    try { message = JSON.parse(raw.toString()); } catch { socket.close(4002, "invalid json"); return; }
    if (message.type !== "request" || typeof message.requestId !== "string" || !message.payload) return;
    if (message.payload.id === undefined) {
      child.stdin.write(JSON.stringify(message.payload) + LF, error => {
        if (error) console.error(JSON.stringify({ status: "notification-write-failed", requestId: message.requestId, message: error.message }));
      });
      return;
    }
    const bridgeId = localId++;
    pendingOutbound.set(bridgeId, { requestId: message.requestId, originalId: message.payload.id });
    child.stdin.write(JSON.stringify({ ...message.payload, id: bridgeId }) + LF, error => {
      if (!error) return;
      pendingOutbound.delete(bridgeId);
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "response", requestId: message.requestId, payload: { jsonrpc: "2.0", id: message.payload?.id ?? null, error: { code: -32004, message: "qualified payload stdin write failed" } } }));
    });
  });

  socket.on("error", error => console.error(JSON.stringify({ status: "device-websocket-error", message: error.message })));
  socket.on("close", () => {
    if (stopped) return;
    for (const marker of pendingOutbound.values()) console.error(JSON.stringify({ status: "request-outcome-unknown-after-disconnect", requestId: marker.requestId }));
    pendingOutbound.clear();
    const delay = Math.min(30_000, 1_000 * (2 ** Math.min(reconnectAttempt++, 5)));
    setTimeout(connect, delay);
  });
}

child.stdout.on("data", chunk => {
  buffer += chunk.toString();
  const lines = buffer.split(LF);
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
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "response", requestId: marker.requestId, payload: { ...payload, id: marker.originalId } }));
  }
});

child.on("exit", code => {
  stopped = true;
  if (ws?.readyState === WebSocket.OPEN) ws.close(1011, "desktop commander exited");
  console.error(JSON.stringify({ status: "desktop-commander-exited", code }));
  process.exit(code ?? 1);
});

connect();
