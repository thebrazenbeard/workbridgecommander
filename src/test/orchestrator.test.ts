import test from "node:test";
import assert from "node:assert/strict";
import { LogicOrchestrator } from "../orchestrator.js";

test("logic lanes are explicit independently identified work contexts", async () => {
  const o = new LogicOrchestrator(32);
  const a = o.create();
  const b = o.create();
  assert.notEqual(a.id, b.id);
  await o.run(a.id, async () => 1);
  assert.equal(o.get(a.id)?.state, "completed");
  assert.equal(o.get(b.id)?.state, "queued");
});

test("effect binding is explicit and device-scoped", () => {
  const o = new LogicOrchestrator(32);
  const lane = o.create();
  o.bindEffect(lane.id, "lappy");
  assert.equal(o.get(lane.id)?.effectDevice, "lappy");
  assert.equal(o.get(lane.id)?.state, "waiting-for-effect");
});
