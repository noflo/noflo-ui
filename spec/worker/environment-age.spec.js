import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createEnvironmentAge } from "../../src/worker/EnvironmentAge.js";

describe("the environment age aggregator (work documents #30 update #3, #3)", () => {
  it("the sketch stays abstract where the mesh is unused", () => {
    const age = createEnvironmentAge();
    assert.equal(age.compute(), "abstract", "no mesh, no runtime: sketching");
    // A disabled mesh is not Offline — the sketch works without it
    const disabled = createEnvironmentAge();
    disabled.absorb({
      kind: "mesh-config",
      config: { enabled: false },
    });
    assert.equal(disabled.compute(), "abstract", "disabled mesh: abstract");
  });

  it("the mesh in use and down reads Offline; up returns to abstract", () => {
    const age = createEnvironmentAge();
    age.absorb({ kind: "mesh-config", config: { enabled: true } });
    assert.equal(
      age.compute(),
      "offline",
      "enabled and not yet proven up: the mesh is down until it connects",
    );
    age.absorb({ kind: "mesh-status", connected: false });
    assert.equal(age.compute(), "offline", "enabled and not connected");
    age.absorb({ kind: "mesh-status", connected: true });
    assert.equal(age.compute(), "abstract", "connected: back to the sketch");
    age.absorb({ kind: "mesh-status", error: "identity lost" });
    assert.equal(age.compute(), "offline", "a mesh error is offline");
  });

  it("a live network earns golden — connected and running", () => {
    const age = createEnvironmentAge();
    age.absorb({ kind: "mesh-config", config: { enabled: true } });
    age.absorb({ kind: "mesh-status", connected: true });
    age.absorb({
      kind: "runtime-connection",
      destinationHash: "a".repeat(32),
      state: "connected",
    });
    assert.equal(age.compute(), "abstract", "connected but stopped: sketch");
    age.absorb({
      kind: "runtime-run",
      destinationHash: "a".repeat(32),
      state: "running",
    });
    assert.equal(age.compute(), "golden", "running: golden");
    age.absorb({
      kind: "runtime-run",
      destinationHash: "a".repeat(32),
      state: "stopped",
    });
    assert.equal(age.compute(), "abstract", "stopped: the sketch returns");
  });

  it("crash is not deferred: any error flips the environment at once", () => {
    const age = createEnvironmentAge();
    age.absorb({ kind: "mesh-config", config: { enabled: true } });
    age.absorb({ kind: "mesh-status", connected: true });
    age.absorb({
      kind: "runtime-connection",
      destinationHash: "a".repeat(32),
      state: "connected",
    });
    age.absorb({
      kind: "runtime-run",
      destinationHash: "a".repeat(32),
      state: "running",
    });
    assert.equal(age.compute(), "golden");
    age.absorb({
      kind: "runtime-run",
      destinationHash: "b".repeat(32),
      state: "error",
    });
    assert.equal(age.compute(), "crashed", "a crashed constituent wins");
    // Even an offline mesh cannot mask the crash
    age.absorb({ kind: "mesh-status", connected: false });
    assert.equal(age.compute(), "crashed", "crash outranks offline");
  });
});
