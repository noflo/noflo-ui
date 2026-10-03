/**
 * @file Engine-owned mesh configuration (work document #21): Reticulum
 * identity, room name, and network interfaces. Persisted per-device by the
 * Engine, deliberately separate from the project CRDT — configuration is
 * device state, not project data, and must not sync to peers.
 */

export const MESH_CONFIG_VERSION = 1;
export const MESH_CONFIG_KEY = "mesh-config";

/**
 * Interface configuration is options-based: each interface type supplies its
 * own JSON Schema (`getConfigurationSchema()` static on @reticulum/core interface classes), and the options object holds whatever that schema describes. The settings UI renders forms from the schema.
 *
 * @typedef {Object} MeshInterface
 * @property {string} id Stable identifier for editing and removal
 * @property {'websocket' | 'tcp'} type
 * @property {{ [key: string]: any }} options Constructor options per the interface type's JSON Schema
 * @property {boolean} enabled Whether the Engine should attach the interface
 */

/**
 * @typedef {Object} MeshConfig
 * @property {number} schemaVersion
 * @property {boolean} enabled Whether mesh sync runs at all
 * @property {string} room Room name peers sync through
 * @property {string} identity Base64 of the 128-byte Reticulum private key;
 *   empty until the Engine generates one
 * @property {MeshInterface[]} interfaces
 */

/**
 * @returns {MeshConfig}
 */
export function createDefaultMeshConfig() {
  return {
    schemaVersion: MESH_CONFIG_VERSION,
    enabled: false,
    room: "noflo-ui",
    identity: "",
    interfaces: [],
  };
}

/**
 * Minimal async key-value storage contract; implemented over IndexedDB in
 * the browser and over a plain map in tests.
 *
 * @typedef {Object} AsyncStorage
 * @property {(key: string) => Promise<any>} get
 * @property {(key: string, value: any) => Promise<void>} set
 */

/**
 * Validates and normalizes a parsed config blob, merging in defaults for
 * missing fields. Unknown fields are dropped; malformed shapes fall back to
 * defaults so a corrupt store can never break the Engine boot.
 *
 * @param {any} blob
 * @returns {MeshConfig}
 */
export function normalizeMeshConfig(blob) {
  const config = createDefaultMeshConfig();
  if (!blob || typeof blob !== "object") return config;
  if (blob.enabled === true) config.enabled = true;
  if (typeof blob.room === "string" && blob.room.length > 0) {
    config.room = blob.room;
  }
  if (typeof blob.identity === "string") config.identity = blob.identity;
  if (Array.isArray(blob.interfaces)) {
    config.interfaces = blob.interfaces
      .filter((/** @type {any} */ iface) => iface && typeof iface === "object")
      .map((/** @type {any} */ iface) => ({
        id: typeof iface.id === "string" ? iface.id : "",
        type:
          iface.type === "websocket" || iface.type === "tcp" ? iface.type : "",
        options:
          iface.options && typeof iface.options === "object"
            ? { ...iface.options }
            : // Configs saved before options-based interfaces folded the
              // constructor arguments into the entry itself
              {
                ...(typeof iface.url === "string" ? { url: iface.url } : {}),
                ...(typeof iface.host === "string" ? { host: iface.host } : {}),
                ...(typeof iface.port === "number" ? { port: iface.port } : {}),
              },
        enabled: iface.enabled === true,
      }))
      .filter(
        (/** @type {any} */ iface) =>
          iface.id && iface.type && typeof iface.options === "object",
      );
  }
  return config;
}

/**
 * @param {AsyncStorage} storage
 * @returns {Promise<MeshConfig>}
 */
export async function loadMeshConfig(storage) {
  try {
    return normalizeMeshConfig(await storage.get(MESH_CONFIG_KEY));
  } catch {
    return createDefaultMeshConfig();
  }
}

/**
 * @param {AsyncStorage} storage
 * @param {MeshConfig} config
 * @returns {Promise<void>}
 */
export async function saveMeshConfig(storage, config) {
  await storage.set(MESH_CONFIG_KEY, normalizeMeshConfig(config));
}

/**
 * Browser storage over a dedicated IndexedDB database, so mesh configuration
 * survives restarts like the rest of the Engine-owned state.
 *
 * @param {string} dbName
 * @param {string} storeName
 * @returns {AsyncStorage}
 */
export function createIndexeddbStorage(dbName, storeName) {
  /** @type {Promise<IDBDatabase> | null} */
  let dbPromise = null;
  /** @returns {Promise<IDBDatabase>} */
  const openDb = () => {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore(storeName);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(
            /** @type {any} */ (request.error) ?? new Error("open failed"),
          );
      });
    }
    return dbPromise;
  };
  return {
    async get(key) {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(/** @type {any} */ (request.error) ?? new Error("get failed"));
      });
    },
    async set(key, value) {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () =>
          reject(/** @type {any} */ (tx.error) ?? new Error("set failed"));
      });
    },
  };
}

/**
 * @returns {AsyncStorage}
 */
export function createMemoryStorage() {
  const map = new Map();
  return {
    async get(key) {
      return map.get(key);
    },
    async set(key, value) {
      map.set(key, value);
    },
  };
}
