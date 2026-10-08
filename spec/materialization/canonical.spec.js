import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canonicalGraph,
  serializeGraph,
} from "../../src/materialization/canonical.js";

/**
 * A view with every collection populated, in deliberately unsorted order.
 *
 * @returns {any}
 */
function sampleView() {
  return {
    processes: {
      Log: { component: "core/Output", metadata: { x: 200, y: 80 } },
      Read: { component: "fs/ReadFile", metadata: { x: 10, y: 20 } },
    },
    connections: [
      {
        src: { process: "Log", port: "out" },
        tgt: { process: "Read", port: "in", index: 2 },
        metadata: { route: 5 },
      },
      {
        src: { process: "Read", port: "out" },
        tgt: { process: "Log", port: "in" },
        metadata: {},
      },
      {
        data: "file.txt",
        tgt: { process: "Read", port: "source" },
        metadata: { id: "DATA->Read:source" },
      },
    ],
    inports: {
      input: { process: "Read", port: "source" },
    },
    outports: {
      output: { process: "Log", port: "out", metadata: { route: 3 } },
    },
    groups: [{ id: "g1", name: "Pipeline", nodes: ["Log", "Read"] }],
    properties: { name: "Main", id: "p1" },
  };
}

describe("canonical graph serialization (work document #43)", () => {
  it("is deterministic: key and collection order are fixed", () => {
    const view = sampleView();
    // A reshuffled input (reversed collections) must serialize identically:
    // the CRDT materializes its collections in arbitrary order
    const reshuffled = {
      ...view,
      processes: { Read: view.processes.Read, Log: view.processes.Log },
      connections: [...view.connections].reverse(),
      groups: [...view.groups],
    };
    assert.equal(serializeGraph(reshuffled), serializeGraph(view));
  });

  it("round-trips stably: parse → serialize → identical bytes", () => {
    const once = serializeGraph(sampleView());
    const twice = serializeGraph(JSON.parse(once));
    assert.equal(twice, once, "byte-stable round trip");
  });

  it("carries addressable slots and IIPs through the interchange shape", () => {
    const canonical = canonicalGraph(sampleView());
    const indexed = canonical.connections.find(
      (/** @type {any} */ c) => c.tgt?.index !== undefined,
    );
    assert.equal(indexed.tgt.process, "Read");
    assert.equal(indexed.tgt.port, "in");
    assert.equal(indexed.tgt.index, 2, "the addressable slot survives");
    const iip = canonical.connections.find(
      (/** @type {any} */ c) => c.data !== undefined,
    );
    assert.equal(iip.data, "file.txt");
    assert.equal(iip.tgt.process, "Read");
    assert.equal(iip.src, undefined, "IIPs have no src");
  });
});
