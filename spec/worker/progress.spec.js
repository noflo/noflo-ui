import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { progress } from "../../src/worker/Progress.js";
import { progressPhrase } from "../../src/glass/progressPhrases.js";

describe("operation narration (work document #34)", () => {
  it("renders micro-phrases from the catalog", () => {
    assert.equal(
      progressPhrase(progress("mesh.connect", "discovery", "running")),
      "Waiting for peers",
    );
    assert.equal(
      progressPhrase(progress("persistence.load", "load", "running")),
      "Loading project store",
    );
    assert.equal(
      progressPhrase(progress("mesh.connect", "transport", "running")),
      "Connecting to the relay",
    );
  });

  it("interpolates detail parameters into the phrase", () => {
    assert.equal(
      progressPhrase(
        progress("mesh.connect.path", "request", "running", {
          peer: "a3f2c1d9b4e5f607",
        }),
      ),
      "Requesting a path to peer a3f2c1d9b4e5f607",
    );
  });

  it("renders the failure wording for failed states", () => {
    assert.equal(
      progressPhrase(
        progress("mesh.connect", "transport", "failed", {
          error: "relay unreachable",
        }),
      ),
      "Mesh transport failed: relay unreachable",
    );
  });

  it("falls back to a readable form for unphrased stages", () => {
    assert.equal(
      progressPhrase(progress("mesh.connect", "unknown_stage", "running")),
      "mesh.connect unknown_stage",
    );
  });

  it("omits the detail field when there is nothing to interpolate", () => {
    const message = progress("persistence.load", "load", "running");
    assert.deepEqual(Object.keys(message).sort(), [
      "kind",
      "operation",
      "stage",
      "state",
    ]);
  });
});
