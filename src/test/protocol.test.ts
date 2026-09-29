import test from "node:test";
import assert from "node:assert/strict";
import { isNotification } from "../protocol.js";

test("JSON-RPC notifications are messages without an id", () => {
  assert.equal(isNotification({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }), true);
  assert.equal(isNotification({ jsonrpc: "2.0", id: 0, method: "tools/list", params: {} }), false);
});
