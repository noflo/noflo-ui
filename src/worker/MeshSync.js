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

import { bytesEqual, Identity, toHex } from "../../vendor/reticulum-core.js";
import { ReticulumProvider } from "../../vendor/y-reticulum.js";
import {
  loadMeshConfig,
  normalizeMeshConfig,
  pickDefaultEntryPoint,
  saveMeshConfig,
} from "../crdt/MeshConfig.js";
import { grantPermission } from "../crdt/ProjectDoc.js";
import {
  buildInviteUri,
  createBootstrapHost,
  generateInviteToken,
  INVITE_TOKEN_TTL_MS,
  isInviteRecordValid,
  joinViaBootstrapInvite,
  parseInviteUri,
} from "./Bootstrap.js";

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
  // Approval watcher (work document #21): when the grants map gains a grant
  // for this device's identity hash, the owner has approved this device's
  // join request — surfaced through onApproved so the Engine can materialize
  // the project.
  /** @type {boolean} */
  let approvalFired = false;
  doc.getMap?.("grants")?.observe(() => {
    if (approvalFired || !identityHash || !isGranted(identityHash)) return;
    approvalFired = true;
    onApproved?.();
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
    // Invited devices never self-grant: their access comes from the owner's
    // approval, synced through the grants map after the link establishes
    if (config.joinedViaInvite) return;
    if (!doc.getMap?.("grants")) return;
    if (!isGranted(ownHash)) {
      grantPermission(doc, ownHash, "developer");
    }
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
    if (config.joinedViaInvite || bootstrapHost || !provider) return;
    const reticulum = provider.room?.rns ?? null;
    if (!reticulum) return;
    const metadata = doc.getMap?.("metadata");
    const projectId = String(metadata?.get("id") ?? "");
    if (!projectId) return;
    try {
      bootstrapHost = await createBootstrapHost({
        reticulum,
        identity: await ensureIdentity(),
        projectId,
        projectName: String(metadata?.get("name") ?? projectId),
        isGranted,
        getGrant: (/** @type {string} */ peerHash) => {
          const grants = doc.getMap?.("grants");
          if (!grants) return null;
          for (const entry of grants.values()) {
            const plain = entry.toJSON();
            if (plain.peerHash === peerHash && plain.revoked === null) {
              return {
                peerHash: plain.peerHash,
                role: plain.role,
                issued: plain.issued,
              };
            }
          }
          return null;
        },
        mintGrant: (/** @type {string} */ peerHash) =>
          grantPermission(doc, peerHash, "developer"),
        hasAuthority: () => !config.joinedViaInvite,
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
      // Approved: hand the project identity to the Engine first — the grant
      // write below triggers the Engine's approval watcher, which must see
      // the pending invite by then
      await hooks.onApproved?.(response.project ?? {});
      const grant = response.grant ?? {};
      if (typeof grant.peerHash === "string" && grant.peerHash) {
        grantPermission(doc, grant.peerHash, "developer");
      }
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
      ensureSelfGrant(identityHash);
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
