import test from "node:test";
import assert from "node:assert/strict";
import { capacityConfig, qualificationStatus } from "../config.js";

test("4/32 are default qualification floors, not architectural ceilings", () => {
  const defaults = capacityConfig({});
  assert.deepEqual(defaults, { executionPerDevice: 4, logic: 32 });
  const scaled = capacityConfig({ WORKBRIDGE_EXECUTION_CAPACITY: "12", WORKBRIDGE_LOGIC_CAPACITY: "128" });
  assert.deepEqual(scaled, { executionPerDevice: 12, logic: 128 });
  assert.deepEqual(qualificationStatus(scaled), {
    executionFloor: 4, logicFloor: 32, executionMeetsFloor: true, logicMeetsFloor: true
  });
});

test("runtime may deliberately configure below qualification floor without lying about qualification", () => {
  const small = capacityConfig({ WORKBRIDGE_EXECUTION_CAPACITY: "2", WORKBRIDGE_LOGIC_CAPACITY: "8" });
  assert.equal(qualificationStatus(small).executionMeetsFloor, false);
  assert.equal(qualificationStatus(small).logicMeetsFloor, false);
});
