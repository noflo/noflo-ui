import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addEdge,
  addIIP,
  addNode,
  createGraph,
  createProjectDoc,
} from "../../src/crdt/ProjectDoc.js";
import {
  addEdgeIntent,
  addNodeIntent,
  moveNodeIntent,
  projectGraph,
  removeEdgeIntent,
  removeNodeIntent,
} from "../../src/glass/projectView.js";

function seedGraph(doc, graphId = "main") {
  const graph = createGraph(doc, graphId, "Main");
  addNode(graph, "Read", "fs/ReadFile", { x: 10, y: 20 });
  addNode(graph, "Log", "core/Output", { x: 200, y: 80 });
  addEdge(
    graph,
    { node: "Read", port: "out" },
    { node: "Log", port: "in", index: 2 },
    { route: 5 },
  );
  addIIP(graph, "file.txt", { node: "Read", port: "source" });
  return graph;
}

describe("projectGraph", () => {
  it("projects nodes, edges with indexes, IIPs, and exports", () => {
    const doc = createProjectDoc("p");
    seedGraph(doc);

    const view = projectGraph(doc, "main");

    assert.equal(view.processes.Read.component, "fs/ReadFile");
    assert.equal(view.processes.Read.metadata.x, 10);

    assert.equal(view.connections.length, 2);
    const edge = view.connections.find((/** @type {any} */ c) => c.src);
    assert.equal(edge.src.node, "Read");
    assert.equal(edge.src.port, "out");
    assert.equal(edge.tgt.node, "Log");
    assert.equal(edge.tgt.port, "in");
    assert.equal(edge.tgt.index, 2);
    assert.equal(edge.metadata.route, 5);

    const iip = view.connections.find((/** @type {any} */ c) => c.data);
    assert.equal(iip.data, "file.txt");
    assert.equal(iip.tgt.node, "Read");
    assert.equal(iip.tgt.port, "source");
    assert.equal(iip.src, undefined, "IIPs have no src");
  });

  it("projects exported ports and graph metadata", () => {
    const doc = createProjectDoc("p");
    const graph = seedGraph(doc);
    graph.get("inports").set("input", { process: "Read", port: "source" });
    graph.get("outports").set("output", { process: "Log", port: "out" });

    const view = projectGraph(doc, "main");
    assert.equal(view.inports.input.process, "Read");
    assert.equal(view.outports.output.port, "out");
    assert.equal(view.properties.name, "Main");
  });

  it("returns null for unknown graphs", () => {
    const doc = createProjectDoc("p");
    assert.equal(projectGraph(doc, "nope"), null);
  });
});

describe("intent constructors", () => {
  it("builds the Appendix A message shapes", () => {
    assert.deepEqual(
      addNodeIntent("main", "Read", "fs/ReadFile", { x: 1, y: 2 }),
      {
        type: "INTENT",
        command: "addNode",
        payload: {
          graphId: "main",
          nodeId: "Read",
          componentName: "fs/ReadFile",
          metadata: { x: 1, y: 2 },
        },
      },
    );
    assert.deepEqual(removeNodeIntent("main", "Read"), {
      type: "INTENT",
      command: "removeNode",
      payload: { graphId: "main", nodeId: "Read" },
    });
    assert.deepEqual(moveNodeIntent("main", "Read", { x: 3, y: 4 }), {
      type: "INTENT",
      command: "moveNode",
      payload: { graphId: "main", nodeId: "Read", metadata: { x: 3, y: 4 } },
    });
    assert.deepEqual(
      addEdgeIntent(
        "main",
        { node: "A", port: "out" },
        { node: "B", port: "in" },
      ),
      {
        type: "INTENT",
        command: "addEdge",
        payload: {
          graphId: "main",
          src: { node: "A", port: "out" },
          tgt: { node: "B", port: "in" },
        },
      },
    );
  });

  it("removeEdgeIntent derives the deterministic id", () => {
    assert.deepEqual(
      removeEdgeIntent(
        "main",
        { node: "A", port: "out", index: 1 },
        { node: "B", port: "in" },
      ),
      {
        type: "INTENT",
        command: "removeEdge",
        payload: { graphId: "main", id: "A:out[1]->B:in[0]" },
      },
    );
  });
});
