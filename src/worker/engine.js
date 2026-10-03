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
import { createProjectDoc } from "../crdt/ProjectDoc.js";
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
  const doc = createProjectDoc(options.name ?? "Untitled project");
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

  // Persist the document when IndexedDB is available (browser worker).
  if (typeof globalThis.indexedDB !== "undefined") {
    try {
      const persistence = bindDocumentPersistence(doc, "noflo-project");
      whenPersisted(persistence).then(() => {
        // The Engine drives CRDT schema migrations after loading
        migrateLoadedProject(doc);
        syncFullState(doc, io);
      });
    } catch (err) {
      console.error("Document persistence failed:", err);
      syncFullState(doc, io);
    }
  } else {
    syncFullState(doc, io);
  }

  // Mesh sync (work document #21): Engine-owned configuration over its own
  // storage; disabled until the Glass configures it. CONFIG-family messages
  // are handled here instead of the dispatcher graph — they concern the
  // Engine's own peripherals, not the CRDT
  const meshStorage =
    typeof globalThis.indexedDB !== "undefined"
      ? createIndexeddbStorage("noflo-mesh", "config")
      : createMemoryStorage();
  const mesh = await createMeshSync({
    doc,
    postMessage: io.postMessage,
    storage: meshStorage,
  });

  // Swap the plain socket forwarder for the mesh-aware router
  routeMessage = (message) => {
    if (message?.type === "MESH") {
      if (message.command === "configure") {
        mesh
          .handleConfigure(message.payload)
          .catch((err) => console.error("Mesh configuration failed:", err));
      } else if (message.command === "status") {
        io.postMessage({
          kind: "mesh-config",
          config: mesh.config,
          identityHash: mesh.identityHash,
          // Interface configuration schemas come from the interface classes
          // themselves; the settings UI renders forms from them
          interfaceSchemas: {
            websocket: WebSocketClientInterface.getConfigurationSchema(),
          },
        });
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
