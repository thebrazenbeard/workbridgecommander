export type ExecutionEvent = {
  executionId: string;
  parentExecutionId?: string;
  seq: number;
  type: string;
  at: number;
  data: unknown;
};

export class ExecutionEventLog {
  private readonly events = new Map<string, ExecutionEvent[]>();
  private readonly seq = new Map<string, number>();

  constructor(private readonly maxEventsPerExecution = 200) {
    if (!Number.isSafeInteger(maxEventsPerExecution) || maxEventsPerExecution < 1) throw new Error("maxEventsPerExecution must be a positive integer");
  }

  append(executionId: string, type: string, data: unknown, parentExecutionId?: string): ExecutionEvent {
    const next = (this.seq.get(executionId) ?? 0) + 1;
    this.seq.set(executionId, next);
    const event: ExecutionEvent = { executionId, seq: next, type, at: Date.now(), data, ...(parentExecutionId ? { parentExecutionId } : {}) };
    const list = this.events.get(executionId) ?? [];
    list.push(event);
    if (list.length > this.maxEventsPerExecution) list.splice(0, list.length - this.maxEventsPerExecution);
    this.events.set(executionId, list);
    return event;
  }

  since(executionId: string, afterSeq: number): ExecutionEvent[] {
    return (this.events.get(executionId) ?? []).filter(e => e.seq > afterSeq);
  }
}
