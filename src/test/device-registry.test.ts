import test from "node:test";
import assert from "node:assert/strict";
import { DeviceConnection } from "../device-registry.js";

class FakeSocket {
  sent: any[] = [];
  send(data: string, cb?: (error?: Error) => void) {
    this.sent.push(JSON.parse(data));
    cb?.();
  }
  close() {}
}

test("execution capacity is enforced for one device", async () => {
  const socket = new FakeSocket();
  const device = new DeviceConnection("fake", socket as any, 4);
  const requests = Array.from({ length: 12 }, (_, i) => device.request({ jsonrpc: "2.0", id: i + 1, method: "tools/list" }, 5000));
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(socket.sent.length, 4);
  assert.equal(device.activeCount, 4);
  assert.equal(device.queuedCount, 8);

  for (let i = 0; i < 12; i++) {
    let wire = socket.sent[i];
    for (let spin = 0; !wire && spin < 100; spin++) { await new Promise(resolve => setTimeout(resolve, 1)); wire = socket.sent[i]; }
    assert.ok(wire, `request ${i + 1} was not dispatched after a lane released`);
    device.accept({ type: "response", requestId: wire.requestId, payload: { jsonrpc: "2.0", id: i + 1, result: {} } });
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  await Promise.all(requests);
  assert.equal(device.activeCount, 0);
  assert.equal(device.queuedCount, 0);
});

test("disconnect rejects in-flight requests and a replacement does not replay them", async () => {
  const firstSocket = new FakeSocket();
  const first = new DeviceConnection("fake", firstSocket as any, 4);
  const pending = first.request({ jsonrpc: "2.0", id: 99, method: "tools/list" }, 5000);
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(firstSocket.sent.length, 1);
  first.close("lost");
  await assert.rejects(pending, /lost/);

  const replacementSocket = new FakeSocket();
  new DeviceConnection("fake", replacementSocket as any, 4);
  assert.equal(replacementSocket.sent.length, 0);
});
