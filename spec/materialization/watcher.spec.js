import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addEdge,
  addIIP,
  addNode,
  createGraph,
  createProjectDoc,
  setComponentSignature,
} from "../../src/crdt/ProjectDoc.js";
import { serializeGraph } from "../../src/materialization/canonical.js";
import { createMaterializer } from "../../src/materialization/watcher.js";

/**
 * Boots a materializer over a seeded project: one graph with a node, an
 * edge, and an IIP — already materialized into the memory fs.
 *
 * @returns {{ materializer: any, intents: any[], files: Map<string, string>, doc: any }}
 */
function boot() {
  const doc = createProjectDoc("p");
  createGraph(doc, "main", "Main");
  const main = doc.getMap("graphs").get("main");
  addNode(main, "Read", "fs/ReadFile", { x: 10, y: 20 });
  addNode(main, "Log", "core/Output", { x: 200, y: 80 });
  addEdge(main, { node: "Read", port: "out" }, { node: "Log", port: "in" });
  addIIP(main, "file.txt", { node: "Read", port: "source" });
  // The engine registers a default signature at addNode; the direct
  // ProjectDoc helper does not, so the seed states it explicitly
  setComponentSignature(doc, "fs/ReadFile", {
    inports: [{ name: "source" }],
    outports: [{ name: "out" }],
  });

  /** @type {any[]} */
  const intents = [];
  /** @type {Array<[string, string]>} */
  const diagnostics = [];
  /** @type {Map<string, string>} */
  const files = new Map();
  const materializer = createMaterializer({
    doc,
    fs: {
      writeFile: async (path, content) => {
        files.set(path, content);
      },
      remove: async (path) => {
        files.delete(path);
      },
    },
    emitIntent: (intent) => intents.push(intent),
    onDiagnostic: (path, diagnostic) => diagnostics.push([path, diagnostic]),
  });
  return { materializer, intents, diagnostics, files, doc };
}

/** The engine's canonical echo for the graph, as the watcher's snapshot. */
function materialized({ materializer }) {
  return materializer.materialize();
}

