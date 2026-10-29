import test from "node:test";
import assert from "node:assert/strict";
import { capacityConfig, listenHost, qualificationStatus } from "../config.js";

test("workstation-control listener defaults to loopback and requires explicit remote opt-in", () => {
  assert.equal(listenHost({}), "127.0.0.1");
  assert.equal(listenHost({ HOST: "" }), "127.0.0.1");
  assert.equal(listenHost({ HOST: "127.0.0.1" }), "127.0.0.1");
  assert.equal(listenHost({ HOST: "0.0.0.0" }), "0.0.0.0");
});

test("4/32 are default qualification floors, not architectural ceilings", () => {
  const defaults = capacityConfig({});
  assert.deepEqual(defaults, { executionPerDevice: 4, upstreamContexts: 32 });
  const scaled = capacityConfig({ WORKBRIDGE_EXECUTION_CAPACITY: "12", WORKBRIDGE_UPSTREAM_CONTEXT_CAPACITY: "128" });
  assert.deepEqual(scaled, { executionPerDevice: 12, upstreamContexts: 128 });
  assert.deepEqual(qualificationStatus(scaled), {
    executionFloor: 4, upstreamContextFloor: 32, executionMeetsFloor: true, upstreamContextMeetsFloor: true
  });
});

test("runtime may deliberately configure below qualification floor without lying about qualification", () => {
  const small = capacityConfig({ WORKBRIDGE_EXECUTION_CAPACITY: "2", WORKBRIDGE_UPSTREAM_CONTEXT_CAPACITY: "8" });
  assert.equal(qualificationStatus(small).executionMeetsFloor, false);
  assert.equal(qualificationStatus(small).upstreamContextMeetsFloor, false);
});
