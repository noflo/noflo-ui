import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdir, mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createEngineState, handleMessage } from "../../src/crdt/EngineCore.js";
import {
  addEdge,
  addNode,
  createGraph,
  createProjectDoc,
  ensureComponent,
  getComponentCode,
  setComponentSignature,
} from "../../src/crdt/ProjectDoc.js";
import { projectGraph } from "../../src/glass/projectView.js";
import { wireProjectFolder } from "../../src/node/projectFolder.js";

/**
 * The reverse-path integration (work document #43): the loop the Companion
 * runs for a file-based collaborator — materialize the project to a real
 * directory, the collaborator edits files, the watcher diffs them into
 * intents through the ENGINE's real dispatch, and the absorption writes
 * the converged state back. Everything here is real: a temp directory on
 * disk, the engine's dispatch table (refusals included), the canonical
 * serialization.
 */

const PI = "f".repeat(32);

/** @returns {Promise<any>} The wired loop over a temp directory. */
async function loop() {
  const doc = createProjectDoc("p");
  const state = createEngineState();
  // The file collaborator's authorship: file edits attribute like intents
  state.intentOrigin = PI;
  createGraph(doc, "main", "Main");
  const main = doc.getMap("graphs").get("main");
  addNode(main, "Read", "fs/ReadFile", { x: 10, y: 20 });
  addNode(main, "Log", "core/Output", { x: 200, y: 80 });
  addEdge(main, { node: "Read", port: "out" }, { node: "Log", port: "in" });
  setComponentSignature(doc, "mylib/Parse", {
    inports: [{ name: "in", type: "string" }],
    outports: [{ name: "out" }],
  });
  // The component's code buffer: the seeded authored line Pi will replace
  ensureComponent(doc, "mylib/Parse", { name: "mylib/Parse" })
    .get("code")
    .insert(0, "export const parse = (s) => s.trim();\n");

  /** @type {Array<[string, string]>} */
  const diagnostics = [];
  const folder = await mkdtemp(path.join(tmpdir(), "noflo-reverse-"));
  // The bridge's production wiring — the same module the Companion runs:
  // intents through the engine's real dispatch (a refusal is invisible
  // here, which is exactly why the absorption's write-back is the loop's
  // honesty mechanism), and the absorption riding every CRDT update
  const projectFolder = wireProjectFolder({
    doc,
    folder,
    engine: { handle: (intent) => void handleMessage(doc, state, intent) },
    onDiagnostic: (file, diagnostic) => diagnostics.push([file, diagnostic]),
  });
  const materializer = projectFolder.materializer;
  await projectFolder.materialize();
  return {
    doc,
    state,
    materializer,
    projectFolder,
    diagnostics,
    folder,
  };
}

/** Reads one file back from the folder. */
async function readBack(folder, file) {
  return readFile(path.join(folder, file), "utf8");
}

