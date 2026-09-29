/**
 * @file Persistence binding for the project Y.Doc (Engine side), per SPEC
 * "IndexedDB Persistence & Multi-Tab Safety": y-indexeddb holds the
 * authoritative CRDT state, and the schema version is checked after loading —
 * the Engine drives the migrations.
 *
 * This module is Engine/Worker territory: it must never be imported by
 * main-thread (Glass) code, so the y-indexeddb dependency stays out of the
 * Glass module graph.
 */

import { IndexeddbPersistence } from "../../vendor/y-indexeddb.js";

import { ensureProjectSchema } from "./ProjectDoc.js";

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
