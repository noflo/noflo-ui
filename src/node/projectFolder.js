/**
 * @file The project folder's wiring (work document #43, the Companion's
 * half): the materializer over a real Node fs, the absorption guard that
 * keeps the two flows from re-entering each other, and the debounced
 * folder watcher whose file events stream back as intents. One module owns
 * the loop so the bridge and the integration tests exercise the same
 * production wiring, not parallel re-implementations.
 */

import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";
import { createMaterializer } from "../materialization/watcher.js";

/**
 * The materializer's fs seam over a real project directory.
 *
 * @param {string} folder The project's working directory.
 * @returns {import("../materialization/fileTree.js").MaterializerFs}
 */
export function materializerFs(folder) {
  return {
    writeFile: async (file, content) => {
      const target = path.join(folder, file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content);
    },
    remove: async (file) => {
      await fs.rm(path.join(folder, file)).catch(() => {});
    },
  };
}

/**
 * Watches a project folder and feeds file events to the handler:
 * `fs.watch` recursive covers macOS, Windows, and current Linux Node;
 * chokidar is the robustness upgrade if platforms complain. Debounced —
 * editors write in bursts; the read happens at flush so the handler sees
 * the settled content, and a failed read (a deleted file) hands over
 * null.
 *
 * @param {string} folder
 * @param {(relativePath: string, content: string | null) => Promise<void>} handle
 * @returns {import("node:fs").FSWatcher} The watcher, so a project switch
 *   can close it.
 */
function watchFolder(folder, handle) {
  /** @type {NodeJS.Timeout | null} */
  let timer = null;
  /** @type {Set<string>} */
  const queued = new Set();
  return fsSync.watch(folder, { recursive: true }, (_event, file) => {
    if (!file) return;
    const relative = file.replaceAll("\\", "/");
    queued.add(relative);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      for (const relativePath of [...queued]) {
        queued.delete(relativePath);
        fs.readFile(path.join(folder, relativePath), "utf8")
          .then((content) => handle(relativePath, content))
          .catch(() => handle(relativePath, null));
      }
    }, 200);
  });
}

/**
 * Wires the project folder's loop: the materializer, the absorption
 * reaction to CRDT updates, and the folder watcher. The single
 * `absorbing` guard spans both flows — the materializer's own writes and
 * the intents its file events produce must never re-enter each other.
 *
 * @param {Object} options
 * @param {import("yjs").Doc} options.doc The authoritative project doc.
 * @param {string} options.folder The project's working directory.
 * @param {{ handle: (intent: any) => void }} options.engine The engine
 *   dispatch — file-derived intents ride it Dacar-checked like any other.
 * @param {(message: string) => void} [options.log] The diagnostics
 *   channel (the Companion narrates; tests collect).
 * @param {(file: string, diagnostic: string) => void} [options.onDiagnostic]
 *   The structured pre-validation channel; when absent, diagnostics ride
 *   the log with the materializer's prefix.
 * @returns {{
 *   materializer: ReturnType<typeof createMaterializer>,
 *   materialize: () => Promise<void>,
 *   watch: () => import("node:fs").FSWatcher,
 * }}
 */
export function wireProjectFolder({
  doc,
  folder,
  engine,
  log = () => {},
  onDiagnostic,
}) {
  const materializer = createMaterializer({
    doc,
    fs: materializerFs(folder),
    emitIntent: (intent) => engine.handle(intent),
    onDiagnostic:
      onDiagnostic ??
      ((file, diagnostic) => {
        log(`materializer  ${file}: ${diagnostic}`);
      }),
  });

  // One guard for both flows: absorption runs on every CRDT update, the
  // watcher's handler raises the flag while its intents apply
  let absorbing = false;
  doc.on("update", () => {
    if (absorbing) return;
    absorbing = true;
    materializer
      .absorbRemote()
      .catch((error) => log(`Absorption failed: ${error?.message ?? error}`))
      .finally(() => {
        absorbing = false;
      });
  });

  return {
    materializer,
    async materialize() {
      absorbing = true;
      try {
        await materializer.materialize();
      } finally {
        absorbing = false;
      }
    },
    watch() {
      return watchFolder(folder, async (relative, content) => {
        absorbing = true;
        try {
          await materializer.handleFileEvent(relative, content);
        } finally {
          absorbing = false;
        }
      });
    },
  };
}
