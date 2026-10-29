import test from "node:test";
import assert from "node:assert/strict";
import { createChildEnvironment } from "../child-environment.js";

test("qualified command-capable child receives only OS bootstrap variables and its explicit flag", () => {
  const parent = {
    Path: "C:\\Windows\\System32",
    SystemRoot: "C:\\Windows",
    TEMP: "C:\\Temp",
    APPDATA: "C:\\Users\\Patrick\\AppData\\Roaming",
    WORKBRIDGE_DEVICE_TOKEN: "do-not-leak-device",
    WORKBRIDGE_CLIENT_TOKEN: "do-not-leak-client",
    WORKBRIDGE_SERVICE_URL: "do-not-leak-service",
    GITHUB_TOKEN: "do-not-leak-github",
    AWS_SECRET_ACCESS_KEY: "do-not-leak-aws",
    NODE_OPTIONS: "--require evil.js",
    DC_REMOTE_DEVICE: "false",
    UNRECOGNIZED_KEY: "do-not-leak-unknown"
  };

  const child = createChildEnvironment(parent);
  assert.deepEqual(child, {
    Path: "C:\\Windows\\System32",
    SystemRoot: "C:\\Windows",
    TEMP: "C:\\Temp",
    APPDATA: "C:\\Users\\Patrick\\AppData\\Roaming",
    DC_REMOTE_DEVICE: "true"
  });
  assert.equal(parent.WORKBRIDGE_DEVICE_TOKEN, "do-not-leak-device", "input environment is not mutated");
});

test("child environment preserves necessary POSIX paths but no unrelated credentials", () => {
  const child = createChildEnvironment({
    PATH: "/usr/local/bin:/usr/bin",
    HOME: "/home/patrick",
    LANG: "en_US.UTF-8",
    TMPDIR: "/tmp",
    WORKBRIDGE_DEVICE_TOKEN: "sensitive",
    workbridge_client_token: "also-sensitive",
    OPENAI_API_KEY: "sensitive",
    NODE_OPTIONS: "--import=malicious",
    DC_REMOTE_DEVICE: "false"
  });

  assert.deepEqual(child, {
    PATH: "/usr/local/bin:/usr/bin",
    HOME: "/home/patrick",
    LANG: "en_US.UTF-8",
    TMPDIR: "/tmp",
    DC_REMOTE_DEVICE: "true"
  });
});
