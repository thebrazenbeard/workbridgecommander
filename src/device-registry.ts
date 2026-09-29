import { randomUUID } from "node:crypto";
import type WebSocket from "ws";
import type { DeviceRequest, DeviceResponse, JsonRpc } from "./protocol.js";
import { LanePool, EXECUTION_LANES } from "./lanes.js";

type Pending = {
  resolve: (value: JsonRpc) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
};

export class DeviceConnection {
  readonly execution = new LanePool(EXECUTION_LANES);
  private pending = new Map<string, Pending>();

  constructor(readonly id: string, readonly socket: WebSocket) {}

  accept(message: DeviceResponse) {
    const p = this.pending.get(message.requestId);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(message.requestId);
    p.resolve(message.payload);
  }

  request(payload: JsonRpc, timeoutMs = 120_000): Promise<JsonRpc> {
    return this.execution.run(() => new Promise<JsonRpc>((resolve, reject) => {
      const requestId = randomUUID();
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error("device request timed out"));
      }, timeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
      const wire: DeviceRequest = { type: "request", requestId, payload };
      this.socket.send(JSON.stringify(wire), err => {
        if (!err) return;
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(err);
      });
    }));
  }

  close(reason = "device disconnected") {
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error(reason));
      this.pending.delete(id);
    }
  }
}

export class DeviceRegistry {
  private devices = new Map<string, DeviceConnection>();

  attach(device: DeviceConnection) {
    const prior = this.devices.get(device.id);
    if (prior && prior !== device) prior.socket.close(4001, "replaced by newer connection");
    this.devices.set(device.id, device);
  }

  detach(device: DeviceConnection) {
    if (this.devices.get(device.id) === device) this.devices.delete(device.id);
    device.close();
  }

  get(id: string) { return this.devices.get(id); }
  list() { return [...this.devices.keys()].sort(); }
}