describe("the reverse path over a real filesystem (work document #43)", () => {
  it("Pi's component edit lands in the engine and survives the absorption", async () => {
    const { doc, materializer, folder } = await loop();
    const target = path.join("components", "mylib", "Parse.js");
    const authored =
      "export const parse = (s) => s.trim().toLowerCase();\n";
    await writeFile(path.join(folder, target), authored);
    await materializer.handleFileEvent(target, authored);

    // The engine's authoritative buffer carries Pi's edit
    const component = doc.getMap("components").get("mylib/Parse");
    assert.equal(getComponentCode(component)?.toString(), authored);

    // The absorption is suppression, not a clobber: Pi's file stays
    await materializer.absorbRemote();
    assert.equal(await readBack(folder, target), authored);
  });

  it("a remote CRDT change rewrites Pi's file (the replica wins on disk)", async () => {
    const { doc, materializer, folder } = await loop();
    const target = path.join("components", "mylib", "Parse.js");
    // A peer (the Glass) sets the code engine-side, not through files
    const code = doc.getMap("components").get("mylib/Parse").get("code");
    code.delete(0, code.length);
    code.insert(0, "export const parse = (s) => s;\n");
    await materializer.absorbRemote();
    assert.equal(
      await readBack(folder, target),
      "export const parse = (s) => s;\n",
      "the disk converges to the CRDT",
    );
  });

  it("a graph edit from disk applies through the engine and converges", async () => {
    const { doc, materializer, folder } = await loop();
    const target = path.join("graphs", "main.graph.json");
    const graphFile = JSON.parse(await readFile(path.join(folder, target), "utf8"));
    // Pi adds a node in the file: the canonical processes map gains an entry
    graphFile.processes["Lower"] = {
      component: "mylib/Parse",
      metadata: { x: 300, y: 40 },
    };
    const edited = `${JSON.stringify(graphFile, null, 2)}\n`;
    await writeFile(path.join(folder, target), edited);
    await materializer.handleFileEvent(target, edited);

    const view = projectGraph(doc, "main");
    assert.ok(view?.processes["Lower"], "the engine gained the node");
    await materializer.absorbRemote();
    const converged = JSON.parse(await readFile(path.join(folder, target), "utf8"));
    assert.deepEqual(converged, JSON.parse(await readBackSnapshot(materializer, target)), "the file is the snapshot");
    assert.ok(view.processes["Lower"], "the node stays");
  });

  it("Pi's new component file creates the component in the CRDT", async () => {
    const { doc, materializer, folder } = await loop();
    const target = path.join("components", "mylib", "Format.js");
    const content = "export const format = (s) => `[${s}]`;\n";
    await writeFile(path.join(folder, target), content);
    await materializer.handleFileEvent(target, content);
    const component = doc.getMap("components").get("mylib/Format");
    assert.ok(component, "the component exists");
    assert.equal(getComponentCode(component)?.toString(), content);
  });

  it("multi-file sweep: code, graph, and docs land in one pass", async () => {
    const { doc, materializer, folder } = await loop();
    const code = "export const parse = (s) => s.split(/\\s+/);\n";
    await writeFile(path.join(folder, "components/mylib/Parse.js"), code);
    const docs = "# Notes\n\nPi wrote this.\n";
    await mkdir(path.join(folder, "docs"), { recursive: true });
    await writeFile(path.join(folder, "docs/notes.md"), docs);
    await materializer.handleFileEvent("components/mylib/Parse.js", code);
    await materializer.handleFileEvent("docs/notes.md", docs);

    const component = doc.getMap("components").get("mylib/Parse");
    assert.equal(getComponentCode(component)?.toString(), code);
    assert.equal(
      doc.getMap("docs").get("notes")?.get("content")?.toString(),
      docs,
      "the project-carried doc lands (the name drops the .md suffix)",
    );
  });

  it("a component file deletion is diagnosed, never silently ignored", async () => {
    const { materializer, diagnostics, folder } = await loop();
    const target = path.join("components", "mylib", "Parse.js");
    await rm(path.join(folder, target));
    await materializer.handleFileEvent(target, null);
    assert.ok(
      diagnostics.some(([file, message]) => file === target && /deletion/.test(message)),
      "the deletion answers with a reason",
    );
  });

  it("the engine's refusal surfaces as the absorption's write-back", async () => {
    const { doc, materializer, folder } = await loop();
    // A graph-implemented component: the engine refuses setSignature for it
    createGraph(doc, "MyGraph", "My Graph");
    const forged = path.join("components", "MyGraph.json");
    const forgedContent = `${JSON.stringify(
      { name: "MyGraph", inports: [{ name: "in" }], outports: [] },
      null,
      2,
    )}\n`;
    await writeFile(path.join(folder, forged), forgedContent);
    materializer.handleFileEvent(forged, forgedContent);
    // The intent went through the dispatch and was refused: the CRDT has
    // no signature for the graph component
    const signature = doc
      .getMap("registry")
      .get("MyGraph");
    const plain = signature?.toJSON?.() ?? {};
    assert.equal(plain.inports?.length ?? 0, 0, "the refusal held");
    // The absorption's write-back removes the file the CRDT never had
    await materializer.absorbRemote();
    await assert.rejects(readFile(path.join(folder, forged)));
  });

  it("derived manifests are ignored as file events", async () => {
    const { materializer, folder } = await loop();
    await writeFile(
      path.join(folder, "package.json"),
      '{"name": "pi-was-here"}',
    );
    // The absorption rewrites the generator's truth — after the event's
    // own derived rewrite settles (handleFileEvent is async; the bridge
    // awaits it)
    await materializer.handleFileEvent("package.json", '{"name": "pi-was-here"}');
    await materializer.absorbRemote();
    const manifest = JSON.parse(await readFile(path.join(folder, "package.json"), "utf8"));
    assert.equal(manifest.type, "module");
    assert.ok(manifest.dependencies["@noflo/noflo"]);
  });
});

/**
 * The watcher's snapshot for one path (the absorption's write-back base).
 *
 * @param {any} materializer
 * @param {string} target
 */
function readBackSnapshot(materializer, target) {
  return materializer.snapshot()[target] ?? "";
}

describe("spec files on the reverse path (work document #43)", () => {
  it("a spec file edit is diagnosed, never silently ignored", async () => {
    const { materializer, diagnostics, folder } = await loop();
    const target = path.join("specs", "spec_parse.yaml");
    await mkdir(path.join(folder, "specs"), { recursive: true });
    await writeFile(path.join(folder, target), "name: forged\n");
    await materializer.handleFileEvent(target, "name: forged\n");
    assert.ok(
      diagnostics.some(
        ([file, message]) =>
          file === target && /spec file edits/.test(message),
      ),
      "the edit answers with a reason",
    );
  });
});

describe("run artifacts on the reverse path (work document #43's trace convention)", () => {
  it(".flowtrace/ paths skip the reverse path by design", async () => {
    const { doc, materializer, diagnostics, folder } = await loop();
    const target = path.join(".flowtrace", "spec_parse.trace");
    await mkdir(path.join(folder, ".flowtrace"), { recursive: true });
    const content = "binary-ish trace bytes";
    await writeFile(path.join(folder, target), content);
    await materializer.handleFileEvent(target, content);
    // No intents, no diagnostics, no snapshot knowledge: the artifact is
    // an output, the CRDT never carries it
    assert.equal(
      doc.getMap("components").get("spec_parse"),
      undefined,
    );
    assert.equal(diagnostics.length, 0);
    assert.equal(materializer.snapshot()[target], undefined);
    // The file Pi wrote stays on disk — the absorption does not delete it
    await materializer.absorbRemote();
    assert.equal(await readFile(path.join(folder, target), "utf8"), content);
  });
});
