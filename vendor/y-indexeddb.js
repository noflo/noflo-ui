// node_modules/y-indexeddb/src/y-indexeddb.js
import * as Y from "./yjs.js";

// node_modules/lib0/promise.js
var create = (f) => (
  /** @type {Promise<T>} */
  new Promise(f)
);
var all = Promise.all.bind(Promise);

// node_modules/lib0/error.js
var create2 = (s) => new Error(s);

// node_modules/lib0/indexeddb.js
var rtop = (request) => create((resolve, reject) => {
  request.onerror = (event) => reject(new Error(event.target.error));
  request.onsuccess = (event) => resolve(event.target.result);
});
var openDB = (name, initDB) => create((resolve, reject) => {
  const request = indexedDB.open(name);
  request.onupgradeneeded = (event) => initDB(event.target.result);
  request.onerror = (event) => reject(create2(event.target.error));
  request.onsuccess = (event) => {
    const db = event.target.result;
    db.onversionchange = () => {
      db.close();
    };
    resolve(db);
  };
});
var deleteDB = (name) => rtop(indexedDB.deleteDatabase(name));
var createStores = (db, definitions) => definitions.forEach(
  (d) => (
    // @ts-ignore
    db.createObjectStore.apply(db, d)
  )
);
var transact = (db, stores, access = "readwrite") => {
  const transaction = db.transaction(stores, access);
  return stores.map((store) => getStore(transaction, store));
};
var count = (store, range) => rtop(store.count(range));
var get = (store, key) => rtop(store.get(key));
var del = (store, key) => rtop(store.delete(key));
var put = (store, item, key) => rtop(store.put(item, key));
var addAutoKey = (store, item) => rtop(store.add(item));
var getAll = (store, range, limit) => rtop(store.getAll(range, limit));
var queryFirst = (store, query, direction) => {
  let first = null;
  return iterateKeys(store, query, (key) => {
    first = key;
    return false;
  }, direction).then(() => first);
};
var getLastKey = (store, range = null) => queryFirst(store, range, "prev");
var iterateOnRequest = (request, f) => create((resolve, reject) => {
  request.onerror = reject;
  request.onsuccess = async (event) => {
    const cursor = event.target.result;
    if (cursor === null || await f(cursor) === false) {
      return resolve();
    }
    cursor.continue();
  };
});
var iterateKeys = (store, keyrange, f, direction = "next") => iterateOnRequest(store.openKeyCursor(keyrange, direction), (cursor) => f(cursor.key));
var getStore = (t, store) => t.objectStore(store);
var createIDBKeyRangeUpperBound = (upper, upperOpen) => IDBKeyRange.upperBound(upper, upperOpen);
var createIDBKeyRangeLowerBound = (lower, lowerOpen) => IDBKeyRange.lowerBound(lower, lowerOpen);

// node_modules/lib0/map.js
var create3 = () => /* @__PURE__ */ new Map();
var setIfUndefined = (map, key, createT) => {
  let set = map.get(key);
  if (set === void 0) {
    map.set(key, set = createT());
  }
  return set;
};

// node_modules/lib0/set.js
var create4 = () => /* @__PURE__ */ new Set();

// node_modules/lib0/array.js
var from = Array.from;

