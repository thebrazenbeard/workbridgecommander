import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const script = readFileSync(path.resolve("scripts/Bootstrap-WorkBridgeCommanderLappy.ps1"), "utf8");

test("bootstrap requires explicit and matching installed ChatGPT tunnel identity", () => {
  assert.match(script, /\[Parameter\(Mandatory = \$true\)\]\s*\[ValidatePattern\('\^tunnel_/);
  assert.match(script, /\[string\]\$ConfirmedInstalledAppTunnelId/);
  assert.match(script, /\$TunnelId -cne \$ConfirmedInstalledAppTunnelId/);
  assert.doesNotMatch(script, /\[string\]\$TunnelId\s*=/);
});

test("bootstrap blocks unsafe existing/untracked service replacement before filesystem writes", () => {
  const mutation = script.indexOf("New-Item -ItemType Directory");
  assert.ok(mutation > 0);
  for (const guard of [
    "explicit -ReplaceExistingRuntime is required",
    "Refusing to replace an existing runtime bound to a different tunnel",
    "Recorded PID $($recorded.Pid) no longer belongs",
    "Port 8787 has an untracked listener",
    "Port 8787 is not exclusively owned",
    "Untracked tunnel-client process exists"
  ]) {
    const position = script.indexOf(guard);
    assert.ok(position > 0 && position < mutation, `${guard} must precede first filesystem mutation`);
  }
  assert.match(script, /Assert-RecordedProcess \(\[int\]\$state\.tunnel_pid\)/);
  assert.match(script, /Assert-RecordedProcess \(\[int\]\$state\.server_pid\)/);
});

test("bootstrap requires a reviewed source commit with no stale default and rejects obsolete heads", () => {
  assert.match(script, /\[Parameter\(Mandatory = \$true\)\]\s*\[ValidatePattern\('\^\[0-9a-fA-F\]\{40\}\$'\)\]\s*\[string\]\$ReviewedCommanderCommit/);
  assert.match(script, /\$CommanderCommit = \$ReviewedCommanderCommit\.ToLowerInvariant\(\)/);
  assert.doesNotMatch(script, /\[string\]\$ReviewedCommanderCommit\s*=/);
  assert.match(script, /\$CommanderCommit -in @\(/);
  assert.match(script, /40e523f75771a83b4be666940c6fdec3f8ffe445/);
  assert.match(script, /1692c54595ee2974c48719ad5e7de528089a70ff/);
  assert.match(script, /Refusing an obsolete Commander source commit/);
  assert.ok(script.indexOf("Refusing an obsolete Commander source commit") < script.indexOf("New-Item -ItemType Directory"));
  assert.match(script, /\$git fetch origin \$CommanderCommit --depth=1/);
  assert.match(script, /\$git checkout --detach \$CommanderCommit/);
});

test("bootstrap preserves unknown source directories and checks tunnel custody even with state", () => {
  assert.match(script, /Refusing to overwrite an existing non-Git source directory/);
  assert.doesNotMatch(script, /Remove-Item -LiteralPath \$SourceRoot -Recurse/);
  assert.match(script, /\$tunnelProcesses = @\(Get-CimInstance Win32_Process/);
  assert.match(script, /\$recordedTunnelPid = if \(\$null -ne \$existingState\)/);
  assert.match(script, /Where-Object \{ \[int\]\$_\.ProcessId -ne \$recordedTunnelPid \}/);
});

test("bootstrap does not claim process execution from tool listing alone", () => {
  assert.match(script, /local_start_process_verified = \$false/);
  assert.doesNotMatch(script, /local_start_process_verified = \$true/);
  assert.match(script, /start_process listed; execution not verified/);
});
