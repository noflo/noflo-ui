/**
 * @file Structural storage database for a NoFlo project, per SPEC "IndexedDB
 * Persistence & Multi-Tab Safety": a wrapper database whose structural
 * migrations are handled through IndexedDB's native `onupgradeneeded`
 * lifecycle, independently of the Yjs document schema (which lives in its own
 * y-indexeddb database).
 */

/**
 * @typedef {Object} StoreDefinition
 * @property {string} name
 * @property {string} keyPath Primary key path of the object store.
 */

/**
 * @typedef {Object} DatabaseOptions
 * @property {number} version Database schema version (bump to migrate).
 * @property {(db: IDBDatabase, oldVersion: number, transaction: IDBTransaction) => void} upgrade
 *   Creates object stores and indexes when the version increases.
 */

/**
 * Opens the structural database, applying the upgrade migration whenever the
 * requested version is higher than the stored one.
 *
 * @param {IDBFactory} idbFactory Injected `indexedDB` global (testable).
 * @param {string} name
 * @param {DatabaseOptions} options
 * @returns {Promise<IDBDatabase>}
 */
export function openDatabase(idbFactory, name, { version, upgrade }) {
  return new Promise((resolve, reject) => {
    const request = idbFactory.open(name, version);
    request.onupgradeneeded = (event) => {
      const target = /** @type {any} */ (event.target);
      upgrade(
        /** @type {IDBDatabase} */ (target.result),
        event.oldVersion,
        target.transaction,
      );
    };
    request.onsuccess = () => {
      const db = /** @type {IDBDatabase} */ (request.result);
      db.onversionchange = () => {
        // Another context upgraded or deleted the database; close politely.
        db.close();
      };
      resolve(db);
    };
    request.onerror = () => {
      reject(/** @type {any} */ (request.error));
    };
  });
}

/**
 * Reads one record by primary key.
 *
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {IDBValidKey} key
 * @returns {Promise<any>}
 */
export function getRecord(db, storeName, key) {
  return runRequest(db, storeName, "readonly", (store) => store.get(key));
}

/**
 * Reads all records of a store.
 *
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @returns {Promise<any[]>}
 */
export function getAllRecords(db, storeName) {
  return runRequest(db, storeName, "readonly", (store) => store.getAll());
}

/**
 * Writes a record.
 *
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {any} value
 * @param {IDBValidKey} [key] Only when the store does not use in-line keys.
 * @returns {Promise<IDBValidKey>}
 */
export function putRecord(db, storeName, value, key) {
  return runRequest(db, storeName, "readwrite", (store) =>
    key === undefined ? store.put(value) : store.put(value, key),
  );
}

/**
 * Deletes a record by primary key.
 *
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {IDBValidKey} key
 * @returns {Promise<void>}
 */
export function deleteRecord(db, storeName, key) {
  return runRequest(db, storeName, "readwrite", (store) => store.delete(key));
}

/**
 * Runs one request on a fresh transaction and resolves with its result.
 *
 * @template T
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest<T>} start
 * @returns {Promise<T>}
 */
function runRequest(db, storeName, mode, start) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = start(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(/** @type {T} */ (request.result));
    request.onerror = () => reject(/** @type {any} */ (request.error));
  });
}
