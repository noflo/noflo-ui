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

import { Identity, toHex } from "../../vendor/reticulum-core.js";
import { ReticulumProvider } from "../../vendor/y-reticulum.js";
import {
  loadMeshConfig,
  normalizeMeshConfig,
  pickDefaultEntryPoint,
  saveMeshConfig,
} from "../crdt/MeshConfig.js";
import { grantPermission } from "../crdt/ProjectDoc.js";

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
 * @param {string} room
 * @param {{ isGranted: (peerHash: string) => boolean, onRefused: (refusals: any[]) => void }} access
 *   Dacar access-control hooks (work document #21): the link policy gates
 *   sync to granted peers; refusals surface as join requests.
 * @returns {Promise<any>}
 */
async function defaultCreateProvider(config, identity, doc, room, access) {
  const { Reticulum, WebRTCSignaling, WebSocketClientInterface } = await import(
    "../../vendor/reticulum-core.js"
  );
  const reticulum = new Reticulum();
  for (const iface of config.interfaces) {
    if (!iface.enabled) continue;
    if (iface.type === "websocket") {
      const client = new WebSocketClientInterface(iface.options ?? {});
      await client.connect();
      reticulum.addInterface(client, true);
    } else {
      console.warn(
        `Mesh interface type ${iface.type} is not available in the browser worker; skipped`,
      );
    }
  }
  const provider = new ReticulumProvider(room, doc, {
    reticulum,
    identity,
    // Dacar gate: only peers with a non-revoked grant may sync. Ignored by
    // y-reticulum versions without the hook, degrading to the old behavior.
    linkPolicy: (/** @type {any} */ context) =>
      access.isGranted(context.remoteIdentityHash),
  });
  provider.on("refused", (/** @type {any} */ event) => {
    access.onRefused(event.refusals ?? []);
  });
  await provider.connect();

  // WebRTC transport upgrade (work document #21): the signaling orchestrator
  // announces a capability destination, accepts inbound link requests, and
  // registers each resulting data channel as a WebRTCInterface. The
  // orchestrator owns its resources, so its teardown is wrapped into the
  // provider's destroy.
  if (config.webrtc?.enabled) {
    const signaling = new WebRTCSignaling({
      rns: reticulum,
      identity,
      rtcConfig: config.webrtc.rtcConfig ?? {},
    });
    await signaling.start();
    if (config.webrtc.autoConnect) {
      signaling.addEventListener("peer", (/** @type {any} */ event) => {
        signaling
          .connect(event.detail?.destinationHash)
          .catch((/** @type {any} */ err) =>
            console.warn(
              `WebRTC connect to ${event.detail?.destinationHash} failed: ${err?.message ?? err}`,
            ),
          );
      });
    }
    const originalDestroy = provider.destroy.bind(provider);
    provider.destroy = async () => {
      signaling.stop();
      await originalDestroy();
    };
  }

  return provider;
}

/**
 * @typedef {Object} MeshSyncHandle
 * @property {import("../crdt/MeshConfig.js").MeshConfig} config
 * @property {string} identityHash Hex identity hash for display; empty until
 *   the identity is generated or restored.
 * @property {string} identityError Set when identity generation is
 *   impossible (WebCrypto without Ed25519); mesh sync cannot run.
 * @property {string} room The room the project syncs through, derived from
 *   the project identity.
 * @property {() => Promise<void>} rebind Restarts the provider with a
 *   freshly resolved room.
 * @property {(base64: string) => Promise<void>} handleImportedIdentity
 *   Adopts a main-thread-generated identity.
 * @property {Array<{ identityHash: string, destinationHash: string | null, firstSeen: number }>} joinRequests
 *   Peers that know the room but hold no grant (access requests).
 * @property {(identityHash: string) => void} resolveJoinRequest Removes a
 *   handled join request and re-reports the list.
 * @property {() => Promise<void>} stop
 * @property {(payload: any) => Promise<void>} handleConfigure Validates,
 *   persists, and applies a new configuration, restarting the provider.
 * @property {(payload: any) => void} handleAwareness Handles a local
 *   `AWARENESS: dragging` payload from the Glass (throttled).
 * @property {() => Promise<void>} stop
 */

/**
 * Binds mesh sync to a project document.
 *
 * @param {{
 *   doc: import("yjs").Doc,
 *   postMessage: (message: any) => void,
 *   storage: import("../crdt/MeshConfig.js").AsyncStorage,
 *   createProvider?: (config: import("../crdt/MeshConfig.js").MeshConfig, identity: InstanceType<typeof Identity>, doc: import("yjs").Doc, room: string, access: { isGranted: (peerHash: string) => boolean, onRefused: (refusals: any[]) => void }) => Promise<any>,
 *   awarenessThrottleMs?: number,
 *   roomFor?: () => string,
 *   autostart?: boolean,
 * }} options
 * @returns {Promise<MeshSyncHandle>}
 */
export async function createMeshSync({
  doc,
  postMessage,
  storage,
  createProvider = defaultCreateProvider,
  awarenessThrottleMs = 250,
  roomFor = () => "noflo-ui",
  autostart = true,
}) {
  /**
   * The room this project syncs through: per-project by construction,
   * derived from the project's CRDT identity. Peers join by sharing this
   * value. Re-evaluated on rebind, since persistence may restore the
   * authoritative project id after boot.
   */
  let room = roomFor();
  /** Hex identity hash for display in the config UI; empty until generated. */
  let identityHash = "";
  /**
   * Set when identity generation is impossible (e.g. WebKit's WebCrypto
   * lacks Ed25519): mesh sync cannot run, but the Engine keeps working.
   */
  let identityError = "";
  let config = await loadMeshConfig(storage);
  // The identity is the peer's address: generate (and persist) it at boot,
  // independent of whether sync is enabled — peers and node admins need the
  // hash to grant access before sync is ever turned on. Failure here (old
  // WebKit without Ed25519 in WebCrypto) disables mesh but not the Engine.
  try {
    await ensureIdentity();
  } catch (err) {
    const reason = /** @type {any} */ (err)?.message ?? err;
    identityError = `Identity generation failed: ${reason}`;
    postMessage({
      kind: "mesh-status",
      connected: false,
      synced: false,
      peers: 0,
      error: identityError,
    });
  }
  /** @type {any} */
  let provider = null;
  let peerCount = 0;

  // ---- Awareness (work document #21, SPEC "Spatial Interactions") -------
  // Ephemeral drag-ghost telemetry; never mutates the CRDT. Local states are
  // throttled to ~250ms with a trailing flush; stops pass immediately.
  /** @type {any} */
  let awareness = null;
  /** @type {(() => void) | null} */
  let unobserveAwareness = null;
  let lastAwarenessSentAt = 0;
  /** @type {any} */
  let pendingAwareness = null;
  /** @type {any} */
  let awarenessTimer = null;

  /**
   * @param {any} dragging Null clears the local ghost state.
   */
  function writeLocalAwareness(dragging) {
    if (!awareness) return;
    awareness.setLocalStateField("dragging", dragging);
  }

  /**
   * Handles a local `AWARENESS: dragging` message from the Glass.
   *
   * @param {any} payload Appendix A AwarenessDragging, or with a null
   *   nodeId to signal drag end.
   */
  function handleAwareness(payload) {
    const dragging =
      payload?.nodeId == null
        ? null
        : {
            graphId: payload.graphId,
            nodeId: payload.nodeId,
            x: payload.x,
            y: payload.y,
          };
    if (dragging === null) {
      if (awarenessTimer !== null) {
        clearTimeout(awarenessTimer);
        awarenessTimer = null;
      }
      pendingAwareness = null;
      lastAwarenessSentAt = Date.now();
      writeLocalAwareness(null);
      return;
    }
    const since = Date.now() - lastAwarenessSentAt;
    if (since >= awarenessThrottleMs) {
      lastAwarenessSentAt = Date.now();
      writeLocalAwareness(dragging);
      return;
    }
    pendingAwareness = dragging;
    if (awarenessTimer === null) {
      awarenessTimer = setTimeout(() => {
        awarenessTimer = null;
        if (pendingAwareness === null) return;
        lastAwarenessSentAt = Date.now();
        writeLocalAwareness(pendingAwareness);
        pendingAwareness = null;
      }, awarenessThrottleMs - since);
    }
  }

  /**
   * Forwards remote awareness states to the Glass, keyed by peer.
   *
   * @param {{ added: number[], updated: number[], removed: number[] }} changes
   */
  function forwardRemoteAwareness(changes) {
    if (!awareness) return;
    /** @type {any[]} */
    const states = [];
    const allStates = awareness.getStates();
    for (const clientId of [...changes.added, ...changes.updated]) {
      if (clientId === awareness.clientID) continue;
      const state = allStates.get(clientId);
      if (state?.dragging) {
        states.push({ peerId: String(clientId), ...state.dragging });
      }
    }
    for (const clientId of changes.removed) {
      if (clientId === awareness.clientID) continue;
      states.push({ peerId: String(clientId), dragging: null });
    }
    if (states.length > 0) {
      postMessage({ kind: "awareness", states });
    }
  }

  /**
   * Returns the configured identity, generating and persisting one on first
   * use so the peer's Reticulum address stays stable across restarts.
   */
  async function ensureIdentity() {
    if (config.identity) {
      try {
        const restored = await Identity.fromBytes(
          base64ToBytes(config.identity),
        );
        if (!restored) {
          throw new Error("stored identity could not be restored");
        }
        identityHash = toHex(restored.getSalt());
        return restored;
      } catch {
        // A corrupt stored identity is regenerated: it is only an address,
        // and peers re-grant access to the new hash through the config UI
      }
    }
    const identity = await Identity.generate();
    config.identity = bytesToBase64(await identity.getPrivateKey());
    identityHash = toHex(identity.getSalt());
    await saveMeshConfig(storage, config);
    return identity;
  }

  /**
   * Dacar check: a peer may sync when a non-revoked grant names its identity
   * hash (work document #21). Reads the live grants map so revocations apply
   * immediately.
   *
   * @param {string} peerHash
   * @returns {boolean}
   */
  function isGranted(peerHash) {
    const grants = doc.getMap?.("grants");
    if (!grants) return false;
    for (const entry of grants.values()) {
      const plain = entry.toJSON();
      if (plain.peerHash === peerHash && plain.revoked === null) return true;
    }
    return false;
  }

  /**
   * The project owner bootstraps their own grant, otherwise the strict
   * policy would lock everyone - including the owner - out of an
   * un-granted project.
   *
   * @param {string} ownHash
   */
  function ensureSelfGrant(ownHash) {
    if (!doc.getMap?.("grants")) return;
    if (!isGranted(ownHash)) {
      grantPermission(doc, ownHash, "developer");
    }
  }

  /**
   * Refused links are access requests: peers that know the room but hold no
   * grant. Surfaced to the Glass for approval.
   *
   * @type {Map<string, { identityHash: string, destinationHash: string | null, firstSeen: number }>}
   */
  const joinRequests = new Map();

  async function start() {
    if (!config.enabled || provider) return;
    // A fresh instance connects through a random default entry point, so
    // mesh sync works out of the box; the choice persists with the config.
    // Seeding only needs randomness, not identity: it must happen even when
    // identity generation previously failed, so the state can be repaired
    if (config.interfaces.length === 0) {
      config.interfaces = [
        {
          id: `iface-${Math.random().toString(36).slice(2, 10)}`,
          type: "websocket",
          options: { url: pickDefaultEntryPoint() },
          enabled: true,
        },
      ];
      await saveMeshConfig(storage, config);
    }
    // Identity generation failures disable mesh (surfaced via mesh-status)
    if (identityError) return;
    try {
      const identity = await ensureIdentity();
      ensureSelfGrant(identityHash);
      room = roomFor();
      provider = await createProvider(config, identity, doc, room, {
        isGranted,
        onRefused: (/** @type {any[]} */ refusals) => {
          for (const refusal of refusals) {
            if (!refusal?.identityHash) continue;
            if (!joinRequests.has(refusal.identityHash)) {
              joinRequests.set(refusal.identityHash, {
                identityHash: refusal.identityHash,
                destinationHash: refusal.destinationHash ?? null,
                firstSeen: Date.now(),
              });
            }
          }
          if (refusals.length > 0) {
            postMessage({
              kind: "mesh-requests",
              requests: [...joinRequests.values()],
            });
          }
        },
      });
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
    // Bind awareness to this provider instance; dropped on unbind.
    // y-protocols Awareness extends lib0's Observable: the API is
    // on/off, not observe
    awareness = provider.awareness ?? null;
    if (awareness) {
      const updateHandler = (/** @type {any} */ changes) =>
        forwardRemoteAwareness(changes);
      awareness.on("update", updateHandler);
      unobserveAwareness = () => awareness?.off?.("update", updateHandler);
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
    if (unobserveAwareness) {
      unobserveAwareness();
      unobserveAwareness = null;
    }
    if (awarenessTimer !== null) {
      clearTimeout(awarenessTimer);
      awarenessTimer = null;
    }
    pendingAwareness = null;
    awareness = null;
    try {
      await provider.destroy();
    } catch {
      // Tearing down a half-connected provider is best-effort
    }
    provider = null;
    peerCount = 0;
    joinRequests.clear();
    // Clear any peer ghosts the Glass is rendering
    postMessage({ kind: "awareness", states: [] });
  }

  if (autostart) {
    await start();
  }

  return {
    get config() {
      return config;
    },
    get identityHash() {
      return identityHash;
    },
    get identityError() {
      return identityError;
    },
    /**
     * Adopts a main-thread-generated identity (work document #21): the Glass
     * generates the keypair where WebCrypto works and hands over the raw
     * private key, since generation is a do-once operation. The worker still
     * needs to import and use the key — if that also fails, identityError
     * resurfaces.
     *
     * @param {string} base64 Base64 of the 128-byte private key.
     */
    async handleImportedIdentity(base64) {
      if (typeof base64 !== "string" || base64.length === 0) return;
      config.identity = base64;
      await saveMeshConfig(storage, config);
      identityError = "";
      await stop();
      await start();
      if (identityError) {
        postMessage({
          kind: "mesh-status",
          connected: false,
          synced: false,
          peers: 0,
          error: identityError,
        });
      }
    },
    get room() {
      return room;
    },
    get joinRequests() {
      return [...joinRequests.values()];
    },
    /**
     * Removes a handled join request (granted or dismissed).
     *
     * @param {string} identityHash
     */
    resolveJoinRequest(identityHash) {
      joinRequests.delete(identityHash);
      postMessage({
        kind: "mesh-requests",
        requests: [...joinRequests.values()],
      });
    },
    /**
     * Stops and restarts the provider with a freshly resolved room — the
     * Engine calls this once persistence has restored the authoritative
     * project identity.
     */
    async rebind() {
      await stop();
      await start();
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
      // The Engine reports the full state (config, identity, room, schemas)
      // after reconfiguration; MeshSync stays silent here
    },
    /**
     * @param {any} payload
     */
    handleAwareness(payload) {
      handleAwareness(payload);
    },
    async stop() {
      await stop();
    },
  };
}
