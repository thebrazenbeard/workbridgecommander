import test from "node:test";
import assert from "node:assert/strict";
import { bearerAuthorized, tokenAuthorized } from "../auth.js";

test("bearer authentication is exact", () => {
  assert.equal(bearerAuthorized("Bearer secret", "secret"), true);
  assert.equal(bearerAuthorized("Bearer wrong", "secret"), false);
  assert.equal(bearerAuthorized(undefined, "secret"), false);
});

test("device token authentication is exact", () => {
  assert.equal(tokenAuthorized("abc", "abc"), true);
  assert.equal(tokenAuthorized("abcd", "abc"), false);
});
