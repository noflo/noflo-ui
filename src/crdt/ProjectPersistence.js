/**
 * @file Persistence binding for the project Y.Doc, per SPEC "IndexedDB
 * Persistence & Multi-Tab Safety": y-indexeddb holds the authoritative CRDT
 * state, the schema version is checked after loading (the Engine drives the
 * migrations), and imminent eviction is surfaced to the user.
 */

import { IndexeddbPersistence } from "y-indexeddb";

import { ensureProjectSchema, getProjectMetadata } from "./ProjectDoc.js";

/**
 * Binds a project Y.Doc to its IndexedDB persistence. The provider keeps
 * the document updated from disk and flushes changes continuously.
 *
 * @param {import("yjs").Doc} doc
 * @param {string} databaseName
 * @returns {IndexeddbPersistence}
 */
export function bindDocumentPersistence(doc, databaseName) {
  return new IndexeddbPersistence(databaseName, doc);
}

/**
 * Resolves once the persisted document has been fully loaded from storage.
 *
 * @param {IndexeddbPersistence} persistence
 * @returns {Promise<IndexeddbPersistence>}
 */
export function whenPersisted(persistence) {
  return persistence.whenSynced;
}

/**
 * Drives the CRDT schema migration after a persisted document was loaded.
 * Per SPEC, the Engine owns data migrations for older UI versions.
 *
 * @param {import("yjs").Doc} doc
 * @returns {{ from: number, to: number, migrated: boolean }}
 */
export function migrateLoadedProject(doc) {
  return ensureProjectSchema(doc);
}

/**
 * The storage pressure level reported by {@link checkEviction}.
 *
 * @typedef {'ok' | 'warning'} EvictionLevel
 */

/**
 * @typedef {Object} EvictionStatus
 * @property {EvictionLevel} level
 * @property {number} usage
 * @property {number} quota
 * @property {number} fraction
 */

/** Fraction of the quota above which the UI should warn about eviction. */
export const EVICTION_WARN_FRACTION = 0.8;

/**
 * Queries the storage estimate and reports whether eviction is imminent, so
 * the UI can proactively warn the user to export critical data.
 *
 * @param {{ estimate?: () => Promise<{ usage: number, quota: number }> } | undefined} storage
 *   Injected `navigator.storage` (undefined on unsupported platforms).
 * @param {{ warnFraction?: number }} [options]
 * @returns {Promise<EvictionStatus | null>} Null when storage estimates are unsupported.
 */
export async function checkEviction(storage, options = {}) {
  if (!storage || typeof storage.estimate !== "function") {
    return null;
  }
  const { usage = 0, quota = 0 } = await storage.estimate();
  const fraction = quota > 0 ? usage / quota : 0;
  const warnFraction = options.warnFraction ?? EVICTION_WARN_FRACTION;
  return {
    level: fraction >= warnFraction ? "warning" : "ok",
    usage,
    quota,
    fraction,
  };
}
