import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as Y from "yjs";

import {
  addEdge,
  addIIP,
  addInport,
  addNode,
  addOutport,
  createGraph,
  createProjectDoc,
  deleteGraph,
  edgeIdFor,
  ensureProjectSchema,
  getGraph,
  getNode,
  getProjectMetadata,
  iipEdgeIdFor,
  moveNode,
  PROJECT_SCHEMA_VERSION,
  removeEdge,
  removeExportedPort,
  removeNode,
} from "../../src/crdt/ProjectDoc.js";

describe("edge id rules", () => {
  it("builds deterministic keys including arrayport indexes", () => {
    assert.equal(
      edgeIdFor({ node: "a", port: "out" }, { node: "b", port: "in" }),
      "a:out[0]->b:in[0]",
    );
    assert.equal(
      edgeIdFor(
        { node: "a", port: "out", index: 2 },
        { node: "b", port: "in", index: 1 },
      ),
      "a:out[2]->b:in[1]",
    );
  });

  it("builds the DATA-> key for IIPs", () => {
    assert.equal(
      iipEdgeIdFor({ node: "b", port: "in", index: 1 }),
      "DATA->b:in[1]",
    );
  });
});

describe("project document", () => {
  it("sets metadata with name, id, and schema version", () => {
    const doc = createProjectDoc("My Project");
    const metadata = getProjectMetadata(doc);
    assert.equal(metadata.get("name"), "My Project");
    assert.match(metadata.get("id"), /^project-|^[0-9a-f-]{36}$/);
    assert.equal(metadata.get("schemaVersion"), PROJECT_SCHEMA_VERSION);
  });
});

describe("schema migration", () => {
  it("is a no-op for a fresh document", () => {
    const doc = createProjectDoc("p");
    const result = ensureProjectSchema(doc);
    assert.deepEqual(result, {
      from: PROJECT_SCHEMA_VERSION,
      to: PROJECT_SCHEMA_VERSION,
      migrated: false,
    });
  });

  it("upgrades a legacy document without a schema version", () => {
    const doc = createProjectDoc("p");
    getProjectMetadata(doc).delete("schemaVersion");
    const result = ensureProjectSchema(doc);
    assert.equal(result.migrated, true);
    assert.equal(result.from, 0);
    assert.equal(result.to, PROJECT_SCHEMA_VERSION);
    assert.equal(
      getProjectMetadata(doc).get("schemaVersion"),
      PROJECT_SCHEMA_VERSION,
    );
  });
});

describe("graphs", () => {
  it("creates a graph with the Appendix B structure and is idempotent", () => {
    const doc = createProjectDoc("p");
    const graph = createGraph(doc, "main", "Main");
    for (const key of ["metadata", "nodes", "edges", "inports", "outports"]) {
      assert.ok(graph.get(key) !== undefined, `graph has ${key}`);
    }
    assert.equal(graph.get("metadata").get("name"), "Main");
    assert.equal(
      createGraph(doc, "main", "Other"),
      graph,
      "returns the existing graph",
    );
  });

  it("deletes a graph", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "main");
    assert.equal(deleteGraph(doc, "main"), true);
    assert.equal(deleteGraph(doc, "main"), false);
    assert.equal(getGraph(doc, "main"), undefined);
  });
});

describe("nodes", () => {
  it("adds a node with metadata and rejects duplicates", () => {
    const doc = createProjectDoc("p");
    const graph = createGraph(doc, "main");

    const node = addNode(graph, "Read", "fs/ReadFile", { x: 10, y: 20 });
    assert.ok(node);
    assert.equal(node.get("component"), "fs/ReadFile");
    assert.equal(node.get("metadata").get("x"), 10);

    assert.equal(addNode(graph, "Read", "fs/ReadFile"), null);
  });

  it("moves a node", () => {
    const doc = createProjectDoc("p");
    const graph = createGraph(doc, "main");
    addNode(graph, "Read", "fs/ReadFile");

    assert.equal(moveNode(graph, "Read", 100, 200), true);
    assert.equal(getNode(graph, "Read").get("metadata").get("x"), 100);
    assert.equal(moveNode(graph, "Nope", 1, 2), false);
  });
});

