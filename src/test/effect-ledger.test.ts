import test from "node:test";
import assert from "node:assert/strict";
import { EffectLedger } from "../effect-ledger.js";

test("effect lifecycle preserves ambiguous post-dispatch outcome", () => {
  const ledger = new EffectLedger();
  ledger.create("r1", "dev", 7, false);
  ledger.transition("r1", "ADMITTED");
  ledger.transition("r1", "DISPATCHED");
  const final = ledger.transition("r1", "OUTCOME_UNKNOWN");
  assert.equal(final.generation, 7);
  assert.equal(final.replaySafe, false);
  assert.equal(final.disposition, "OUTCOME_UNKNOWN");
});

test("replay safety is explicit rather than inferred from failure", () => {
  const ledger = new EffectLedger();
  assert.equal(ledger.create("unsafe", "dev", 1).replaySafe, false);
  assert.equal(ledger.create("safe", "dev", 1, true).replaySafe, true);
});
