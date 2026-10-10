/**
 * @file The Engine ("The Brain"): the Web Worker that owns the project CRDT
 * and processes Glass messages through the NoFlo dispatcher graph.
 *
 * SPEC "Worker Internals & Resilience": the supervisor on the main thread
 * monitors the heartbeat emitted here and respins the worker when it dies.
 */

import { createNetwork, internalSocket } from "../../vendor/noflo.js";
import { WebSocketClientInterface } from "../../vendor/reticulum-core.js";
import * as Y from "../../vendor/yjs.js";

import {
  createEngineState,
  refreshDerivedSignatures,
} from "../crdt/EngineCore.js";
import {
  createIndexeddbStorage,
  createMemoryStorage,
} from "../crdt/MeshConfig.js";
import { adoptProjectIdentity, createProjectDoc } from "../crdt/ProjectDoc.js";
import {
  bindDocumentPersistence,
  migrateLoadedProject,
  whenPersisted,
} from "../crdt/ProjectPersistence.js";
import {
  createDispatcherGraph,
  createEngineRegistry,
  wireEngineContext,
} from "../graphs/engine-dispatch.js";
import { probeX25519Support } from "../shims/x25519-subtle.js";
import { parseInviteUri } from "./Bootstrap.js";
import { listNofloDatabases, performFactoryReset } from "./FactoryReset.js";
import { attachInterfaces } from "./interfaces.js";
import { createMeshSync } from "./MeshSync.js";
import { routeMeshCommand } from "./mesh-commands.js";
import { progress } from "./Progress.js";

const HEARTBEAT_INTERVAL_MS = 10_000;

/**
 * Sends the full document state to the Glass. Applied on a fresh replica, it
 * establishes clock contiguity so subsequent incremental `y-update` messages
 * integrate.
 *
 * @param {import("yjs").Doc} doc
 * @param {{ postMessage: (message: any) => void }} io
 */
function syncFullState(doc, io) {
  io.postMessage({ kind: "y-sync", update: Y.encodeStateAsUpdate(doc) });
}

/**
 * Starts the engine. Kept as a pure async function so integration tests can
 * drive it without a real Worker global.
 *
 * @param {{
 *   postMessage: (message: any) => void,
 *   registerMessageHandler: (handler: (message: any) => void) => void,
 * }} io Injection point for the Worker messaging surface.
 * @param {{ name?: string, meshStorage?: import("../crdt/MeshConfig.js").AsyncStorage, attachInterfaces?: (rns: any, interfaces: any[]) => Promise<void>, reticulum?: any }} [options]
 *   `meshStorage` injects the Engine-owned mesh configuration storage —
 *   used by tests to share device state across simulated reloads.
 *   `attachInterfaces` overrides the browser interface wiring — the Node
 *   bridge injects its own (work document #44).
 * @returns {Promise<{ doc: import("yjs").Doc, stop: () => void, handle: (message: any) => void, getReticulum: () => any }>}}
 *   `handle` is the headless seam (work document #44): the same
 *   Dacar-checked dispatch the browser reaches over postMessage, callable
 *   directly by Node entries.
 */
