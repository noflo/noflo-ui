/**
 * @file Factory reset (work document #26): wipes this device's local
 * state — mesh configuration and identity, Dacar wallet and node configs,
 * project CRDT stores — so the device can be re-invited from scratch.
 *
 * The Safari trap: `indexedDB.deleteDatabase()` *blocks* for as long as any
 * connection to the database is open, and Safari neither fires `blocked`
 * promptly nor surfaces which connection holds it. Every connection the
 * Engine owns must therefore be closed BEFORE the deletes, and each delete
 * is raced against a timeout so a stuck delete can never hang the reset —
 * the Glass reloads afterwards and boots from whatever state actually
 * landed (a half-deleted store is still wiped on the next attempt, since
 * the connections are gone by then).
 */

/**
 * Closes the given storage wrappers (best-effort): open IndexedDB
 * connections block `deleteDatabase`.
 *
 * @param {Array<import("../crdt/MeshConfig.js").AsyncStorage | undefined | null>} storages
 */
function closeStorages(storages) {
  for (const storage of storages) {
    try {
      storage?.close?.();
    } catch {
      // Best-effort: a failing close must not stop the reset
    }
  }
}

/**
 * Deletes one database, resolving even when the delete cannot complete
 * (Safari blocks while a connection is open) after `timeoutMs`.
 *
 * @param {IDBFactory} indexeddb
 * @param {string} name
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
function deleteOneDatabase(indexeddb, name, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timer;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    timer = setTimeout(finish, timeoutMs);
    const request = indexeddb.deleteDatabase(name);
    request.onsuccess = finish;
    request.onerror = finish;
    request.onblocked = () => {
      // Connections still open: the timeout path resolves; a later reset
      // (or the reload's fresh boot) finishes the wipe
    };
  });
}

/**
 * Lists the device's noflo-* IndexedDB databases. `indexedDB.databases()`
 * is unavailable on some Safari versions, in which case the caller's known
 * names are used as the fallback set.
 *
 * @param {IDBFactory} indexeddb
 * @param {string[]} fallbackNames
 * @returns {Promise<string[]>}
 */
export async function listNofloDatabases(indexeddb, fallbackNames) {
  const names = new Set(fallbackNames);
  try {
    const infos = /** @type {Array<{ name: string }> | undefined} */ (
      await /** @type {any} */ (indexeddb).databases?.()
    );
    if (Array.isArray(infos)) {
      for (const info of infos) {
        if (typeof info?.name === "string" && info.name.startsWith("noflo-")) {
          names.add(info.name);
        }
      }
    }
  } catch {
    // Enumeration unsupported: the fallback set applies
  }
  return [...names];
}

/**
 * Performs the factory reset: closes every given storage connection, then
 * deletes the given databases by name. Resolves once every delete either
 * completed or timed out.
 *
 * @param {{
 *   indexeddb: IDBFactory,
 *   storages?: Array<import("../crdt/MeshConfig.js").AsyncStorage | undefined | null>,
 *   databaseNames: string[],
 *   timeoutMs?: number,
 * }} options
 * @returns {Promise<void>}
 */
export async function performFactoryReset({
  indexeddb,
  storages = [],
  databaseNames,
  timeoutMs = 5_000,
}) {
  closeStorages(storages);
  for (const name of databaseNames) {
    await deleteOneDatabase(indexeddb, name, timeoutMs);
  }
}
