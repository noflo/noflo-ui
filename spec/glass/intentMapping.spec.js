import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "../elements/utils/register.js";

import { createIntentMapper } from "../../src/glass/intentMapping.js";

/**
 * A port element stub for the mapper's port-driven flows.
 *
 * @param {{ out?: boolean, type?: string, name?: string }} options
 * @returns {any}
 */
function fakePort({ out = true, type = "number", name = "out" } = {}) {
  return {
    classList: { contains: (cls) => cls === (out ? "port-out" : "port-in") },
    dataset: { portName: name, portDataType: type },
    getRootNode: () => ({}),
    closest: () => null,
  };
}

describe("typed-port prefill (work document #29 update #1)", () => {
  it("queues the prefilled signature once the created node exists", async () => {
    /** @type {any[]} */
    const sent = [];
    const mapper = createIntentMapper({
      sendIntent: (message) => sent.push(message),
      graphId: () => "main",
      getLibrary: () => null,
      pickComponent: async () => ({
        name: "fresh",
        signature: {
          inports: [{ name: "in", type: "number" }],
          outports: [{ name: "out", type: "all" }],
        },
      }),
    });
    const ed = document.createElement("div");
    document.body.appendChild(ed);
    mapper.wire(ed);

    ed.dispatchEvent(
      new CustomEvent("node-creation-attempt", {
        detail: { x: 10, y: 20, startPort: fakePort() },
        bubbles: true,
        composed: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));

    // addNode goes straight out; the prefill waits for the node to exist
    assert.deepEqual(
      sent.map((message) => message.command),
      ["addNode"],
      "only addNode before the node exists",
    );
    const nodeId = sent[0].payload.nodeId;

    mapper.flushPending(() => true);
    const queued = sent.slice(1).map((message) => message.command);
    assert.deepEqual(
      queued,
      ["setSignature", "addEdge"],
      "the signature lands before the wire",
    );
    assert.deepEqual(sent[1].payload, {
      component: "fresh",
      signature: {
        inports: [{ name: "in", type: "number" }],
        outports: [{ name: "out", type: "all" }],
      },
    });
    assert.equal(sent[2].payload.tgt.node, nodeId);
    assert.equal(
      sent[2].payload.tgt.port,
      "in",
      "the wire targets the default inport",
    );
    ed.remove();
  });

  it("a string pick keeps the prompt-era behavior without prefill", async () => {
    /** @type {any[]} */
    const sent = [];
    const mapper = createIntentMapper({
      sendIntent: (message) => sent.push(message),
      graphId: () => "main",
      getLibrary: () => null,
      pickComponent: async () => "existing",
    });
    const ed = document.createElement("div");
    document.body.appendChild(ed);
    mapper.wire(ed);

    ed.dispatchEvent(
      new CustomEvent("node-creation-attempt", {
        detail: { x: 10, y: 20, startPort: null },
        bubbles: true,
        composed: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(
      sent.map((message) => message.command),
      ["addNode"],
    );
    assert.equal(sent[0].payload.componentName, "existing");
    assert.equal(sent[0].payload.componentName, sent[0].payload.componentName);
    ed.remove();
  });
});
