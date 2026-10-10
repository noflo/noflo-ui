import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createEngineState,
  handleMessage,
  refreshDerivedSignatures,
} from "../../src/crdt/EngineCore.js";
import {
  addEdge,
  addIIP,
  addInport,
  addNode,
  createGraph,
  createProjectDoc,
  getComponentSignature,
  getDocText,
  getGraph,
  getNode,
  getProjectMetadata,
  grantAssertion,
  setComponentSignature,
} from "../../src/crdt/ProjectDoc.js";
import * as Y from "../../vendor/yjs.js";

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

  it("setDoc writes collaborative docs; path-unsafe names are refused", () => {
    const doc = createProjectDoc("p");
    assert.equal(
      handle(doc, {
        type: "INTENT",
        command: "setDoc",
        payload: { name: "AGENTS", content: "# Conventions\n" },
      }).accepted,
      true,
    );
    const text = getDocText(doc, "AGENTS");
    assert.equal(text?.toString(), "# Conventions\n");

    for (const name of ["../escape", "sub/Name", ".hidden", "Notes.md"]) {
      assert.equal(
        handle(doc, {
          type: "INTENT",
          command: "setDoc",
          payload: { name, content: "x" },
        }).accepted,
        false,
        `${name} is not a path-safe doc name`,
      );
    }
  });

  it("setComponentCode applies a binary update from the mirror (work document #29)", () => {
    const engineDoc = createProjectDoc("p");
    handle(engineDoc, {
      type: "INTENT",
      command: "setSignature",
      payload: {
        component: "fs/Count",
        signature: { inports: [], outports: [] },
      },
    });
    handle(engineDoc, {
      type: "INTENT",
      command: "implementInCode",
      payload: {
        component: "fs/Count",
        language: "javascript",
        scaffold: "const a = 1;\n",
      },
    });

    // The Glass's mirror: a bare Y.Doc mirroring the engine via the
    // y-update echo channel. Bare matters: a mirror that writes its own
    // metadata would create client items the engine never sees, and its
    // transaction diffs would pend forever (the createProjectDoc
    // variant reproduces exactly that).
    const mirror = new Y.Doc();
    Y.applyUpdate(mirror, Y.encodeStateAsUpdate(engineDoc));

    // A local edit in the mirror, then its transaction diff as the intent
    const ytext = mirror.getMap("components").get("fs/Count").get("code");
    assert.ok(ytext, "the mirror carries the component's code buffer");
    /** @type {Uint8Array | null} */
    let captured = null;
    mirror.on("update", (/** @type {Uint8Array} */ update) => {
      captured = update;
    });
    mirror.transact(() => {
      ytext.insert(0, "// counted\n");
    });
    assert.ok(captured, "the transaction produced a diff");

    const result = handle(engineDoc, {
      type: "INTENT",
      command: "setComponentCode",
      payload: { component: "fs/Count", update: captured },
    });
    assert.equal(result.accepted, true);

    // The authoritative buffer holds the SAME items the mirror created:
    // content matches and a re-applied mirror update is idempotent
    const engineCode = engineDoc
      .getMap("components")
      .get("fs/Count")
      .get("code");
    assert.equal(engineCode.toString(), "// counted\nconst a = 1;\n");
    const before = engineDoc
      .getMap("components")
      .get("fs/Count")
      .get("code")
      .toString();
    Y.applyUpdate(engineDoc, Y.encodeStateAsUpdate(mirror));
    assert.equal(
      engineDoc.getMap("components").get("fs/Count").get("code").toString(),
      before,
      "the echo is idempotent: no duplicated text",
    );

    // Malformed updates are refused
    assert.equal(
      handle(engineDoc, {
        type: "INTENT",
        command: "setComponentCode",
        payload: { component: "fs/Count", update: "not-binary" },
      }).accepted,
      false,
    );
  });

  it("removeDoc drops the doc entry", () => {
    const doc = createProjectDoc("p");
    handle(doc, {
      type: "INTENT",
      command: "setDoc",
      payload: { name: "AGENTS", content: "x" },
    });
    assert.equal(
      handle(doc, {
        type: "INTENT",
        command: "removeDoc",
        payload: { name: "AGENTS" },
      }).accepted,
      true,
    );
    assert.equal(getDocText(doc, "AGENTS"), undefined);
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
          metadata: {},
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
        payload: { name: "input", nodeId: "A", port: "in", metadata: {} },
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

describe("graph lifecycle (work document #23)", () => {
  it("creates a root graph and echoes creategraph", () => {
    const result = handleMessage(createProjectDoc("p"), createEngineState(), {
      type: "INTENT",
      command: "createGraph",
      payload: { graphId: "main", name: "Main" },
    });
    assert.ok(result.accepted);
    assert.deepEqual(result.echoes, [
      {
        protocol: "graph",
        command: "creategraph",
        payload: { id: "main", name: "Main", parent: "" },
      },
    ]);
  });

  it("creates a subgraph with a parent", () => {
    const doc = createProjectDoc("p");
    handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "createGraph",
      payload: { graphId: "main", name: "Main" },
    });
    const result = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "createGraph",
      payload: { graphId: "main/A", name: "A", parent: "main" },
    });
    assert.ok(result.accepted);
    assert.equal(result.echoes[0].payload.parent, "main");
  });

  it("is idempotent for an existing graph", () => {
    const doc = createProjectDoc("p");
    handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "createGraph",
      payload: { graphId: "main", name: "Main" },
    });
    const result = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "createGraph",
      payload: { graphId: "main", name: "Main" },
    });
    assert.ok(result.accepted);
    assert.deepEqual(result.echoes[0].payload, {
      id: "main",
      name: "Main",
      parent: "",
    });
  });

  it("rejects an unknown parent", () => {
    const result = handleMessage(createProjectDoc("p"), createEngineState(), {
      type: "INTENT",
      command: "createGraph",
      payload: { graphId: "x", parent: "ghost" },
    });
    assert.ok(!result.accepted);
    assert.equal(result.echoes.length, 0);
  });

  it("rejects removing a graph with children", () => {
    const doc = createProjectDoc("p");
    handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "createGraph",
      payload: { graphId: "main", name: "Main" },
    });
    handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "createGraph",
      payload: { graphId: "main/A", name: "A", parent: "main" },
    });
    const result = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "removeGraph",
      payload: { graphId: "main" },
    });
    assert.ok(!result.accepted, "parent with children is protected");
  });

  it("removes a leaf graph and echoes removegraph", () => {
    const doc = createProjectDoc("p");
    handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "createGraph",
      payload: { graphId: "main", name: "Main" },
    });
    handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "createGraph",
      payload: { graphId: "main/A", name: "A", parent: "main" },
    });
    const result = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "removeGraph",
      payload: { graphId: "main/A" },
    });
    assert.ok(result.accepted);
    assert.deepEqual(result.echoes, [
      { protocol: "graph", command: "removegraph", payload: { id: "main/A" } },
    ]);
  });
});

