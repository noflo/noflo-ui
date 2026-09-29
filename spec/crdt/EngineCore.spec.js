import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createEngineState, handleMessage } from "../../src/crdt/EngineCore.js";
import {
  createProjectDoc,
  getGraph,
  getNode,
  getProjectMetadata,
  setComponentSignature,
} from "../../src/crdt/ProjectDoc.js";

/** @param {import("yjs").Doc} doc @param {any} message */
function handle(doc, message) {
  return handleMessage(doc, createEngineState(), message);
}

describe("envelope validation", () => {
  it("rejects malformed messages without mutating state", () => {
    const doc = createProjectDoc("p");
    const before = doc.toJSON();

    for (const message of [
      null,
      {},
      { type: "INTENT" },
      { type: "INTENT", command: "addNode" },
      { type: "INTENT", command: "addNode", payload: null },
      { type: "WAT", command: "nope", payload: {} },
    ]) {
      const result = handleMessage(doc, createEngineState(), message);
      assert.equal(
        result.accepted,
        false,
        `rejects ${JSON.stringify(message)}`,
      );
      assert.deepEqual(result.echoes, []);
    }

    assert.deepEqual(doc.toJSON(), before, "document untouched");
  });
});

describe("lifecycle", () => {
  it("tracks subscriptions", () => {
    const state = createEngineState();
    const result = handleMessage(createProjectDoc("p"), state, {
      type: "LIFECYCLE",
      command: "subscribe",
      payload: { graphId: "main" },
    });
    assert.equal(result.accepted, true);
    assert.deepEqual(result.echoes, []);
    assert.ok(state.subscriptions.has("main"));
  });

  it("rejects malformed subscribe messages", () => {
    const state = createEngineState();
    const result = handleMessage(createProjectDoc("p"), state, {
      type: "LIFECYCLE",
      command: "subscribe",
      payload: {},
    });
    assert.equal(result.accepted, false);
    assert.equal(state.subscriptions.size, 0);
  });
});

