import { LanePool } from "./lanes.js";

export class ResourceKeyGate {
  private readonly pools = new Map<string, LanePool>();

  async run<T>(key: string, work: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    let pool = this.pools.get(key);
    if (!pool) {
      pool = new LanePool(1);
      this.pools.set(key, pool);
    }
    try {
      return await pool.run(work, signal);
    } finally {
      // Aborted waiters leave the queue immediately; released keys need not
      // retain a chain of pending promises after clients have disconnected.
      if (pool.activeCount === 0 && pool.queuedCount === 0 && this.pools.get(key) === pool) {
        this.pools.delete(key);
      }
    }
  }
}
