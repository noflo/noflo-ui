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

import {
  pushOne,
  RnsSyncServer,
  SYNC_REQUEST_PATH,
} from "../../vendor/dacar.js";
import {
  Destination,
  DestType,
  fromHex,
  Identity,
  toHex,
} from "../../vendor/reticulum-core.js";
import {
  ReticulumProvider,
  roomDestinationHash,
} from "../../vendor/y-reticulum.js";
import {
  createIndexeddbStorage,
  loadMeshConfig,
  normalizeMeshConfig,
  pickDefaultEntryPoint,
  saveMeshConfig,
} from "../crdt/MeshConfig.js";
import { grantAssertion } from "../crdt/ProjectDoc.js";
import {
  buildInviteUri,
  createBootstrapHost,
  generateInviteToken,
  INVITE_TOKEN_TTL_MS,
  isInviteRecordValid,
  joinViaBootstrapInvite,
  parseInviteUri,
} from "./Bootstrap.js";
import {
  authorizationFingerprint,
  createDacarNode,
  generateSalt,
  mintAuthorization as mintDacarAuthorization,
  projectResource,
  ROLE_PERMISSIONS,
} from "./Dacar.js";
import { createDacarLinkAuthorizer } from "./DacarLinkAuth.js";
import { listWalletGrants, saveWalletGrant } from "./DacarWallet.js";
import { progress } from "./Progress.js";

/** How long the joiner waits for the pushed grant to authorize it. */
const GRANT_WAIT_MS = 30_000;

/** How long a provider start may take before the stall is surfaced. */
const PROVIDER_CONNECT_TIMEOUT_MS = 30_000;

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
 * Hooks the join flow's explicit lifecycle drives (work document #27): each
 * granted transition fires its hook directly instead of an observer inferring
 * the transition from grants-map contents.
 *
 * @typedef {Object} JoinHooks
 * @property {(project: any) => Promise<string> | string} [onAdopt]
 *   Adopts the invited project identity. Returns "adopted", "present" (the
 *   project already exists here — the join continues, cleanup runs), or
 *   "refused" (the device has other content — the join fails).
 * @property {(project: any) => Promise<void> | void} [onGranted]
 *   Materializes the granted project and rebinds the mesh onto it.
 */

/**
 * Default provider factory: a provider bound to the room on the SHARED
 * Reticulum instance (owned by the mesh layer, so the bootstrap pre-flow and
 * the sync phase share one transport — work document #25).
 *
 * @param {import("../crdt/MeshConfig.js").MeshConfig} config
 * @param {InstanceType<typeof Identity>} identity
 * @param {import("yjs").Doc} doc
 * @param {string} room
 * @param {{ isGranted: (peerHash?: string) => boolean, isInRequesterMode: () => boolean, authorizeLink: (context: any) => Promise<boolean>, onRefused: (refusals: any[]) => void }} access
 *   Dacar access-control hooks (work document #21): the link policy gates
 *   sync to granted peers; refusals surface as join requests.
 * @param {any} reticulum Shared Reticulum instance built from the enabled
 *   interfaces; the factory binds the provider to it but does not own it.
 * @returns {Promise<any>}
 */