export async function startEngine(io, options = {}) {
  // WebKit ships Ed25519 but not X25519 in WebCrypto: intercept X25519
  // operations with the first-party RFC 7748 implementation. No-op on
  // runtimes with full support.
  await probeX25519Support();
  // Project-scoped persistence (work document #21): the device keeps an
  // active-project pointer in its engine-owned storage; the project document
  // loads from and persists to its own IndexedDB store keyed by the project
  // id. Joining a project by invite materializes it as a new project here.
  /** @type {any} */ const meshStorage =
    options.meshStorage ??
    (typeof globalThis.indexedDB !== "undefined"
      ? createIndexeddbStorage("noflo-mesh", "config")
      : createMemoryStorage());
  const storedProjectId = await meshStorage
    .get("activeProjectId")
    .catch(() => null);
  // A pending bootstrap invite survives reloads (work document #25 plan
  // item 3): the joiner re-dials the host, which answers idempotently
  const storedPendingInviteUri = await meshStorage
    .get("pendingInviteUri")
    .catch(() => null);
  const hasPendingInvite =
    !storedProjectId &&
    typeof storedPendingInviteUri === "string" &&
    parseInviteUri(storedPendingInviteUri) !== null;
  const doc = createProjectDoc(options.name ?? "Untitled project");
  if (typeof storedProjectId === "string" && storedProjectId) {
    adoptProjectIdentity(doc, storedProjectId);
  }
  const projectId = doc.getMap("metadata").get("id");
  const state = createEngineState();

  const graph = createDispatcherGraph();
  const network = await createNetwork(graph, {
    registry: createEngineRegistry(),
  });
  wireEngineContext(network, {
    doc,
    state,
    callback: io.postMessage,
  });

  const gateway = network.getNode("gateway");
  if (!gateway?.component) {
    throw new Error("Engine dispatcher lost its gateway");
  }
  const socket = internalSocket.createSocket();
  gateway.component.inPorts.in.attach(socket);
  // Single mutable delegate: the mesh-aware router replaces the plain socket
  // forwarder once mesh sync has booted
  let routeMessage = (/** @type {any} */ message) => {
    socket.send(message);
  };
  io.registerMessageHandler((message) => {
    routeMessage(message);
  });
  const startedAt = Date.now();
  const heartbeat = setInterval(() => {
    io.postMessage({
      protocol: "system",
      command: "heartbeat",
      payload: { status: "ok", uptime: Date.now() - startedAt },
    });
  }, HEARTBEAT_INTERVAL_MS);

  // Mirror every CRDT update to the Glass so its read replica stays in sync.
  // Incremental updates alone can never converge a fresh replica: the document
  // state starts before the listener attaches (project metadata) and grows
  // through persisted loads, so Yjs clock contiguity requires a full-state
  // sync first (the same reason yjs sync protocols exchange state on connect).
  doc.on("update", (update) => {
    io.postMessage({ kind: "y-update", update });
  });

  /**
   * Runs after a persistence binding has loaded the project: migrations,
   * full-state sync to the Glass, and a mesh rebind (the room derives from
   * the project identity, which may just have been restored or adopted).
   */
  // The project load and the mesh boot race (both wait on IndexedDB): if the
  // load wins, the mesh rebind runs once the mesh exists
  /** @type {any} */
  let mesh = null;
  let projectLoaded = false;
  const onProjectLoaded = () => {
    projectLoaded = true;
    migrateLoadedProject(doc);
    // Derived signatures are engine-computed state: re-derive them at load
    // so interfaces written by older engines (e.g. name-only, pre-datatype
    // inheritance) come back in step with their graphs (work document #29)
    refreshDerivedSignatures(doc);
    syncFullState(doc, io);
    mesh
      ?.rebind()
      .then(() => {
        io.postMessage(progress("project.bind", "rebind", "done"));
        postMeshConfig();
      })
      .catch((/** @type {any} */ err) =>
        console.error("Mesh rebinding failed:", err),
      );
  };

  /**
   * Binds project-scoped persistence for the given store name.
   *
   * @param {string} storeName
   */
  const bindProjectPersistence = (storeName) => {
    io.postMessage(progress("persistence.load", "load", "running"));
    persistence = bindDocumentPersistence(doc, storeName);
    whenPersisted(persistence)
      .then(() => {
        if (legacyLoad) {
          // First boot after the move to project-scoped stores: the pointer
          // was just adopted from the legacy load. Binding the scoped store
          // writes the doc's current state into it.
          legacyLoad = false;
          meshStorage.set("activeProjectId", projectId).catch(() => {});
          bindProjectPersistence(`noflo-project-${projectId}`);
        } else {
          io.postMessage(progress("persistence.load", "load", "done"));
          onProjectLoaded();
        }
      })
      .catch((err) => {
        io.postMessage(
          progress("persistence.load", "load", "failed", {
            error: /** @type {any} */ (err)?.message ?? String(err),
          }),
        );
        console.error("Document persistence failed:", err);
        syncFullState(doc, io);
      });
  };

  // Persist the document when IndexedDB is available (browser worker).
  /** @type {any} */
  let persistence = null;
  /** Whether this boot still reads the pre-scoped legacy store. */
  let legacyLoad = false;
  if (typeof globalThis.indexedDB !== "undefined") {
    try {
      if (hasPendingInvite) {
        // Pending join: the project store materializes on approval
        legacyLoad = false;
      } else {
        // Devices without a pointer read the pre-scoped fixed store once,
        // then move the project into its own scoped store
        legacyLoad = !storedProjectId;
        bindProjectPersistence(
          legacyLoad ? "noflo-project" : `noflo-project-${projectId}`,
        );
      }
    } catch (err) {
      console.error("Document persistence failed:", err);
      syncFullState(doc, io);
    }
  } else {
    syncFullState(doc, io);
  }

  // Mesh sync (work document #21): Engine-owned configuration over its own
  // storage; disabled until the Glass configures it. The sync room is
  // per-project, derived from the project's CRDT identity — persistence may
  // restore the authoritative id after boot, so the provider binds (and
  // rebinds) only once that identity is known. CONFIG-family messages are
  // handled here instead of the dispatcher graph — they concern the
  // Engine's own peripherals, not the CRDT
  const projectRoom = () =>
    `noflo-ui:${doc.getMap("metadata").get("id") ?? "default"}`;
  mesh = await createMeshSync({
    doc,
    postMessage: io.postMessage,
    storage: meshStorage,
    reticulum: options.reticulum ?? undefined,
    roomFor: projectRoom,
    // With a bound project store, wait for the stored project id before
    // binding; a pending bootstrap invite resumes the join instead of
    // starting the sync provider (the grant has not been handed off yet)
    autostart: !persistence && !hasPendingInvite,
  });
  if (projectLoaded) {
    // The project load beat the mesh boot: bind now
    mesh
      .rebind()
      .then(() => postMeshConfig())
      .catch((/** @type {any} */ err) =>
        console.error("Mesh rebinding failed:", err),
      );
  }
  if (hasPendingInvite) {
    // Resume the interrupted join (work document #25 plan item 3): the
    // host answers idempotently, so the re-dial is safe. The handler is
    // referenced lazily: it is defined further down in the boot sequence.
    mesh
      .resumePendingInvite(joinHooks())
      .catch((/** @type {any} */ err) =>
        console.error("Join resume failed:", err),
      );
  }

  /**
   * Reports the full mesh state to the Glass (config, identity, room, and
   * the interface schemas the settings UI renders forms from).
   */
  const postMeshConfig = () => {
    io.postMessage({
      kind: "mesh-config",
      config: mesh.config,
      identityHash: mesh.identityHash,
      identityError: mesh.identityError,
      room: mesh.room,
      joinRequests: mesh.joinRequests,
      // Interface configuration schemas come from the interface classes
      // themselves; the settings UI renders forms from them
      interfaceSchemas: {
        websocket: WebSocketClientInterface.getConfigurationSchema(),
      },
      // Interfaces the mesh layer attached by default (work document
      // #47's legibility): the settings dialog renders them read-only
      runtimeInterfaces: mesh.getRuntimeInterfaces?.() ?? null,
    });
  };
  // The Glass learns the mesh state proactively at boot: the corner sync
  // panel (work document #28) renders from it without waiting for the
  // settings dialog to be opened
  postMeshConfig();

  /**
   * The join flow's explicit lifecycle hooks (work document #27): the
   * granted path fires them directly — adopt the invited identity, then
   * materialize and rebind — instead of an observer inferring the
   * transitions from grants-map contents. A function declaration so the
   * boot sequence's early resume call can reference it; the hooks close
   * over later-defined handlers that only fire once the join grants.
   *
   * @returns {import("./MeshSync.js").JoinHooks}
   */
  function joinHooks() {
    return {
      onAdopt: (/** @type {any} */ project) => adoptInvitedProject(project),
      onGranted: (/** @type {any} */ project) => {
        const invitedId = String(project?.id ?? "");
        if (!invitedId) return;
        materializePendingProject(invitedId);
        // The mesh room derives from the adopted project identity, so the
        // rebind runs NOW: gating it on the persistence sync would leave the
        // provider on the scratch room forever if the sync stalls (Safari's
        // IndexedDB can). onProjectLoaded runs again once the store syncs,
        // which is harmless (migrations and full-state sync are idempotent)
        onProjectLoaded();
        postMeshConfig();
      },
    };
  }

  /**
   * Applies an approved bootstrap handoff (work document #25 §4.2): adopts
   * the invited project identity and switches the device into invited mode
   * (no self-grant, grants map cleared). The handed-off grant itself is
   * written by the mesh layer right after this resolves, and the granted
   * path materializes the project directly through `onGranted`.
   *
   * @param {any} project Approved handoff payload `{ id, name }`.
   * @returns {Promise<"adopted" | "present" | "refused">}
   *   "adopted" — the identity was adopted; "present" — this device already
   *   holds the project (the join continues, cleanup runs); "refused" — the
   *   device has other project content, joining would merge two projects.
   */
  const adoptInvitedProject = async (project) => {
    const invitedId = String(project?.id ?? "");
    if (!invitedId) return "refused";
    if (invitedId === projectId) {
      // Already have this project; the existing grants stay authoritative
      return "present";
    }
    if (doc.getMap("graphs").size > 0) {
      io.postMessage({
        kind: "mesh-status",
        error:
          "Join failed: this device already has project content. Joining would merge two projects.",
      });
      return "refused";
    }
    adoptProjectIdentity(doc, invitedId);
    if (persistence) {
      persistence.destroy().catch(() => {});
      persistence = null;
    }
    if (typeof globalThis.indexedDB !== "undefined") {
      legacyLoad = false;
    }
    await mesh.handleJoinedViaInvite();
    return "adopted";
  };

  /**
   * Joins a project by invite (work document #25, "Knock and Approve"):
   * runs the joiner state machine against the invited host — path request,
   * bootstrap link, identify, knock — and, on approval, adopts the invited
   * project and materializes it as a new project in this device's
   * IndexedDB. Declines surface their reason; failed links leave the
   * pending invite stored so a reload resumes the join.
   *
   * @param {any} payload
   */
  const joinProject = (payload) => {
    const invite = String(payload?.invite ?? "").trim();
    if (!parseInviteUri(invite)) {
      io.postMessage({
        kind: "mesh-status",
        error: "Join failed: paste an invite (noflo://join/...) URL",
      });
      return;
    }
    mesh
      .startBootstrapJoin(invite, joinHooks())
      .catch((/** @type {any} */ err) =>
        io.postMessage({
          kind: "mesh-status",
          error: `Join failed: ${err?.message ?? err}`,
        }),
      );
  };

  /**
   * Materializes the pending invited project (work document #21): binds the
   * project-scoped persistence store (which adopts the synced document
   * state), sets the device pointer, and clears the pending invite.
   *
   * @param {string} invitedId
   */
  const materializePendingProject = (invitedId) => {
    meshStorage.set("activeProjectId", invitedId).catch(() => {});
    meshStorage.set("pendingInviteUri", "").catch(() => {});
    legacyLoad = false;
    if (typeof globalThis.indexedDB !== "undefined" && !persistence) {
      bindProjectPersistence(`noflo-project-${invitedId}`);
    }
  };

  /**
   * Factory reset (work document #26): wipes this device's local state —
   * mesh config and identity, Dacar wallet and node configs, project
   * stores — and tells the Glass to reload into a fresh boot. Safari
   * blocks deleteDatabase while connections are open, so every connection
   * the Engine owns is closed first and each delete is raced against a
   * timeout.
   */
  async function factoryReset() {
    console.warn("Factory reset: wiping local device state");
    await mesh?.stop().catch(() => {});
    if (persistence) {
      await persistence.destroy().catch(() => {});
      persistence = null;
    }
    meshStorage.close?.();
    /** @type {string[]} */
    const knownNames = ["noflo-mesh", "noflo-dacar", "noflo-project"];
    if (typeof storedProjectId === "string" && storedProjectId) {
      knownNames.push(`noflo-project-${storedProjectId}`);
    }
    if (typeof globalThis.indexedDB !== "undefined") {
      const databaseNames = await listNofloDatabases(
        globalThis.indexedDB,
        knownNames,
      );
      await performFactoryReset({
        indexeddb: globalThis.indexedDB,
        storages: [meshStorage],
        databaseNames,
      });
    }
    // Without IndexedDB (tests, non-browser runtimes) there is nothing
    // persistent to wipe: the reload respins the worker with fresh state
    io.postMessage({ kind: "factory-reset" });
  }

  // Swap the plain socket forwarder for the mesh-aware router
  routeMessage = (message) => {
    if (message?.type === "MESH") {
      routeMeshCommand(
        {
          mesh,
          postMessage: (echo) => io.postMessage(echo),
          postMeshConfig,
          joinProject,
          factoryReset,
        },
        message,
      );
      return;
    }
    if (message?.type === "AWARENESS") {
      // Ephemeral drag telemetry: throttled by the mesh layer, never a CRDT
      // mutation, and meaningless without a live provider
      mesh.handleAwareness(message.payload);
      return;
    }
    socket.send(message);
  };

  // The headless seam (work document #44): the same dispatch the browser
  // reaches over postMessage, callable directly — the Node bridge submits
  // intents and mesh commands through it, Dacar-checked identically
  return {
    doc,
    handle: (/** @type {any} */ message) => routeMessage(message),
    /**
     * The shared Reticulum instance once the mesh started (null before).
     * The Companion's LXMF layer rides the same stack (work document #47).
     *
     * @returns {any}
     */
    getReticulum: () => mesh?.getReticulum() ?? null,
    // eslint-disable-line @typescript-eslint/no-invalid-void-type -- any: the Reticulum type lives in the vendored bundle
    stop() {
      clearInterval(heartbeat);
      mesh.stop().catch(() => {});
      network.stop().catch(() => {});
    },
  };
}

// When running as an actual Worker, wire the global messaging surface.
const selfGlobal = /** @type {any} */ (globalThis).self;
if (
  selfGlobal &&
  typeof selfGlobal.postMessage === "function" &&
  typeof selfGlobal.addEventListener === "function" &&
  typeof selfGlobal.document === "undefined"
) {
  // Surface otherwise-silent worker promise rejections with their stacks
  selfGlobal.addEventListener(
    "unhandledrejection",
    (/** @type {any} */ event) => {
      const reason = event.reason ?? {};
      console.error(
        "Worker unhandled rejection:",
        reason?.stack ?? reason?.message ?? reason,
      );
    },
  );
  startEngine({
    postMessage: (message) => selfGlobal.postMessage(message),
    registerMessageHandler: (handler) => {
      selfGlobal.addEventListener("message", (/** @type {any} */ event) =>
        handler(event.data),
      );
    },
  }).catch((err) => {
    console.error("Engine failed to start:", err);
  });
}
