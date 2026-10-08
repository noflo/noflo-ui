/**
 * @file The project materializer (work document #43): the stateful half of
 * the mapping. Two flows meet at a per-file snapshot:
 *
 * - **CRDT → files** (`absorbRemote`): the replica changed — re-project the
 *   tree, write changed paths, and advance the snapshot. The snapshot
 *   advance is the echo suppression: the materializer's own writes now
 *   match what the CRDT says, so the watcher's file events for them diff
 *   to nothing.
 * - **Files → CRDT** (`handleFileEvent`): an edited file diffs against its
 *   snapshot into minimal intents (deltas.js), which the bridge submits
 *   through the engine's dispatch; the snapshot advances immediately, so
 *   an intent the engine refuses surfaces as the next absorption writing
 *   the file back — never silently accepted.
 */

import {
  diffCode,
  diffGraphFile,
  diffSignature,
  parseGraphFile,
} from "./deltas.js";
import { docToFileTree } from "./fileTree.js";

/**
 * @typedef {Object} MaterializerOptions
 * @property {import("yjs").Doc} doc
 * @property {import("./fileTree.js").MaterializerFs} fs
 * @property {(intent: any) => void} emitIntent Submits one intent through
 *   the engine's dispatch — Dacar-checked identically to browser intents.
 * @property {(path: string, diagnostic: string) => void} [onDiagnostic]
 *   Receives pre-validation failures for edited files — rejections always
 *   answer with a reason, never silently (work document #43).
 * @property {string} [graphId] Restrict to one graph (single-graph
 *   consumers); the default materializes every graph in the doc.
 */

/**
 * @param {MaterializerOptions} options
 * @returns {{
 *   materialize: () => Promise<void>,
 *   absorbRemote: () => Promise<void>,
 *   handleFileEvent: (path: string, content: string | null) => Promise<void>,
 *   snapshot: () => Record<string, string>,
 * }}
 */
export function createMaterializer(options) {
  const { doc, fs, emitIntent, onDiagnostic = () => {} } = options;
  /** The last-materialized tree: the diff base and the echo-suppression
   * pivot. Null until the first materialization. */
  /** @type {Record<string, string> | null} */
  let snapshot = null;

  /**
   * Writes the tree's changed paths and advances the snapshot.
   *
   * @param {Record<string, string>} tree
   * @returns {Promise<void>}
   */
  async function writeChanged(tree) {
    const paths = new Set([
      ...Object.keys(tree),
      ...Object.keys(snapshot ?? {}),
    ]);
    for (const path of [...paths].sort()) {
      const content = tree[path];
      if (snapshot?.[path] === content) continue;
      if (content === undefined) {
        // The CRDT dropped a path (a graph or component was removed)
        if (fs.remove) await fs.remove(path);
        continue;
      }
      await fs.writeFile(path, content);
    }
    snapshot = { ...tree };
  }

  return {
    /**
     * Full materialization: project → write every file → snapshot.
     *
     * @returns {Promise<void>}
     */
    async materialize() {
      await writeChanged(docToFileTree(doc, options));
    },

    /**
     * Echo suppression: remote CRDT changes re-project and rewrite; the
     * snapshot advances so the watcher's events for these writes diff to
     * nothing.
     *
     * @returns {Promise<void>}
     */
    async absorbRemote() {
      await writeChanged(docToFileTree(doc, options));
    },

    /**
     * Handles one file event: `content` is the new file content, or `null`
     * when the file was deleted. Routes by path into the delta differs and
     * submits the resulting intents.
     *
     * @param {string} path
     * @param {string | null} content
     * @returns {Promise<void>}
     */
    async handleFileEvent(path, content) {
      if (snapshot === null) return;
      const base = snapshot[path] ?? null;

      if (path === "project.json") {
        // The manifest is derived state in this increment
        return;
      }

      if (path.startsWith("graphs/") && path.endsWith(".graph.json")) {
        const graphId = path
          .slice("graphs/".length, -".graph.json".length)
          .replace(/\.graph\.json$/, "");
        if (content === null) {
          emitIntent({
            type: "INTENT",
            command: "removeGraph",
            payload: { graphId },
          });
          delete snapshot[path];
          return;
        }
        const parsed = parseGraphFile(content);
        if (!parsed.ok) {
          // Pre-validation: an invalid file is a diagnostic, never a
          // rejected-intent storm into the CRDT
          onDiagnostic(path, parsed.diagnostic);
          return;
        }
        const baseGraph = base === null ? null : parseGraphFile(base);
        const baseGraphView =
          baseGraph && baseGraph.ok
            ? baseGraph.graph
            : { processes: {}, connections: [] };
        const intents = diffGraphFile(graphId, baseGraphView, parsed.graph);
        for (const intent of intents) emitIntent(intent);
        snapshot[path] = content;
        return;
      }

      if (path.startsWith("components/") && path.endsWith(".js")) {
        const componentName = path.slice("components/".length, -".js".length);
        if (content === null) return;
        const intent = diffCode(base, content);
        if (intent === null) return;
        emitIntent({
          type: "INTENT",
          command: "setComponentCode",
          payload: { component: componentName, code: intent },
        });
        snapshot[path] = content;
        return;
      }

      if (path.startsWith("components/") && path.endsWith(".json")) {
        const componentName = path.slice("components/".length, -".json".length);
        if (content === null) return;
        const signature = diffSignature(base, content);
        if (signature === null) return;
        emitIntent({
          type: "INTENT",
          command: "setSignature",
          payload: { component: componentName, signature },
        });
        snapshot[path] = content;
        return;
      }
    },

    /**
     * The current snapshot (diagnostics and tests).
     *
     * @returns {Record<string, string>}
     */
    snapshot() {
      return snapshot ?? {};
    },
  };
}
