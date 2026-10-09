import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createEngineRegistry } from "../src/graphs/engine-dispatch.js";
import { asPromise } from "../vendor/noflo.js";

/**
 * The vendored @noflo/core component through the Engine's component
 * registry (work document #52): proves the NoFlo 2.x loading path —
 * application-supplied registry, name resolution by the 2.x ecosystem
 * convention, execution of a third-party component inside a network.
 */
describe("vendored @noflo/core components (work document #52)", () => {
  it("resolves core/Repeat through the engine registry and runs it", async () => {
    const run = asPromise("core/Repeat", {
      name: "core-repeat-smoketest",
      registry: createEngineRegistry(),
    });
    const output = await run({ in: "noflo://join/…" });
    assert.equal(output.out, "noflo://join/…");
  });

  it("refuses names outside the registry", async () => {
    const run = asPromise("strings/Replace", {
      name: "unregistered-component-smoketest",
      registry: createEngineRegistry(),
    });
    await assert.rejects(() => run({ in: "x" }));
  });
});
