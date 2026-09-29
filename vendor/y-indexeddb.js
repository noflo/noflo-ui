import * as Y from "./yjs.js";
//#region node_modules/lib0/promise.js
/**
* @template T
* @callback PromiseResolve
* @param {T|PromiseLike<T>} [result]
*/
/**
* @template T
* @param {function(PromiseResolve<T>,function(Error):void):any} f
* @return {Promise<T>}
*/
const create$3 = (f) => new Promise(f);
Promise.all.bind(Promise);
//#endregion
//#region node_modules/lib0/error.js
/**
* Error helpers.
*
* @module error
*/
/**
* @param {string} s
* @return {Error}
*/
/* c8 ignore next */
const create$2 = (s) => new Error(s);
//#endregion
//#region node_modules/lib0/indexeddb.js
/**
* Helpers to work with IndexedDB.
*
* @module indexeddb
*/
/* c8 ignore start */
/**
* IDB Request to Promise transformer
*
* @param {IDBRequest} request
* @return {Promise<any>}
*/
const rtop = (request) => create$3((resolve, reject) => {
	request.onerror = (event) => reject(new Error(event.target.error));
	request.onsuccess = (event) => resolve(event.target.result);
});
/**
* @param {string} name
* @param {function(IDBDatabase):any} initDB Called when the database is first created
* @return {Promise<IDBDatabase>}
*/
const openDB = (name, initDB) => create$3((resolve, reject) => {
	const request = indexedDB.open(name);
	/**
	* @param {any} event
	*/
	request.onupgradeneeded = (event) => initDB(event.target.result);
	/**
	* @param {any} event
	*/
	request.onerror = (event) => reject(create$2(event.target.error));
	/**
	* @param {any} event
	*/
	request.onsuccess = (event) => {
		/**
		* @type {IDBDatabase}
		*/
		const db = event.target.result;
		db.onversionchange = () => {
			db.close();
		};
		resolve(db);
	};
});
/**
* @param {string} name
*/
const deleteDB = (name) => rtop(indexedDB.deleteDatabase(name));
/**
* @param {IDBDatabase} db
* @param {Array<Array<string>|Array<string|IDBObjectStoreParameters|undefined>>} definitions
*/
const createStores = (db, definitions) => definitions.forEach((d) => db.createObjectStore.apply(db, d));
/**
* @param {IDBDatabase} db
* @param {Array<string>} stores
* @param {"readwrite"|"readonly"} [access]
* @return {Array<IDBObjectStore>}
*/
const transact = (db, stores, access = "readwrite") => {
	const transaction = db.transaction(stores, access);
	return stores.map((store) => getStore(transaction, store));
};
/**
* @param {IDBObjectStore} store
* @param {IDBKeyRange} [range]
* @return {Promise<number>}
*/
const count = (store, range) => rtop(store.count(range));
/**
* @param {IDBObjectStore} store
* @param {String | number | ArrayBuffer | Date | Array<any> } key
* @return {Promise<String | number | ArrayBuffer | Date | Array<any>>}
*/
const get = (store, key) => rtop(store.get(key));
/**
* @param {IDBObjectStore} store
* @param {String | number | ArrayBuffer | Date | IDBKeyRange | Array<any> } key
*/
const del = (store, key) => rtop(store.delete(key));
/**
* @param {IDBObjectStore} store
* @param {String | number | ArrayBuffer | Date | boolean} item
* @param {String | number | ArrayBuffer | Date | Array<any>} [key]
*/
const put = (store, item, key) => rtop(store.put(item, key));
/**
* @param {IDBObjectStore} store
* @param {String | number | ArrayBuffer | Date}  item
* @return {Promise<number>} Returns the generated key
*/
const addAutoKey = (store, item) => rtop(store.add(item));
/**
* @param {IDBObjectStore} store
* @param {IDBKeyRange} [range]
* @param {number} [limit]
* @return {Promise<Array<any>>}
*/
const getAll = (store, range, limit) => rtop(store.getAll(range, limit));
/**
* @param {IDBObjectStore} store
* @param {IDBKeyRange|null} query
* @param {'next'|'prev'|'nextunique'|'prevunique'} direction
* @return {Promise<any>}
*/
const queryFirst = (store, query, direction) => {
	/**
	* @type {any}
	*/
	let first = null;
	return iterateKeys(store, query, (key) => {
		first = key;
		return false;
	}, direction).then(() => first);
};
/**
* @param {IDBObjectStore} store
* @param {IDBKeyRange?} [range]
* @return {Promise<any>}
*/
const getLastKey = (store, range = null) => queryFirst(store, range, "prev");
/**
* @param {any} request
* @param {function(IDBCursorWithValue):void|boolean|Promise<void|boolean>} f
* @return {Promise<void>}
*/
const iterateOnRequest = (request, f) => create$3((resolve, reject) => {
	request.onerror = reject;
	/**
	* @param {any} event
	*/
	request.onsuccess = async (event) => {
		const cursor = event.target.result;
		if (cursor === null || await f(cursor) === false) return resolve();
		cursor.continue();
	};
});
/**
* Iterate on the keys (no values)
*
* @param {IDBObjectStore} store
* @param {IDBKeyRange|null} keyrange
* @param {function(any):void|boolean|Promise<void|boolean>} f callback that receives the key
* @param {'next'|'prev'|'nextunique'|'prevunique'} direction
*/
const iterateKeys = (store, keyrange, f, direction = "next") => iterateOnRequest(store.openKeyCursor(keyrange, direction), (cursor) => f(cursor.key));
/**
* Open store from transaction
* @param {IDBTransaction} t
* @param {String} store
* @returns {IDBObjectStore}
*/
const getStore = (t, store) => t.objectStore(store);
/**
* @param {any} upper
* @param {boolean} upperOpen
*/
const createIDBKeyRangeUpperBound = (upper, upperOpen) => IDBKeyRange.upperBound(upper, upperOpen);
/**
* @param {any} lower
* @param {boolean} lowerOpen
*/
const createIDBKeyRangeLowerBound = (lower, lowerOpen) => IDBKeyRange.lowerBound(lower, lowerOpen);
/* c8 ignore stop */
//#endregion
//#region node_modules/lib0/map.js
/**
* Utility module to work with key-value stores.
*
* @module map
*/
/**
* @template K
* @template V
* @typedef {Map<K,V>} GlobalMap
*/
/**
* Creates a new Map instance.
*
* @function
* @return {Map<any, any>}
*
* @function
*/
const create$1 = () => /* @__PURE__ */ new Map();
/**
* Get map property. Create T if property is undefined and set T on map.
*
* ```js
* const listeners = map.setIfUndefined(events, 'eventName', set.create)
* listeners.add(listener)
* ```
*
* @function
* @template {Map<any, any>} MAP
* @template {MAP extends Map<any,infer V> ? function():V : unknown} CF
* @param {MAP} map
* @param {MAP extends Map<infer K,any> ? K : unknown} key
* @param {CF} createT
* @return {ReturnType<CF>}
*/
const setIfUndefined = (map, key, createT) => {
	let set = map.get(key);
	if (set === void 0) map.set(key, set = createT());
	return set;
};
//#endregion
//#region node_modules/lib0/set.js
/**
* Utility module to work with sets.
*
* @module set
*/
const create = () => /* @__PURE__ */ new Set();
//#endregion
//#region node_modules/lib0/array.js
/**
* Transforms something array-like to an actual Array.
*
* @function
* @template T
* @param {ArrayLike<T>|Iterable<T>} arraylike
* @return {T}
*/
const from = Array.from;
Array.isArray;
//#endregion
//#region node_modules/lib0/observable.js
/**
* Observable class prototype.
*
* @module observable
*/
/* c8 ignore start */
/**
* Handles named events.
*
* @deprecated
* @template N
*/
var Observable = class {
	constructor() {
		/**
		* Some desc.
		* @type {Map<N, any>}
		*/
		this._observers = create$1();
	}
	/**
	* @param {N} name
	* @param {function} f
	*/
	on(name, f) {
		setIfUndefined(this._observers, name, create).add(f);
	}
	/**
	* @param {N} name
	* @param {function} f
	*/
	once(name, f) {
		/**
		* @param  {...any} args
		*/
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
			if (observers.size === 0) this._observers.delete(name);
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
		return from((this._observers.get(name) || create$1()).values()).forEach((f) => f(...args));
	}
	destroy() {
		this._observers = create$1();
	}
};
/* c8 ignore end */
//#endregion
//#region node_modules/y-indexeddb/src/y-indexeddb.js
const customStoreName = "custom";
const updatesStoreName = "updates";
const PREFERRED_TRIM_SIZE = 500;
/**
* @param {IndexeddbPersistence} idbPersistence
* @param {function(IDBObjectStore):void} [beforeApplyUpdatesCallback]
* @param {function(IDBObjectStore):void} [afterApplyUpdatesCallback]
*/
const fetchUpdates = (idbPersistence, beforeApplyUpdatesCallback = () => {}, afterApplyUpdatesCallback = () => {}) => {
	const [updatesStore] = transact(idbPersistence.db, [updatesStoreName]);
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
/**
* @param {IndexeddbPersistence} idbPersistence
* @param {boolean} forceStore
*/
const storeState = (idbPersistence, forceStore = true) => fetchUpdates(idbPersistence).then((updatesStore) => {
	if (forceStore || idbPersistence._dbsize >= 500) addAutoKey(updatesStore, Y.encodeStateAsUpdate(idbPersistence.doc)).then(() => del(updatesStore, createIDBKeyRangeUpperBound(idbPersistence._dbref, true))).then(() => count(updatesStore).then((cnt) => {
		idbPersistence._dbsize = cnt;
	}));
});
/**
* @param {string} name
*/
const clearDocument = (name) => deleteDB(name);
/**
* @extends Observable<string>
*/
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
		/**
		* @type {IDBDatabase|null}
		*/
		this.db = null;
		this.synced = false;
		this._db = openDB(name, (db) => createStores(db, [["updates", { autoIncrement: true }], ["custom"]]));
		/**
		* @type {Promise<IndexeddbPersistence>}
		*/
		this.whenSynced = create$3((resolve) => this.on("synced", () => resolve(this)));
		this._db.then((db) => {
			this.db = db;
			/**
			* @param {IDBObjectStore} updatesStore
			*/
			const beforeApplyUpdatesCallback = (updatesStore) => addAutoKey(updatesStore, Y.encodeStateAsUpdate(doc));
			const afterApplyUpdatesCallback = () => {
				if (this._destroyed) return this;
				this.synced = true;
				this.emit("synced", [this]);
			};
			fetchUpdates(this, beforeApplyUpdatesCallback, afterApplyUpdatesCallback);
		});
		/**
		* Timeout in ms untill data is merged and persisted in idb.
		*/
		this._storeTimeout = 1e3;
		/**
		* @type {any}
		*/
		this._storeTimeoutId = null;
		/**
		* @param {Uint8Array} update
		* @param {any} origin
		*/
		this._storeUpdate = (update, origin) => {
			if (this.db && origin !== this) {
				const [updatesStore] = transact(this.db, [updatesStoreName]);
				addAutoKey(updatesStore, update);
				if (++this._dbsize >= 500) {
					if (this._storeTimeoutId !== null) clearTimeout(this._storeTimeoutId);
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
		if (this._storeTimeoutId) clearTimeout(this._storeTimeoutId);
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
//#endregion
export { IndexeddbPersistence, PREFERRED_TRIM_SIZE, clearDocument, fetchUpdates, storeState };
