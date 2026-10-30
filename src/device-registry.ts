import { randomUUID } from "node:crypto";
import type WebSocket from "ws";
import type { DeviceRequest, DeviceResponse, JsonRpc } from "./protocol.js";
import { LanePool, QueuedWorkCancelledError } from "./lanes.js";

// onDispatch marks the attempt to hand a message to the WebSocket, not
// downstream acknowledgement or completed workstation execution.
export type DispatchOptions = { signal?: AbortSignal; onDispatch?: () => void };

export class DeviceEffectError extends Error {
  constructor(message: string, readonly disposition: "FAILED" | "OUTCOME_UNKNOWN") { super(message); this.name = "DeviceEffectError"; }
}

type Pending = {
  resolve: (value: JsonRpc) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
};

export class DeviceConnection {
  readonly execution: LanePool;
  private pending = new Map<string, Pending>();

  constructor(
    readonly id: string,
    readonly socket: WebSocket,
    executionCapacity: number,
    readonly initializeResult: Record<string, unknown> = {}
  ) {
    this.execution = new LanePool(executionCapacity);
  }

  accept(message: DeviceResponse) {
    const p = this.pending.get(message.requestId);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(message.requestId);
    p.resolve(message.payload);
  }

  notify(payload: JsonRpc, options?: DispatchOptions): Promise<void> {
    return this.execution.run(() => new Promise<void>((resolve, reject) => {
      if (options?.signal?.aborted) return reject(new QueuedWorkCancelledError());
      if (this.socket.readyState !== this.socket.OPEN) return reject(new DeviceEffectError("device socket is not open", "FAILED"));
      const wire: DeviceRequest = { type: "request", requestId: randomUUID(), payload };
      options?.onDispatch?.();
      this.socket.send(JSON.stringify(wire), err => err ? reject(new DeviceEffectError(err.message, "OUTCOME_UNKNOWN")) : resolve());
    }), options?.signal);
  }

  request(payload: JsonRpc, timeoutMs = 120_000, options?: DispatchOptions): Promise<JsonRpc> {
    return this.execution.run(() => new Promise<JsonRpc>((resolve, reject) => {
      if (options?.signal?.aborted) return reject(new QueuedWorkCancelledError());
      if (this.socket.readyState !== this.socket.OPEN) return reject(new DeviceEffectError("device socket is not open", "FAILED"));
      const requestId = randomUUID();
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new DeviceEffectError("device request timed out", "OUTCOME_UNKNOWN"));
      }, timeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
      const wire: DeviceRequest = { type: "request", requestId, payload };
      options?.onDispatch?.();
      this.socket.send(JSON.stringify(wire), err => {
        if (!err) return;
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(new DeviceEffectError(err.message, "OUTCOME_UNKNOWN"));
      });
    }), options?.signal);
  }

  get activeCount() { return this.execution.activeCount; }
  get queuedCount() { return this.execution.queuedCount; }

  close(reason = "device disconnected") {
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new DeviceEffectError(reason, "OUTCOME_UNKNOWN"));
      this.pending.delete(id);
    }
  }
}

export type DeviceAttachment = {
  deviceId: string;
  generation: number;
  connectedAt: number;
  executionCapacity: number;
};

export class DeviceRegistry {
  private devices = new Map<string, DeviceConnection>();
  private generations = new Map<string, number>();
  private connectedAt = new Map<string, number>();

  attach(device: DeviceConnection) {
    const prior = this.devices.get(device.id);
    if (prior && prior !== device) prior.socket.close(4001, "replaced by newer connection");
    this.devices.set(device.id, device);
    this.generations.set(device.id, (this.generations.get(device.id) ?? 0) + 1);
    this.connectedAt.set(device.id, Date.now());
  }

  detach(device: DeviceConnection) {
    if (this.devices.get(device.id) === device) this.devices.delete(device.id);
    device.close();
  }

  get(id: string) { return this.devices.get(id); }
  resolve(id: string) {
    const device = this.devices.get(id);
    // The client can complete its close handshake before the server's detach
    // callback runs. A closing socket is not an available workstation.
    if (!device || device.socket.readyState !== device.socket.OPEN) return undefined;
    return { device, generation: this.generations.get(id) ?? 0 };
  }
  getIfGeneration(id: string, generation: number) {
    const device = this.generations.get(id) === generation ? this.devices.get(id) : undefined;
    return device?.socket.readyState === device?.socket.OPEN ? device : undefined;
  }
  describe(id: string): DeviceAttachment | undefined {
    const device = this.devices.get(id);
    if (!device) return undefined;
    return { deviceId: id, generation: this.generations.get(id) ?? 0, connectedAt: this.connectedAt.get(id) ?? 0, executionCapacity: device.execution.limit };
  }
  list() { return [...this.devices.keys()].sort(); }
}
