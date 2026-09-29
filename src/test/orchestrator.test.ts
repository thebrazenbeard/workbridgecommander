import test from "node:test";
import assert from "node:assert/strict";
import { WorkContextOrchestrator } from "../orchestrator.js";

test("logic lanes are explicit independently identified work contexts", async () => {
  const o = new WorkContextOrchestrator(32);
  const a = o.create();
  const b = o.create();
  assert.notEqual(a.id, b.id);
  await o.run(a.id, async () => 1);
  assert.equal(o.get(a.id)?.state, "completed");
  assert.equal(o.get(b.id)?.state, "queued");
});

test("effect binding is explicit and device-scoped", () => {
  const o = new WorkContextOrchestrator(32);
  const lane = o.create();
  o.bindEffect(lane.id, "lappy");
  assert.equal(o.get(lane.id)?.effectDevice, "lappy");
  assert.equal(o.get(lane.id)?.state, "waiting-for-effect");
});

test("completed logic-lane history is bounded", async () => {
  const o = new WorkContextOrchestrator(32);
  for (let i = 0; i < 1030; i++) {
    const lane = o.create();
    await o.run(lane.id, async () => i);
  }
  assert.ok(o.list().length <= 1024);
});