describe("makeSubgraph (work document #23)", () => {
  it("populates the child graph, exports ports, and switches the component", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    const graph = getGraph(doc, "main");
    addNode(graph, "A", "core/Hello");
    addNode(graph, "B", "core/Other");
    addEdge(graph, { node: "B", port: "out" }, { node: "A", port: "in" });
    setComponentSignature(doc, "core/Hello", {
      inports: [{ name: "in" }],
      outports: [{ name: "out" }],
    });

    const result = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "makeSubgraph",
      payload: { graphId: "main", nodeIds: ["A"] },
    });
    assert.ok(result.accepted);

    // Echo sequence: create, populate, export, switch. Exports are
    // connection-driven: only the connected in port crosses the boundary
    const commands = result.echoes.map((e) => e.command);
    assert.deepEqual(commands, [
      "creategraph",
      "addnode",
      "addinport",
      "setcomponent",
    ]);
    assert.deepEqual(result.echoes[0].payload, {
      id: "main/A",
      name: "A",
      parent: "main",
    });
    assert.deepEqual(result.echoes[3].payload, {
      id: "A",
      component: "main/A",
    });

    // The child graph holds a copy of the node and the exports
    const child = getGraph(doc, "main/A");
    assert.ok(child);
    assert.equal(child.get("nodes").get("A").get("component"), "core/Hello");
    assert.equal(child.get("inports").get("in").get("process"), "A");
    assert.ok(
      !child.get("outports").has("out"),
      "unconnected signature ports are not exported",
    );

    // The parent node now points at the subgraph, making it openable
    assert.equal(graph.get("nodes").get("A").get("component"), "main/A");

    // The subgraph is registered so the library can render its ports
    const signature = doc.getMap("registry").get("main/A");
    assert.ok(signature);
    assert.deepEqual(
      signature
        .get("inports")
        .toJSON()
        .map((p) => p.name),
      ["in"],
    );
    assert.deepEqual(
      signature
        .get("outports")
        .toJSON()
        .map((p) => p.name),
      [],
    );
  });

  it("the derived signature inherits types from the exported component ports (work document #29)", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    const graph = getGraph(doc, "main");
    addNode(graph, "A", "core/Typed");
    addNode(graph, "B", "core/Other");
    addEdge(graph, { node: "B", port: "out" }, { node: "A", port: "in" });
    setComponentSignature(doc, "core/Typed", {
      inports: [{ name: "in", type: "number", addressable: true }],
      outports: [{ name: "out", type: "string" }],
    });
    setComponentSignature(doc, "core/Other", {
      inports: [{ name: "in" }],
      outports: [{ name: "out", type: "boolean" }],
    });

    const made = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "makeSubgraph",
      payload: { graphId: "main", nodeIds: ["A"] },
    });
    assert.ok(made.accepted);
    const signature = doc.getMap("registry").get("main/A");
    const inports = signature.get("inports").toJSON();
    assert.deepEqual(
      inports,
      [{ name: "in", type: "number" }],
      "the boundary export inherits the internal port's datatype — as a single address slot, never addressable",
    );

    // An export added later inherits its internal port's type too
    handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "addOutport",
      payload: {
        graphId: "main/A",
        name: "result",
        nodeId: "A",
        port: "out",
      },
    });
    const outports = doc
      .getMap("registry")
      .get("main/A")
      .get("outports")
      .toJSON();
    assert.deepEqual(outports, [{ name: "result", type: "string" }]);
  });

  it("boot refresh re-derives stale signatures (work document #29)", () => {
    // A subgraph whose signature was written by a pre-datatype-inheritance
    // engine: name-only ports, derived state gone stale on disk
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    const main = doc.getMap("graphs").get("main");
    addNode(main, "S", "main/child", { x: 0, y: 0 });
    createGraph(doc, "main/child");
    const child = doc.getMap("graphs").get("main/child");
    addNode(child, "A", "core/Typed", { x: 10, y: 10 });
    child.get("inports").set("in", { process: "A", port: "in" });
    setComponentSignature(doc, "core/Typed", {
      inports: [{ name: "in", type: "number" }],
    });
    // The stale derived signature: names only, no types
    setComponentSignature(doc, "main/child", {
      inports: [{ name: "in" }],
      description: "Subgraph of main",
    });

    const before = getComponentSignature(doc, "main/child");
    refreshDerivedSignatures(doc);
    assert.deepEqual(
      getComponentSignature(doc, "main/child")?.toJSON(),
      {
        inports: [{ name: "in", type: "number" }],
        outports: [],
        description: "Subgraph of main",
      },
      "the stale signature comes back in step with its exports",
    );

    // An in-step signature is left untouched: no CRDT churn at boot
    const fresh = getComponentSignature(doc, "main/child");
    assert.notEqual(fresh, before, "the stale entry was replaced");
    refreshDerivedSignatures(doc);
    assert.equal(
      getComponentSignature(doc, "main/child"),
      fresh,
      "an in-step signature keeps its identity across a refresh",
    );
  });

  it("exports connection ports even without a registry signature", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    const graph = getGraph(doc, "main");
    addNode(graph, "A", "core/NoSignature");
    addNode(graph, "B", "core/Other");
    addEdge(graph, { node: "B", port: "out" }, { node: "A", port: "in0" });

    const result = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "makeSubgraph",
      payload: { graphId: "main", nodeIds: ["A"] },
    });
    assert.ok(result.accepted);
    const child = getGraph(doc, "main/A");
    assert.ok(child.get("inports").get("in0"), "connected in port exported");
    assert.ok(
      !child.get("outports").has("out0"),
      "no out boundary, so no out export",
    );
  });

  it("exporting a port inside a subgraph re-derives its signature (work document #5)", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    const graph = getGraph(doc, "main");
    addNode(graph, "A", "core/Hello");
    addNode(graph, "B", "core/Other");
    addEdge(graph, { node: "B", port: "out" }, { node: "A", port: "in" });
    setComponentSignature(doc, "core/Hello", {
      inports: [{ name: "in" }],
      outports: [{ name: "out" }],
    });
    handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "makeSubgraph",
      payload: { graphId: "main", nodeIds: ["A"] },
    });

    const result = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "addOutport",
      payload: {
        graphId: "main/A",
        name: "extra",
        nodeId: "A",
        port: "out2",
      },
    });

    assert.ok(result.accepted);
    // The export echo is followed by the re-derived signature echo, so
    // parents re-render the subgraph node with the new port
    assert.deepEqual(
      result.echoes.map((e) => e.command),
      ["addoutport", "signature"],
    );
    assert.equal(result.echoes[1].payload.componentName, "main/A");
    const signature = doc.getMap("registry").get("main/A");
    assert.deepEqual(
      signature
        .get("outports")
        .toJSON()
        .map((/** @type {any} */ p) => p.name),
      ["extra"],
      "the parent's node interface grows the new export",
    );

    // And removing it re-derives again
    const removal = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "removeOutport",
      payload: { graphId: "main/A", name: "extra" },
    });
    assert.ok(removal.accepted);
    assert.deepEqual(
      removal.echoes.map((e) => e.command),
      ["removeoutport", "signature"],
    );
    assert.deepEqual(
      doc.getMap("registry").get("main/A").get("outports").toJSON(),
      [],
    );
  });

  it("exports on the root project graph carry no signature echo", () => {
    // The root graph is not a component: there is no registry signature
    // to re-derive, and the plain export echo stays as-is
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    addNode(getGraph(doc, "main"), "A", "c");
    const result = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "addInport",
      payload: { graphId: "main", name: "input", nodeId: "A", port: "in" },
    });
    assert.ok(result.accepted);
    assert.deepEqual(
      result.echoes.map((e) => e.command),
      ["addinport"],
    );
  });

  it("addressable exports pin their array slot (canonical port refs)", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    const graph = getGraph(doc, "main");
    addNode(graph, "A", "core/Hello");
    addNode(graph, "B", "core/Other");
    // B's addressable slot 2 feeds A's slot 1
    addEdge(
      graph,
      { node: "B", port: "out", index: 2 },
      { node: "A", port: "in", index: 1 },
    );
    setComponentSignature(doc, "core/Hello", {
      inports: [{ name: "in", addressable: true }],
      outports: [{ name: "out" }],
    });

    const made = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "makeSubgraph",
      payload: { graphId: "main", nodeIds: ["A"] },
    });
    assert.ok(made.accepted);
    const child = getGraph(doc, "main/A");
    // The boundary export pins the slot the connection targeted
    assert.equal(child.get("inports").get("in").get("index"), 1);

    // Exporting another slot of the same array port stores its own index
    const exported = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "addInport",
      payload: {
        graphId: "main/A",
        name: "in3",
        nodeId: "A",
        port: "in",
        index: 3,
      },
    });
    assert.ok(exported.accepted);
    assert.equal(exported.echoes[0].payload.index, 3);
    assert.equal(child.get("inports").get("in3").get("index"), 3);

    // Invalid indexes are refused
    const invalid = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "addInport",
      payload: {
        graphId: "main/A",
        name: "bad",
        nodeId: "A",
        port: "in",
        index: -1,
      },
    });
    assert.equal(invalid.accepted, false);
    assert.ok(!child.get("inports").has("bad"));
  });

  it("rejects unknown nodes and already-subgraph nodes", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    const graph = getGraph(doc, "main");
    addNode(graph, "A", "core/Hello");

    const unknown = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "makeSubgraph",
      payload: { graphId: "main", nodeIds: ["ghost"] },
    });
    assert.ok(!unknown.accepted);

    handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "makeSubgraph",
      payload: { graphId: "main", nodeIds: ["A"] },
    });
    const again = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "makeSubgraph",
      payload: { graphId: "main", nodeIds: ["A"] },
    });
    assert.ok(!again.accepted, "node is already a subgraph instance");
  });
});

