/**
 * @file Mesh sync (work document #21): binds the Engine's project Y.Doc to
 * the Reticulum mesh via y-reticulum. Configuration is Engine-owned
 * (see MeshConfig.js); the Glass drives it through CONFIG messages and
 * observes state through `mesh-status` / `mesh-peers` messages.
 *
 * The transport is injectable so tests can wire two peers over an in-process
 * loopback; the default factory builds a Reticulum instance with the
 * configured WebSocket interfaces attached.
 */

import { Identity } from "../../vendor/reticulum-core.js";
import { ReticulumProvider } from "../../vendor/y-reticulum.js";
import {
  loadMeshConfig,
  normalizeMeshConfig,
  saveMeshConfig,
} from "../crdt/MeshConfig.js";

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Default provider factory: a Reticulum instance with the enabled WebSocket
 * interfaces from the config, and a provider bound to the room.
 *
 * @param {import("../crdt/MeshConfig.js").MeshConfig} config
 * @param {InstanceType<typeof Identity>} identity
 * @param {import("yjs").Doc} doc
 * @returns {Promise<any>}
 */
async function defaultCreateProvider(config, identity, doc) {
  const { Reticulum, WebSocketClientInterface } = await import(
    "../../vendor/reticulum-core.js"
  );
  const reticulum = new Reticulum();
  for (const iface of config.interfaces) {
    if (!iface.enabled) continue;
    if (iface.type === "websocket" && iface.url) {
      const client = new WebSocketClientInterface({ url: iface.url });
      await client.connect();
      reticulum.addInterface(client, true);
    }
  }
  const provider = new ReticulumProvider(config.room, doc, {
    reticulum,
    identity,
  });
  await provider.connect();
  return provider;
}

/**
 * @typedef {Object} MeshSyncHandle
 * @property {import("../crdt/MeshConfig.js").MeshConfig} config
 * @property {(payload: any) => Promise<void>} handleConfigure Validates,
 *   persists, and applies a new configuration, restarting the provider.
 * @property {() => Promise<void>} stop
 */

/**
 * Binds mesh sync to a project document.
 *
 * @param {{
 *   doc: import("yjs").Doc,
 *   postMessage: (message: any) => void,
 *   storage: import("../crdt/MeshConfig.js").AsyncStorage,
 *   createProvider?: (config: import("../crdt/MeshConfig.js").MeshConfig, identity: InstanceType<typeof Identity>, doc: import("yjs").Doc) => Promise<any>,
 * }} options
 * @returns {Promise<MeshSyncHandle>}
 */
export async function createMeshSync({
  doc,
  postMessage,
  storage,
  createProvider = defaultCreateProvider,
}) {
  let config = await loadMeshConfig(storage);
  /** @type {any} */
  let provider = null;
  let peerCount = 0;

  /**
   * Returns the configured identity, generating and persisting one on first
   * use so the peer's Reticulum address stays stable across restarts.
   */
  async function ensureIdentity() {
    if (config.identity) {
      try {
        return await Identity.fromBytes(base64ToBytes(config.identity));
      } catch {
        // A corrupt stored identity is regenerated: it is only an address,
        // and peers re-grant access to the new hash through the config UI
      }
    }
    const identity = await Identity.generate();
    config.identity = bytesToBase64(await identity.getPrivateKey());
    await saveMeshConfig(storage, config);
    return identity;
  }

  async function start() {
    if (!config.enabled || provider) return;
    try {
      const identity = await ensureIdentity();
      provider = await createProvider(config, identity, doc);
    } catch (err) {
      provider = null;
      const reason = /** @type {any} */ (err)?.message ?? err;
      postMessage({
        kind: "mesh-status",
        connected: false,
        synced: false,
        peers: 0,
        error: `Mesh provider failed: ${reason}`,
      });
      return;
    }
    provider.on("status", (/** @type {any} */ event) => {
      postMessage({
        kind: "mesh-status",
        connected: event.connected === true,
        synced: false,
        peers: peerCount,
      });
    });
    provider.on("synced", (/** @type {any} */ event) => {
      postMessage({
        kind: "mesh-status",
        connected: true,
        synced: event.synced === true,
        peers: peerCount,
      });
    });
    provider.on("peers", (/** @type {any} */ event) => {
      peerCount += event.added.length - event.removed.length;
      postMessage({
        kind: "mesh-peers",
        added: event.added,
        removed: event.removed,
        peers: peerCount,
      });
    });
  }

  async function stop() {
    if (!provider) return;
    try {
      await provider.destroy();
    } catch {
      // Tearing down a half-connected provider is best-effort
    }
    provider = null;
    peerCount = 0;
  }

  return {
    get config() {
      return config;
    },
    /**
     * @param {any} payload
     */
    async handleConfigure(payload) {
      config = normalizeMeshConfig(payload);
      config.enabled = payload?.enabled === true;
      await saveMeshConfig(storage, config);
      await stop();
      await start();
      postMessage({ kind: "mesh-config", config });
    },
    async stop() {
      await stop();
    },
  };
}
