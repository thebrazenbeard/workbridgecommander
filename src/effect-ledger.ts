export type EffectDisposition =
  | "QUEUED"
  | "ADMITTED"
  | "DISPATCHED"
  | "COMPLETED"
  | "FAILED"
  | "OUTCOME_UNKNOWN";

export type EffectRecord = {
  requestId: string;
  deviceId: string;
  generation: number;
  disposition: EffectDisposition;
  replaySafe: boolean;
  updatedAt: number;
};

export class EffectLedger {
  private records = new Map<string, EffectRecord>();

  create(requestId: string, deviceId: string, generation: number, replaySafe = false) {
    const record: EffectRecord = { requestId, deviceId, generation, disposition: "QUEUED", replaySafe, updatedAt: Date.now() };
    this.records.set(requestId, record);
    return record;
  }

  transition(requestId: string, disposition: EffectDisposition) {
    const record = this.records.get(requestId);
    if (!record) throw new Error("unknown effect");
    record.disposition = disposition;
    record.updatedAt = Date.now();
    return record;
  }

  get(requestId: string) { return this.records.get(requestId); }
  recent(limit = 100) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("effect ledger limit must be 1..1000");
    return [...this.records.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
  }
}
