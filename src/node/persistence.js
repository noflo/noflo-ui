/**
 * @file File-backed Y.Doc persistence (work document #44, M1): the Node
 * counterpart of the engine's IndexedDB binder. The doc's state is written
 * as a binary Y update — atomically (temp file + rename) — debounced on
 * every change, and applied back at boot. The mesh peers are the other
 * half of durability: a snapshot at boot plus live sync converges the doc
 * even when the file predates remote edits.
 *
 * The Yjs instance is imported through the same vendored module the app
 * uses, so all contexts share one Yjs implementation.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as Y from "../../vendor/yjs.js";

/**
 * Binds a file-backed persistence to the doc: applies the existing
 * snapshot (when present) and saves a debounced full-state update on every
 * doc change.
 *
 * @param {import("yjs").Doc} doc
 * @param {string} filePath
 * @param {{ debounceMs?: number }} [options]
 * @returns {{ ready: Promise<void>, destroy: () => Promise<void> }}
 */
export function bindFilePersistence(doc, filePath, options = {}) {
  const debounceMs = options.debounceMs ?? 500;
  /** @type {NodeJS.Timeout | null} */
  let timer = null;
  let pending = false;
  let closed = false;
  let lastSerialized = "";

  const save = async () => {
    const update = Y.encodeStateAsUpdate(doc);
    // Serialize-compare skips writes when nothing changed
    const serialized = Buffer.from(update).toString("base64");
    if (serialized === lastSerialized) return;
    lastSerialized = serialized;
    const temp = `${filePath}.tmp`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(temp, update);
    await fs.rename(temp, filePath);
  };

  const scheduleSave = () => {
    if (closed) return;
    if (timer) {
      pending = true;
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      save()
        .then(() => {
          if (pending) {
            pending = false;
            scheduleSave();
          }
        })
        .catch((error) => console.error("Doc persistence failed:", error));
    }, debounceMs);
  };

  return {
    ready: (async () => {
      try {
        const snapshot = await fs.readFile(filePath);
        // Yjs merges merge-safe: the snapshot may be older than mesh
        // state; the vector clocks reconcile
        Y.applyUpdate(doc, snapshot);
      } catch {
        // No snapshot yet: first boot — the doc starts fresh and the
        // first save creates the file
      }
      doc.on("update", scheduleSave);
      await save();
    })(),
    async destroy() {
      closed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      doc.off("update", scheduleSave);
      await save();
    },
  };
}

/**
 * A file-backed mesh-config storage (the AsyncStorage contract the engine
 * accepts for `meshStorage`): the config survives daemon restarts.
 *
 * @param {string} filePath
 * @returns {import("../crdt/MeshConfig.js").AsyncStorage}
 */
export function createFileStorage(filePath) {
  /** @type {Map<string, any>} */
  const store = new Map();
  let loaded = false;
  return {
    async get(key) {
      if (!loaded) {
        loaded = true;
        try {
          const raw = await fs.readFile(filePath, "utf8");
          const parsed = JSON.parse(raw);
          for (const [k, v] of Object.entries(parsed)) store.set(k, v);
        } catch {
          // First boot: no config file yet
        }
      }
      return store.get(key) ?? null;
    },
    async set(key, value) {
      store.set(key, value);
      /** @type {Record<string, any>} */
      const record = {};
      for (const [k, v] of store.entries()) record[k] = v;
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(record, null, 2) + "\n");
    },
    close() {},
  };
}
