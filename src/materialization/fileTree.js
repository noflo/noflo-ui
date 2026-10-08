/**
 * @file Y.Doc → file tree (work document #43): the materialization mapping
 * from the project CRDT to the on-disk layout. The mapping is
 * environment-agnostic — it produces a plain `{ path: content }` record —
 * and the `fs` adapter (Node `fs/promises`, browser File System Access
 * API, in-memory test doubles) decides where the tree lands. The inverse
 * direction (file events → CRDT deltas) is the package's next increment.
 *
 * Layout:
 * - `project.json` — the project manifest (metadata, canonical)
 * - `graphs/<graphId>.graph.json` — one canonical graph file per graph;
 *   subgraph ids (`main/A`) materialize into subdirectories
 * - `components/<name>.js` — component code (the registry's Y.Text buffers)
 * - `components/<name>.json` — the component's declared signature
 */

import {
  COMPONENTS_MAP,
  getComponentCode,
  getComponentSignature,
  REGISTRY_MAP,
} from "../crdt/ProjectDoc.js";
import { projectGraph } from "../glass/projectView.js";
import { canonicalGraph, serializeGraph } from "./canonical.js";

/**
 * The fs adapter contract: write one file. Implemented over Node
 * `fs/promises` in the bridge, the File System Access API in the browser,
 * and in-memory maps in tests.
 *
 * @typedef {Object} MaterializerFs
 * @property {(path: string, content: string) => Promise<void>} writeFile
 * @property {(path: string) => Promise<void>} [remove] Drops a file the
 *   CRDT no longer carries; optional — consumers may ignore deletions.
 */

/**
 * The canonical on-disk path of a graph: graph ids are hierarchical
 * (`main/A`), so subgraphs materialize into subdirectories.
 *
 * @param {string} graphId
 * @returns {string}
 */
function graphPath(graphId) {
  return `graphs/${graphId}.graph.json`;
}

/**
 * The canonical on-disk path of a component's code file: component names
 * are component-library ids (`fs/ReadFile`) — the library namespace
 * materializes into subdirectories.
 *
 * @param {string} componentName
 * @returns {string}
 */
function componentCodePath(componentName) {
  return `components/${componentName}.js`;
}

/**
 * @param {string} componentName
 * @returns {string}
 */
function componentSignaturePath(componentName) {
  return `components/${componentName}.json`;
}

/**
 * Recursively sorts object keys for deterministic serialization.
 *
 * @param {any} value
 * @returns {any}
 */
function sorted(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sorted(item));
  }
  if (value && typeof value === "object") {
    /** @type {Record<string, any>} */
    const result = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = sorted(value[key]);
    }
    return result;
  }
  return value;
}

/**
 * Materializes the project document into the file tree: a plain
 * `{ path: content }` record. Pure — no fs touched here; `writeFileTree`
 * persists it.
 *
 * @param {import("yjs").Doc} doc
 * @param {{ graphId?: string }} [options] `graphId` materializes a single
 *   graph instead of the whole project.
 * @returns {Record<string, string>}
 */
export function docToFileTree(doc, options = {}) {
  const metadata = sorted(doc.getMap("metadata").toJSON());
  /** @type {Record<string, string>} */
  const tree = {
    "project.json":
      JSON.stringify({ ...metadata, format: "noflo-ui-project" }, null, 2) +
      "\n",
  };

  const graphIds = options.graphId
    ? [options.graphId]
    : [...doc.getMap("graphs").keys()].sort();
  for (const graphId of graphIds) {
    const view = projectGraph(doc, graphId);
    if (!view) continue;
    tree[graphPath(graphId)] = serializeGraph(view);
  }

  // Components materialize from two maps: the `components` map carries the
  // code buffers (Y.Text), the `registry` carries the declared signatures
  const components = doc.getMap(COMPONENTS_MAP);
  const registry = doc.getMap(REGISTRY_MAP);
  const names = [...new Set([...components.keys(), ...registry.keys()].sort())];
  for (const name of names) {
    const component = components.get(name);
    const code = component ? getComponentCode(component) : null;
    if (code) {
      tree[componentCodePath(name)] = code.toString();
    }
    const signature = getComponentSignature(doc, name)?.toJSON?.() ?? {};
    tree[componentSignaturePath(name)] =
      JSON.stringify(
        sorted({
          name,
          description: signature.description ?? "",
          icon: signature.icon ?? "gear",
          inports: (signature.inports ?? []).map((/** @type {any} */ port) => ({
            name: port.name,
            type: port.type ?? "all",
            ...(port.addressable ? { addressable: true } : {}),
          })),
          outports: (signature.outports ?? []).map(
            (/** @type {any} */ port) => ({
              name: port.name,
              type: port.type ?? "all",
              ...(port.addressable ? { addressable: true } : {}),
            }),
          ),
        }),
        null,
        2,
      ) + "\n";
  }

  return tree;
}

/**
 * Writes a file tree through the fs adapter.
 *
 * @param {Record<string, string>} tree
 * @param {MaterializerFs} fs
 * @returns {Promise<string[]>} The written paths, sorted.
 */
export async function writeFileTree(tree, fs) {
  const paths = Object.keys(tree).sort();
  for (const path of paths) {
    await fs.writeFile(path, tree[path]);
  }
  return paths;
}