describe("project materializer (work document #43)", () => {
  it("a node added in the file produces an addNode intent", async () => {
    const harness = boot();
    await materialized(harness);
    const graphText = harness.files.get("graphs/main.graph.json") ?? "";
    const graph = JSON.parse(graphText);
    graph.processes.Send = {
      component: "core/Send",
      metadata: { x: 300, y: 40 },
    };
    await harness.materializer.handleFileEvent(
      "graphs/main.graph.json",
      JSON.stringify(graph, null, 2),
    );
    const add = harness.intents.find((i) => i.command === "addNode");
    assert.ok(add, "the new node submits an addNode intent");
    assert.deepEqual(add.payload, {
      graphId: "main",
      nodeId: "Send",
      componentName: "core/Send",
      metadata: { x: 300, y: 40 },
    });
    assert.equal(
      harness.intents.filter((i) => i.command === "addNode").length,
      1,
      "minimal deltas: one intent for one change",
    );
  });

  it("a node removed in the file produces removeNode; a move produces moveNode", async () => {
    const harness = boot();
    await materialized(harness);
    const graphText = harness.files.get("graphs/main.graph.json") ?? "";
    const graph = JSON.parse(graphText);
    delete graph.processes.Read;
    graph.processes.Log.metadata = { x: 250, y: 120 };
    await harness.materializer.handleFileEvent(
      "graphs/main.graph.json",
      JSON.stringify(graph),
    );
    const commands = harness.intents.map((i) => i.command);
    assert.ok(commands.includes("removeNode"), "the removal is an intent");
    assert.ok(commands.includes("moveNode"), "the move is an intent");
    assert.ok(
      !commands.includes("addEdge"),
      "removing Read removes its edge without an add",
    );
    assert.ok(
      !commands.includes("removeEdge"),
      "the file edit removed only the node — the dangling edge stays in the file; the engine's removeNode cascade removes it",
    );
    assert.ok(
      !commands.includes("removeIIP"),
      "same for the IIP: the engine cascades it with the node",
    );
  });

  it("echo suppression: the materializer's own writes produce no intents", async () => {
    const harness = boot();
    await materialized(harness);
    // Absorb a remote change: the snapshot advances to what the CRDT says
    const before = harness.intents.length;
    await harness.materializer.absorbRemote();
    assert.equal(harness.intents.length, before, "absorption emits nothing");
    // The watcher's file events for the absorption's own writes diff to
    // nothing: content equals the snapshot
    const graphText = harness.files.get("graphs/main.graph.json") ?? "";
    await harness.materializer.handleFileEvent(
      "graphs/main.graph.json",
      graphText,
    );
    assert.equal(
      harness.intents.length,
      before,
      "a file matching its snapshot produces no intents",
    );
  });

  it("an invalid graph file produces a diagnostic, never intents", async () => {
    const harness = boot();
    await materialized(harness);
    await harness.materializer.handleFileEvent(
      "graphs/main.graph.json",
      "{ not json",
    );
    assert.deepEqual(harness.intents, [], "no intents from an invalid file");
    assert.equal(harness.diagnostics.length, 1, "one diagnostic");
    assert.equal(harness.diagnostics[0][0], "graphs/main.graph.json");
    assert.match(
      harness.diagnostics[0][1],
      /not valid JSON/,
      "the reason is named",
    );
  });

  it("a deleted graph file produces removeGraph", async () => {
    const harness = boot();
    await materialized(harness);
    await harness.materializer.handleFileEvent("graphs/main.graph.json", null);
    assert.deepEqual(
      harness.intents.map((i) => i.command),
      ["removeGraph"],
    );
    assert.deepEqual(harness.intents[0].payload, { graphId: "main" });
  });

  it("a component code edit produces setComponentCode", async () => {
    const harness = boot();
    await materialized(harness);
    const codePath = "components/fs/ReadFile.js";
    const next = harness.files.get(codePath) + "\n// edited\n";
    await harness.materializer.handleFileEvent(codePath, next);
    assert.deepEqual(
      harness.intents.map((i) => ({
        command: i.command,
        payload: i.payload,
      })),
      [
        {
          command: "setComponentCode",
          payload: {
            component: "fs/ReadFile",
            code: next,
          },
        },
      ],
    );
  });

  it("a signature edit produces setSignature", async () => {
    const harness = boot();
    await materialized(harness);
    const signaturePath = "components/fs/ReadFile.json";
    const signature = JSON.parse(harness.files.get(signaturePath));
    signature.description = "Reads a file";
    signature.inports = [{ name: "source", type: "number" }];
    await harness.materializer.handleFileEvent(
      signaturePath,
      JSON.stringify(signature, null, 2) + "\n",
    );
    assert.deepEqual(
      harness.intents.map((i) => i.command),
      ["setSignature"],
    );
    assert.equal(harness.intents[0].payload.component, "fs/ReadFile");
    assert.equal(
      harness.intents[0].payload.signature.inports[0].type,
      "number",
    );
  });
});

describe("graph file serialization helper", () => {
  it("a docs/*.md edit produces setDoc; deletion produces removeDoc", async () => {
    const { materializer, intents } = boot();
    await materializer.materialize();
    await materializer.handleFileEvent("docs/AGENTS.md", "# Conventions\n");
    const set = intents.at(-1);
    assert.equal(set.command, "setDoc");
    assert.equal(set.payload.name, "AGENTS");
    assert.equal(set.payload.content, "# Conventions\n");
    await materializer.handleFileEvent("docs/AGENTS.md", null);
    const remove = intents.at(-1);
    assert.equal(remove.command, "removeDoc");
    assert.equal(remove.payload.name, "AGENTS");
  });

  it("the materialized file parses back to the projected view", async () => {
    const harness = boot();
    await materialized(harness);
    const graphText = harness.files.get("graphs/main.graph.json") ?? "";
    const graph = JSON.parse(graphText);
    assert.equal(graph.processes.Read.component, "fs/ReadFile");
    assert.equal(
      graph.connections.length,
      2,
      "the edge and the IIP ride one list",
    );
  });
});
