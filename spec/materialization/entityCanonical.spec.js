import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addEdge,
  addIIP,
  addInport,
  addNode,
  addOutport,
  createGraph,
  createProjectDoc,
} from "../../src/crdt/ProjectDoc.js";
import { projectGraph } from "../../src/glass/projectView.js";
import { canonicalGraph } from "../../src/materialization/canonical.js";
import { toEntityCanonical } from "../../src/materialization/entityCanonical.js";
import { GraphModel } from "../../vendor/graph.js";

/** Seeds a project graph with nodes, an edge, an IIP, and exports. */
function seededView(doc) {
  createGraph(doc, "main", "Main");
  const main = doc.getMap("graphs").get("main");
  addNode(main, "Read", "fs/ReadFile", { x: 10, y: 20 });
  addNode(main, "Log", "core/Output", { x: 200, y: 80 });
  addEdge(main, { node: "Read", port: "out" }, { node: "Log", port: "in" });
  addIIP(main, "file.txt", { node: "Read", port: "source" });
  addInport(main, "source", "Read", "source");
  addOutport(main, "written", "Log", "out");
  return projectGraph(doc, "main");
}

describe("the canonical-forms converter (work document #59's found gap)", () => {
  it("maps the interchange form onto the entity-model canonical", () => {
    const doc = createProjectDoc("p");
    const entity = toEntityCanonical(canonicalGraph(seededView(doc)));
    assert.deepEqual(
      entity.nodes.map((/** @type {any} */ n) => n.entity_id),
      ["Log", "Read"],
      "nodes sort by entity_id",
    );
    assert.equal(entity.nodes[1].component, "fs/ReadFile");
    assert.deepEqual(
      entity.edges.map((/** @type {any} */ e) => e.entity_id),
      ["Read:out->Log:in"],
    );
    assert.equal(entity.edges[0].from.node, "Read");
    assert.deepEqual(
      entity.iips.map((/** @type {any} */ i) => i.entity_id),
      ["DATA->Read:source"],
    );
    assert.equal(entity.iips[0].from.data, "file.txt");
    const exported = entity.exports.map(
      (/** @type {any} */ e) => `${e.direction}:${e.public}`,
    );
    assert.deepEqual(exported.sort(), ["inport:source", "outport:written"]);
  });

  it("the converted form builds a live GraphModel", () => {
    const doc = createProjectDoc("p");
    const entity = toEntityCanonical(canonicalGraph(seededView(doc)));
    const model = GraphModel.fromCanonical(entity);
    const serialized = model.serialize();
    assert.deepEqual(
      serialized.nodes.map((/** @type {any} */ n) => n.entity_id).sort(),
      ["Log", "Read"],
    );
    assert.equal(serialized.edges.length, 1);
    assert.equal(serialized.iips.length, 1);
    assert.equal(serialized.exports.length, 2);
  });

  it("is deterministic across materializations", () => {
    const doc = createProjectDoc("p");
    const first = toEntityCanonical(canonicalGraph(seededView(doc)));
    const second = toEntityCanonical(canonicalGraph(seededView(doc)));
    assert.deepEqual(first, second);
  });

  it("handles an empty graph", () => {
    const doc = createProjectDoc("p");
    createGraph(doc, "empty");
    const entity = toEntityCanonical(
      canonicalGraph(projectGraph(doc, "empty")),
    );
    assert.deepEqual(entity.nodes, []);
    assert.deepEqual(entity.edges, []);
    assert.deepEqual(entity.iips, []);
    const model = GraphModel.fromCanonical(entity);
    assert.equal(model.serialize().nodes.length, 0);
  });
});