async function defaultCreateProvider(
  config,
  identity,
  doc,
  room,
  access,
  reticulum,
) {
  const { WebRTCSignaling } = await import("../../vendor/reticulum-core.js");
  const provider = new ReticulumProvider(room, doc, {
    reticulum,
    identity,
    // The room re-announce keeps cached mesh paths warm: a peer coming
    // online announces immediately (the fast discovery path), so the
    // steady-state cadence can sit at the desktop class (SPEC §9.7)
    announceIntervalMs: 10 * 60_000,
    // The §6.2 assertion exchange sends our grants and awaits the peer's
    // over the link channel: a slow multi-hop mesh hop needs more than
    // y-reticulum's 10 s default before the link is torn down
    authorizeTimeoutMs: 30_000,
    // Dacar gate (work document #54): a granted peer syncs; requester
    // mode (empty grants, fresh join) accepts ONLY its own outbound
    // dials — the access request is the dial — and responder-side
    // inbound links stay refused (they surface as join requests, which
    // is the existing UX). The old `isInRequesterMode() || isGranted`
    // failed open on both gates: any peer that linked to an ungranted
    // device got read AND write.
    linkPolicy: (/** @type {any} */ context) => {
      const allowed = evaluateLinkPolicy(
        {
          isInRequesterMode: access.isInRequesterMode,
          isGranted: access.isGranted,
        },
        context,
      );
      console.info(
        `[mesh] linkPolicy: peer …${context.remoteIdentityHash?.slice(-12) ?? "unidentified"}, ${context.initiator ? "initiator" : "responder"}, ${allowed ? "ALLOW" : "REFUSE"}`,
      );
      return allowed;
    },
    // §6.2 assertion exchange (work document #25): once the identity is
    // proven and before any sync flows, both peers present their Dacar
    // assertions and verify each other through the Dacar Engine. Ignored
    // by y-reticulum versions without the hook.
    authorizeLink: access.authorizeLink ?? null,
  });
  provider.on("refused", (/** @type {any} */ event) => {
    access.onRefused(event.refusals ?? []);
  });
  await provider.connect();

  // WebRTC transport upgrade (work document #21): the signaling orchestrator
  // announces a capability destination, accepts inbound link requests, and
  // registers each resulting data channel as a WebRTCInterface. The
  // orchestrator owns its resources, so its teardown is wrapped into the
  // provider's destroy. Workers do not expose RTCPeerConnection: the
  // upgrade needs a main-thread bridge (future work), so it is skipped —
  // mesh continues over the WebSocket interfaces.
  if (config.webrtc?.enabled) {
    if (typeof globalThis.RTCPeerConnection !== "function") {
      console.info(
        "WebRTC upgrade skipped: RTCPeerConnection is not available in workers; mesh continues over WebSocket interfaces",
      );
    } else {
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
 * @property {() => any} getReticulum The shared Reticulum instance once the
 *   mesh started (null before). The Companion's LXMF layer rides the same
 *   stack (work document #47).
 * @property {() => Array<{ type: string, options: Record<string, any>, reason: string }> | null} getRuntimeInterfaces
 *   Interfaces the mesh layer attached by default rather than from the
 *   stored config (the settings dialog renders them read-only).
 * @property {string} room The room the project syncs through, derived from
 *   the project identity.
 * @property {() => Promise<void>} rebind Restarts the provider with a
 *   freshly resolved room.
 * @property {(base64: string) => Promise<void>} handleImportedIdentity
 *   Adopts a main-thread-generated identity.
 * @property {() => Promise<void>} handleJoinedViaInvite Marks the device as
 *   invited (no self-grant) and clears its local grants map.
 * @property {Array<{ identityHash: string, destinationHash: string | null, firstSeen: number, source: "sync" | "bootstrap" }>} joinRequests
 *   Peers that know the room but hold no grant (access requests) and
 *   bootstrap knockers awaiting a decision.
 * @property {(payload: { identityHash: string, decision?: "approved" | "declined" }) => void} resolveRequest
 *   Resolves a handled request: a pending bootstrap approval gets its
 *   decision, sync-refusal entries are removed, and the list re-reports.
 * @property {() => Promise<{ uri: string, token: string, expiresAt: number } | null>} createInvite
 *   Issues a bootstrap invite URI for the hosted project; null when this
 *   device cannot host (mesh disabled, joined by invite, no bootstrap host).
 * @property {(uri: string, hooks?: JoinHooks) => Promise<void>} startBootstrapJoin
 *   Runs the joiner state machine (work document #25 §5.1) against the
 *   invited host; the granted path routes through the hooks.
 * @property {(hooks?: JoinHooks) => Promise<boolean>} resumePendingInvite
 *   Re-runs a persisted pending invite (resume on reload); false when none
 *   is stored.
 * @property {() => Promise<void>} stop
 * @property {(payload: any) => Promise<boolean>} grant Mints a
 *   Dacar-signed grant for a peer through the mesh layer (anchor only);
 *   false when this device cannot mint.
 * @property {(payload: any) => Promise<void>} handleConfigure Validates,
 *   persists, and applies a new configuration, restarting the provider.
 * @property {(payload: any) => void} handleAwareness Handles a local
 *   `AWARENESS: dragging` payload from the Glass (throttled).
 * @property {() => Promise<void>} stop
 */

/**
 * The default interface attachment (work document #44): the browser-safe
 * set. WebSocket interfaces attach inline from the vendored reticulum-core;
 * the Node-only types (shared, autointerface, tcp) load via a dynamic
 * import that fails and skips in the browser. The Node bridge injects its
 * own `attachInterfaces` with static imports and the shared/autointerface
 * defaults instead.
 *
 * @param {any} rns The shared Reticulum instance.
 * @param {import("../crdt/MeshConfig.js").MeshInterface[]} interfaces
 * @returns {Promise<void>}
 */
/**
 * Whether the local Companion hub probe applies: a webapp served from
 * localhost over plain HTTP, with no already-configured WebSocket
 * interface targeting the local hub. The probe is additive — a
 * cloud-hosted WebSocket stays configured alongside (the Companion is
 * not a transport node yet and cannot relay to the wider mesh).
 *
 * @param {import("../crdt/MeshConfig.js").MeshInterface[]} interfaces
 * @returns {boolean}
 */
export function needsLocalHubProbe(interfaces) {
  const location = /** @type {any} */ (globalThis).location;
  if (!location) return false;
  if (location.protocol !== "http:") return false; // HTTPS pages cannot open ws://
  const hostname = location.hostname;
  if (
    hostname !== "localhost" &&
    hostname !== "127.0.0.1" &&
    hostname !== "[::1]"
  ) {
    return false;
  }
  // The hub is an on-ramp for the pure-localhost scenario only:
  // reticulum-js cannot relay yet (transport-node announce propagation is
  // future work), so a hub attached beside a cloud interface splits the
  // path table — announces heard via the hub make RNS prefer the bridge
  // as the path, and path requests routed there die (work document #44
  // M3 live finding). A configured cloud interface wins; the probe
  // stands down.
  // A user-disabled probe persists as a negative entry (work document
  // #47's interface legibility): the user stays in control without
  // editing files
  if (
    (interfaces ?? []).some(
      (iface) => iface.type === "local-hub" && iface.enabled === false,
    )
  ) {
    return false;
  }
  return !(interfaces ?? []).some(
    (iface) => iface.enabled && iface.type === "websocket",
  );
}

async function defaultAttachInterfaces(
  /** @type {any} */ rns,
  /** @type {import("../crdt/MeshConfig.js").MeshInterface[]} */ interfaces,
) {
  const { WebSocketClientInterface } = await import(
    "../../vendor/reticulum-core.js"
  );
  /** @type {any | null} */
  let nodeInterfaces = null;
  /**
   * Interfaces the mesh layer attached by default rather than from the
   * stored config (work document #47's interface legibility): the
   * settings dialog renders them read-only so an invisible mesh surface
   * never surprises the user again.
   *
   * @type {Array<{ type: string, options: Record<string, any>, reason: string }>}
   */
  const runtimeAttached = [];
  for (const iface of interfaces ?? []) {
    if (!iface.enabled) continue;
    const options = iface.options ?? {};
    if (iface.type === "websocket") {
      const client = new WebSocketClientInterface(options);
      await client.connect();
      rns.addInterface(client, true);
    } else {
      // The Node-only types load lazily: the browser worker has no
      // @reticulum/node (no import-map entry), so the import fails and
      // the interface types skip; the Node bridge resolves them natively
      try {
        if (!nodeInterfaces) {
          nodeInterfaces = await import("@reticulum/node");
        }
        if (iface.type === "shared") {
          const shared =
            await nodeInterfaces.LocalClientInterface.connectToSharedInstance(
              options,
            );
          if (shared) {
            rns.addInterface(shared, true);
          } else {
            console.warn(
              "Mesh interface type shared: no shared instance running; skipped",
            );
          }
        } else if (iface.type === "autointerface") {
          const auto = new nodeInterfaces.AutoInterface(options);
          await auto.connect();
          rns.addInterface(auto, true);
        } else if (iface.type === "tcp") {
          const tcp = options.listen
            ? new nodeInterfaces.TCPServerInterface(
                /** @type {any} */ (options),
              )
            : new nodeInterfaces.TCPClientInterface(options);
          await tcp.connect();
          if (options.listen) {
            tcp.addEventListener("connection", (/** @type {any} */ event) => {
              rns.addInterface(event.detail, true);
            });
          } else {
            rns.addInterface(tcp, true);
          }
        }
      } catch {
        console.warn(
          `Mesh interface type ${iface.type} requires @reticulum/node (Node); skipped`,
        );
      }
    }
  }

  // Auto-detect (SPEC): a webapp served from localhost also tries the
  // local Companion's hub — additive to any configured cloud WebSocket,
  // since the Companion is not a transport node yet and cannot relay
  // traffic onward. A failed probe is never fatal: the reconnect loop
  // picks the hub up whenever the Companion starts
  if (needsLocalHubProbe(interfaces)) {
    const probeOptions = { url: "ws://localhost:3569" };
    runtimeAttached.push({
      type: "local-hub",
      options: probeOptions,
      reason:
        "Local Companion hub (auto-detected; a localhost webapp reaches its Companion through it)",
    });
    const local = new WebSocketClientInterface({
      ...probeOptions,
      name: "companion-local-hub",
    });
    let added = false;
    local.addEventListener("connected", () => {
      if (added) return;
      added = true;
      rns.addInterface(local, true);
    });
    await local.connect().catch(() => {
      console.warn(
        "Mesh: no local Companion hub on ws://localhost:3569 yet; retrying in the background",
      );
    });
  }
  return runtimeAttached;
}

/**
 * The link policy decision (work document #54): a granted peer syncs; a
 * device in requester mode (empty grants, fresh join) accepts ONLY links
 * it initiated itself — "the access request is the dial" — and
 * responder-side inbound links are refused (they surface as join
 * requests instead of full read/write sync with any peer that links to
 * an ungranted device).
 *
 * @param {{ isInRequesterMode: () => boolean, isGranted: (hash?: string) => boolean }} access
 * @param {{ remoteIdentityHash?: string, initiator?: boolean }} context
 *   Y-reticulum's LinkAuthorizationContext subset: the proven remote
 *   identity and whether this side initiated the link.
 * @returns {boolean}
 */
export function evaluateLinkPolicy(access, context) {
  if (access.isGranted(context.remoteIdentityHash)) return true;
  if (access.isInRequesterMode() && context.initiator === true) return true;
  return false;
}

/**
 * Binds mesh sync to a project document.
 *
 * The `reticulum` option injects a process-owned Reticulum instance (the
 * Companion daemon): it is used instead of building one and never stopped
 * by mesh stop — its owner manages the lifetime, so project engines can
 * restart around a stable mesh node (work document #47, multi-project).
 *
 * @param {{
 *   doc: import("yjs").Doc,
 *   postMessage: (message: any) => void,
 *   storage: import("../crdt/MeshConfig.js").AsyncStorage,
 *   createProvider?: (config: import("../crdt/MeshConfig.js").MeshConfig, identity: InstanceType<typeof Identity>, doc: import("yjs").Doc, room: string, access: { isGranted: (peerHash?: string) => boolean, isInRequesterMode: () => boolean, authorizeLink: (context: any) => Promise<boolean>, onRefused: (refusals: any[]) => void }, reticulum: any) => Promise<any>,
 *   attachInterfaces?: (rns: any, interfaces: import("../crdt/MeshConfig.js").MeshInterface[]) => Promise<void>,
 *   reticulum?: any,
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
  attachInterfaces = undefined,
  reticulum = undefined,
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
  /** Whether the identity narration already fired (restores after the
   * first are silent rebind noise). */
  let identityNarrated = false;

  /** @type {import("../crdt/MeshConfig.js").MeshConfig} */
  let config;
  try {
    config = await loadMeshConfig(storage);
  } catch (err) {
    // A storage failure must never look like "no stored identity": the
    // identity is the device's mesh address, and minting a new one over it
    // silently invalidates every grant held for it (work document #28
    // finding). Mesh stays off; the Engine keeps working.
    config = normalizeMeshConfig(null);
    identityError = `Mesh storage unavailable, sync stays off: ${
      /** @type {any} */ (err)?.message ?? String(err)
    }`;
  }
  // Local Dacar wallet (work document #25 §5.2): its own IndexedDB store
  // (`dacar_grants`), falling back to the caller's storage where IndexedDB
  // is unavailable (tests, non-browser runtimes)
  const walletStorage =
    typeof globalThis.indexedDB !== "undefined"
      ? createIndexeddbStorage("noflo-dacar", "dacar_grants")
      : storage;
  // ---- Dacar node state (work document #25 §2, §6.2, §7) ----------------
  // One per-project Dacar node: Config + StateVector + DeltaReceiver +
  // Engine. Grants reach it two ways — the §11 direct-link Delta push
  // during the bootstrap handoff, and the grants map (the CRDT is the
  // replication layer) — and both paths authenticate through
  // verify-on-ingest against the project's designated Trust Anchor. An
  // unknown Trust Anchor's deltas are refused and never authorize (§7).
  //
  // The state declarations live ABOVE the observers below: those observers
  // can fire while createMeshSync is still awaiting (a persisted document
  // loading through y-indexeddb commits transactions mid-boot), and a
  // callback hitting a not-yet-initialized declaration is a TDZ error.
  /** @type {ReturnType<typeof createDacarNode> | null} */
  let dacarNode = null;
  let dacarNodeAnchorHash = "";
  let dacarNodeProjectId = "";
  /** Peer → Engine verdict cache; isGranted reads this synchronously. */
  /** @type {Map<string, boolean>} */
  const grantedCache = new Map();
  /** Grants-map entries already ingested, keyed by content fingerprint. */
  /** @type {Map<string, string>} */
  const ingestedEntries = new Map();
  /** Tombstone state per entry id, to detect revocations. */
  /** @type {Map<string, boolean>} */
  const entryRevocations = new Map();
  /** Per-entry verification status, reported to the Glass. */
  /** @type {Map<string, string>} */
  const entryStatuses = new Map();
  let reconciling = false;
  /** Set when a reconcile is requested while one is already running. */
  let pendingReconcile = false;
  /** Set while a bootstrap join is in flight: pushes the active project's
   * Dacar node refuses may belong to the invited project, whose binding is
   * not the active one until the project is adopted. */
  let joinInFlight = false;
  /** The host identity to dial directly after the join's rebind (work
   * document #34): the handoff carries the host's identity key, so the
   * joiner reaches the room without waiting for announce-driven discovery. */
  let pendingHostDial = /** @type {{ identity: any, peer: string } | null} */ (
    null
  );
  /** Room destination hashes whose direct dial failed and has not yet
   * succeeded: re-dialed when a matching announce refreshes the path. */
  const failedDials = new Set();
  /** The identity hashes currently holding a transport link, maintained
   * by the provider's peers handler (the reachability surface reads it). */
  const onlineIdentities = new Set();
  /** Per-peer dial bookkeeping (work document #47): offline peers are the
   * default scenario, so redials back off per peer instead of churning. */
  /** @type {Map<string, { attempts: number, lastDialAt: number }>} */
  const peerDialState = new Map();
  const REDIAL_BASE_MS = 10 * 60_000;
  const REDIAL_MAX_MS = 60 * 60_000;
  /** The redial tick: the cadence dialKnownPeers runs on; per-peer
   * backoff windows gate which peers actually dial each tick. Reticulum
   * is patient by design — path requests and announces are the mesh's
   * control traffic, and a ten-minute class keeps it quiet (SPEC §9.7
   * recommends 30-60 min for desktop clients; a peer coming online
   * announces immediately, which is the fast path). */
  const REDIAL_TICK_MS = 10 * 60_000;
  /** @type {ReturnType<typeof setInterval> | null} */
  let redialTimer = null;
  /** Pushes received before the node was configured, replayed after. */
  /** @type {Uint8Array[]} */
  const pendingPushes = [];
  /** The last delta batch a peer pushed to this device (§11), base64. */
  let lastPushedBatch = "";

  /**
   * @param {string} projectId
   * @returns {string}
   */
  const dacarNodeConfigKey = (projectId) => `dacar-node:${projectId}`;
  // The identity is the peer's address: generate (and persist) it at boot,
  // independent of whether sync is enabled — peers and node admins need the
  // hash to grant access before sync is ever turned on. Failure here (old
  // WebKit without Ed25519 in WebCrypto) disables mesh but not the Engine.
  // When storage is unavailable, generation is skipped entirely: an
  // unsaved identity is worth nothing, and a write over a temporarily
  // unreadable store could destroy the real one.
  if (!identityError) {
    try {
      await ensureIdentity();
    } catch (err) {
      const reason = /** @type {any} */ (err)?.message ?? err;
      // ensureIdentity sets the precise identityError (restore failure vs
      // generation failure); only fill in a generic message otherwise
      identityError = identityError || `Identity generation failed: ${reason}`;
      postMessage({
        kind: "mesh-status",
        connected: false,
        synced: false,
        peers: 0,
        error: identityError,
      });
    }
  } else {
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
        // Narrate the first restore so the boot checklist shows the
        // identity came from device state, not fresh generation; later
        // calls (rebinds) re-restore silently
        if (!identityNarrated) {
          identityNarrated = true;
          postMessage(progress("identity.generate", "restore", "done"));
        }
        return restored;
      } catch (err) {
        // The stored identity is sacred (work document #28 finding): a
        // failed restore never regenerates over it — that would silently
        // change this device's mesh address and invalidate every grant
        // held for it. Surface the failure and stop; recovery is explicit
        // (import a backed-up identity, or factory reset).
        const reason = /** @type {any} */ (err)?.message ?? String(err);
        identityError = `Stored mesh identity could not be restored: ${reason}`;
        postMessage(
          progress("identity.generate", "restore", "failed", { error: reason }),
        );
        throw new Error(identityError);
      }
    }
    postMessage(progress("identity.generate", "generate", "running"));
    const identity = await Identity.generate();
    config.identity = bytesToBase64(await identity.getPrivateKey());
    identityHash = toHex(identity.getSalt());
    await saveMeshConfig(storage, config);
    postMessage(progress("identity.generate", "generate", "done"));
    return identity;
  }

  // ---- Device-local Trust Anchor binding (work document #27) ------------
  // The anchor binding (hash, pubkey, salt) is device-local state, never
  // project CRDT metadata: a synced peer could rewrite a CRDT binding and
  // swap the trust root, and every write raced every replica via LWW. The
  // creator self-assigns locally; every other device receives the binding
  // through the authenticated bootstrap handoff, and a device that loses
  // its local state factory-resets and re-joins via a new invite — the
  // CRDT is never a source of trust. A binding is immutable for the
  // project's lifetime: transferring the anchor means forking the project
  // (a new project id with fresh grants).
  /** @type {{ projectId: string, anchorHash: string, anchorPubkey: string, salt: string } | null} */
  let localBinding = null;

  /**
   * Hex hash of the project's designated Trust Anchor, from the
   * device-local binding. Empty while the binding is unknown (an invited
   * device before the handoff, or before the local state has loaded).
   *
   * @returns {string}
   */
  function trustAnchorHash() {
    return localBinding?.anchorHash ?? "";
  }

  /**
   * Loads (or, as the creator, self-assigns) the device-local Trust Anchor
   * binding for the project. A device that did not join via invite binds
   * its own Reticulum identity as the anchor and mints the project's
   * Privacy Salt (work document #25 §2.2, §2.3); invited devices wait for
   * the bootstrap handoff to provision the binding.
   *
   * @returns {Promise<{ projectId: string, anchorHash: string, anchorPubkey: string, salt: string } | null>}
   */
  async function ensureLocalBinding() {
    const projectId = String(doc.getMap?.("metadata")?.get("id") ?? "");
    if (!projectId) {
      localBinding = null;
      return null;
    }
    if (localBinding?.projectId === projectId) return localBinding;
    try {
      const stored = await storage.get(dacarNodeConfigKey(projectId));
      if (
        stored &&
        typeof stored.anchorHash === "string" &&
        /^[0-9a-f]{32}$/.test(stored.anchorHash) &&
        typeof stored.salt === "string" &&
        /^[0-9a-f]{64}$/.test(stored.salt) &&
        typeof stored.anchorPubkey === "string" &&
        /^[0-9a-f]{128}$/.test(stored.anchorPubkey)
      ) {
        localBinding = { projectId, ...stored };
        return localBinding;
      }
    } catch {
      // Fall through to self-assignment below
    }
    if (config.joinedViaInvite || !identityHash) {
      localBinding = null;
      return null;
    }
    const binding = {
      projectId,
      anchorHash: identityHash,
      anchorPubkey: toHex(await (await ensureIdentity()).getPublicKey()),
      salt: await ensureDacarSalt(projectId),
    };
    await storage
      .set(dacarNodeConfigKey(projectId), {
        anchorHash: binding.anchorHash,
        anchorPubkey: binding.anchorPubkey,
        salt: binding.salt,
      })
      .catch(() => {});
    localBinding = binding;
    return binding;
  }

  /**
   * Authority (work document #25 §2.2): this device may mint grants iff it
   * holds the project Trust Anchor's private key. The creator's binding is
   * its own mesh identity, so ownership is an identity-hash match; a
   * device holding only the public anchor (a participant) cannot sign
   * assertions.
   *
   * @returns {boolean}
   */
  function hasAuthority() {
    if (identityHash === "") return false;
    const projectId = String(doc.getMap?.("metadata")?.get("id") ?? "");
    return (
      localBinding !== null &&
      localBinding.projectId === projectId &&
      localBinding.anchorHash === identityHash
    );
  }

  /**
   * The project's Dacar Privacy Salt (work document #25 §2.3): device-local
   * state generated by the anchor at first mint and delivered to joiners
   * through the bootstrap handoff and the grants map. Holders can unblind
   * assertions for local inspection; mesh eavesdroppers only ever see the
   * salted hashes.
   *
   * @param {string} projectId
   * @returns {Promise<string>} Hex salt.
   */
  async function ensureDacarSalt(projectId) {
    const key = `dacar-salt:${projectId}`;
    try {
      const stored = await storage.get(key);
      if (typeof stored === "string" && /^[0-9a-f]{64}$/.test(stored)) {
        return stored;
      }
    } catch {
      // Regenerate below
    }
    const salt = await generateSalt();
    await storage.set(key, salt).catch(() => {});
    return salt;
  }

  // ---- Dacar node state (work document #25 §2, §6.2, §7) ----------------
  // One per-project Dacar node: Config + StateVector + DeltaReceiver +
  // Engine. Grants reach it two ways — the §11 direct-link Delta push
  // during the bootstrap handoff, and the grants map (the CRDT is the
  // replication layer) — and both paths authenticate through
  // verify-on-ingest against the project's designated Trust Anchor. An
  // unknown Trust Anchor's deltas are refused and never authorize (§7).
  /**
   * Returns the live Dacar node for the project, built from the
   * device-local Trust Anchor binding (work document #27): the anchor's
   * own device self-assigns it, joiners receive it in the bootstrap
   * handoff (§2.3, §10). Null while the project id or the binding is
   * unknown.
   *
   * @returns {Promise<ReturnType<typeof createDacarNode> | null>}
   */
  async function ensureDacarNode() {
    const projectId = String(doc.getMap?.("metadata")?.get("id") ?? "");
    if (!projectId) return null;
    const binding = await ensureLocalBinding();
    if (!binding) return null;
    if (
      dacarNode &&
      dacarNodeAnchorHash === binding.anchorHash &&
      dacarNodeProjectId === projectId
    ) {
      return dacarNode;
    }
    dacarNode = createDacarNode();
    dacarNode.configure({
      anchorHashHex: binding.anchorHash,
      anchorPubkeyHex: binding.anchorPubkey,
      salt: binding.salt,
    });
    dacarNodeAnchorHash = binding.anchorHash;
    dacarNodeProjectId = projectId;
    return dacarNode;
  }

  /** Drops all Dacar state: grants cache, ingest bookkeeping, node. */
  function invalidateDacarState() {
    grantedCache.clear();
    ingestedEntries.clear();
    entryRevocations.clear();
    entryStatuses.clear();
    dacarNode = null;
    dacarNodeAnchorHash = "";
    dacarNodeProjectId = "";
  }

  /**
   * Reports the Dacar authorization state to the Glass (work document #26):
   * the project's Trust Anchor and whether this device holds its private
   * key, every grants-map entry with its verification status, and the local
   * wallet's contents — the raw material for the Dacar grants UI.
   *
   * @param {any} grants
   * @param {string} projectId
   * @returns {Promise<void>}
   */
  async function reportDacarState(grants, projectId) {
    /** @type {Array<any>} */
    const grantReports = [];
    for (const [id, entry] of grants.entries()) {
      const plain = entry.toJSON();
      grantReports.push({
        id,
        peerHash: plain.peerHash,
        role: plain.role,
        issued: plain.issued,
        revoked: plain.revoked,
        status: entryStatuses.get(id) ?? "pending",
      });
    }
    /** @type {Array<any>} */
    const wallet = [];
    try {
      for (const record of await listWalletGrants(walletStorage)) {
        wallet.push({
          grantId: record.grantId,
          projectId: record.projectId,
          resource: record.unblindedScope,
          permissions: record.assertion.permissions,
          issuer: record.trustAnchor.hash,
          issuedAt: record.assertion.issued_at,
          expires: record.assertion.expires,
        });
      }
    } catch {
      // Wallet listing is best-effort UI detail
    }
    postMessage({
      kind: "mesh-dacar",
      projectId,
      anchor: {
        hash: trustAnchorHash(),
        owner: hasAuthority(),
      },
      grants: grantReports,
      wallet,
    });
  }

  /**
   * Dacar check (work document #25 §6.2, §7): a peer may sync when the
   * project's Trust Anchor authorizes it — either the peer IS the anchor
   * (private-key possession is authority), or the Dacar Engine allows its
   * `sync` relation over the project resource. Reads the verdict cache,
   * which the reconcile pass keeps current.
   *
   * @param {string} peerHash
   * @returns {boolean}
   */
  /**
   * Whether a peer holds a non-revoked grant (synchronous policy check).
   * Accepts an undefined hash (an unidentified peer): the answer is no.
   *
   * @param {string | undefined} peerHash
   * @returns {boolean}
   */
  function isGranted(peerHash) {
    if (!peerHash) return false;
    if (peerHash && peerHash === trustAnchorHash()) return true;
    return grantedCache.get(peerHash) === true;
  }

  /**
   * Reconcile pass (work document #25 §6.2, §7): feed the grants map into
   * the Dacar node and re-evaluate every peer through the Engine.
   *
   * - entries carrying a Dacar authorization are ingested with
   *   verify-on-ingest — unknown anchors (§7) and tampered deltas are
   *   refused, so they never authorize;
   * - tombstoned (revoked) entries leave the Dacar state via a rebuild;
   * - verdicts land in the granted cache for synchronous policy checks.
   *
   * The grants observer re-runs this pass on every change. Grants are
   * born verified (work document #27): the mesh layer's `grant` mints the
   * Dacar-signed authorization directly, so there are no unsigned entries
   * waiting for a countersign pass.
   *
   * @returns {Promise<void>}
   */
  async function reconcileDacarState() {
    if (reconciling) {
      // A pass is in flight: queue exactly one trailing re-run so changes
      // made mid-pass (the anchor write, a grants entry) are never lost to
      // a swallowed trigger
      pendingReconcile = true;
      return;
    }
    reconciling = true;
    try {
      for (;;) {
        pendingReconcile = false;
        await runReconcilePass();
        if (!pendingReconcile) break;
      }
    } finally {
      reconciling = false;
      // Grants changed: the reachability surface gains or loses peers
      // (a newly granted peer is offline until its first dial)
      postPeerReachability();
    }
  }

  /** @returns {Promise<void>} */
  async function runReconcilePass() {
    try {
      const grants = doc.getMap?.("grants");
      if (!grants) return;
      const metadata = doc.getMap?.("metadata");
      const projectId = String(metadata?.get("id") ?? "");
      const node = await ensureDacarNode();
      if (!node) return;
      // Tombstoned entries must leave the Dacar state: a revocation is a
      // removal from the evaluation set, so rebuild once per change
      for (const [id, entry] of grants.entries()) {
        const plain = entry.toJSON();
        const revoked = plain.revoked !== null;
        if (entryRevocations.get(id) === revoked) continue;
        entryRevocations.set(id, revoked);
        if (revoked) {
          node.reset();
          ingestedEntries.clear();
          grantedCache.clear();
          // The revocation must also reach ESTABLISHED links (work
          // document #54, unblocked by y-reticulum 0.5.0's teardown
          // API): a tombstoned grant blocks re-initiates, but the
          // peer's live connection used to keep syncing indefinitely.
          // The peer's identity hash is the grant's subject key.
          provider?.revokePeer?.(String(plain.peerHash ?? ""));
        }
      }
      // Replay pushes that arrived before the node was configured
      if (pendingPushes.length > 0) {
        const buffered = pendingPushes.splice(0);
        for (const data of buffered) {
          await node.ingestDeltas(data).catch(() => 0);
        }
      }
      // Ingest authorization entries not yet in the Dacar state. Entries
      // without an authorization cannot verify and are skipped: grants are
      // born verified through the mesh layer (work document #27)
      for (const [id, entry] of grants.entries()) {
        const plain = entry.toJSON();
        if (plain.revoked !== null) {
          entryStatuses.set(id, "revoked");
          continue;
        }
        if (!plain.authorization) continue;
        const fingerprint = authorizationFingerprint(plain.authorization);
        if (ingestedEntries.get(id) === fingerprint) continue;
        ingestedEntries.set(id, fingerprint);
        await node.ingestAuthorization(plain.authorization);
        // Every verified grant the device holds is cataloged in the wallet
        // (§5.2): its own, the host's, and every peer's — the grants map is
        // the replication, the wallet the local catalog
        await saveWalletGrant(walletStorage, {
          projectId,
          authorization: plain.authorization,
        }).catch(() => {});
      }
      // Evaluate every grants-map peer plus this device through the Engine
      const peers = new Set(identityHash ? [identityHash] : []);
      for (const entry of grants.values()) {
        const plain = entry.toJSON();
        if (plain.revoked === null && plain.peerHash) peers.add(plain.peerHash);
      }
      for (const peerHash of peers) {
        if (!/^[0-9a-f]{32}$/.test(peerHash)) continue;
        grantedCache.set(
          peerHash,
          (await node.evaluate(projectId, "sync", peerHash)) === true,
        );
      }
      // Per-entry verification status for the Glass: a grant entry is
      // verified when the Engine allows its peer, refused when the peer is
      // known but unauthorized, pending while the Dacar node is still
      // unconfigured (no designated anchor or salt learned yet)
      for (const [id, entry] of grants.entries()) {
        const plain = entry.toJSON();
        if (plain.revoked !== null) {
          entryStatuses.set(id, "revoked");
        } else if (!node.isConfigured()) {
          entryStatuses.set(id, "pending");
        } else if (grantedCache.get(plain.peerHash) === true) {
          entryStatuses.set(id, "verified");
        } else {
          entryStatuses.set(id, "refused");
        }
      }
      await reportDacarState(grants, projectId);
    } catch (err) {
      console.warn(
        "Dacar reconcile pass failed:",
        /** @type {any} */ (err)?.message ?? err,
      );
    }
  }

  /**
   * Ingests one push received on the `dacar.sync.v1` endpoint (§11): the
   * Dacar node authenticates it by verify-on-ingest; while unconfigured the
   * push is buffered and replayed after the bootstrap handoff delivers the
   * node config. Applied pushes refresh the verdict cache.
   *
   * @param {Uint8Array} data
   * @returns {Promise<number>} Applied delta count.
   */
  async function ingestPush(data) {
    const node = await ensureDacarNode().catch(() => null);
    if (!node) {
      pendingPushes.push(data);
      return 1;
    }
    const applied = await node.ingestDeltas(data);
    if (applied > 0) {
      lastPushedBatch = bytesToBase64(data);
      await reconcileDacarState().catch(() => {});
    } else if (joinInFlight) {
      // The active project's node refused the push, but a bootstrap join is
      // in flight: the invited project's grant arrives while this device
      // still runs its scratch project, so the refusal only means the push
      // is not for the active binding. Buffer it for the join flow's drain
      // (work document #27); the invited project's verify-on-ingest there
      // refuses anything that does not authenticate
      pendingPushes.push(data);
      return 1;
    }
    return applied;
  }

  /**
   * The `DeltaReceiver`-shaped seam the direct-link push transport (§11)
   * feeds: stable across Dacar node rebuilds.
   */
  const dacarPushReceiver = {
    /**
     * @param {Uint8Array} data
     * @returns {Promise<boolean>}
     */
    async applyPayload(data) {
      return (await ingestPush(data)) > 0;
    },
    /**
     * @param {Uint8Array} data
     * @returns {Promise<number>}
     */
    async applyPayloads(data) {
      return await ingestPush(data);
    },
  };

  /** The `dacar.sync.v1` direct-link ingestion endpoint (§11), if started. */
  /** @type {any} */
  let dacarSyncServer = null;

  /**
   * Starts the direct-link Delta ingestion endpoint on this device's
   * identity: peers push signed grants to it over Reticulum Links. Idempotent.
   *
   * @returns {Promise<any>}
   */
  async function ensureDacarSyncServer() {
    if (dacarSyncServer) return dacarSyncServer;
    const rns = sharedRns ?? (await ensureReticulum());
    dacarSyncServer = await RnsSyncServer.create({
      identity: await ensureIdentity(),
      // The transport only consumes the two apply methods (§11.2.4); the
      // generated declaration types the seam as the full DeltaReceiver
      // class, whose internals leak as required properties (upstream: mark
      // them @private or type the seam structurally)
      receiver: /** @type {any} */ (dacarPushReceiver),
      rns,
    });
    // The one-shot announce at creation races interface readiness: peers
    // that connect later never learn this device's Delta-push destination.
    // Announce periodically like the room destination does
    dacarSyncServer.destination?.startAnnouncing?.({
      intervalMs: 10 * 60_000,
    });
    // The handoff's delta push depends on this destination being reachable,
    // so its announce cadence matters for join debugging (work document
    // #34); @reticulum/core 0.9.5 emits "announced" on broadcast
    dacarSyncServer.destination?.addEventListener?.("announced", () => {
      postMessage(
        progress("mesh.announce", "sync", "done", {
          destination: toHex(
            dacarSyncServer.destination?.destinationHash ?? [],
          ),
        }),
      );
    });
    return dacarSyncServer;
  }

  /** Stops the direct-link ingestion endpoint (no upstream stop API). */
  async function stopDacarSyncServer() {
    if (!dacarSyncServer) return;
    const server = dacarSyncServer;
    dacarSyncServer = null;
    const destination = server.destination;
    if (destination) {
      try {
        destination.stopAnnouncing?.();
        sharedRns?.transport?.unbindLocalDestination?.(destination);
        sharedRns?.deregisterDestination?.(destination);
      } catch {
        // Best-effort teardown
      }
    }
  }

  /**
   * The per-peer redial backoff: one attempt a minute at first, doubling
   * to a ten-minute ceiling. A peer's counter resets when it comes online.
   *
   * @param {{ attempts: number, lastDialAt: number } | undefined} state
   * @returns {number}
   */
  function nextRedialDelay(state) {
    const attempts = state?.attempts ?? 0;
    return Math.min(REDIAL_BASE_MS * 2 ** attempts, REDIAL_MAX_MS);
  }

  /**
   * Dials every granted peer's room destination directly (work document
   * #34): the grants map carries each granted peer's identity hash, and the
   * room destination hash is derivable from it — restarts recover without
   * announce-driven discovery, whose acceptance at the relay is not
   * guaranteed for known destinations.
   */
  async function dialKnownPeers() {
    if (!provider) return;
    const grants = doc.getMap?.("grants");
    if (!grants) return;
    const room = roomFor();
    /** Peers already dialed in this pass (entries can repeat per role). */
    const dialed = new Set();
    for (const entry of grants.values()) {
      const plain = entry.toJSON();
      if (plain.revoked !== null || !plain.authorization) continue;
      const peerHash = String(plain.peerHash ?? "");
      if (peerHash === identityHash) continue;
      if (!/^[0-9a-f]{32}$/.test(peerHash) || dialed.has(peerHash)) continue;
      dialed.add(peerHash);
      // Offline peers are the mesh's normal state (work document #47):
      // the boot pass dials everyone once; the periodic redial backs off
      // per peer so an absent participant costs one attempt per window,
      // not a continuous retry churn
      const dialState = peerDialState.get(peerHash);
      const now = Date.now();
      const notBefore =
        (dialState?.lastDialAt ?? 0) + nextRedialDelay(dialState);
      if (dialState && now < notBefore) continue;
      peerDialState.set(peerHash, {
        attempts: (dialState?.attempts ?? 0) + 1,
        lastDialAt: now,
      });
      const destHash = await roomDestinationHash(room, peerHash);
      const established = await provider
        .dialHash?.(destHash, peerHash)
        .catch(() => false);
      if (established) {
        failedDials.delete(destHash);
        peerDialState.set(peerHash, { attempts: 0, lastDialAt: Date.now() });
      } else {
        failedDials.add(destHash);
      }
      postPeerReachability();
    }
  }

  /**
   * Reports peer reachability (work document #47): granted peers are
   * either online (a transport link exists) or offline (a normal state
   * in a store-and-forward mesh — they will be re-dialed with backoff).
   * The Glass renders offline granted peers as offline instead of
   * showing a path request that looks stuck.
   *
   * @returns {void}
   */
  function postPeerReachability() {
    const online = onlineIdentities;
    const grants = doc.getMap?.("grants");
    if (!grants) return;
    /** @type {Record<string, "online" | "offline">} */
    const states = {};
    for (const entry of grants.values()) {
      const plain = entry.toJSON();
      if (plain.revoked !== null || !plain.authorization) continue;
      const peerHash = String(plain.peerHash ?? "");
      if (!/^[0-9a-f]{32}$/.test(peerHash) || peerHash === identityHash) {
        continue;
      }
      states[peerHash] = online.has(peerHash) ? "online" : "offline";
    }
    postMessage({ kind: "mesh-peer-reachability", states });
  }

  /**
   * Mints a Dacar-signed grant for a peer and records it on a grants-map
   * entry — the CRDT is the replication other peers verify from (work
   * document #25 §6.2).
   *
   * @param {string} peerHash
   * @param {string} projectId
   * @param {string} [role]
   * @returns {Promise<any>} The minted authorization.
   */
  async function mintPeerAuthorization(
    peerHash,
    projectId,
    role = "developer",
  ) {
    const salt = await ensureDacarSalt(projectId);
    const authorization = await mintDacarAuthorization({
      anchorIdentity: await ensureIdentity(),
      subjectHex: peerHash,
      projectId,
      role,
      salt,
    });
    await writeGrantedAssertion(peerHash, role, authorization);
    // The wallet catalogs every grant this device holds, including the
    // ones it minted itself (work document #25 §5.2)
    await saveWalletGrant(walletStorage, { projectId, authorization }).catch(
      () => {},
    );
    return authorization;
  }

  /**
   * Writes a grants-map entry carrying a Dacar authorization, deduplicating
   * by cryptographic content so a bootstrap re-handoff and a CRDT sync of
   * the same grant never duplicate the entry.
   *
   * @param {string} peerHash
   * @param {string} role
   * @param {any} authorization
   * @returns {Promise<any>} The written (or existing) entry.
   */
  async function writeGrantedAssertion(peerHash, role, authorization) {
    const fingerprint = authorizationFingerprint(authorization);
    const grants = doc.getMap?.("grants");
    if (grants) {
      for (const entry of grants.values()) {
        const plain = entry.toJSON();
        if (
          plain.peerHash === peerHash &&
          plain.revoked === null &&
          plain.authorization &&
          authorizationFingerprint(plain.authorization) === fingerprint
        ) {
          return plain;
        }
      }
    }
    return grantAssertion(doc, peerHash, role, authorization);
  }

  /**
   * Returns the stored Dacar authorization of a granted peer's live
   * grants-map entry, or null when the peer holds none — the idempotent
   * re-dial path re-handoffs exactly what was granted before.
   *
   * @param {string} peerHash
   * @returns {any | null}
   */
  function findAuthorization(peerHash) {
    const grants = doc.getMap?.("grants");
    if (!grants) return null;
    for (const entry of grants.values()) {
      const plain = entry.toJSON();
      if (
        plain.peerHash === peerHash &&
        plain.revoked === null &&
        plain.authorization
      ) {
        return plain.authorization;
      }
    }
    return null;
  }

  /**
   * The §6.2 link authorizer (work document #25): peers present their Dacar
   * assertions on the established link and verify each other through the
   * Dacar Engine before any sync flows. Both sides send first, then read,
   * so the phase cannot deadlock; a timeout or refusal tears the link down.
   */
  const authorizeLink = createDacarLinkAuthorizer({
    isGranted,
    peerRole: (/** @type {string} */ hash) => {
      const grants = doc.getMap?.("grants");
      if (!grants) return null;
      for (const entry of grants.values()) {
        const plain = entry.toJSON();
        if (plain.peerHash === hash && plain.revoked === null) {
          return String(plain.role ?? "") || null;
        }
      }
      return null;
    },
    localAnchorHash: () => localBinding?.anchorHash ?? null,
    isInRequesterMode,
    ownAuthorization: () =>
      identityHash ? findAuthorization(identityHash) : null,
    ensureDacarNode,
    projectId: () => String(doc.getMap?.("metadata")?.get("id") ?? ""),
  });

  /**
   * The project owner bootstraps their own signed grant, otherwise the
   * strict policy would lock everyone - including the owner - out of an
   * un-granted project. The anchor signs itself like any other peer, so
   * every device's authorization answers through the same Dacar Engine.
   */
  async function ensureSelfAuthorization() {
    // Invited devices never self-grant: their access comes from the owner's
    // approval, synced through the grants map after the link establishes
    if (config.joinedViaInvite) return;
    const projectId = String(doc.getMap?.("metadata")?.get("id") ?? "");
    if (!projectId) return;
    await ensureLocalBinding();
    if (!hasAuthority()) return;
    if (findAuthorization(identityHash)) return;
    await mintPeerAuthorization(identityHash, projectId);
  }

  /**
   * Requester mode (work document #21): a device whose grants map is
   * completely empty is a fresh joiner — its own policy must let it dial,
   * because the access REQUEST is the dial itself; the owner's policy then
   * decides. Without this, an empty-grants joiner could never contact the
   * owner and no join request would ever surface. Once grants sync
   * (approval), the device leaves requester mode.
   *
   * @returns {boolean}
   */
  function isInRequesterMode() {
    const grants = doc.getMap?.("grants");
    if (!grants) return false;
    return grants.size === 0;
  }

  /**
   * Refused links are access requests: peers that know the room but hold no
   * grant. Surfaced to the Glass for approval.
   *
   * @type {Map<string, { identityHash: string, destinationHash: string | null, firstSeen: number, source: "sync" | "bootstrap" }>}}
   */
  const joinRequests = new Map();

  // ---- Shared Reticulum transport --------------------------------------
  // One Reticulum instance serves BOTH the bootstrap pre-flow (work
  // document #25) and the sync phase (y-reticulum): the joiner's routing
  // table warms up during the bootstrap wait, so the first sync dial after
  // the grant needs no discovery wait. MeshSync owns the instance — it is
  // built from the enabled interfaces at first use and stopped exactly once
  // per provider lifetime (the ghost-connection fix in work doc #21 update
  // #9 now lives here).
  /** @type {any} */
  let sharedRns = null;
  /** Interfaces the mesh layer attached by default (the settings dialog
   * renders them read-only — work document #47's legibility). */
  /** @type {Array<{ type: string, options: Record<string, any>, reason: string }> | null} */
  let runtimeInterfaces = null;

  /**
   * Returns the shared Reticulum instance, creating it on first use. The
   * interface attachment is injected (`attachInterfaces`) — the entry
   * imports its platform's wiring (the browser wiring from the document's
   * module graph, the Node wiring from the bridge), so import-map-less
   * Workers and bare Node both resolve their own modules natively
   * (work document #44).
   *
   * @returns {Promise<any>}
   */
  /** Whether the shared instance is process-owned (injected): the daemon
   * hands one Reticulum instance down so the LXMF layer and project
   * engines share a single mesh node — mesh stop must not stop it. */
  const injectedRns = reticulum ?? null;

  async function ensureReticulum() {
    if (sharedRns) return sharedRns;
    if (injectedRns) {
      // Process-owned: interfaces were attached by the owner already
      sharedRns = injectedRns;
      return sharedRns;
    }
    const { Reticulum } = await import("../../vendor/reticulum-core.js");
    const rns = new Reticulum();
    try {
      const attach = attachInterfaces ?? defaultAttachInterfaces;
      const runtimeAttached = await attach(rns, config.interfaces);
      if (Array.isArray(runtimeAttached)) {
        runtimeInterfaces = runtimeAttached;
      }
    } catch (err) {
      // A failed connect keeps an auto-reconnect loop alive: stop the whole
      // instance so no ghost connection outlives the failed start
      await rns.stop().catch(() => {});
      throw err;
    }
    sharedRns = rns;
    return rns;
  }

  /** Stops and discards the shared Reticulum instance. A process-owned
   * instance is only released, never stopped: its owner manages its
   * lifetime (work document #47, multi-project). */
  async function releaseReticulum() {
    if (!sharedRns) return;
    const rns = sharedRns;
    sharedRns = null;
    if (injectedRns) return;
    await rns.stop().catch(() => {});
  }

  // ---- Bootstrap pre-flow (work document #25, "Knock and Approve") ------
  // The host side announces a stable per-owner `noflo.join` destination on
  // the shared Reticulum instance; the joiner side runs the state machine
  // over an ephemeral link to that destination.
  /** @type {any} */
  let bootstrapHost = null;
  /** Pending host-user approval decisions, keyed by joiner identity hash. */
  /** @type {Map<string, (decision: "approved" | "declined") => void>} */
  const pendingApprovals = new Map();
  const INVITES_KEY = "bootstrap-invites";

  /**
   * Reads the issued-invite registry, pruning expired records.
   *
   * @returns {Promise<Array<{ token: string, createdAt: number, expiresAt: number }>>}
   */
  async function loadInvites() {
    try {
      const list = await storage.get(INVITES_KEY);
      if (!Array.isArray(list)) return [];
      const now = Date.now();
      const live = list.filter(
        (/** @type {any} */ record) =>
          record &&
          typeof record.token === "string" &&
          typeof record.expiresAt === "number" &&
          record.expiresAt > now,
      );
      if (live.length !== list.length) {
        await storage.set(INVITES_KEY, live);
      }
      return live;
    } catch {
      return [];
    }
  }

  /**
   * Starts the bootstrap host on the shared Reticulum instance: only a
   * device that owns its grants may host invites (an invited device holds no
   * signing authority). Failures degrade to "no invites can be issued" —
   * sync itself is unaffected.
   */
  async function startBootstrapHost() {
    if (bootstrapHost || !provider) return;
    const reticulum = provider.room?.rns ?? null;
    if (!reticulum) return;
    const metadata = doc.getMap?.("metadata");
    const projectId = String(metadata?.get("id") ?? "");
    if (!projectId) return;
    // Only the project Trust Anchor's private-key holder hosts invites: a
    // device holding only the public anchor cannot mint Dacar grants
    // (work document #25 §2.2)
    if (!hasAuthority()) return;
    try {
      bootstrapHost = await createBootstrapHost({
        reticulum,
        identity: await ensureIdentity(),
        projectId,
        projectName: String(metadata?.get("name") ?? projectId),
        isGranted,
        getAuthorization: (/** @type {string} */ peerHash) =>
          findAuthorization(peerHash),
        mintAuthorization: (/** @type {string} */ peerHash) =>
          mintPeerAuthorization(peerHash, projectId),
        hasAuthority,
        deliverAuthorization: async (
          /** @type {string} */ _joinerHash,
          /** @type {any} */ authorization,
          /** @type {any} */ joinerIdentity,
        ) => {
          // §11 direct-link Delta push to the joiner's `dacar.sync.v1`
          // endpoint. The joiner's full identity comes from the bootstrap
          // link's identify handshake, so the destination is derived
          // directly — no identity recall involved. The joiner's announce
          // may not have propagated when the handoff response lands, so
          // retry until a path resolves; a finally-lost push is recovered
          // by the joiner's CRDT sync, which carries the same grants-map
          // entry
          if (!joinerIdentity) {
            console.warn(
              "Dacar delta push skipped: the joiner never identified",
            );
            return;
          }
          const destination = await Destination.OUT(
            "dacar.sync.v1",
            DestType.SINGLE,
            joinerIdentity,
            reticulum,
          );
          const destinationHash = destination.destinationHash;
          for (let attempt = 0; attempt < 6; attempt++) {
            try {
              if (!reticulum.transport.hasPath?.(destinationHash)) {
                await reticulum.transport
                  .requestPath(destinationHash)
                  .catch(() => {});
              }
              let waited = 0;
              while (
                !reticulum.transport.hasPath?.(destinationHash) &&
                waited < 5_000
              ) {
                await new Promise((resolve) => setTimeout(resolve, 200));
                waited += 200;
              }
              const link = await destination.createLink();
              const accepted = await pushOne(
                link,
                SYNC_REQUEST_PATH,
                base64ToBytes(authorization.deltas),
                15_000,
              );
              await link.teardown().catch(() => {});
              if (accepted) return;
              console.warn("Dacar delta push refused by the joiner; retrying");
            } catch (err) {
              console.warn(
                `Dacar delta push attempt ${attempt} failed: ${
                  /** @type {any} */ (err)?.message ?? err
                }`,
              );
            }
            await new Promise((resolve) => setTimeout(resolve, 1_000));
          }
          console.warn(
            "Dacar delta push not applied; the grants map will recover the grant",
          );
        },
        requestApproval: (/** @type {string} */ joinerHash) => {
          if (!joinRequests.has(joinerHash)) {
            joinRequests.set(joinerHash, {
              identityHash: joinerHash,
              destinationHash: null,
              firstSeen: Date.now(),
              source: "bootstrap",
            });
          }
          postMessage({
            kind: "mesh-requests",
            requests: [...joinRequests.values()],
          });
          return new Promise((resolve) => {
            pendingApprovals.set(joinerHash, resolve);
          });
        },
        isValidInviteToken: async (/** @type {string} */ token) => {
          const invites = await loadInvites();
          return invites.some((record) =>
            isInviteRecordValid(record, token, Date.now()),
          );
        },
      });
    } catch (err) {
      bootstrapHost = null;
      console.warn(
        "Bootstrap host failed to start (invites unavailable):",
        /** @type {any} */ (err)?.message ?? err,
      );
    }
  }

  /**
   * Stops the bootstrap host and fails any pending approval decisions —
   * the knocking joiner re-dials and gets the answer then.
   */
  async function stopBootstrapHost() {
    if (!bootstrapHost) return;
    const host = bootstrapHost;
    bootstrapHost = null;
    for (const resolve of pendingApprovals.values()) resolve("declined");
    pendingApprovals.clear();
    await host.stop().catch(() => {});
  }

  /**
   * Parses, validates, and runs the joiner state machine against the
   * invited host, then applies the handoff through the explicit lifecycle:
   * the Engine adopts the invited project identity (`onAdopt`), the verified
   * grant is written into the local grants map, and the project
   * materializes (`onGranted`) — no observer infers the transitions.
   *
   * @param {string} uri Invite URI (`noflo://join/<hash>/<token>`).
   * @param {JoinHooks} [hooks]
   */
  async function runBootstrapJoin(uri, hooks = {}) {
    const invite = parseInviteUri(uri);
    if (!invite) {
      postMessage({
        kind: "mesh-status",
        error: "Join failed: not a valid invite (noflo://join/...) URL",
      });
      return;
    }
    joinInFlight = true;
    try {
      await runBootstrapJoinInner(uri, hooks, invite);
    } finally {
      joinInFlight = false;
    }
  }

  /**
   * Inner body of the joiner state machine, run with `joinInFlight` set so
   * the push receiver buffers refused deltas for the invited project.
   *
   * @param {string} uri Invite URI (`noflo://join/<hash>/<token>`).
   * @param {JoinHooks} hooks
   * @param {any} invite Parsed invite.
   */
  async function runBootstrapJoinInner(uri, hooks, invite) {
    // The stage narrated when an unexpected failure aborts the flow
    let joinStage = "requesting_path";
    // Persisted so a reload resumes the join (work document #25 plan item 3):
    // the host answers idempotently, so re-dialing is safe
    await storage.set("pendingInviteUri", uri).catch(() => {});
    const identity = await ensureIdentity();
    try {
      // The direct-link Delta ingestion endpoint (§11) must be up before the
      // host pushes the approved grant
      await ensureReticulum();
      await ensureDacarSyncServer();
      const response = await joinViaBootstrapInvite({
        reticulum: await ensureReticulum(),
        identity,
        invite,
        onState: (/** @type {string} */ stage) => {
          joinStage = stage;
          postMessage(progress("mesh.join", stage, "running"));
        },
      });
      if (response.status === "declined") {
        // Declined joins halt without auto-retry (work document #25 §5.1)
        joinStage = "wait_response";
        await storage.set("pendingInviteUri", "").catch(() => {});
        postMessage(
          progress("mesh.join", "wait_response", "failed", {
            reason: response.reason,
          }),
        );
        postMessage({
          kind: "mesh-status",
          error: `Join declined: ${response.reason}`,
        });
        return;
      }
      // Approved: the handoff carries the project's Dacar node bootstrap
      // (§10 — Trust Anchor and Privacy Salt, the out-of-band provisioning
      // the Dacar spec prescribes). The delivered anchor is trusted here:
      // the out-of-band invite authenticated the host, and the host is the
      // project's anchor source (§2.3). The signed grant itself arrives via
      // the §11 direct-link Delta push (or, if that was lost, the CRDT
      // grants map) and authorizes through the Dacar Engine
      const nodeConfig = response.config ?? null;
      const invitedProjectId = String(response.project?.id ?? "");
      joinStage = "handoff";
      postMessage(progress("mesh.join", "handoff", "running"));
      if (!nodeConfig?.anchor?.hash || !nodeConfig.salt || !invitedProjectId) {
        joinStage = "handoff";
        await storage.set("pendingInviteUri", "").catch(() => {});
        postMessage(
          progress("mesh.join", "handoff", "failed", {
            reason: "invalid_authorization",
          }),
        );
        postMessage({
          kind: "mesh-status",
          error: "Join failed: handoff carried no Dacar node config",
        });
        return;
      }
      invalidateDacarState();
      // Provision the device-local Trust Anchor binding for the invited
      // project (work document #27, §2.3): anchor hash, pubkey, and salt
      // delivered over the authenticated handoff. No CRDT write carries
      // the binding — peers cannot swap the trust root
      await storage
        .set(dacarNodeConfigKey(invitedProjectId), {
          salt: nodeConfig.salt,
          anchorHash: nodeConfig.anchor.hash,
          anchorPubkey: nodeConfig.anchor.pubkey,
        })
        .catch(() => {});
      // The host's identity key is the anchor's: after the granted path's
      // rebind, dial the host's room destination directly instead of waiting
      // for announce-driven discovery (work document #34) — the announce
      // exchange costs a full cycle even when it works
      pendingHostDial = {
        identity: await Identity.fromPublicKey(
          fromHex(nodeConfig.anchor.pubkey),
        ),
        peer: String(nodeConfig.anchor.hash),
      };
      joinStage = "grant";
      // Wait for the pushed grant and verify it through a Dacar node built
      // from the delivered anchor — BEFORE any project setup: the device
      // does not adopt the invited project until it demonstrably holds the
      // grants for it. A lost push fails the join cleanly; the pending
      // invite survives so a reload re-dials (the host answers idempotently
      // and re-pushes)
      const tempNode = createDacarNode();
      tempNode.configure({
        anchorHashHex: nodeConfig.anchor.hash,
        anchorPubkeyHex: nodeConfig.anchor.pubkey,
        salt: nodeConfig.salt,
      });
      const grantDeadline = Date.now() + GRANT_WAIT_MS;
      let granted = false;
      for (;;) {
        for (const data of pendingPushes.splice(0)) {
          const applied = await tempNode.ingestDeltas(data).catch(() => 0);
          if (applied > 0) {
            // The grant record reconstructs from the pushed deltas — the
            // drain bypasses ingestPush, so track the applied batch here
            lastPushedBatch = bytesToBase64(data);
          }
        }
        if (
          (await tempNode.evaluate(invitedProjectId, "sync", identityHash)) ===
          true
        ) {
          granted = true;
          break;
        }
        if (Date.now() > grantDeadline) break;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!granted) {
        postMessage(
          progress("mesh.join", "grant", "failed", {
            error:
              "the pushed grant did not arrive — the invite stays pending; re-join to retry",
          }),
        );
        postMessage({
          kind: "mesh-status",
          error:
            "Join failed: the pushed grant did not arrive; re-join to retry",
        });
        return;
      }
      // Granted. The explicit lifecycle (work document #27) walks
      // adopt → write the verified entry → materialize → rebind, with no
      // observer inferring the transitions: each step fires its hook
      // directly
      const adopted = await hooks.onAdopt?.(response.project ?? {});
      if (adopted === "refused") {
        // The device already carries other project content: joining would
        // merge two projects. The invite is spent; re-joining after
        // clearing the content restarts the flow
        joinStage = "materialize";
        await storage.set("pendingInviteUri", "").catch(() => {});
        postMessage(
          progress("mesh.join", "materialize", "failed", {
            error: "this device already has project content",
          }),
        );
        return;
      }
      invalidateDacarState();
      // Reconstruct the grant record from Dacar ground truth: the deltas
      // that granted us plus the permissions the Engine actually allows
      /** @type {string[]} */
      const grantedPermissions = [];
      for (const permission of ["sync", "write"]) {
        if (
          (await tempNode.evaluate(
            invitedProjectId,
            permission,
            identityHash,
          )) === true
        ) {
          grantedPermissions.push(permission);
        }
      }
      const authorization = {
        anchor: nodeConfig.anchor,
        subject: identityHash,
        resource: projectResource(invitedProjectId),
        permissions: grantedPermissions,
        salt: nodeConfig.salt,
        issued_at: Date.now(),
        expires: null,
        deltas: lastPushedBatch,
      };
      await writeGrantedAssertion(
        identityHash,
        grantedPermissions.includes("write") ? "developer" : "observer",
        authorization,
      );
      await saveWalletGrant(walletStorage, {
        projectId: invitedProjectId,
        authorization,
      }).catch(() => {});
      // The verified grant is in place: materialize the project and rebind
      // the mesh onto the adopted identity — the join flow's explicit
      // transition, not an observer inference
      await hooks.onGranted?.(response.project ?? {});
      await storage.set("pendingInviteUri", "").catch(() => {});
      postMessage(
        progress("mesh.join", "materialize", "done", {
          project: response.project ?? null,
        }),
      );
    } catch (err) {
      const reason = /** @type {any} */ (err)?.message ?? err;
      postMessage(
        progress("mesh.join", joinStage, "failed", { error: String(reason) }),
      );
      postMessage({
        kind: "mesh-status",
        error: `Join failed: ${reason}`,
      });
    }
  }

  /**
   * Posts the idle (not connected) mesh state. Boot-stage narration is the
   * progress channel's job (work document #34); mesh-status carries state,
   * not stages.
   *
   * @param {string} [error]
   */
  function postIdleStatus(error) {
    postMessage({
      kind: "mesh-status",
      connected: false,
      synced: false,
      peers: 0,
      ...(error ? { error } : {}),
    });
  }

  async function start() {
    console.info(
      `Mesh start called: enabled=${config.enabled}, hasProvider=${Boolean(provider)}, identityError=${identityError || "none"}, room=${roomFor()}, interfaces=${config.interfaces.length}, requesterMode=${isInRequesterMode()}, identityHash=${identityHash ?? "none"}`,
    );
    if (!config.enabled) return;
    if (provider) {
      // Already running: the provider's own events keep the Glass current
      return;
    }
    if (identityError) {
      postIdleStatus(identityError);
      return;
    }
    postMessage(progress("mesh.connect", "starting", "running"));
    postIdleStatus();
    console.info("Mesh starting: gates passed");
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
      // Load (or, as the creator, self-assign) the device-local Trust
      // Anchor binding (work document #27). An invited device waits for
      // the bootstrap handoff instead.
      await ensureLocalBinding();
      // The anchor signs itself like any other peer, so authorization is
      // uniform across devices (work document #25 §2.2)
      await ensureSelfAuthorization();
      // Reconcile entries already in the restored document: observers only
      // fire on changes, so a persisted grants map needs a first pass
      await reconcileDacarState().catch(() => {});
      // The direct-link Delta ingestion endpoint (§11) serves pushes on the
      // shared transport for as long as sync runs
      await ensureDacarSyncServer().catch((/** @type {any} */ err) => {
        console.warn(
          "Dacar sync endpoint failed to start (push delivery unavailable):",
          err?.message ?? err,
        );
      });
      room = roomFor();
      // The shared transport serves the provider AND the bootstrap pre-flow
      const reticulum = await ensureReticulum();
      postMessage(progress("mesh.connect", "transport", "running"));
      postIdleStatus();
      // A connect that never completes (a Safari stall, a half-open
      // interface) must be diagnosable, not silent: race the provider
      // start against a timeout so the status line reports the failure
      // instead of hanging on "connecting" forever (work document #27)
      let connectTimeout;
      try {
        provider = await Promise.race([
          createProvider(
            config,
            identity,
            doc,
            room,
            {
              isGranted,
              isInRequesterMode,
              authorizeLink: /** @type {any} */ (authorizeLink),
              onRefused: (/** @type {any[]} */ refusals) => {
                for (const refusal of refusals) {
                  // Narrate every refusal with its reason (work document
                  // #34): dial failures must not be silent
                  if (refusal?.reason) {
                    postMessage(
                      progress("mesh.connect.link", "establish", "failed", {
                        peer: String(refusal.identityHash ?? ""),
                        reason: refusal.reason,
                      }),
                    );
                  }
                  if (!refusal?.identityHash) continue;
                  // Only responder-side refusals are access requests: a peer
                  // knocked and the policy declined. An initiator-side
                  // refusal is this device's own dial being declined by its
                  // own policy — surfacing it as a join request would ask a
                  // participant to "approve" a peer it has no authority to
                  // grant (work document #28 finding)
                  if (refusal.initiator === true) continue;
                  if (!joinRequests.has(refusal.identityHash)) {
                    joinRequests.set(refusal.identityHash, {
                      identityHash: refusal.identityHash,
                      destinationHash: refusal.destinationHash ?? null,
                      firstSeen: Date.now(),
                      source: "sync",
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
            },
            reticulum,
          ),
          new Promise((_resolve, reject) => {
            connectTimeout = setTimeout(
              () => reject(new Error("provider connect timed out")),
              PROVIDER_CONNECT_TIMEOUT_MS,
            );
          }),
        ]);
      } finally {
        clearTimeout(connectTimeout);
      }
    } catch (err) {
      provider = null;
      // No ghost transport may outlive a failed provider start
      await releaseReticulum();
      const reason = /** @type {any} */ (err)?.message ?? err;
      postMessage(
        progress("mesh.connect", "transport", "failed", { error: reason }),
      );
      postIdleStatus(`Mesh provider failed: ${reason}`);
      return;
    }
    // (connect() completes before createProvider resolves), before these
    // listeners were attached — so the transport state is reported here
    // directly: the sync line must leave "connecting…" as soon as the
    // transport is up, not when the first peer happens to sync
    postMessage({
      kind: "mesh-status",
      connected: true,
      synced: false,
      peers: peerCount,
    });
    postMessage(progress("mesh.connect", "transport", "done"));
    // Discovery is where a quiet relay costs a full announce interval: the
    // narration makes the wait legible instead of looking hung (work
    // document #34); the first peer event resolves it
    let discoveryDone = false;
    postMessage(progress("mesh.connect", "discovery", "running"));
    // Narrate discovery and announce facts as they happen (work
    // document #34): a matching announce proves room propagation even when
    // a subsequent link does not form, and each announce on air marks the
    // cadence discovery depends on. The Room's immediate announce fired
    // inside the factory, before these listeners — narrate it directly
    provider.on("discovered", (/** @type {any} */ event) => {
      const remoteHex = String(unwrap(event)?.remoteHex ?? "");
      postMessage(
        progress("mesh.connect", "discovered", "done", { peer: remoteHex }),
      );
      // An announce means the peer is reachable right now (work document
      // #47): reachability refreshes, and the dial backoff resets so the
      // retry runs immediately
      const announcedPeerHash = identityByLink.get(remoteHex) ?? null;
      if (announcedPeerHash) {
        peerDialState.set(announcedPeerHash, {
          attempts: 0,
          lastDialAt: 0,
        });
      }
      postPeerReachability();
      // The announce just refreshed the path table: retry a direct dial
      // that failed at start, when the path may still have pointed at the
      // peer's previous session (work document #34). The retry's done
      // closes the failed narration the Glass is showing.
      if (failedDials.has(remoteHex)) {
        failedDials.delete(remoteHex);
        postMessage(
          progress("mesh.connect.path", "request", "running", {
            peer: remoteHex,
          }),
        );
        provider
          .dialHash?.(remoteHex)
          .then((/** @type {any} */ established) => {
            if (!established) failedDials.add(remoteHex);
            postMessage(
              progress(
                "mesh.connect.path",
                "request",
                established ? "done" : "failed",
                { peer: remoteHex },
              ),
            );
          })
          .catch(() => failedDials.add(remoteHex));
      }
    });
    provider.on("announced", () => {
      postMessage(
        progress("mesh.announce", "room", "done", {
          destination: String(provider.room?.myHex ?? ""),
        }),
      );
    });
    provider.on("announce-failed", (/** @type {any} */ event) => {
      postMessage(
        progress("mesh.announce", "room", "failed", {
          error: String(unwrap(event)?.error ?? "unknown"),
        }),
      );
    });
    if (pendingHostDial) {
      // The join flow left a host identity to dial: reach the room directly
      // instead of waiting for the host's next periodic announce (work
      // document #34)
      const dial = pendingHostDial;
      pendingHostDial = null;
      postMessage(
        progress("mesh.connect.path", "request", "running", {
          peer: dial.peer,
        }),
      );
      provider
        .dialPeer?.(dial.identity)
        .then((/** @type {any} */ established) => {
          postMessage(
            progress(
              "mesh.connect.path",
              "request",
              established ? "done" : "failed",
              {
                peer: dial.peer,
              },
            ),
          );
        })
        .catch(() => {});
    }
    // Restart recovery (work document #34): dial every granted peer's room
    // destination directly, derived from the grants map — announce-driven
    // discovery is the fallback
    dialKnownPeers().catch(() => {});
    // The patient redial (work document #47): offline peers are the mesh's
    // default state, so granted peers re-dial with per-peer backoff until
    // they appear. Announces shortcut the backoff (a peer's announce means
    // it is reachable now); the poll is the fallback for silent starts
    if (redialTimer) clearInterval(redialTimer);
    redialTimer = setInterval(() => {
      if (!provider) return;
      dialKnownPeers().catch(() => {});
    }, REDIAL_TICK_MS);
    if (redialTimer.unref) redialTimer.unref();
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
    const unwrap = (/** @type {any} */ event) =>
      Array.isArray(event) ? event[0] : event;
    /** The transport's current link ids. */
    const peerLinks = new Set();
    /** Link id → identity hash, from the provider's peers event (work
     * document #28). Unidentified links are absent until the provider
     * reports their identity. */
    const identityByLink = new Map();
    /** Serialized identities of the last posted peers summary: the synced
     * re-post only fires when the mapping actually changed. */
    let lastIdentitiesSerialized = "[]";

    /**
     * The peers summary: identities de-duplicate reconnect links, so the
     * count is unique peers — an unidentified link counts on its own until
     * its identity resolves.
     *
     * @returns {{ count: number, identities: Record<string, string> }}
     */
    const peersSummary = () => {
      /** @type {Set<string>} */
      const identities = new Set();
      let unidentified = 0;
      for (const linkId of peerLinks) {
        const identityHash = identityByLink.get(linkId);
        if (identityHash) identities.add(identityHash);
        else unidentified += 1;
      }
      return {
        count: identities.size + unidentified,
        identities: Object.fromEntries(identityByLink),
      };
    };

    const resolveIdentities = (/** @type {any} */ payload) => {
      for (const [linkId, identityHash] of Object.entries(
        payload.identities ?? {},
      )) {
        if (identityHash) identityByLink.set(linkId, identityHash);
      }
      for (const linkId of payload.removed ?? []) {
        identityByLink.delete(linkId);
      }
    };

    provider.on("status", (/** @type {any} */ event) => {
      const payload = unwrap(event) ?? {};
      postMessage({
        kind: "mesh-status",
        connected: payload.connected === true,
        synced: false,
        peers: peersSummary().count,
      });
    });
    provider.on("synced", (/** @type {any} */ event) => {
      const payload = unwrap(event) ?? {};
      // Sync completion implies the identity is certainly known: resolve
      // again, and re-post the mapping only when it changed
      resolveIdentities(payload);
      const summary = peersSummary();
      peerCount = summary.count;
      postMessage({
        kind: "mesh-status",
        connected: true,
        synced: payload.synced === true,
        peers: summary.count,
      });
      const serialized = JSON.stringify(summary.identities);
      if (serialized !== lastIdentitiesSerialized) {
        lastIdentitiesSerialized = serialized;
        postMessage({
          kind: "mesh-peers",
          added: [],
          removed: [],
          peers: summary.count,
          identities: summary.identities,
        });
      }
    });
    provider.on("peers", (/** @type {any} */ event) => {
      const payload = unwrap(event) ?? {};
      for (const linkId of payload.added ?? []) peerLinks.add(linkId);
      for (const linkId of payload.removed ?? []) peerLinks.delete(linkId);
      resolveIdentities(payload);
      onlineIdentities.clear();
      for (const identityHash of Object.values(identityByLink)) {
        onlineIdentities.add(String(identityHash));
      }
      const summary = peersSummary();
      if (summary.count > 0 && !discoveryDone) {
        discoveryDone = true;
        postMessage(
          progress("mesh.connect", "discovery", "done", {
            peers: summary.count,
          }),
        );
      }
      peerCount = summary.count;
      lastIdentitiesSerialized = JSON.stringify(summary.identities);
      postMessage({
        kind: "mesh-peers",
        added: payload.added ?? [],
        removed: payload.removed ?? [],
        peers: summary.count,
        identities: summary.identities,
      });
      // A peer that connected or dropped flips its reachability state
      postPeerReachability();
    });
    // Host side of the bootstrap pre-flow: invite others once the sync
    // provider is live (work document #25)
    await startBootstrapHost();
  }

  async function stop() {
    if (redialTimer) {
      clearInterval(redialTimer);
      redialTimer = null;
    }
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
      // Best-effort: the destroy's link teardown against an unreachable
      // peer can retry for the whole Reticulum link timeout — the new
      // provider must not wait for that. A late teardown completing in the
      // background is harmless (the room state is already released).
      await Promise.race([
        provider.destroy(),
        new Promise((resolve) => setTimeout(resolve, 2_500)),
      ]);
    } catch {
      // Tearing down a half-connected provider is best-effort
    }
    provider = null;
    peerCount = 0;
    joinRequests.clear();
    // Bootstrap host and shared transport end with the provider: exactly
    // one teardown per provider lifetime (ghost-connection rule)
    await stopBootstrapHost();
    await stopDacarSyncServer();
    if (sharedRns) {
      const rns = sharedRns;
      sharedRns = null;
      await Promise.race([
        rns.stop(),
        new Promise((resolve) => setTimeout(resolve, 2_500)),
      ]).catch(() => {});
    }
    // Release the wallet's connection so a factory reset's deleteDatabase
    // is never blocked by it
    walletStorage.close?.();
    // Clear any peer ghosts the Glass is rendering
    postMessage({ kind: "awareness", states: [] });
  }

  // ---- Observers (registered after every closure declaration) -----------
  // The observers can fire while createMeshSync is suspended on an await
  // (a persisted document loading through y-indexeddb commits transactions
  // mid-boot), so they are registered only after the whole closure state
  // exists — a callback hitting a not-yet-initialized declaration is a TDZ
  // error. State changes before this point are covered by the initial
  // reconcile pass in start(). Observer failures must never propagate into
  // the Yjs transaction that triggered them (a throw there would abort
  // persistence commits).

  // Dacar grant lifecycle (work document #25 §6.2, §7): reconcile the
  // grants map into the Dacar node state as entries arrive. The grants map
  // is replication: verification happens through the Dacar Engine, never
  // by inferring device transitions from map contents — the join flow's
  // granted path drives materialization directly (work document #27)
  doc.getMap?.("grants")?.observe(() => {
    try {
      reconcileDacarState().catch((/** @type {any} */ err) =>
        console.warn("Dacar reconcile failed:", err?.message ?? err),
      );
    } catch (err) {
      console.warn(
        "Grants observer failed:",
        /** @type {any} */ (err)?.message ?? err,
      );
    }
  });
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
    /**
     * The shared Reticulum instance once the mesh started (null before).
     * The Companion's LXMF layer rides the same stack — one mesh node
     * (work document #47).
     *
     * @returns {any}
     */
    getReticulum() {
      return sharedRns;
    },
    /**
     * Interfaces the mesh layer attached by default rather than from the
     * stored config (work document #47's legibility): the settings
     * dialog renders them read-only.
     *
     * @returns {Array<{ type: string, options: Record<string, any>, reason: string }> | null}
     */
    getRuntimeInterfaces() {
      return runtimeInterfaces;
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
     * Removes a handled request (granted, declined, or dismissed) and
     * re-reports the list. A pending bootstrap approval gets its decision
     * here; sync-refusal entries are just cleared.
     *
     * @param {{ identityHash: string, decision?: "approved" | "declined" }} payload
     */
    resolveRequest(payload) {
      const identityHash = payload?.identityHash;
      if (typeof identityHash !== "string" || !identityHash) return;
      const pending = pendingApprovals.get(identityHash);
      if (pending) {
        pendingApprovals.delete(identityHash);
        pending(payload.decision === "approved" ? "approved" : "declined");
      }
      joinRequests.delete(identityHash);
      postMessage({
        kind: "mesh-requests",
        requests: [...joinRequests.values()],
      });
    },
    /**
     * Issues a bootstrap invite for the hosted project (work document #25
     * §3.2 Step 1): a `noflo://join/<hash>/<token>` URI whose token the
     * host validates on knock. Null when this device cannot host.
     *
     * @returns {Promise<{ uri: string, token: string, expiresAt: number } | null>}
     */
    async createInvite() {
      if (!bootstrapHost) return null;
      const token = generateInviteToken();
      const createdAt = Date.now();
      const expiresAt = createdAt + INVITE_TOKEN_TTL_MS;
      const invites = await loadInvites();
      invites.push({ token, createdAt, expiresAt });
      await storage.set(INVITES_KEY, invites);
      return {
        uri: buildInviteUri({
          hostDestinationHash: bootstrapHost.destinationHash,
          token,
        }),
        token,
        expiresAt,
      };
    },
    /**
     * Runs the joiner state machine against the invited host.
     *
     * @param {string} uri
     * @param {JoinHooks} [hooks]
     */
    async startBootstrapJoin(uri, hooks = {}) {
      await runBootstrapJoin(uri, hooks);
    },
    /**
     * Re-runs a persisted pending invite (resume on reload, work document
     * #25 plan item 3); false when no pending invite is stored.
     *
     * @param {JoinHooks} [hooks]
     * @returns {Promise<boolean>}
     */
    async resumePendingInvite(hooks = {}) {
      let uri = "";
      try {
        uri = String((await storage.get("pendingInviteUri")) ?? "");
      } catch {
        return false;
      }
      if (!uri) return false;
      await runBootstrapJoin(uri, hooks);
      return true;
    },
    /**
     * @param {any} payload
     */
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
     * Mints a Dacar-signed grant for a peer directly through the mesh
     * layer (work document #27): the Trust Anchor's device signs the
     * authorization and writes the born-verified entry — no unsigned
     * intermediate state, no asynchronous countersign pass. Fails with a
     * status message when this device does not hold the project's anchor.
     *
     * @param {any} payload `{ identityHash: string, role: string }`.
     * @returns {Promise<boolean>} Whether the grant was minted.
     */
    async grant(payload) {
      const peerHash = String(payload?.identityHash ?? "");
      const role = String(payload?.role ?? "");
      const projectId = String(doc.getMap?.("metadata")?.get("id") ?? "");
      if (
        !/^[0-9a-f]{32}$/.test(peerHash) ||
        !ROLE_PERMISSIONS[role] ||
        !projectId
      ) {
        postMessage({
          kind: "mesh-status",
          error:
            "Grant failed: a peer identity hash and a valid role are required",
        });
        return false;
      }
      await ensureLocalBinding();
      if (!hasAuthority()) {
        postMessage({
          kind: "mesh-status",
          error:
            "Grant failed: only the project Trust Anchor's device can mint grants",
        });
        return false;
      }
      await mintPeerAuthorization(peerHash, projectId, role);
      await reconcileDacarState().catch(() => {});
      return true;
    },
    /**
     * @param {any} payload
     */
    async handleConfigure(payload) {
      // The identity is device state, not configuration: a configure
      // payload that omits it (the settings form does not render secret
      // key material) must never wipe it — a fresh identity would drop
      // every grant the peers hold, silently unsyncing the device
      const previousIdentity = config.identity;
      config = normalizeMeshConfig(payload);
      config.enabled = payload?.enabled === true;
      if (!config.identity && previousIdentity) {
        config.identity = previousIdentity;
      }
      await saveMeshConfig(storage, config);
      await stop();
      await start();
      // The Engine reports the full state (config, identity, room, schemas)
      // after reconfiguration; MeshSync stays silent here
    },
    /**
     * Marks this device as having joined by invite (work document #21):
     * invited devices never self-grant, and their local grants map is
     * cleared so the document starts with the owner's grant map once the
     * access is approved and the link syncs.
     */
    async handleJoinedViaInvite() {
      // Joining implies enabling sync: the whole point of the invite
      config.enabled = true;
      config.joinedViaInvite = true;
      await saveMeshConfig(storage, config);
      doc.getMap?.("grants")?.clear();
      // No anchor claim needs clearing: the Trust Anchor binding is
      // device-local per project (work document #27), so a scratch
      // project's self-assignment cannot shadow the invited project
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
