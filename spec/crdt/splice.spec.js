import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createEngineState,
  handleMessage,
  refreshDerivedSignatures,
} from "../../src/crdt/EngineCore.js";
import {
  createGraph,
  createProjectDoc,
  getComponentSignature,
  getGraph,
  getNode,
  setComponentSignature,
} from "../../src/crdt/ProjectDoc.js";
import * as Y from "../../vendor/yjs.js";

/** A session with one state, as the worker holds across a project. */
function session() {
  const doc = createProjectDoc("p");
  createGraph(doc, "main", "main", null);
  const state = createEngineState();
  const handle = (/** @type {any} */ message) =>
    handleMessage(doc, state, message);
  const intent = (/** @type {string} */ command, /** @type {any} */ payload) =>
    handle({ type: "INTENT", command, payload });
  return { doc, state, handle, intent };
}

/** Sets a component signature with typed ports. */
function signature(doc, component, inports, outports) {
  setComponentSignature(doc, component, {
    inports: inports.map((entry) =>
      typeof entry === "string" ? { name: entry } : entry,
    ),
    outports: outports.map((entry) =>
      typeof entry === "string" ? { name: entry } : entry,
    ),
  });
}

describe("spliceNode intent (work document #5, #39)", () => {
  it("creates a node through the edge: one intent, four echoes", () => {
    const s = session();
    s.intent("addNode", {
      graphId: "main",
      nodeId: "A",
      componentName: "core/Repeat",
      metadata: { x: 0, y: 0 },
    });
    s.intent("addNode", {
      graphId: "main",
      nodeId: "B",
      componentName: "core/Repeat",
      metadata: { x: 200, y: 100 },
    });
    const edge = s.intent("addEdge", {
      graphId: "main",
      src: { node: "A", port: "out" },
      tgt: { node: "B", port: "in" },
    });
    const edgeId = edge.echoes[0].payload.id;

    const result = s.intent("spliceNode", {
      graphId: "main",
      edgeId,
      nodeId: "M",
      componentName: "core/Repeat",
      x: 100,
      y: 50,
    });
    assert.ok(result.accepted, "splice accepted");
    // The undo-availability report rides every accepted intent (work
    // document #39); the splice's own echoes are the graph commands
    const commands = result.echoes
      .filter((/** @type {any} */ e) => e.kind !== "undo")
      .map((/** @type {any} */ e) => e.command);
    assert.deepEqual(commands, ["removeedge", "addnode", "addedge", "addedge"]);
    const graph = getGraph(s.doc, "main");
    assert.equal(graph.get("edges").has(edgeId), false, "old edge gone");
    assert.ok(getNode(graph, "M"), "node created at the splice");
    assert.ok(
      [...graph.get("edges").keys()].some((id) => id.startsWith("A:out")),
      "A -> M edge exists",
    );
    assert.ok(
      [...graph.get("edges").keys()].some((id) => id.includes("->B:in")),
      "M -> B edge exists",
    );
  });

  it("moves an existing node into the splice (the drag path)", () => {
    const s = session();
    s.intent("addNode", {
      graphId: "main",
      nodeId: "A",
      componentName: "core/Repeat",
      metadata: { x: 0, y: 0 },
    });
    s.intent("addNode", {
      graphId: "main",
      nodeId: "B",
      componentName: "core/Repeat",
      metadata: { x: 200, y: 100 },
    });
    s.intent("addNode", {
      graphId: "main",
      nodeId: "C",
      componentName: "core/Repeat",
      metadata: { x: 500, y: 500 },
    });
    const edge = s.intent("addEdge", {
      graphId: "main",
      src: { node: "A", port: "out" },
      tgt: { node: "B", port: "in" },
    });
    const edgeId = edge.echoes[0].payload.id;

    const result = s.intent("spliceNode", {
      graphId: "main",
      edgeId,
      nodeId: "C",
      x: 100,
      y: 50,
    });
    assert.ok(result.accepted, "splice accepted");
    const graph = getGraph(s.doc, "main");
    assert.equal(graph.get("edges").has(edgeId), false, "old edge gone");
    const node = getNode(graph, "C");
    assert.equal(node.get("metadata").get("x"), 100, "node moved");
    const ids = [...graph.get("edges").keys()];
    assert.ok(
      ids.some((id) => id.startsWith("A:out")),
      "A -> C",
    );
    assert.ok(
      ids.some((id) => id.startsWith("C:")),
      "C -> B",
    );
  });

  it("refuses a node without compatible ports, mutating nothing", () => {
    const s = session();
    // A: string out; B: string in; the edge carries string
    signature(s.doc, "src/String", [], [{ name: "out", type: "string" }]);
    signature(s.doc, "tgt/String", [{ name: "in", type: "string" }], []);
    s.intent("addNode", {
      graphId: "main",
      nodeId: "A",
      componentName: "src/String",
      metadata: { x: 0, y: 0 },
    });
    s.intent("addNode", {
      graphId: "main",
      nodeId: "B",
      componentName: "tgt/String",
      metadata: { x: 200, y: 100 },
    });
    const edge = s.intent("addEdge", {
      graphId: "main",
      src: { node: "A", port: "out" },
      tgt: { node: "B", port: "in" },
    });
    const edgeId = edge.echoes[0].payload.id;
    // The spliced component is number-only: incompatible with string
    signature(
      s.doc,
      "num/Only",
      [{ name: "in", type: "number" }],
      [{ name: "out", type: "number" }],
    );
    const before = s.doc.toJSON();

    const created = s.intent("spliceNode", {
      graphId: "main",
      edgeId,
      nodeId: "M",
      componentName: "num/Only",
      x: 100,
      y: 50,
    });
    assert.equal(created.accepted, false, "incompatible splice declined");
    const dragged = s.intent("spliceNode", {
      graphId: "main",
      edgeId,
      nodeId: "A",
      x: 100,
      y: 50,
    });
    assert.equal(dragged.accepted, false, "incompatible drag declined");
    assert.deepEqual(s.doc.toJSON(), before, "document untouched");
  });

  it("accepts all-typed components and picks the canonical ports", () => {
    const s = session();
    s.intent("addNode", {
      graphId: "main",
      nodeId: "A",
      componentName: "core/Repeat",
      metadata: { x: 0, y: 0 },
    });
    s.intent("addNode", {
      graphId: "main",
      nodeId: "B",
      componentName: "core/Repeat",
      metadata: { x: 200, y: 100 },
    });
    const edge = s.intent("addEdge", {
      graphId: "main",
      src: { node: "A", port: "out" },
      tgt: { node: "B", port: "in" },
    });
    const edgeId = edge.echoes[0].payload.id;
    // The spliced component carries typed ports where `all` endpoints match
    signature(
      s.doc,
      "multi/Port",
      [
        { name: "in", type: "number" },
        { name: "in", type: "string" },
      ],
      [{ name: "out", type: "string" }],
    );
    const result = s.intent("spliceNode", {
      graphId: "main",
      edgeId,
      nodeId: "M",
      componentName: "multi/Port",
      x: 100,
      y: 50,
    });
    assert.ok(result.accepted, "the string inport matches");
    const graph = getGraph(s.doc, "main");
    const ids = [...graph.get("edges").keys()];
    assert.ok(
      ids.some((id) => id.includes("->M:")),
      "A wired through the compatible inport",
    );
  });

  it("is one undo step (work document #39)", () => {
    const s = session();
    s.intent("addNode", {
      graphId: "main",
      nodeId: "A",
      componentName: "core/Repeat",
      metadata: { x: 0, y: 0 },
    });
    s.intent("addNode", {
      graphId: "main",
      nodeId: "B",
      componentName: "core/Repeat",
      metadata: { x: 200, y: 100 },
    });
    const edge = s.intent("addEdge", {
      graphId: "main",
      src: { node: "A", port: "out" },
      tgt: { node: "B", port: "in" },
    });
    const edgeId = edge.echoes[0].payload.id;
    s.intent("spliceNode", {
      graphId: "main",
      edgeId,
      nodeId: "M",
      componentName: "core/Repeat",
      x: 100,
      y: 50,
    });
    // ONE undo reverts the whole splice: the direct edge is back, the
    // spliced node is gone
    s.intent("undo", {});
    const graph = getGraph(s.doc, "main");
    assert.equal(getNode(graph, "M"), undefined, "spliced node undone");
    assert.ok(graph.get("edges").has(edgeId), "the direct edge is restored");
    assert.equal(graph.get("edges").size, 1, "no spliced edges remain");
  });

  it("an explicitly pinned incompatible port refuses the splice", () => {
    const s = session();
    signature(s.doc, "src/Str", [], [{ name: "out", type: "string" }]);
    signature(s.doc, "tgt/Str", [{ name: "in", type: "string" }], []);
    signature(
      s.doc,
      "multi/Port",
      [
        { name: "in", type: "number" },
        { name: "in", type: "string" },
      ],
      [{ name: "out", type: "string" }],
    );
    s.intent("addNode", {
      graphId: "main",
      nodeId: "A",
      componentName: "src/Str",
      metadata: { x: 0, y: 0 },
    });
    s.intent("addNode", {
      graphId: "main",
      nodeId: "B",
      componentName: "tgt/Str",
      metadata: { x: 200, y: 100 },
    });
    const edge = s.intent("addEdge", {
      graphId: "main",
      src: { node: "A", port: "out" },
      tgt: { node: "B", port: "in" },
    });
    const edgeId = edge.echoes[0].payload.id;
    const result = s.intent("spliceNode", {
      graphId: "main",
      edgeId,
      nodeId: "M",
      componentName: "multi/Port",
      x: 100,
      y: 50,
      inPort: "in",
      outPort: "out",
    });
    // inPort "in" resolves to... the canonical in is number-typed first in
    // the list but the Glass pinned it explicitly: the engine validates
    assert.ok(result.accepted === false || result.accepted === true);
    // The pinned "in" is number-typed and the edge carries string:
    // incompatible — refused
    assert.equal(result.accepted, false);
  });
});
