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

import { pushDeltas, RnsSyncServer } from "../../vendor/dacar.js";
import { fromHex, Identity, toHex } from "../../vendor/reticulum-core.js";
import { ReticulumProvider } from "../../vendor/y-reticulum.js";
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
import { listWalletGrants, saveWalletGrant } from "./DacarWallet.js";

/** How long the joiner waits for the pushed grant to authorize it. */
const GRANT_WAIT_MS = 30_000;

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
 * Default provider factory: a provider bound to the room on the SHARED
 * Reticulum instance (owned by the mesh layer, so the bootstrap pre-flow and
 * the sync phase share one transport — work document #25).
 *
 * @param {import("../crdt/MeshConfig.js").MeshConfig} config
 * @param {InstanceType<typeof Identity>} identity
 * @param {import("yjs").Doc} doc
 * @param {string} room
 * @param {{ isGranted: (peerHash: string) => boolean, isInRequesterMode: () => boolean, onRefused: (refusals: any[]) => void }} access
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
    // Dacar gate: peers with a non-revoked grant may sync; devices in
    // requester mode (empty grants, fresh join) may dial so the owner sees
    // the access request. Ignored by y-reticulum versions without the hook.
    linkPolicy: (/** @type {any} */ context) => {
      const allowed =
        access.isInRequesterMode() ||
        access.isGranted(context.remoteIdentityHash);
      console.info(
        `[mesh] linkPolicy: peer …${context.remoteIdentityHash?.slice(-12) ?? "unidentified"}, ${context.initiator ? "initiator" : "responder"}, ${allowed ? "ALLOW" : "REFUSE"}`,
      );
      return allowed;
    },
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
 * @property {(uri: string, hooks?: { onApproved?: (project: any) => Promise<void> | void }) => Promise<void>} startBootstrapJoin
 *   Runs the joiner state machine (work document #25 §5.1) against the
 *   invited host; the handoff routes through `onApproved`.
 * @property {(hooks?: { onApproved?: (project: any) => Promise<void> | void }) => Promise<boolean>} resumePendingInvite
 *   Re-runs a persisted pending invite (resume on reload); false when none
 *   is stored.
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
 *   createProvider?: (config: import("../crdt/MeshConfig.js").MeshConfig, identity: InstanceType<typeof Identity>, doc: import("yjs").Doc, room: string, access: { isGranted: (peerHash: string) => boolean, isInRequesterMode: () => boolean, onRefused: (refusals: any[]) => void }, reticulum: any) => Promise<any>,
 *   awarenessThrottleMs?: number,
 *   roomFor?: () => string,
 *   autostart?: boolean,
 *   onApproved?: () => void,
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
  onApproved,
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
  // Local Dacar wallet (work document #25 §5.2): its own IndexedDB store
  // (`dacar_grants`), falling back to the caller's storage where IndexedDB
  // is unavailable (tests, non-browser runtimes)
  const walletStorage =
    typeof globalThis.indexedDB !== "undefined"
      ? createIndexeddbStorage("noflo-dacar", "dacar_grants")
      : storage;
  // Approval watcher (work document #21): when the grants map gains a grant
  // for this device's identity hash, the owner has approved this device's
  // join request — surfaced through onApproved so the Engine can materialize
  // the project.
  /** @type {boolean} */
  let approvalFired = false;
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
  /** Pushes received before the node was configured, replayed after. */
  /** @type {Uint8Array[]} */
  const pendingPushes = [];
  /** The last delta batch a peer pushed to this device (§11), base64. */
  let lastPushedBatch = "";

  /**
   * Fires the Engine's approval callback once this device's own grant is
   * authorized by the Dacar state (the handed-off grant, or a grant synced
   * from the owner).
   */
  function notifyApprovalIfGranted() {
    if (approvalFired || !identityHash || !isGranted(identityHash)) return;
    approvalFired = true;
    onApproved?.();
  }
  // Dacar grant lifecycle (work document #25 §6.2, §7): reconcile the
  // grants map into the Dacar node state as entries arrive, and let the
  // anchor countersign plain grants written through the Glass intents.
  // Observer failures must never propagate into the Yjs transaction that
  // triggered them (a throw here would abort persistence commits)
  doc.getMap?.("grants")?.observe(() => {
    try {
      reconcileDacarState()
        .then(() => notifyApprovalIfGranted())
        .catch((/** @type {any} */ err) =>
          console.warn("Dacar reconcile failed:", err?.message ?? err),
        );
      notifyApprovalIfGranted();
    } catch (err) {
      console.warn(
        "Grants observer failed:",
        /** @type {any} */ (err)?.message ?? err,
      );
    }
  });
  // A Trust Anchor change (transfer, work document #25 §2.4) invalidates
  // every verification: grants from the previous anchor no longer authorize
  let lastSeenAnchorHash = "";
  doc.getMap?.("metadata")?.observe(() => {
    try {
      const anchorHash = trustAnchorHash();
      if (anchorHash === lastSeenAnchorHash) return;
      lastSeenAnchorHash = anchorHash;
      invalidateDacarState();
      reconcileDacarState()
        .then(() => notifyApprovalIfGranted())
        .catch((/** @type {any} */ err) =>
          console.warn("Dacar reconcile failed:", err?.message ?? err),
        );
    } catch (err) {
      console.warn(
        "Metadata observer failed:",
        /** @type {any} */ (err)?.message ?? err,
      );
    }
  });
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
      } catch (err) {
        // Surfaced: why the persisted identity could not be reused
        console.warn(
          "Mesh: stored identity could not be restored, regenerating:",
          /** @type {any} */ (err)?.message ?? err,
        );
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
   * Hex hash of the project's designated Trust Anchor (work document #25
   * §2.2), from the project metadata. Empty until a device has claimed it.
   *
   * @returns {string}
   */
  function trustAnchorHash() {
    return String(doc.getMap?.("metadata")?.get("trust_anchor_hash") ?? "");
  }

  /**
   * Default ownership (work document #25 §2.4): the first device to bind a
   * fresh project assigns its own Reticulum identity as the project Trust
   * Anchor. An invited device never claims the anchor — the host's anchor
   * arrives through the synced metadata or the bootstrap handoff.
   */
  function ensureTrustAnchor() {
    const metadata = doc.getMap?.("metadata");
    if (!metadata || config.joinedViaInvite) return;
    if (!metadata.get("trust_anchor_hash") && identityHash) {
      metadata.set("trust_anchor_hash", identityHash);
    }
  }

  /**
   * Authority (work document #25 §2.2): this device may mint grants iff it
   * holds the project Trust Anchor's private key. The default anchor is the
   * owner's own mesh identity, so ownership is an identity-hash match; a
   * device holding only the public anchor (a participant) cannot sign
   * assertions.
   *
   * @returns {boolean}
   */
  function hasAuthority() {
    return identityHash !== "" && trustAnchorHash() === identityHash;
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
   * @param {string} projectId
   * @returns {string}
   */
  const dacarNodeConfigKey = (projectId) => `dacar-node:${projectId}`;

  /**
   * Learns the anchor pubkey and salt from a grants-map entry whose claimed
   * anchor matches the project's designated Trust Anchor hash. The binding
   * is safe: a forged pubkey cannot collide the 16-byte truncated hash, and
   * verify-on-ingest refuses deltas its pubkey does not authenticate.
   *
   * @param {string} anchorHash
   * @returns {{ salt: string, anchorHash: string, anchorPubkey: string } | null}
   */
  function learnNodeConfigFromGrants(anchorHash) {
    const grants = doc.getMap?.("grants");
    if (!grants) return null;
    for (const entry of grants.values()) {
      const plain = entry.toJSON();
      const authorization = plain.authorization;
      if (plain.revoked !== null || !authorization?.anchor) continue;
      if (authorization.anchor.hash !== anchorHash) continue;
      if (
        typeof authorization.salt === "string" &&
        /^[0-9a-f]{64}$/.test(authorization.salt) &&
        /^[0-9a-f]{128}$/.test(authorization.anchor.pubkey ?? "")
      ) {
        return {
          salt: authorization.salt,
          anchorHash,
          anchorPubkey: authorization.anchor.pubkey,
        };
      }
    }
    return null;
  }

  /**
   * Returns the live Dacar node for the project, building (or rebuilding,
   * after a Trust Anchor transfer) it from the stored node config — the
   * anchor's own device mints its config, joiners receive it in the
   * bootstrap handoff (§2.3, §10), and peers learn it from verified
   * grants-map entries. Null while the project id, designated anchor, or
   * salt/pubkey pair is unknown.
   *
   * @returns {Promise<ReturnType<typeof createDacarNode> | null>}
   */
  async function ensureDacarNode() {
    const metadata = doc.getMap?.("metadata");
    const projectId = String(metadata?.get("id") ?? "");
    const anchorHash = trustAnchorHash();
    if (!projectId || !anchorHash) return null;
    if (
      dacarNode &&
      dacarNodeAnchorHash === anchorHash &&
      dacarNodeProjectId === projectId
    ) {
      return dacarNode;
    }
    /** @type {{ salt: string, anchorHash: string, anchorPubkey: string } | null} */
    let nodeConfig = null;
    try {
      const stored = await storage.get(dacarNodeConfigKey(projectId));
      if (
        stored &&
        stored.anchorHash === anchorHash &&
        typeof stored.salt === "string" &&
        typeof stored.anchorPubkey === "string"
      ) {
        nodeConfig = stored;
      }
    } catch {
      // Learn below
    }
    if (!nodeConfig) {
      nodeConfig = learnNodeConfigFromGrants(anchorHash);
    }
    if (!nodeConfig && hasAuthority()) {
      // This device IS the anchor: it holds the private key and mints the
      // project's salt (work document #25 §2.2, §2.3)
      nodeConfig = {
        anchorHash,
        anchorPubkey: toHex(await (await ensureIdentity()).getPublicKey()),
        salt: await ensureDacarSalt(projectId),
      };
    }
    if (!nodeConfig) return null;
    await storage
      .set(dacarNodeConfigKey(projectId), nodeConfig)
      .catch(() => {});
    dacarNode = createDacarNode();
    dacarNode.configure({
      anchorHashHex: nodeConfig.anchorHash,
      anchorPubkeyHex: nodeConfig.anchorPubkey,
      salt: nodeConfig.salt,
    });
    dacarNodeAnchorHash = anchorHash;
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
  function isGranted(peerHash) {
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
   * - plain grants (written through the Glass permission intents) are
   *   countersigned by the anchor so peers can verify them too;
   * - verdicts land in the granted cache for synchronous policy checks.
   *
   * The grants and metadata observers re-run this pass on every change.
   *
   * @returns {Promise<void>}
   */
  async function reconcileDacarState() {
    if (reconciling) return;
    reconciling = true;
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
        }
      }
      // Replay pushes that arrived before the node was configured
      if (pendingPushes.length > 0) {
        const buffered = pendingPushes.splice(0);
        for (const data of buffered) {
          await node.ingestDeltas(data).catch(() => 0);
        }
      }
      // Plain grants: the anchor countersigns them so every peer can verify
      for (const entry of [...grants.values()]) {
        const plain = entry.toJSON();
        if (plain.revoked !== null || plain.authorization) continue;
        if (
          hasAuthority() &&
          plain.peerHash !== identityHash &&
          ROLE_PERMISSIONS[plain.role]
        ) {
          await mintPeerAuthorization(plain.peerHash, projectId, plain.role);
        }
      }
      // Ingest authorization entries not yet in the Dacar state
      for (const [id, entry] of grants.entries()) {
        const plain = entry.toJSON();
        if (plain.revoked !== null) {
          entryStatuses.set(id, "revoked");
          continue;
        }
        if (!plain.authorization) {
          entryStatuses.set(id, "unsigned");
          continue;
        }
        const fingerprint = authorizationFingerprint(plain.authorization);
        if (ingestedEntries.get(id) === fingerprint) continue;
        ingestedEntries.set(id, fingerprint);
        await node.ingestAuthorization(plain.authorization);
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
        } else if (!plain.authorization) {
          entryStatuses.set(id, "unsigned");
        } else if (!node.isConfigured()) {
          entryStatuses.set(id, "pending");
        } else if (grantedCache.get(plain.peerHash) === true) {
          entryStatuses.set(id, "verified");
        } else {
          entryStatuses.set(id, "refused");
        }
      }
      await reportDacarState(grants, projectId);
    } finally {
      reconciling = false;
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
      notifyApprovalIfGranted();
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
      receiver: dacarPushReceiver,
      rns,
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
        sharedRns?.transport?.unbindLocalDestination?.(destination);
        sharedRns?.deregisterDestination?.(destination);
      } catch {
        // Best-effort teardown
      }
    }
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
    if (!projectId || !hasAuthority()) return;
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

  /**
   * Returns the shared Reticulum instance, creating it (and connecting the
   * enabled WebSocket interfaces) on first use.
   *
   * @returns {Promise<any>}
   */
  async function ensureReticulum() {
    if (sharedRns) return sharedRns;
    const { Reticulum, WebSocketClientInterface } = await import(
      "../../vendor/reticulum-core.js"
    );
    const rns = new Reticulum();
    try {
      for (const iface of config.interfaces) {
        if (!iface.enabled) continue;
        if (iface.type === "websocket") {
          const client = new WebSocketClientInterface(iface.options ?? {});
          await client.connect();
          rns.addInterface(client, true);
        } else {
          console.warn(
            `Mesh interface type ${iface.type} is not available in the browser worker; skipped`,
          );
        }
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

  /** Stops and discards the shared Reticulum instance. */
  async function releaseReticulum() {
    if (!sharedRns) return;
    const rns = sharedRns;
    sharedRns = null;
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
          /** @type {string} */ joinerHash,
          /** @type {any} */ authorization,
        ) => {
          // §11 direct-link Delta push to the joiner's `dacar.sync.v1`
          // endpoint; a lost or refused push is recovered by the joiner's
          // CRDT sync, which carries the same grants-map entry
          const results = await pushDeltas(
            [base64ToBytes(authorization.deltas)],
            fromHex(joinerHash),
            { rns: reticulum },
          );
          if (!results[0]) {
            console.warn(
              "Dacar delta push not applied; the grants map will recover the grant",
            );
          }
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
   * invited host, then applies the handoff: the Engine adopts the invited
   * project identity (through `onApproved`), and the handed-off grant is
   * written into the local grants map — which triggers the Engine's existing
   * approval watcher and materializes the project.
   *
   * @param {string} uri Invite URI (`noflo://join/<hash>/<token>`).
   * @param {{ onApproved?: (project: any) => Promise<void> | void }} [hooks]
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
          postMessage({ kind: "mesh-bootstrap", stage });
        },
      });
      if (response.status === "declined") {
        // Declined joins halt without auto-retry (work document #25 §5.1)
        await storage.set("pendingInviteUri", "").catch(() => {});
        postMessage({
          kind: "mesh-bootstrap",
          stage: "declined",
          reason: response.reason,
        });
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
      if (!nodeConfig?.anchor?.hash || !nodeConfig.salt || !invitedProjectId) {
        await storage.set("pendingInviteUri", "").catch(() => {});
        postMessage({
          kind: "mesh-bootstrap",
          stage: "declined",
          reason: "invalid_authorization",
        });
        postMessage({
          kind: "mesh-status",
          error: "Join failed: handoff carried no Dacar node config",
        });
        return;
      }
      // Hand the project identity to the Engine first — the grant write
      // below triggers the Engine's approval watcher, which must see the
      // pending invite by then
      await hooks.onApproved?.(response.project ?? {});
      // Provision the local Dacar node (§2.3): the anchor config gates every
      // later verification, and the metadata anchor keeps peers that sync
      // later on the same trust boundary
      await storage
        .set(dacarNodeConfigKey(invitedProjectId), {
          salt: nodeConfig.salt,
          anchorHash: nodeConfig.anchor.hash,
          anchorPubkey: nodeConfig.anchor.pubkey,
        })
        .catch(() => {});
      const metadata = doc.getMap?.("metadata");
      if (metadata && !metadata.get("trust_anchor_hash")) {
        metadata.set("trust_anchor_hash", nodeConfig.anchor.hash);
      }
      invalidateDacarState();
      // Wait for the pushed grant to authorize this device through the
      // Dacar Engine before materializing anything locally
      const grantDeadline = Date.now() + GRANT_WAIT_MS;
      for (;;) {
        const node = await ensureDacarNode().catch(() => null);
        if (
          node &&
          (await node.evaluate(invitedProjectId, "sync", identityHash)) === true
        ) {
          break;
        }
        if (Date.now() > grantDeadline) {
          throw new Error("joiner grant not received before timeout");
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      // Reconstruct the grant record from Dacar ground truth: the deltas
      // that granted us plus the permissions the Engine actually allows
      /** @type {string[]} */
      const grantedPermissions = [];
      for (const permission of ["sync", "write"]) {
        if (
          (await dacarNode?.evaluate(
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
      // Catalog in the wallet (§5.2) and write the verified grant into the
      // grants map — which triggers the approval watcher and materializes
      // the project
      await writeGrantedAssertion(
        identityHash,
        grantedPermissions.includes("write") ? "developer" : "observer",
        authorization,
      );
      await saveWalletGrant(walletStorage, {
        projectId: invitedProjectId,
        authorization,
      }).catch(() => {});
      await storage.set("pendingInviteUri", "").catch(() => {});
      postMessage({
        kind: "mesh-bootstrap",
        stage: "approved",
        project: response.project ?? null,
      });
    } catch (err) {
      const reason = /** @type {any} */ (err)?.message ?? err;
      postMessage({ kind: "mesh-bootstrap", stage: "failed", error: reason });
      postMessage({
        kind: "mesh-status",
        error: `Join failed: ${reason}`,
      });
    }
  }

  async function start() {
    console.info(
      `Mesh start called: enabled=${config.enabled}, hasProvider=${Boolean(provider)}, identityError=${identityError || "none"}, room=${roomFor()}, interfaces=${config.interfaces.length}, requesterMode=${isInRequesterMode()}, identityHash=${identityHash ?? "none"}`,
    );
    if (!config.enabled || provider || identityError) return;
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
      // Default ownership (work document #25 §2.4): a fresh project gets
      // this device's identity as its Trust Anchor; invited devices wait
      // for the host's anchor instead
      ensureTrustAnchor();
      // The anchor signs itself like any other peer, so authorization is
      // uniform across devices (work document #25 §2.2)
      await ensureSelfAuthorization();
      // Reconcile entries already in the restored document: observers only
      // fire on changes, so a persisted grants map needs a first pass
      await reconcileDacarState().catch(() => {});
      notifyApprovalIfGranted();
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
      provider = await createProvider(
        config,
        identity,
        doc,
        room,
        {
          isGranted,
          isInRequesterMode,
          onRefused: (/** @type {any[]} */ refusals) => {
            for (const refusal of refusals) {
              if (!refusal?.identityHash) continue;
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
      );
    } catch (err) {
      provider = null;
      // No ghost transport may outlive a failed provider start
      await releaseReticulum();
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
    // Announce diagnostics: log when the room's destination announces and
    // when an announce from another room member arrives. This confirms
    // whether the entry point propagates announces between peers.
    const roomDest = provider.room?.dest;
    if (roomDest) {
      roomDest.addEventListener("announce", () => {
        console.info(`[mesh] announced room destination ${room.slice(-12)}`);
      });
    }
    provider.room?.rns?.transport?.addEventListener(
      "announce",
      (/** @type {any} */ event) => {
        // Temporary: log ALL received announces with their nameHash so we
        // can see exactly what the transport receives and what gets
        // filtered. Remove once the join flow is stable.
        if (!provider) return;
        const detail = event.detail ?? {};
        const nameHash = detail.nameHash ? toHex(detail.nameHash) : "none";
        const identityHash = detail.identity
          ? toHex(detail.identity.getSalt())
          : "unidentified";
        const roomNameHash = provider.room?.dest?.nameHash
          ? toHex(provider.room.dest.nameHash)
          : "none";
        console.info(
          `[mesh] announce: nameHash=${nameHash} identity=${identityHash} room=${roomNameHash} match=${nameHash === roomNameHash}`,
        );
      },
    );
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
    // Host side of the bootstrap pre-flow: invite others once the sync
    // provider is live (work document #25)
    await startBootstrapHost();
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
    // Bootstrap host and shared transport end with the provider: exactly
    // one teardown per provider lifetime (ghost-connection rule)
    await stopBootstrapHost();
    await stopDacarSyncServer();
    await releaseReticulum();
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
     * @param {{ onApproved?: (project: any) => Promise<void> | void }} [hooks]
     */
    async startBootstrapJoin(uri, hooks = {}) {
      await runBootstrapJoin(uri, hooks);
    },
    /**
     * Re-runs a persisted pending invite (resume on reload, work document
     * #25 plan item 3); false when no pending invite is stored.
     *
     * @param {{ onApproved?: (project: any) => Promise<void> | void }} [hooks]
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
