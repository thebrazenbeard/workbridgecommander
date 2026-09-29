import test from "node:test";
import assert from "node:assert/strict";
import { LanePool, EXECUTION_LANES, LOGIC_LANES } from "../lanes.js";

test("declared lane ceilings are 4 execution and 32 logic", () => {
  assert.equal(EXECUTION_LANES, 4);
  assert.equal(LOGIC_LANES, 32);
});

test("LanePool never exceeds its concurrency limit", async () => {
  const pool = new LanePool(4);
  let active = 0;
  let max = 0;
  let release!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  const jobs = Array.from({ length: 12 }, () => pool.run(async () => {
    active++;
    max = Math.max(max, active);
    await gate;
    active--;
  }));
  await new Promise(r => setTimeout(r, 20));
  assert.equal(max, 4);
  assert.equal(pool.activeCount, 4);
  assert.equal(pool.queuedCount, 8);
  release();
  await Promise.all(jobs);
  assert.equal(pool.activeCount, 0);
});
