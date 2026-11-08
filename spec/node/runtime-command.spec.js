import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createRuntimeCommand } from "../../src/node/runtimeCommand.js";

/**
 * A fake runtime manager: the seams the command reads, with the status
 * transitions the real one makes.
 *
 * @param {Object} [overrides]
 * @returns {any}
 */
function fakeManager(overrides = {}) {
  /** @type {string} */
  let status = overrides.initialStatus ?? "stopped";
  return {
    calls: [],
    status: () => status,
    destinationHash: () => "ab12".repeat(16),
    async start() {
      this.calls.push("start");
      status = "running";
    },
    async stop() {
      this.calls.push("stop");
      status = "stopped";
    },
    ...overrides,
  };
}

describe("the /runtime chat command (work document #47 item 3)", () => {
  it("reports the no-project state without a manager", async () => {
    const command = createRuntimeCommand(null);
    const reply = await command("start");
    assert.match(reply, /no active project/);
  });

  it("start runs the manager and names the announce destination", async () => {
    const manager = fakeManager();
    const command = createRuntimeCommand(manager);
    const reply = await command("start");
    assert.deepEqual(manager.calls, ["start"]);
    assert.match(reply, /runtime started/);
    assert.match(reply, /Destination: ab12/);
    assert.match(
      reply,
      /Dacar state as a replica/,
      "the trust model is stated honestly",
    );
  });

  it("start on a running runtime refuses without spawning again", async () => {
    const manager = fakeManager({ initialStatus: "running" });
    const command = createRuntimeCommand(manager);
    const reply = await command("start");
    assert.deepEqual(manager.calls, [], "no start call");
    assert.match(reply, /already running/);
  });

  it("stop stops a running runtime; a stopped one is a no-op reply", async () => {
    const manager = fakeManager({ initialStatus: "running" });
    const command = createRuntimeCommand(manager);
    assert.match(await command("stop"), /runtime stopped/);
    assert.deepEqual(manager.calls, ["stop"]);
    assert.match(await command("stop"), /not running/);
    assert.deepEqual(manager.calls, ["stop"], "no second stop call");
  });

  it("status is the default, with usage when the argument is unknown", async () => {
    const manager = fakeManager();
    const command = createRuntimeCommand(manager);
    assert.match(await command(""), /^runtime: stopped/);
    assert.match(await command("status"), /^runtime: stopped/);
    assert.match(
      await command("frobnicate"),
      /\/runtime start \| stop \| status/,
    );
    assert.deepEqual(manager.calls, [], "status never spawns");
  });

  it("status names the destination while running", async () => {
    const manager = fakeManager({ initialStatus: "running" });
    const command = createRuntimeCommand(manager);
    const reply = await command("status");
    assert.match(reply, /runtime: running/);
    assert.match(reply, /announcing as ab12/);
  });

  it("a manager without the destinationHash seam still replies", async () => {
    const manager = fakeManager();
    delete manager.destinationHash;
    const command = createRuntimeCommand(manager);
    const reply = await command("start");
    assert.match(reply, /runtime started/);
    assert.ok(!reply.includes("Destination:"), "the hash line stays out");
  });
});