describe("intents", () => {
  it("addNode creates the graph lazily and echoes addnode", () => {
    const doc = createProjectDoc("p");
    const result = handle(doc, {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "Read",
        componentName: "fs/ReadFile",
        metadata: { x: 100, y: 50 },
      },
    });

    assert.equal(result.accepted, true);
    assert.deepEqual(result.echoes, [
      {
        protocol: "graph",
        command: "addnode",
        payload: {
          id: "Read",
          component: "fs/ReadFile",
          metadata: { x: 100, y: 50 },
        },
      },
    ]);

    const node = getNode(getGraph(doc, "main"), "Read");
    assert.ok(node, "node is in the CRDT");
    assert.equal(node.get("component"), "fs/ReadFile");
  });

  it("addNode rejects duplicates without mutating", () => {
    const doc = createProjectDoc("p");
    const add = {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "Read",
        componentName: "fs/ReadFile",
        metadata: { x: 0, y: 0 },
      },
    };
    handle(doc, add);
    const before = doc.toJSON();

    const result = handle(doc, add);
    assert.equal(result.accepted, false);
    assert.deepEqual(result.echoes, []);
    assert.deepEqual(doc.toJSON(), before);
  });

  it("addNode rejects non-numeric coordinates", () => {
    const doc = createProjectDoc("p");
    const result = handle(doc, {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "Read",
        componentName: "fs/ReadFile",
        metadata: { x: "100", y: 50 },
      },
    });
    assert.equal(result.accepted, false);
    assert.equal(getGraph(doc, "main"), undefined);
  });

  it("moveNode echoes movenode with the authoritative coordinates", () => {
    const doc = createProjectDoc("p");
    handle(doc, {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "Read",
        componentName: "c",
        metadata: { x: 0, y: 0 },
      },
    });

    const result = handle(doc, {
      type: "INTENT",
      command: "moveNode",
      payload: { graphId: "main", nodeId: "Read", metadata: { x: 42, y: 24 } },
    });

    assert.equal(result.accepted, true);
    assert.deepEqual(result.echoes, [
      {
        protocol: "graph",
        command: "movenode",
        payload: { id: "Read", metadata: { x: 42, y: 24 } },
      },
    ]);
    assert.equal(
      getNode(getGraph(doc, "main"), "Read").get("metadata").get("x"),
      42,
    );
  });

  it("addEdge and removeEdge round-trip through deterministic ids", () => {
    const doc = createProjectDoc("p");
    handle(doc, {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "A",
        componentName: "c",
        metadata: { x: 0, y: 0 },
      },
    });
    handle(doc, {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "B",
        componentName: "c",
        metadata: { x: 9, y: 9 },
      },
    });

    const result = handle(doc, {
      type: "INTENT",
      command: "addEdge",
      payload: {
        graphId: "main",
        src: { node: "A", port: "out", index: 2 },
        tgt: { node: "B", port: "in" },
      },
    });

    assert.equal(result.accepted, true);
    assert.equal(result.echoes[0].command, "addedge");
    assert.equal(result.echoes[0].payload.id, "A:out[2]->B:in[0]");
    assert.ok(getGraph(doc, "main").get("edges").has("A:out[2]->B:in[0]"));

    const removal = handle(doc, {
      type: "INTENT",
      command: "removeEdge",
      payload: { graphId: "main", id: "A:out[2]->B:in[0]" },
    });
    assert.equal(removal.accepted, true);
    assert.deepEqual(removal.echoes, [
      {
        protocol: "graph",
        command: "removeedge",
        payload: { id: "A:out[2]->B:in[0]" },
      },
    ]);
    assert.equal(getGraph(doc, "main").get("edges").size, 0);
  });

  it("addEdge rejects dangling endpoints", () => {
    const doc = createProjectDoc("p");
    const result = handle(doc, {
      type: "INTENT",
      command: "addEdge",
      payload: {
        graphId: "main",
        src: { node: "Missing", port: "out" },
        tgt: { node: "B", port: "in" },
      },
    });
    assert.equal(result.accepted, false);
    assert.equal(
      getGraph(doc, "main"),
      undefined,
      "no lazy graph for rejected intent",
    );
  });

  it("removeNode echoes and cascades", () => {
    const doc = createProjectDoc("p");
    handle(doc, {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "A",
        componentName: "c",
        metadata: { x: 0, y: 0 },
      },
    });
    handle(doc, {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "B",
        componentName: "c",
        metadata: { x: 1, y: 1 },
      },
    });
    handle(doc, {
      type: "INTENT",
      command: "addEdge",
      payload: {
        graphId: "main",
        src: { node: "A", port: "out" },
        tgt: { node: "B", port: "in" },
      },
    });

    const result = handle(doc, {
      type: "INTENT",
      command: "removeNode",
      payload: { graphId: "main", nodeId: "A" },
    });

    assert.equal(result.accepted, true);
    assert.deepEqual(result.echoes, [
      { protocol: "graph", command: "removenode", payload: { id: "A" } },
    ]);
    assert.equal(
      getGraph(doc, "main").get("edges").size,
      0,
      "cascade removed the edge",
    );
    assert.equal(getNode(getGraph(doc, "main"), "A"), undefined);
  });

  it("queries reject unknown graphs without lazy creation", () => {
    const doc = createProjectDoc("p");
    const result = handle(doc, {
      type: "INTENT",
      command: "removeNode",
      payload: { graphId: "nope", nodeId: "A" },
    });
    assert.equal(result.accepted, false);
    assert.equal(getGraph(doc, "nope"), undefined);
  });
});

describe("queries", () => {
  it("getSignature returns the registry signature", () => {
    const doc = createProjectDoc("p");
    setComponentSignature(doc, "c/Parser", {
      inports: [{ name: "in", type: "string" }],
      outports: [],
    });

    const result = handle(doc, {
      type: "QUERY",
      command: "getSignature",
      payload: { componentName: "c/Parser" },
    });

    assert.equal(result.accepted, true);
    assert.equal(result.echoes[0].protocol, "system");
    assert.equal(result.echoes[0].command, "signature");
    assert.equal(result.echoes[0].payload.componentName, "c/Parser");
    assert.ok(result.echoes[0].payload.signature);
  });

  it("getSignature returns null for unknown components", () => {
    const doc = createProjectDoc("p");
    const result = handle(doc, {
      type: "QUERY",
      command: "getSignature",
      payload: { componentName: "nope" },
    });
    assert.equal(result.accepted, true);
    assert.equal(result.echoes[0].payload.signature, null);
  });
});

describe("awareness", () => {
  it("is accepted without echo and without mutation", () => {
    const doc = createProjectDoc("p");
    const before = doc.toJSON();
    const result = handle(doc, {
      type: "AWARENESS",
      command: "dragging",
      payload: {
        peerId: "p1",
        graphId: "main",
        nodeId: "A",
        x: 1,
        y: 2,
      },
    });
    assert.equal(result.accepted, true);
    assert.deepEqual(result.echoes, []);
    assert.deepEqual(doc.toJSON(), before);
  });
});

describe("schema integrity", () => {
  it("engine operations never touch the schema version", () => {
    const doc = createProjectDoc("p");
    handle(doc, {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "A",
        componentName: "c",
        metadata: { x: 0, y: 0 },
      },
    });
    assert.equal(getProjectMetadata(doc).get("schemaVersion"), 1);
  });
});
