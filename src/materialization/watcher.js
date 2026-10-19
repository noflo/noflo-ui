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

  // Every write-side operation chains through one queue: the absorption
  // rides every CRDT update and file events arrive while it runs, so
  // interleaved writeChanged calls would race the snapshot's advances —
  // serialized, each operation diffs against the settled base, and rapid
  // updates never drop an absorption
  let queue = Promise.resolve();
  /**
   * @param {() => Promise<void>} job
   * @returns {Promise<void>}
   */
  const enqueue = (job) => {
    const run = queue.then(job);
    queue = run.catch(() => {});
    return run;
  };

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

  /**
   * Handles one file event: `content` is the new file content, or `null`
   * when the file was deleted. Routes by path into the delta differs and
   * submits the resulting intents. Runs inside the write queue — the
   * snapshot it reads and advances is stable for the operation's
   * duration.
   *
   * @param {string} path
   * @param {string | null} content
   * @returns {Promise<void>}
   */
  async function handleFileEventInner(path, content) {
    if (snapshot === null) return;
    const base = snapshot[path] ?? null;

    if (path === "project.json" || path === "package.json") {
      // Derived state: the generator owns these files. A file event on
      // them never advances the snapshot, so the event's content
      // differing from the snapshot IS the signal — re-project the
      // generated form; ownership runs through the intents
      // (setProjectDependency), never the files
      const generated = docToFileTree(doc, options)[path];
      if (generated !== undefined && content !== base) {
        await fs.writeFile(path, generated);
        snapshot[path] = generated;
      }
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

    if (path.startsWith("specs/") && path.endsWith(".yaml")) {
      // The suite's YAML is the interchange form of a CRDT-owned suite
      // (work document #16): file edits do not yet ingest — the reverse
      // direction rides the spec editor's work, and the reason is stated
      onDiagnostic(
        path,
        "spec file edits are not ingested yet — edit tests in the editor",
      );
      return;
    }

    if (path.startsWith("components/") && path.endsWith(".js")) {
      const componentName = path.slice("components/".length, -".js".length);
      if (content === null) {
        // Component removal is an editor act (the signature, the code,
        // and the request pointer leave together) — a deleted file is
        // diagnosed, never silently ignored (work document #43)
        onDiagnostic(
          path,
          "component file deletion is not propagated — remove the component in the editor",
        );
        return;
      }
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

    if (path.startsWith("docs/") && path.endsWith(".md")) {
      const name = path.slice("docs/".length, -".md".length);
      if (content === null) {
        emitIntent({
          type: "INTENT",
          command: "removeDoc",
          payload: { name },
        });
        delete snapshot[path];
        return;
      }
      const intent = diffCode(base, content);
      if (intent === null) return;
      emitIntent({
        type: "INTENT",
        command: "setDoc",
        payload: { name, content: intent },
      });
      snapshot[path] = content;
      return;
    }

    if (path.startsWith("components/") && path.endsWith(".json")) {
      const componentName = path.slice("components/".length, -".json".length);
      if (content === null) {
        // Same as the code file: deletion is an editor act, diagnosed
        // rather than silently ignored (work document #43)
        onDiagnostic(
          path,
          "component signature deletion is not propagated — remove the component in the editor",
        );
        return;
      }
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
  }

  return {
    /**
     * Full materialization: project → write every file → snapshot.
     *
     * @returns {Promise<void>}
     */
    async materialize() {
      await enqueue(() => writeChanged(docToFileTree(doc, options)));
    },

    /**
     * Echo suppression: remote CRDT changes re-project and rewrite; the
     * snapshot advances so the watcher's events for these writes diff to
     * nothing. Queued behind whatever write-side operation is running.
     *
     * @returns {Promise<void>}
     */
    async absorbRemote() {
      await enqueue(() => writeChanged(docToFileTree(doc, options)));
    },

    /**
     * Handles one file event: `content` is the new file content, or `null`
     * when the file was deleted. Queued behind whatever write-side
     * operation is running.
     *
     * @param {string} path
     * @param {string | null} content
     * @returns {Promise<void>}
     */
    async handleFileEvent(path, content) {
      await enqueue(() => handleFileEventInner(path, content));
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
