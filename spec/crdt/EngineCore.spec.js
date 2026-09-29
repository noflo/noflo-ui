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

describe("IIP intents", () => {
  it("addIIP echoes the deterministic DATA-> id", () => {
    const doc = createProjectDoc("p");
    handle(doc, {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "B",
        componentName: "c",
        metadata: { x: 0, y: 0 },
      },
    });

    const result = handle(doc, {
      type: "INTENT",
      command: "addIIP",
      payload: {
        graphId: "main",
        data: "hello",
        tgt: { node: "B", port: "in" },
      },
    });

    assert.equal(result.accepted, true);
    assert.deepEqual(result.echoes, [
      {
        protocol: "graph",
        command: "addiip",
        payload: {
          id: "DATA->B:in[0]",
          data: "hello",
          tgt: { node: "B", port: "in" },
        },
      },
    ]);
  });

  it("addIIP rejects duplicates and unknown graphs", () => {
    const doc = createProjectDoc("p");
    handle(doc, {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "B",
        componentName: "c",
        metadata: { x: 0, y: 0 },
      },
    });
    const intent = {
      type: "INTENT",
      command: "addIIP",
      payload: {
        graphId: "main",
        data: "hello",
        tgt: { node: "B", port: "in" },
      },
    };
    handle(doc, intent);
    const before = doc.toJSON();

    assert.equal(handle(doc, intent).accepted, false, "duplicate rejected");
    assert.equal(
      handle(doc, {
        ...intent,
        payload: { graphId: "nope", data: 1, tgt: { node: "x", port: "in" } },
      }).accepted,
      false,
      "unknown graph rejected",
    );
    assert.deepEqual(doc.toJSON(), before);
  });

  it("updateIIP changes the data in place", () => {
    const doc = createProjectDoc("p");
    handle(doc, {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "B",
        componentName: "c",
        metadata: { x: 0, y: 0 },
      },
    });
    handle(doc, {
      type: "INTENT",
      command: "addIIP",
      payload: { graphId: "main", data: "old", tgt: { node: "B", port: "in" } },
    });

    const result = handle(doc, {
      type: "INTENT",
      command: "updateIIP",
      payload: { graphId: "main", id: "DATA->B:in[0]", data: "new" },
    });

    assert.equal(result.accepted, true);
    assert.deepEqual(result.echoes, [
      {
        protocol: "graph",
        command: "updateiip",
        payload: { id: "DATA->B:in[0]", data: "new" },
      },
    ]);
    assert.equal(
      getGraph(doc, "main").get("edges").get("DATA->B:in[0]").get("data"),
      "new",
    );
  });

  it("updateIIP rejects node edges and unknown ids", () => {
    const doc = createProjectDoc("p");
    const intent = {
      type: "INTENT",
      command: "updateIIP",
      payload: { graphId: "main", id: "A:out[0]->B:in[0]", data: "x" },
    };
    assert.equal(handle(doc, intent).accepted, false, "node edge id rejected");
    assert.equal(
      handle(doc, {
        ...intent,
        payload: { graphId: "nope", id: "DATA->B:in[0]", data: 1 },
      }).accepted,
      false,
      "unknown graph rejected",
    );
  });

  it("removeIIP echoes removeiip", () => {
    const doc = createProjectDoc("p");
    handle(doc, {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "B",
        componentName: "c",
        metadata: { x: 0, y: 0 },
      },
    });
    handle(doc, {
      type: "INTENT",
      command: "addIIP",
      payload: {
        graphId: "main",
        data: "hello",
        tgt: { node: "B", port: "in" },
      },
    });

    const result = handle(doc, {
      type: "INTENT",
      command: "removeIIP",
      payload: { graphId: "main", id: "DATA->B:in[0]" },
    });

    assert.equal(result.accepted, true);
    assert.deepEqual(result.echoes, [
      {
        protocol: "graph",
        command: "removeiip",
        payload: { id: "DATA->B:in[0]" },
      },
    ]);
  });
});

describe("exported port intents", () => {
  /** @param {import("yjs").Doc} doc */
  function withNode(doc) {
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
  }

  it("addInport/addOutport echo authoritative exports", () => {
    const doc = createProjectDoc("p");
    withNode(doc);

    const inResult = handle(doc, {
      type: "INTENT",
      command: "addInport",
      payload: { graphId: "main", name: "input", nodeId: "A", port: "in" },
    });
    assert.equal(inResult.accepted, true);
    assert.deepEqual(inResult.echoes, [
      {
        protocol: "graph",
        command: "addinport",
        payload: { name: "input", nodeId: "A", port: "in" },
      },
    ]);

    const outResult = handle(doc, {
      type: "INTENT",
      command: "addOutport",
      payload: { graphId: "main", name: "output", nodeId: "A", port: "out" },
    });
    assert.equal(outResult.echoes[0].command, "addoutport");
  });

  it("rejects taken names and unknown nodes", () => {
    const doc = createProjectDoc("p");
    withNode(doc);
    const intent = {
      type: "INTENT",
      command: "addInport",
      payload: { graphId: "main", name: "input", nodeId: "A", port: "in" },
    };
    handle(doc, intent);
    const before = doc.toJSON();

    assert.equal(handle(doc, intent).accepted, false, "name taken");
    assert.equal(
      handle(doc, { ...intent, payload: { ...intent.payload, nodeId: "Nope" } })
        .accepted,
      false,
      "unknown node",
    );
    assert.deepEqual(doc.toJSON(), before);
  });

  it("removeInport/removeOutport echo removals", () => {
    const doc = createProjectDoc("p");
    withNode(doc);
    handle(doc, {
      type: "INTENT",
      command: "addInport",
      payload: { graphId: "main", name: "input", nodeId: "A", port: "in" },
    });

    const result = handle(doc, {
      type: "INTENT",
      command: "removeInport",
      payload: { graphId: "main", name: "input" },
    });

    assert.equal(result.accepted, true);
    assert.deepEqual(result.echoes, [
      {
        protocol: "graph",
        command: "removeinport",
        payload: { name: "input" },
      },
    ]);
    assert.equal(getGraph(doc, "main").get("inports").size, 0);
  });

  it("renameInport moves the mapping and rejects taken targets", () => {
    const doc = createProjectDoc("p");
    withNode(doc);
    handle(doc, {
      type: "INTENT",
      command: "addInport",
      payload: { graphId: "main", name: "input", nodeId: "A", port: "in" },
    });
    handle(doc, {
      type: "INTENT",
      command: "addInport",
      payload: { graphId: "main", name: "other", nodeId: "A", port: "in2" },
    });

    const result = handle(doc, {
      type: "INTENT",
      command: "renameInport",
      payload: { graphId: "main", from: "input", to: "renamed" },
    });

    assert.equal(result.accepted, true);
    assert.deepEqual(result.echoes, [
      {
        protocol: "graph",
        command: "renameinport",
        payload: { from: "input", to: "renamed" },
      },
    ]);

    const inports = getGraph(doc, "main").get("inports");
    assert.ok(inports.has("renamed"));
    assert.ok(!inports.has("input"));

    assert.equal(
      handle(doc, {
        type: "INTENT",
        command: "renameInport",
        payload: { graphId: "main", from: "other", to: "renamed" },
      }).accepted,
      false,
      "target name taken",
    );
  });
});
