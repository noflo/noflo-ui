/**
 * @file The diagnostics store (work document #63's stream catalog, the app
 * diagnostics tenant): the persisted crash-report and mesh-connectivity
 * log, per SPEC "Error Handling & Diagnostics" — local persistence, no
 * remote telemetry servers. The storage posture is the flowtraces' (work
 * document #15 update #4): plain IndexedDB, a dedicated store, records
 * that are added and removed but never mutated — they are observation
 * records, not state.
 *
 * The store caps itself with the bounded-log discipline (guidelines §14):
 * the oldest records drop when the cap is exceeded, so a chatty session
 * cannot grow storage without bound. Glass-side only: it shares nothing
 * with the Engine's module graph.
 */

import {
  deleteRecord,
  getAllRecords,
  openDatabase,
  putRecord,
} from "../crdt/ProjectStore.js";

/** The diagnostics database's name. */
export const DIAGNOSTICS_DB = "noflo-diagnostics";

/** The object store holding the diagnostic records. */
export const DIAGNOSTICS_STORE = "events";

/** The record cap: the oldest records drop beyond it. */
const RECORD_CAP = 200;

/**
 * One diagnostic record: what happened, when, and how it reads in the
 * terminal grammar.
 *
 * @typedef {Object} DiagnosticRecord
 * @property {string} id
 * @property {number} at Wall-clock milliseconds.
 * @property {"crash" | "rejection" | "mesh"} kind
 * @property {string} message The human-legible main column.
 * @property {string} [status] The bracketed status tag (`CRASH`, `UP`).
 * @property {"ok" | "fail" | ""} [tone] The status' semantic color.
 * @property {string} [detail] Structured facts (source location, stack head).
 */

/** The singleton store promise: the Glass opens the database once.
 *
 * @type {Promise<DiagnosticsStore> | null}
 */
let singleton = null;

/**
 * @typedef {Object} DiagnosticsStore
 * @property {(record: Omit<DiagnosticRecord, "id">) => Promise<DiagnosticRecord>} append
 *   Persists one record; the cap drops the oldest when exceeded.
 * @property {(limit: number) => Promise<DiagnosticRecord[]>} recent
 *   The newest records, oldest first.
 * @property {() => Promise<boolean>} any Whether any record exists.
 * @property {() => Promise<void>} clear Wipes the log (the user's prune).
 */

/**
 * Opens the diagnostics store. Safe to call repeatedly — the singleton
 * promise is shared. Failures (private-mode browsers, storage pressure)
 * reject the promise; callers must survive without persistence.
 *
 * @param {IDBFactory} [idbFactory] Injected factory (testable); defaults
 *   to the global.
 * @returns {Promise<DiagnosticsStore>}
 */
export function openDiagnosticsStore(
  idbFactory = /** @type {any} */ (globalThis).indexedDB,
) {
  if (singleton) return singleton;
  const promise = (async () => {
    const db = await openDatabase(idbFactory, DIAGNOSTICS_DB, {
      version: 1,
      upgrade: (database) => {
        database.createObjectStore(DIAGNOSTICS_STORE, { keyPath: "id" });
      },
    });
    return {
      /**
       * @param {Omit<DiagnosticRecord, "id">} record
       * @returns {Promise<DiagnosticRecord>}
       */
      async append(record) {
        const full = /** @type {DiagnosticRecord} */ ({
          id:
            typeof crypto?.randomUUID === "function"
              ? crypto.randomUUID()
              : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          ...record,
        });
        await putRecord(db, DIAGNOSTICS_STORE, full);
        // The cap: drop the oldest beyond it (immutable add/remove)
        const all = await getAllRecords(db, DIAGNOSTICS_STORE);
        const sorted = all.sort((a, b) => a.at - b.at);
        const excess = sorted.slice(0, Math.max(0, sorted.length - RECORD_CAP));
        for (const record of excess) {
          await deleteRecord(db, DIAGNOSTICS_STORE, record.id);
        }
        return full;
      },
      /**
       * @param {number} limit
       * @returns {Promise<DiagnosticRecord[]>}
       */
      async recent(limit) {
        const all = await getAllRecords(db, DIAGNOSTICS_STORE);
        return all.sort((a, b) => a.at - b.at).slice(-limit);
      },
      async any() {
        const all = await getAllRecords(db, DIAGNOSTICS_STORE);
        return all.length > 0;
      },
      async clear() {
        const all = await getAllRecords(db, DIAGNOSTICS_STORE);
        for (const record of all) {
          await deleteRecord(db, DIAGNOSTICS_STORE, record.id);
        }
      },
    };
  })();
  singleton = promise;
  // A failed open must not poison the singleton: the next caller retries
  // (a test injecting a factory, or storage recovering)
  promise.catch(() => {
    if (singleton === promise) singleton = null;
  });
  return promise;
}

/** Test seam: forget the singleton so a spec can open a fresh store. */
export function resetDiagnosticsStore() {
  singleton = null;
}
