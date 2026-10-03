/**
 * @file The Engine ("The Brain"): the Web Worker that owns the project CRDT
 * and processes Glass messages through the NoFlo dispatcher graph.
 *
 * SPEC "Worker Internals & Resilience": the supervisor on the main thread
 * monitors the heartbeat emitted here and respins the worker when it dies.
 */

import noflo from "../../vendor/noflo.js";
import { WebSocketClientInterface } from "../../vendor/reticulum-core.js";
import * as Y from "../../vendor/yjs.js";

/** NoFlo's shipped types omit the default export; the runtime API is stable. */
const NoFlo = /** @type {any} */ (noflo);

import { createEngineState } from "../crdt/EngineCore.js";
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
  registerEngineComponents,
} from "../graphs/engine-dispatch.js";
import { createMeshSync } from "./MeshSync.js";

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
 * @param {{ name?: string }} [options]
 * @returns {Promise<{ doc: import("yjs").Doc, stop: () => void }>}
 */
export async function startEngine(io, options = {}) {
  // Project-scoped persistence (work document #21): the device keeps an
  // active-project pointer in its engine-owned storage; the project document
  // loads from and persists to its own IndexedDB store keyed by the project
  // id. Joining a project by invite materializes it as a new project here.
  const meshStorage =
    typeof globalThis.indexedDB !== "undefined"
      ? createIndexeddbStorage("noflo-mesh", "config")
      : createMemoryStorage();
  const storedProjectId = await meshStorage
    .get("activeProjectId")
    .catch(() => null);
  const doc = createProjectDoc(options.name ?? "Untitled project");
  if (typeof storedProjectId === "string" && storedProjectId) {
    adoptProjectIdentity(doc, storedProjectId);
  }
  const projectId = doc.getMap("metadata").get("id");
  const state = createEngineState();

  const loader = new NoFlo.ComponentLoader(".");
  registerEngineComponents(loader);
  const graph = createDispatcherGraph();
  graph.addInitial(doc, "apply", "doc");
  graph.addInitial(state, "apply", "state");
  graph.addInitial(io.postMessage, "send", "callback");
  const network = await new NoFlo.createNetwork(graph, {
    componentLoader: loader,
  });

  const gateway = network.getNode("gateway");
  const socket = NoFlo.internalSocket.createSocket();
  /** @type {any} */ (gateway.component.inPorts).in.attach(socket);
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
    syncFullState(doc, io);
    mesh
      ?.rebind()
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
          onProjectLoaded();
        }
      })
      .catch((err) => {
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
      // Devices without a pointer read the pre-scoped fixed store once, then
      // move the project into its own scoped store
      legacyLoad = !storedProjectId;
      bindProjectPersistence(
        legacyLoad ? "noflo-project" : `noflo-project-${projectId}`,
      );
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
    roomFor: projectRoom,
    // With persistence, wait for the stored project id before binding
    autostart: typeof globalThis.indexedDB === "undefined",
  });
  if (projectLoaded) {
    // The project load beat the mesh boot: bind now
    mesh
      .rebind()
      .catch((/** @type {any} */ err) =>
        console.error("Mesh rebinding failed:", err),
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
      room: mesh.room,
      // Interface configuration schemas come from the interface classes
      // themselves; the settings UI renders forms from them
      interfaceSchemas: {
        websocket: WebSocketClientInterface.getConfigurationSchema(),
      },
    });
  };

  /**
   * Joins a project by invite (work document #21). The invited project
   * materializes as a new project in this device's IndexedDB — its own
   * project-scoped store — unless the device already has the matching
   * project id, in which case the invite is a no-op. Refused for local
   * projects with different ids that already have content: two projects
   * merged would interleave their graphs.
   *
   * @param {any} payload
   */
  const joinProject = (payload) => {
    const room = String(payload?.room ?? "").trim();
    const prefix = "noflo-ui:";
    const invitedId = room.startsWith(prefix)
      ? room.slice(prefix.length)
      : room;
    if (!invitedId) {
      io.postMessage({
        kind: "mesh-status",
        error: "Join failed: paste an invite (project room)",
      });
      return;
    }
    if (invitedId === projectId) {
      // Already have this project; nothing to adopt
      postMeshConfig();
      return;
    }
    if (doc.getMap("graphs").size > 0) {
      io.postMessage({
        kind: "mesh-status",
        error:
          "Join failed: this device already has project content. Joining would merge two projects.",
      });
      return;
    }
    // Adopt the invited identity, then materialize the project: a fresh
    // project-scoped store (the binding writes the doc state into it), the
    // device pointer, and a mesh rebind into the invited room
    adoptProjectIdentity(doc, invitedId);
    if (persistence) {
      persistence.destroy().catch(() => {});
    }
    if (typeof globalThis.indexedDB !== "undefined") {
      legacyLoad = false;
      bindProjectPersistence(`noflo-project-${invitedId}`);
      meshStorage.set("activeProjectId", invitedId).catch(() => {});
    }
    mesh
      .rebind()
      .then(() => postMeshConfig())
      .catch((/** @type {any} */ err) =>
        io.postMessage({
          kind: "mesh-status",
          error: `Join failed: ${err?.message ?? err}`,
        }),
      );
  };

  // Swap the plain socket forwarder for the mesh-aware router
  routeMessage = (message) => {
    if (message?.type === "MESH") {
      if (message.command === "configure") {
        mesh
          .handleConfigure(message.payload)
          .then(() => postMeshConfig())
          .catch((/** @type {any} */ err) =>
            console.error("Mesh configuration failed:", err),
          );
      } else if (message.command === "status") {
        postMeshConfig();
      } else if (message.command === "join") {
        joinProject(message.payload);
      } else if (message.command === "resolveRequest") {
        mesh.resolveJoinRequest(message.payload?.identityHash);
      } else if (message.command === "importIdentity") {
        mesh
          .handleImportedIdentity(message.payload?.identity)
          .then(() => postMeshConfig())
          .catch((/** @type {any} */ err) =>
            console.error("Identity import failed:", err),
          );
      }
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

  return {
    doc,
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
