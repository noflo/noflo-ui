/**
 * Minimal in-memory IDBFactory fake covering the surface the IndexedDB
 * consumers use (ProjectStore's open/upgrade and object-store CRUD through
 * transactions): the diagnostics store spec and the sync panel's persisted
 * stream hydration both run against it, since happy-dom ships no IndexedDB.
 */

/**
 * @returns {IDBFactory}
 */
export function makeFakeIdb() {
  /** @type {Map<string, { version: number, stores: Map<string, Map<any, any>> }>} */
  const databases = new Map();
  return {
    /** @param {string} name @param {number} version */
    open(name, version = 1) {
      let db = databases.get(name);
      if (!db) {
        db = { version: 0, stores: new Map() };
        databases.set(name, db);
      }
      const current = db;
      const request = {
        result: null,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };
      queueMicrotask(() => {
        if (version > current.version) {
          /** @type {any} */
          const fakeDb = {
            /** @param {string} storeName */
            createObjectStore: (storeName) => {
              const store = new Map();
              current.stores.set(storeName, store);
              return { createIndex: () => ({}) };
            },
          };
          request.onupgradeneeded?.({
            target: { result: fakeDb },
            oldVersion: current.version,
          });
          current.version = version;
        }
        const stores = current.stores;
        request.result = {
          name,
          close() {},
          /** @param {string} storeName @param {string} mode */
          transaction: (storeName, _mode = "readonly") => {
            const store = stores.get(storeName);
            if (!store) throw new Error(`no such store: ${storeName}`);
            return {
              objectStore: () => ({
                request: (/** @type {() => any} */ operation) => {
                  const req = {
                    result: null,
                    error: null,
                    onsuccess: null,
                    onerror: null,
                  };
                  queueMicrotask(() => {
                    try {
                      req.result = operation();
                    } catch (err) {
                      req.error = err;
                      req.onerror?.();
                      return;
                    }
                    req.onsuccess?.();
                  });
                  return req;
                },
                get: function (/** @type {any} */ key) {
                  return this.request(() => store.get(key) ?? undefined);
                },
                getAll: function () {
                  return this.request(() => [...store.values()]);
                },
                put: function (/** @type {any} */ value) {
                  return this.request(() => {
                    store.set(value.id, structuredClone(value));
                    return value.id;
                  });
                },
                delete: function (/** @type {any} */ key) {
                  return this.request(() => {
                    store.delete(key);
                    return undefined;
                  });
                },
              }),
            };
          },
        };
        request.onsuccess?.();
      });
      return request;
    },
  };
}