describe("edges", () => {
  it("adds edges under deterministic keys and rejects duplicates and dangling endpoints", () => {
    const doc = createProjectDoc("p");
    const graph = createGraph(doc, "main");
    addNode(graph, "A", "c/A");
    addNode(graph, "B", "c/B");

    const id = addEdge(
      graph,
      { node: "A", port: "out", index: 1 },
      { node: "B", port: "in" },
      { route: 3 },
    );
    assert.equal(id, "A:out[1]->B:in[0]");
    assert.equal(graph.get("edges").get(id).get("metadata").get("route"), 3);

    assert.equal(
      addEdge(
        graph,
        { node: "A", port: "out", index: 1 },
        { node: "B", port: "in" },
      ),
      null,
      "exact duplicate rejected",
    );
    assert.equal(
      addEdge(graph, { node: "A", port: "out" }, { node: "B", port: "in" }),
      "A:out[0]->B:in[0]",
      "a different arrayport index is a distinct edge",
    );
    assert.equal(
      addEdge(graph, { node: "A", port: "out" }, { node: "X", port: "in" }),
      null,
      "unknown target node rejected",
    );
  });

  it("adds IIPs under DATA-> keys", () => {
    const doc = createProjectDoc("p");
    const graph = createGraph(doc, "main");
    addNode(graph, "B", "c/B");

    const id = addIIP(graph, "hello", { node: "B", port: "in" });
    assert.equal(id, "DATA->B:in[0]");
    assert.equal(graph.get("edges").get(id).get("data"), "hello");
    assert.equal(graph.get("edges").get(id).get("src"), undefined);
    assert.equal(addIIP(graph, "hello", { node: "B", port: "in" }), null);
  });

  it("removes edges by id", () => {
    const doc = createProjectDoc("p");
    const graph = createGraph(doc, "main");
    addNode(graph, "A", "c/A");
    addNode(graph, "B", "c/B");
    const id = addEdge(
      graph,
      { node: "A", port: "out" },
      { node: "B", port: "in" },
    );

    assert.equal(removeEdge(graph, id), true);
    assert.equal(removeEdge(graph, id), false);
    assert.equal(graph.get("edges").size, 0);
  });
});

describe("exported ports", () => {
  it("adds inports and outports referencing nodes", () => {
    const doc = createProjectDoc("p");
    const graph = createGraph(doc, "main");
    addNode(graph, "A", "c/A");

    assert.equal(addInport(graph, "input", "A", "in"), true);
    assert.equal(addOutport(graph, "output", "A", "out"), true);
    assert.equal(addInport(graph, "input", "A", "in"), false, "name taken");
    assert.equal(addInport(graph, "bad", "Nope", "in"), false, "unknown node");

    assert.equal(graph.get("inports").get("input").get("process"), "A");
    assert.equal(graph.get("inports").get("input").get("port"), "in");
  });

  it("removes exported ports", () => {
    const doc = createProjectDoc("p");
    const graph = createGraph(doc, "main");
    addNode(graph, "A", "c/A");
    addInport(graph, "input", "A", "in");

    assert.equal(removeExportedPort(graph, "inports", "input"), true);
    assert.equal(removeExportedPort(graph, "inports", "input"), false);
  });
});

describe("removeNode cascades", () => {
  it("removes touching edges, IIPs, and exports but keeps unrelated ones", () => {
    const doc = createProjectDoc("p");
    const graph = createGraph(doc, "main");
    addNode(graph, "A", "c/A");
    addNode(graph, "B", "c/B");
    addNode(graph, "C", "c/C");

    addEdge(graph, { node: "A", port: "out" }, { node: "B", port: "in" });
    addEdge(graph, { node: "B", port: "out" }, { node: "C", port: "in" });
    addIIP(graph, "x", { node: "B", port: "cfg" });
    addInport(graph, "input", "B", "in");
    addOutport(graph, "output", "C", "out");

    assert.equal(removeNode(graph, "B"), true);
    assert.equal(removeNode(graph, "B"), false);

    const edges = graph.get("edges");
    assert.equal(edges.size, 0, "A->B, B->C, and the IIP are all gone");
    assert.equal(graph.get("inports").size, 0, "B's export removed");
    assert.equal(graph.get("outports").get("output").get("process"), "C");
  });
});

describe("peer convergence", () => {
  /** @param {import("yjs").Doc} a @param {import("yjs").Doc} b */
  function sync(a, b) {
    const aState = Y.encodeStateAsUpdate(a);
    const bState = Y.encodeStateAsUpdate(b);
    Y.applyUpdate(b, aState);
    Y.applyUpdate(a, bState);
  }

  it("merges concurrent graphs from two peers", () => {
    const docA = createProjectDoc("p");
    const docB = createProjectDoc("p");
    // Share identity so both peers address the same root maps: seed B from A
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

    const graphA = createGraph(docA, "main");
    addNode(graphA, "A", "c/A");
    const graphB = createGraph(docB, "subgraph");
    addNode(graphB, "B", "c/B");

    sync(docA, docB);

    assert.ok(getGraph(docA, "subgraph"), "A sees B's graph");
    assert.ok(getGraph(docB, "main"), "B sees A's graph");
  });

  it("converges on the same edge added concurrently by two peers", () => {
    const docA = createProjectDoc("p");
    const docB = createProjectDoc("p");
    const graphA = createGraph(docA, "main");
    addNode(graphA, "A", "c/A");
    addNode(graphA, "B", "c/B");
    sync(docA, docB);
    const graphB = getGraph(docB, "main");
    assert.ok(graphB, "B sees the synced graph");

    // Both peers add the same connection concurrently
    addEdge(graphA, { node: "A", port: "out" }, { node: "B", port: "in" });
    addEdge(graphB, { node: "A", port: "out" }, { node: "B", port: "in" });

    sync(docA, docB);

    assert.equal(graphA.get("edges").size, 1, "deduplicated by key");
    assert.deepEqual(
      [...graphA.get("edges").keys()],
      [...graphB.get("edges").keys()],
    );
  });
});