// node_modules/lib0/observable.js
var Observable = class {
  constructor() {
    this._observers = create3();
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  on(name, f) {
    setIfUndefined(this._observers, name, create4).add(f);
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  once(name, f) {
    const _f = (...args) => {
      this.off(name, _f);
      f(...args);
    };
    this.on(name, _f);
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  off(name, f) {
    const observers = this._observers.get(name);
    if (observers !== void 0) {
      observers.delete(f);
      if (observers.size === 0) {
        this._observers.delete(name);
      }
    }
  }
  /**
   * Emit a named event. All registered event listeners that listen to the
   * specified name will receive the event.
   *
   * @todo This should catch exceptions
   *
   * @param {N} name The event name.
   * @param {Array<any>} args The arguments that are applied to the event listener.
   */
  emit(name, args) {
    return from((this._observers.get(name) || create3()).values()).forEach((f) => f(...args));
  }
  destroy() {
    this._observers = create3();
  }
};

// node_modules/y-indexeddb/src/y-indexeddb.js
var customStoreName = "custom";
var updatesStoreName = "updates";
var PREFERRED_TRIM_SIZE = 500;
var fetchUpdates = (idbPersistence, beforeApplyUpdatesCallback = () => {
}, afterApplyUpdatesCallback = () => {
}) => {
  const [updatesStore] = transact(
    /** @type {IDBDatabase} */
    idbPersistence.db,
    [updatesStoreName]
  );
  return getAll(updatesStore, createIDBKeyRangeLowerBound(idbPersistence._dbref, false)).then((updates) => {
    if (!idbPersistence._destroyed) {
      beforeApplyUpdatesCallback(updatesStore);
      Y.transact(idbPersistence.doc, () => {
        updates.forEach((val) => Y.applyUpdate(idbPersistence.doc, val));
      }, idbPersistence, false);
      afterApplyUpdatesCallback(updatesStore);
    }
  }).then(() => getLastKey(updatesStore).then((lastKey) => {
    idbPersistence._dbref = lastKey + 1;
  })).then(() => count(updatesStore).then((cnt) => {
    idbPersistence._dbsize = cnt;
  })).then(() => updatesStore);
};
var storeState = (idbPersistence, forceStore = true) => fetchUpdates(idbPersistence).then((updatesStore) => {
  if (forceStore || idbPersistence._dbsize >= PREFERRED_TRIM_SIZE) {
    addAutoKey(updatesStore, Y.encodeStateAsUpdate(idbPersistence.doc)).then(() => del(updatesStore, createIDBKeyRangeUpperBound(idbPersistence._dbref, true))).then(() => count(updatesStore).then((cnt) => {
      idbPersistence._dbsize = cnt;
    }));
  }
});
var clearDocument = (name) => deleteDB(name);
var IndexeddbPersistence = class extends Observable {
  /**
   * @param {string} name
   * @param {Y.Doc} doc
   */
  constructor(name, doc) {
    super();
    this.doc = doc;
    this.name = name;
    this._dbref = 0;
    this._dbsize = 0;
    this._destroyed = false;
    this.db = null;
    this.synced = false;
    this._db = openDB(
      name,
      (db) => createStores(db, [
        ["updates", { autoIncrement: true }],
        ["custom"]
      ])
    );
    this.whenSynced = create((resolve) => this.on("synced", () => resolve(this)));
    this._db.then((db) => {
      this.db = db;
      const beforeApplyUpdatesCallback = (updatesStore) => addAutoKey(updatesStore, Y.encodeStateAsUpdate(doc));
      const afterApplyUpdatesCallback = () => {
        if (this._destroyed) return this;
        this.synced = true;
        this.emit("synced", [this]);
      };
      fetchUpdates(this, beforeApplyUpdatesCallback, afterApplyUpdatesCallback);
    });
    this._storeTimeout = 1e3;
    this._storeTimeoutId = null;
    this._storeUpdate = (update, origin) => {
      if (this.db && origin !== this) {
        const [updatesStore] = transact(
          /** @type {IDBDatabase} */
          this.db,
          [updatesStoreName]
        );
        addAutoKey(updatesStore, update);
        if (++this._dbsize >= PREFERRED_TRIM_SIZE) {
          if (this._storeTimeoutId !== null) {
            clearTimeout(this._storeTimeoutId);
          }
          this._storeTimeoutId = setTimeout(() => {
            storeState(this, false);
            this._storeTimeoutId = null;
          }, this._storeTimeout);
        }
      }
    };
    doc.on("update", this._storeUpdate);
    this.destroy = this.destroy.bind(this);
    doc.on("destroy", this.destroy);
  }
  destroy() {
    if (this._storeTimeoutId) {
      clearTimeout(this._storeTimeoutId);
    }
    this.doc.off("update", this._storeUpdate);
    this.doc.off("destroy", this.destroy);
    this._destroyed = true;
    return this._db.then((db) => {
      db.close();
    });
  }
  /**
   * Destroys this instance and removes all data from indexeddb.
   *
   * @return {Promise<void>}
   */
  clearData() {
    return this.destroy().then(() => {
      deleteDB(this.name);
    });
  }
  /**
   * @param {String | number | ArrayBuffer | Date} key
   * @return {Promise<String | number | ArrayBuffer | Date | any>}
   */
  get(key) {
    return this._db.then((db) => {
      const [custom] = transact(db, [customStoreName], "readonly");
      return get(custom, key);
    });
  }
  /**
   * @param {String | number | ArrayBuffer | Date} key
   * @param {String | number | ArrayBuffer | Date} value
   * @return {Promise<String | number | ArrayBuffer | Date>}
   */
  set(key, value) {
    return this._db.then((db) => {
      const [custom] = transact(db, [customStoreName]);
      return put(custom, value, key);
    });
  }
  /**
   * @param {String | number | ArrayBuffer | Date} key
   * @return {Promise<undefined>}
   */
  del(key) {
    return this._db.then((db) => {
      const [custom] = transact(db, [customStoreName]);
      return del(custom, key);
    });
  }
};
export {
  IndexeddbPersistence,
  PREFERRED_TRIM_SIZE,
  clearDocument,
  fetchUpdates,
  storeState
};
