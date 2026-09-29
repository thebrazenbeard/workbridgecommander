import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionEventLog } from "../execution-events.js";

test("execution events have monotonic sequence IDs and replay after a cursor", () => {
  const log = new ExecutionEventLog(3);
  assert.equal(log.append("exec-1", "started", { x: 1 }).seq, 1);
  assert.equal(log.append("exec-1", "progress", { x: 2 }).seq, 2);
  assert.equal(log.append("exec-1", "progress", { x: 3 }).seq, 3);
  assert.deepEqual(log.since("exec-1", 1).map(e => e.seq), [2, 3]);
});

test("event buffer is bounded while sequence numbers remain monotonic", () => {
  const log = new ExecutionEventLog(2);
  log.append("exec-1", "a", {});
  log.append("exec-1", "b", {});
  const third = log.append("exec-1", "c", {});
  assert.equal(third.seq, 3);
  assert.deepEqual(log.since("exec-1", 0).map(e => e.seq), [2, 3]);
});

test("parent-child lineage is preserved in event records", () => {
  const log = new ExecutionEventLog();
  const e = log.append("child", "started", {}, "parent");
  assert.equal(e.parentExecutionId, "parent");
});