describe("default component signatures (work document #23)", () => {
  it("registers in/out for a component created without a signature", () => {
    const doc = createProjectDoc("p");
    handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "A",
        componentName: "c/Fresh",
        metadata: { x: 0, y: 0 },
      },
    });
    const signature = doc.getMap("registry").get("c/Fresh")?.toJSON();
    assert.ok(signature, "signature registered");
    assert.deepEqual(
      signature.inports.map((/** @type {any} */ p) => p.name),
      ["in"],
    );
    assert.deepEqual(
      signature.outports.map((/** @type {any} */ p) => p.name),
      ["out"],
    );
  });

  it("leaves existing signatures untouched", () => {
    const doc = createProjectDoc("p");
    setComponentSignature(doc, "c/Known", {
      inports: [{ name: "seed" }],
      outports: [],
    });
    handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "A",
        componentName: "c/Known",
        metadata: { x: 0, y: 0 },
      },
    });
    const signature = doc.getMap("registry").get("c/Known")?.toJSON();
    assert.deepEqual(
      signature.inports.map((/** @type {any} */ p) => p.name),
      ["seed"],
    );
  });
});

describe("makeSubgraph with multiple nodes (work document #23)", () => {
  it("moves the selection, rewires boundaries, and replaces with one node", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    const graph = getGraph(doc, "main");
    addNode(graph, "A", "c/One", { x: 0, y: 0 });
    addNode(graph, "B", "c/Two", { x: 100, y: 0 });
    addNode(graph, "X", "c/Ext", { x: -100, y: 0 });
    addNode(graph, "Y", "c/Ext", { x: 200, y: 0 });
    // Internal edge moves into the subgraph
    addEdge(graph, { node: "A", port: "out" }, { node: "B", port: "in" });
    // Boundary edges rewire through the replacement node
    addEdge(graph, { node: "X", port: "out" }, { node: "B", port: "in0" });
    addEdge(graph, { node: "A", port: "out0" }, { node: "Y", port: "in" });
    // IIP into a moved node is retargeted in the parent
    addIIP(graph, "seed", { node: "A", port: "in" });

    const result = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "makeSubgraph",
      payload: { graphId: "main", nodeIds: ["A", "B"] },
    });
    assert.ok(result.accepted);

    const child = getGraph(doc, "main/A");
    assert.ok(child, "child graph created");
    // Both moved nodes live in the child with their original components
    assert.equal(child.get("nodes").get("A").get("component"), "c/One");
    assert.equal(child.get("nodes").get("B").get("component"), "c/Two");
    // The internal edge moved with them
    assert.ok(child.get("edges").has("A:out[0]->B:in[0]"));
    // Exports: the boundary connections became in/out ports
    assert.equal(child.get("inports").get("in0").get("process"), "B");
    assert.equal(child.get("outports").get("out0").get("process"), "A");

    // The parent kept its boundary edges, rewired to the replacement node
    assert.ok(
      graph.get("edges").has("X:out[0]->A:in0[0]"),
      "inbound edge rewired to the subgraph node",
    );
    assert.ok(
      graph.get("edges").has("A:out0[0]->Y:in[0]"),
      "outbound edge kept (replacement id matches)",
    );
    assert.ok(
      graph.get("edges").has("DATA->A:in[0]"),
      "IIP retargeted to the subgraph node",
    );
    // The moved nodes and their old edges are gone from the parent
    assert.ok(!graph.get("nodes").has("B"));
    assert.ok(!graph.get("edges").has("A:out[0]->B:in[0]"));

    // The replacement node is the subgraph instance at the bbox center
    const replacement = graph.get("nodes").get("A");
    assert.equal(replacement.get("component"), "main/A");
    assert.equal(replacement.get("metadata").get("x"), 50);

    // The subgraph signature carries the exported ports: the boundary
    // connections of every moved node, including the IIP into the
    // replacement node's original in port
    const signature = doc.getMap("registry").get("main/A")?.toJSON();
    assert.deepEqual(
      signature.inports.map((/** @type {any} */ p) => p.name).sort(),
      ["in", "in0"],
    );
    assert.deepEqual(
      signature.outports.map((/** @type {any} */ p) => p.name),
      ["out0"],
    );
  });

  it("rejects selections containing unknown or duplicate ids", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    const graph = getGraph(doc, "main");
    addNode(graph, "A", "c/One");

    const unknown = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "makeSubgraph",
      payload: { graphId: "main", nodeIds: ["A", "ghost"] },
    });
    assert.ok(!unknown.accepted);

    const duplicate = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "makeSubgraph",
      payload: { graphId: "main", nodeIds: ["A", "A"] },
    });
    assert.ok(!duplicate.accepted);

    // Nothing was mutated by the rejected intents
    assert.ok(graph.get("nodes").has("A"));
    assert.ok(!getGraph(doc, "main/A"));
  });
});

