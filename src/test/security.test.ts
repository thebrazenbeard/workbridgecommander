import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { isOriginAllowed, assertSafeDeviceServiceUrl, resolveInsideRoot } from "../security.js";

test("origin allowlist permits absent non-browser origin and exact configured origins", () => {
  assert.equal(isOriginAllowed(undefined, ["https://chatgpt.com"]), true);
  assert.equal(isOriginAllowed("https://chatgpt.com", ["https://chatgpt.com"]), true);
  assert.equal(isOriginAllowed("https://evil.example", ["https://chatgpt.com"]), false);
});

test("device transport requires TLS except explicit loopback development", () => {
  assert.doesNotThrow(() => assertSafeDeviceServiceUrl(new URL("https://commander.example")));
  assert.doesNotThrow(() => assertSafeDeviceServiceUrl(new URL("http://127.0.0.1:8787")));
  assert.throws(() => assertSafeDeviceServiceUrl(new URL("http://commander.example")), /TLS/);
});

test("manifest relative paths cannot escape the qualified install root", () => {
  const root = path.resolve("qualified-root");
  assert.equal(resolveInsideRoot(root, "dist/index.js"), path.resolve(root, "dist/index.js"));
  assert.throws(() => resolveInsideRoot(root, "../outside"), /escapes/);
  assert.throws(() => resolveInsideRoot(root, path.resolve(root, "..", "outside")), /relative/);
});
