import { randomUUID } from "node:crypto";
import { LanePool, LOGIC_LANES } from "./lanes.js";

export type LogicLaneState = "queued" | "running" | "waiting-for-effect" | "completed" | "failed";

export type LogicLaneRecord = {
  id: string;
  state: LogicLaneState;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  effectDevice?: string;
};

export class LogicOrchestrator {
  private readonly pool = new LanePool(LOGIC_LANES);
  private readonly records = new Map<string, LogicLaneRecord>();

  create(): LogicLaneRecord {
    const record: LogicLaneRecord = { id: randomUUID(), state: "queued", createdAt: Date.now() };
    this.records.set(record.id, record);
    return record;
  }

  async run<T>(laneId: string, work: () => Promise<T>): Promise<T> {
    const lane = this.require(laneId);
    return this.pool.run(async () => {
      lane.state = "running";
      lane.startedAt = Date.now();
      try {
        const result = await work();
        lane.state = "completed";
        lane.finishedAt = Date.now();
        return result;
      } catch (error) {
        lane.state = "failed";
        lane.finishedAt = Date.now();
        throw error;
      }
    });
  }

  bindEffect(laneId: string, deviceId: string) {
    const lane = this.require(laneId);
    lane.effectDevice = deviceId;
    lane.state = "waiting-for-effect";
  }

  get(laneId: string) { return this.records.get(laneId); }
  list() { return [...this.records.values()]; }
  get activeCount() { return this.pool.activeCount; }
  get queuedCount() { return this.pool.queuedCount; }

  private require(id: string) {
    const lane = this.records.get(id);
    if (!lane) throw new Error("unknown logic lane");
    return lane;
  }
}