describe("moveUp (work document #23)", () => {
  it("moves a node up, rewires routed parent edges, and re-exports", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    const main = getGraph(doc, "main");
    addNode(main, "X", "c/Ext", { x: 0, y: 0 });
    addNode(main, "A", "main/A", { x: 50, y: 0 });
    addEdge(main, { node: "X", port: "out" }, { node: "A", port: "in0" });
    createGraph(doc, "main/A", "A", "main");
    const child = getGraph(doc, "main/A");
    addNode(child, "A", "c/One", { x: 0, y: 0 });
    addNode(child, "B", "c/Two", { x: 10, y: 0 });
    addEdge(child, { node: "A", port: "out" }, { node: "B", port: "in" });
    addInport(child, "in0", "B", "in0");
    setComponentSignature(doc, "main/A", {
      inports: [{ name: "in0" }],
      outports: [],
    });

    const result = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "moveUp",
      payload: { graphId: "main/A", nodeIds: ["B"] },
    });
    assert.ok(result.accepted);

    // B lives in the parent again
    assert.equal(main.get("nodes").get("B").get("component"), "c/Two");
    // The routed parent edge reconnects directly to the moved node
    assert.ok(main.get("edges").has("X:out[0]->B:in0[0]"));
    assert.ok(!main.get("edges").has("X:out[0]->A:in0[0]"));
    // The child edge into B became an outport export wired to B
    assert.ok(!child.get("edges").has("A:out[0]->B:in[0]"));
    assert.equal(child.get("outports").get("out").get("process"), "A");
    assert.ok(main.get("edges").has("A:out[0]->B:in[0]"));
    // The inport export whose target moved is gone
    assert.ok(!child.get("inports").has("in0"));
    // The signature tracks the remaining exports
    const signature = doc.getMap("registry").get("main/A")?.toJSON();
    assert.deepEqual(
      signature.inports.map((/** @type {any} */ p) => p.name),
      [],
    );
    assert.deepEqual(
      signature.outports.map((/** @type {any} */ p) => p.name),
      ["out"],
    );
    // The subgraph survives with its remaining node
    assert.ok(getGraph(doc, "main/A"));
    assert.ok(child.get("nodes").has("A"));
  });

  it("deletes the subgraph when the move empties it", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    const main = getGraph(doc, "main");
    addNode(main, "X", "c/Ext", { x: 0, y: 0 });
    addNode(main, "sub", "main/A", { x: 50, y: 0 });
    addEdge(main, { node: "X", port: "out" }, { node: "sub", port: "in0" });
    createGraph(doc, "main/A", "A", "main");
    const child = getGraph(doc, "main/A");
    addNode(child, "B", "c/One", { x: 0, y: 0 });
    addNode(child, "C", "c/Two", { x: 10, y: 0 });
    addEdge(child, { node: "B", port: "out" }, { node: "C", port: "in" });
    addInport(child, "in0", "B", "in0");
    setComponentSignature(doc, "main/A", {
      inports: [{ name: "in0" }],
      outports: [],
    });

    const result = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "moveUp",
      payload: { graphId: "main/A", nodeIds: ["B", "C"] },
    });
    assert.ok(result.accepted);

    // Nodes and their internal wiring are in the parent
    assert.equal(main.get("nodes").get("B").get("component"), "c/One");
    assert.equal(main.get("nodes").get("C").get("component"), "c/Two");
    assert.ok(main.get("edges").has("B:out[0]->C:in[0]"));
    // The routed parent edge reconnects directly
    assert.ok(main.get("edges").has("X:out[0]->B:in0[0]"));
    // The subgraph node, graph, and signature are gone
    assert.ok(!main.get("nodes").has("sub"));
    assert.ok(!getGraph(doc, "main/A"));
    assert.ok(!doc.getMap("registry").has("main/A"));
    assert.ok(
      result.echoes.some(
        (e) => e.command === "removegraph" && e.payload.id === "main/A",
      ),
    );
  });

  it("lets a moved node take over the subgraph node's id on full unnest", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    const main = getGraph(doc, "main");
    addNode(main, "X", "c/Ext", { x: 0, y: 0 });
    addNode(main, "A", "main/A", { x: 50, y: 0 });
    addEdge(main, { node: "X", port: "out" }, { node: "A", port: "in0" });
    createGraph(doc, "main/A", "A", "main");
    const child = getGraph(doc, "main/A");
    addNode(child, "A", "c/One", { x: 0, y: 0 });
    addInport(child, "in0", "A", "in0");
    setComponentSignature(doc, "main/A", {
      inports: [{ name: "in0" }],
      outports: [],
    });

    const result = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "moveUp",
      payload: { graphId: "main/A", nodeIds: ["A"] },
    });
    assert.ok(result.accepted);

    // The moved node took over the id with its original component
    assert.equal(main.get("nodes").get("A").get("component"), "c/One");
    // The routed edge reconnects to it directly
    assert.ok(main.get("edges").has("X:out[0]->A:in0[0]"));
    // Subgraph gone entirely
    assert.ok(!getGraph(doc, "main/A"));
    assert.ok(!doc.getMap("registry").has("main/A"));
  });

  it("rejects root graphs, unknown nodes, and unresolvable id conflicts", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    const main = getGraph(doc, "main");
    addNode(main, "X", "c/Ext", { x: 0, y: 0 });
    createGraph(doc, "main/A", "A", "main");
    const child = getGraph(doc, "main/A");
    addNode(child, "A", "c/One", { x: 0, y: 0 });
    addNode(child, "X", "c/Ext", { x: 10, y: 0 });

    const fromRoot = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "moveUp",
      payload: { graphId: "main", nodeIds: ["X"] },
    });
    assert.ok(!fromRoot.accepted, "root graphs have no parent");

    const unknown = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "moveUp",
      payload: { graphId: "main/A", nodeIds: ["ghost"] },
    });
    assert.ok(!unknown.accepted);

    // X exists in both graphs and the move does not empty the subgraph
    const conflict = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "moveUp",
      payload: { graphId: "main/A", nodeIds: ["X"] },
    });
    assert.ok(!conflict.accepted);

    // Nothing was mutated
    assert.ok(getGraph(doc, "main/A"));
    assert.ok(child.get("nodes").has("X"));
    assert.equal(main.get("nodes").get("X").get("component"), "c/Ext");
  });
});

describe("grant intents (work document #27)", () => {
  it("tombstone-revokes through an intent", () => {
    const doc = createProjectDoc("p");
    // Grants are born verified through the mesh layer's `MESH grant`
    // (work document #27); the CRDT-level revoke intent remains
    const grant = grantAssertion(doc, "abc123hash", "observer", {
      anchor: { hash: "a" },
    });
    const grantId = grant?.id ?? "";
    const result = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "revokePermission",
      payload: { grantId },
    });
    assert.ok(result.accepted);
    assert.deepEqual(result.echoes, [
      { protocol: "acl", command: "revoke", payload: { id: grantId } },
    ]);
    assert.ok(doc.getMap("grants").get(grantId).get("revoked") > 0);
  });

  it("rejects unknown grants", () => {
    const doc = createProjectDoc("p");
    const ghost = handleMessage(doc, createEngineState(), {
      type: "INTENT",
      command: "revokePermission",
      payload: { grantId: "grant-ghost" },
    });
    assert.ok(!ghost.accepted);
  });
});
