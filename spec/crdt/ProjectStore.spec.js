import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deleteRecord,
  getAllRecords,
  getRecord,
  openDatabase,
  putRecord,
} from "../../src/crdt/ProjectStore.js";

/**
 * Minimal in-memory IDBFactory fake covering the surface ProjectStore uses:
 * open (with onupgradeneeded versioning) and object store CRUD through
 * transactions.
 */
function makeFakeIdb() {
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
      /** @type {{ result: any, error: any, onupgradeneeded: any, onsuccess: any, onerror: any }} */
      const request = {
        result: null,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };
      queueMicrotask(() => {
        if (version > current.version) {
          const fakeTransaction = {
            objectStore: () => {
              throw new Error(
                "stores must be created synchronously in upgrade",
              );
            },
          };
          /** @type {any} */
          const fakeDb = {
            createObjectStore: (
              /** @type {string} */ storeName,
              /** @type {any} */ options,
            ) => {
              const store = new Map();
              current.stores.set(storeName, store);
              return {
                /** @param {string} keyPath */
                createIndex: (keyPath) => ({ storeName, keyPath }),
              };
            },
            deleteObjectStore: (/** @type {string} */ storeName) => {
              current.stores.delete(storeName);
            },
          };
          if (request.onupgradeneeded) {
            request.onupgradeneeded({
              target: { result: fakeDb, transaction: fakeTransaction },
              oldVersion: current.version,
            });
          }
          current.version = version;
        }
        const stores = current.stores;
        request.result = {
          name,
          close() {},
          /** @param {string} storeName @param {string} mode */
          transaction: (storeName, mode = "readonly") => {
            const store = stores.get(storeName);
            if (!store) {
              throw new Error(`no such store: ${storeName}`);
            }
            return {
              objectStore: () => ({
                /** Wraps a raw operation result in a minimal IDBRequest. */
                request: (/** @type {() => any} */ operation) => {
                  /** @type {{ result: any, error: any, onsuccess: any, onerror: any }} */
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
                      if (req.onerror) req.onerror();
                      return;
                    }
                    if (req.onsuccess) req.onsuccess();
                  });
                  return req;
                },
                /** @param {any} key */
                get: function (key) {
                  return this.request(() => store.get(key) ?? undefined);
                },
                getAll: function () {
                  return this.request(() => [...store.values()]);
                },
                /** @param {any} value @param {any} key */
                put: function (value, key) {
                  return this.request(() => {
                    const recordKey = key ?? (value && value.id);
                    if (recordKey === undefined) {
                      throw new Error("no key");
                    }
                    store.set(recordKey, structuredClone(value));
                    return recordKey;
                  });
                },
                /** @param {any} key */
                delete: function (key) {
                  return this.request(() => {
                    store.delete(key);
                  });
                },
              }),
            };
          },
        };
        if (request.onsuccess) request.onsuccess();
      });
      return request;
    },
  };
}

describe("ProjectStore", () => {
  it("opens a database and runs the upgrade migration per version bump", async () => {
    const idb = makeFakeIdb();
    /** @type {number[]} */
    const upgrades = [];
    const db = await openDatabase(idb, "project-meta", {
      version: 2,
      upgrade: (dbObject, oldVersion) => {
        upgrades.push(oldVersion);
        if (oldVersion < 1)
          dbObject.createObjectStore("projects", { keyPath: "id" });
        if (oldVersion < 2)
          dbObject.createObjectStore("settings", { keyPath: "key" });
      },
    });
    assert.deepEqual(upgrades, [0], "one upgrade call from version 0 to 2");
    assert.ok(db);
  });

  it("does not re-run migrations when the version matches", async () => {
    const idb = makeFakeIdb();
    const options = {
      version: 1,
      upgrade: (/** @type {any} */ dbObject) => {
        dbObject.createObjectStore("projects", { keyPath: "id" });
      },
    };
    await openDatabase(idb, "project-meta", options);
    /** @type {number[]} */
    const upgrades = [];
    await openDatabase(idb, "project-meta", {
      version: 1,
      upgrade: (/** @type {any} */ _db, oldVersion) => {
        upgrades.push(oldVersion);
      },
    });
    assert.deepEqual(upgrades, [], "no upgrade when already at version");
  });

  it("put/get/getAll/delete round-trip records", async () => {
    const idb = makeFakeIdb();
    const db = await openDatabase(idb, "project-meta", {
      version: 1,
      upgrade: (/** @type {any} */ dbObject) => {
        dbObject.createObjectStore("projects", { keyPath: "id" });
      },
    });

    await putRecord(db, "projects", { id: "p1", name: "Marine" });
    await putRecord(db, "projects", { id: "p2", name: "Demo" });

    assert.deepEqual(await getRecord(db, "projects", "p1"), {
      id: "p1",
      name: "Marine",
    });
    assert.equal((await getAllRecords(db, "projects")).length, 2);

    await deleteRecord(db, "projects", "p1");
    assert.equal(await getRecord(db, "projects", "p1"), undefined);
    assert.equal((await getAllRecords(db, "projects")).length, 1);
  });
});
