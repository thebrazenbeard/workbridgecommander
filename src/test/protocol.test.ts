import test from "node:test";
import assert from "node:assert/strict";
import { isNotification } from "../protocol.js";

test("JSON-RPC notifications are messages without an id", () => {
  assert.equal(isNotification({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }), true);
  assert.equal(isNotification({ jsonrpc: "2.0", id: 0, method: "tools/list", params: {} }), false);
});


test("Windows UTF-8 BOM can be stripped before JSON manifest parsing", () => {
  const raw = "\uFEFF" + JSON.stringify({ schema: "WORKBRIDGE_DESKTOP_COMMANDER_DUPLICATE_V1" });
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
  assert.equal(parsed.schema, "WORKBRIDGE_DESKTOP_COMMANDER_DUPLICATE_V1");
});
