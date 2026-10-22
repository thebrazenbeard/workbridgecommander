import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const quote = (s: string) => "'" + s.replaceAll("'", "''") + "'";
test("recovery installer validates all startup anchors and dry run leaves runtime files unchanged",
  { skip: process.platform !== "win32", timeout: 60000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), "commander-recovery-"));
  try {
    const payload = join(root, "payload");
    await mkdir(payload);
    await writeFile(join(payload, "package.json"), '{"fixture":true}');
    const launcher = join(root, "Start-WorkBridgeCommander.ps1");
    const fixture = [
      "function Stop-PriorRuntime {}",
      "$server = Start-Process -FilePath $node -PassThru",
      "$device = Start-Process -FilePath $node -PassThru",
      "$tunnel = Start-Process -FilePath $node -PassThru",
      ""
    ].join("\n");
    await writeFile(launcher, fixture);
    const command = "& " + quote(resolve("scripts/lappy-recovery/Install-WorkBridgeCommanderRecovery.ps1")) +
      " -Root " + quote(root) + " -InstallRoot " + quote(payload);
    const run = () => spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand",
      Buffer.from(command, "utf16le").toString("base64")], { encoding: "utf8", timeout: 20000 });
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(result.stdout);
    assert.equal(plan.installed, false);
    assert.equal(plan.startup, "user-logon");
    assert.equal(plan.run_level, "Highest");
    assert.equal(plan.partial_state_writes, 3);
    assert.equal(await readFile(launcher, "utf8"), fixture);
    assert.equal(await readFile(join(payload, "package.json"), "utf8"), '{"fixture":true}');
    assert.deepEqual((await readdir(root)).sort(), ["Start-WorkBridgeCommander.ps1", "payload"]);
    await writeFile(launcher, "# unexpected launcher revision");
    const rejected = run();
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Unsupported launcher/);
    assert.deepEqual((await readdir(root)).sort(), ["Start-WorkBridgeCommander.ps1", "payload"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
