import http from "node:http";
import { WebSocketServer } from "ws";
import { bearerAuthorized, tokenAuthorized } from "./auth.js";
import { DeviceConnection, DeviceRegistry } from "./device-registry.js";
import { LogicOrchestrator } from "./orchestrator.js";
import type { DeviceHello, DeviceResponse, JsonRpc } from "./protocol.js";
import { isJsonRpc } from "./protocol.js";

const port = Number(process.env.PORT ?? "8787");
const host = process.env.HOST ?? "0.0.0.0";
const clientToken = process.env.WORKBRIDGE_CLIENT_TOKEN ?? "";
const deviceToken = process.env.WORKBRIDGE_DEVICE_TOKEN ?? "";
const defaultDevice = process.env.WORKBRIDGE_DEFAULT_DEVICE ?? "";

if (!clientToken || !deviceToken) {
  throw new Error("WORKBRIDGE_CLIENT_TOKEN and WORKBRIDGE_DEVICE_TOKEN are required");
}

const registry = new DeviceRegistry();
const logic = new LogicOrchestrator();

function json(res: http.ServerResponse, status: number, body: unknown) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(data),
    "cache-control": "no-store"
  });
  res.end(data);
}

function rpcError(id: JsonRpc["id"], code: number, message: string): JsonRpc {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, {
      status: "ok",
      devices: registry.list(),
      executionLaneLimitPerDevice: 4,
      logicLaneLimit: 32,
      logicActive: logic.activeCount,
      logicQueued: logic.queuedCount,
      logicLanes: logic.list()
    });
  }

  if (req.url !== "/mcp" || req.method !== "POST") {
    return json(res, 404, { error: "not found" });
  }
  if (!bearerAuthorized(req.headers.authorization, clientToken)) {
    return json(res, 401, { error: "unauthorized" });
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const b = Buffer.from(chunk);
    size += b.length;
    if (size > 2_000_000) return json(res, 413, { error: "request too large" });
    chunks.push(b);
  }

  let payload: unknown;
  try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { return json(res, 400, { error: "invalid json" }); }
  if (!isJsonRpc(payload)) return json(res, 400, { error: "invalid json-rpc" });

  const requested = req.headers["x-workbridge-device"];
  const deviceId = (Array.isArray(requested) ? requested[0] : requested) || defaultDevice || registry.list()[0];
  if (!deviceId) return json(res, 503, rpcError(payload.id, -32001, "no workstation connected"));
  const device = registry.get(deviceId);
  if (!device) return json(res, 404, rpcError(payload.id, -32002, "requested workstation is not connected"));

  try {
    const lane = logic.create();
    logic.bindEffect(lane.id, deviceId);
    const response = await logic.run(lane.id, () => device.request(payload));
    return json(res, 200, response);
  } catch (error) {
    return json(res, 502, rpcError(payload.id, -32003, error instanceof Error ? error.message : "device bridge failed"));
  }
});

const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => {
  if (req.url !== "/device") return socket.destroy();
  wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
});

wss.on("connection", ws => {
  let device: DeviceConnection | undefined;
  const helloTimer = setTimeout(() => ws.close(4000, "hello timeout"), 10_000);

  ws.on("message", raw => {
    let message: unknown;
    try { message = JSON.parse(raw.toString()); } catch { return ws.close(4002, "invalid json"); }

    if (!device) {
      const hello = message as Partial<DeviceHello>;
      if (hello.type !== "hello" || typeof hello.deviceId !== "string" || typeof hello.token !== "string") {
        return ws.close(4003, "hello required");
      }
      if (!tokenAuthorized(hello.token, deviceToken)) return ws.close(4004, "unauthorized");
      clearTimeout(helloTimer);
      device = new DeviceConnection(hello.deviceId, ws);
      registry.attach(device);
      ws.send(JSON.stringify({ type: "ready", deviceId: device.id }));
      return;
    }

    const response = message as Partial<DeviceResponse>;
    if (response.type === "response" && typeof response.requestId === "string" && isJsonRpc(response.payload)) {
      device.accept(response as DeviceResponse);
    }
  });

  ws.on("close", () => {
    clearTimeout(helloTimer);
    if (device) registry.detach(device);
  });
});

server.listen(port, host, () => {
  console.log(JSON.stringify({ status: "listening", host, port, executionLanes: 4, logicLanes: 32 }));
});
