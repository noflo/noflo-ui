import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "../elements/utils/register.js";

import {
  createIntentMapper,
  hasCompatiblePort,
  portDataTypeFor,
} from "../../src/glass/intentMapping.js";

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

describe("edge splice (work document #5 update #15)", () => {
  /**
   * A library whose components carry typed ports.
   *
   * @returns {any}
   */
  function typedLibrary() {
    return {
      getComponent: (/** @type {string} */ name) =>
        ({
          fresh: {
            inports: [
              { name: "data", type: "number" },
              { name: "in", type: "number" },
            ],
            outports: [{ name: "out", type: "string" }],
          },
          src: {
            inports: [],
            outports: [{ name: "out", type: "number" }],
          },
          tgt: {
            inports: [{ name: "in", type: "string" }],
            outports: [],
          },
        })[name],
      listComponents: () => ["fresh", "src", "tgt"],
    };
  }

  it("splices the picked node into the edge on the most compatible ports", async () => {
    /** @type {any[]} */
    const sent = [];
    const mapper = createIntentMapper({
      sendIntent: (message) => sent.push(message),
      graphId: () => "main",
      getLibrary: typedLibrary,
      pickComponent: async () => "fresh",
    });
    const ed = document.createElement("div");
    document.body.appendChild(ed);
    mapper.wire(ed);

    ed.dispatchEvent(
      new CustomEvent("splice-node-attempt", {
        detail: {
          edgeId: "edge-1",
          src: { node: "src", port: "out" },
          tgt: { node: "tgt", port: "in" },
          x: 10,
          y: 20,
        },
        bubbles: true,
        composed: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(
      sent.map((message) => message.command),
      ["addNode"],
    );
    const nodeId = sent[0].payload.nodeId;
    mapper.flushPending(() => true);

    const addEdges = sent
      .filter((message) => message.command === "addEdge")
      .map((message) => message.payload);
    assert.equal(addEdges.length, 2, "the edge rewires through the node");
    const removal = sent.find((message) => message.command === "removeEdge");
    assert.ok(removal, "the original edge is removed");
    assert.equal(removal.payload.id, "edge-1");
    assert.deepEqual(
      addEdges[0].src,
      { node: "src", port: "out" },
      "the source stays",
    );
    assert.equal(addEdges[0].tgt.node, nodeId);
    assert.equal(
      addEdges[0].tgt.port,
      "in",
      "the preferred in port wins over data",
    );
    assert.equal(addEdges[1].src.node, nodeId);
    assert.equal(addEdges[1].src.port, "out", "the preferred out port");
    assert.deepEqual(addEdges[1].tgt, { node: "tgt", port: "in" });
    ed.remove();
  });

  it("the guiding only offers components fitting the edge's datatypes", () => {
    // The candidate filter's building blocks, exercised directly
    assert.ok(hasCompatiblePort([{ name: "in", type: "number" }], "number"));
    assert.ok(hasCompatiblePort([{ name: "in", type: "all" }], "number"));
    assert.ok(
      !hasCompatiblePort([{ name: "in", type: "string" }], "number"),
      "mismatched types do not fit",
    );
    assert.equal(
      portDataTypeFor(typedLibrary(), "src", "outports", "out"),
      "number",
    );
  });

  it("the create path prefills the signature from the edge's datatypes", async () => {
    /** @type {any[]} */
    const sent = [];
    const mapper = createIntentMapper({
      sendIntent: (message) => sent.push(message),
      graphId: () => "main",
      getLibrary: typedLibrary,
      pickComponent: async () => ({
        name: "made-here",
        signature: {
          inports: [{ name: "in", type: "number" }],
          outports: [{ name: "out", type: "string" }],
        },
      }),
    });
    const ed = document.createElement("div");
    document.body.appendChild(ed);
    mapper.wire(ed);

    ed.dispatchEvent(
      new CustomEvent("splice-node-attempt", {
        detail: {
          edgeId: "edge-1",
          src: { node: "src", port: "out" },
          tgt: { node: "tgt", port: "in" },
          x: 10,
          y: 20,
        },
        bubbles: true,
        composed: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    mapper.flushPending(() => true);
    const commands = sent.map((message) => message.command);
    assert.ok(commands.includes("setSignature"), "the prefill lands");
    const signature = sent.find((message) => message.command === "setSignature")
      ?.payload?.signature;
    assert.deepEqual(signature, {
      inports: [{ name: "in", type: "number" }],
      outports: [{ name: "out", type: "string" }],
    });
    ed.remove();
  });
});
