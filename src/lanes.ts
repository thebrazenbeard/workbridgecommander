export class QueuedWorkCancelledError extends Error {
  constructor() { super("request disconnected before effect dispatch"); this.name = "QueuedWorkCancelledError"; }
}

export class LanePool {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(readonly limit: number) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error("lane limit must be a positive integer");
  }

  get activeCount() { return this.active; }
  get queuedCount() { return this.queue.length; }

  async run<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    await this.acquire(signal);
    try {
      if (signal?.aborted) throw new QueuedWorkCancelledError();
      return await fn();
    }
    finally { this.release(); }
  }

  private acquire(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return Promise.reject(new QueuedWorkCancelledError());
    if (this.active < this.limit) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const enter = () => {
        signal?.removeEventListener("abort", onAbort);
        this.active++;
        resolve();
      };
      const onAbort = () => {
        const index = this.queue.indexOf(enter);
        if (index !== -1) this.queue.splice(index, 1);
        reject(new QueuedWorkCancelledError());
      };
      this.queue.push(enter);
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  private release() {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}
