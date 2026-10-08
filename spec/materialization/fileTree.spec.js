import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addEdge,
  addNode,
  createGraph,
  createProjectDoc,
  ensureComponent,
  setComponentCode,
} from "../../src/crdt/ProjectDoc.js";
import {
  docToFileTree,
  writeFileTree,
} from "../../src/materialization/fileTree.js";

/**
 * Seeds a project with a graph, a subgraph, and a component with code.
 *
 * @param {any} doc
 * @returns {any}
 */
function seed(doc) {
  createGraph(doc, "main", "Main");
  const main = doc.getMap("graphs").get("main");
  addNode(main, "Read", "fs/ReadFile", { x: 10, y: 20 });
  createGraph(doc, "main/Pipeline", "Pipeline");
  const sub = doc.getMap("graphs").get("main/Pipeline");
  addNode(sub, "Log", "core/Output", { x: 5, y: 5 });
  const component = ensureComponent(doc, "fs/ReadFile");
  setComponentCode(component, "export default function setup(runtime) {}\n");
  return doc;
}

describe("Y.Doc → file tree (work document #43)", () => {
  it("materializes one canonical graph file per graph, flat graphs, subgraph components skip", () => {
    const doc = createProjectDoc("p");
    seed(doc);
    const tree = docToFileTree(doc);
    const paths = Object.keys(tree).sort();
    assert.deepEqual(
      paths,
      [
        "components/fs/ReadFile.js",
        "components/fs/ReadFile.json",
        "graphs/Pipeline.graph.json",
        "graphs/main.graph.json",
        "project.json",
      ],
      "graphs are flat; the subgraph component (main/Pipeline) is defined by its graph file, not a component entry",
    );
  });

  it("graph files carry the canonical projection", () => {
    const doc = createProjectDoc("p");
    seed(doc);
    const main = doc.getMap("graphs").get("main");
    addNode(main, "Log", "core/Output", { x: 40, y: 60 });
    addEdge(main, { node: "Read", port: "out" }, { node: "Log", port: "in" });
    const tree = docToFileTree(doc);
    const graph = JSON.parse(tree["graphs/main.graph.json"]);
    assert.equal(graph.properties.name, "Main");
    assert.ok(graph.processes.Read, "the node materializes");
    assert.equal(graph.connections.length, 1, "the edge materializes");
  });

  it("component code materializes as Y.Text content", () => {
    const doc = createProjectDoc("p");
    seed(doc);
    const tree = docToFileTree(doc);
    assert.match(
      tree["components/fs/ReadFile.js"],
      /export default function setup/,
    );
    const signature = JSON.parse(tree["components/fs/ReadFile.json"]);
    assert.equal(signature.name, "fs/ReadFile");
    assert.ok(Array.isArray(signature.inports));
  });

  it("writeFileTree persists through the fs adapter", async () => {
    const doc = createProjectDoc("p");
    seed(doc);
    /** @type {Map<string, string>} */
    const files = new Map();
    const written = await writeFileTree(docToFileTree(doc), {
      writeFile: async (path, content) => {
        files.set(path, content);
      },
    });
    assert.ok(written.length > 0, "every path is written");
    assert.equal(files.size, written.length);
    assert.ok(files.has("project.json"));
  });
});
