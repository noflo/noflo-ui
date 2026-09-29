/**
 * @file The Engine ("The Brain"): the Web Worker that owns the project CRDT
 * and processes Glass messages through the NoFlo dispatcher graph.
 *
 * SPEC "Worker Internals & Resilience": the supervisor on the main thread
 * monitors the heartbeat emitted here and respins the worker when it dies.
 */

import noflo from "../../vendor/noflo.js";

/** NoFlo's shipped types omit the default export; the runtime API is stable. */
const NoFlo = /** @type {any} */ (noflo);

import { createEngineState } from "../crdt/EngineCore.js";
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

const HEARTBEAT_INTERVAL_MS = 10_000;

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
  io.registerMessageHandler((message) => {
    socket.send(message);
  });

  const startedAt = Date.now();
  const heartbeat = setInterval(() => {
    io.postMessage({
      protocol: "system",
      command: "heartbeat",
      payload: { status: "ok", uptime: Date.now() - startedAt },
    });
  }, HEARTBEAT_INTERVAL_MS);

  // Mirror every CRDT update to the Glass so its read replica stays in sync
  doc.on("update", (update) => {
    io.postMessage({ kind: "y-update", update });
  });

  // Persist the document when IndexedDB is available (browser worker). The
  // Glass waits for the synced signal before its first render.
  if (typeof globalThis.indexedDB !== "undefined") {
    try {
      const persistence = bindDocumentPersistence(doc, "noflo-project");
      whenPersisted(persistence).then(() => {
        // The Engine drives CRDT schema migrations after loading
        migrateLoadedProject(doc);
        io.postMessage({ kind: "y-synced" });
      });
    } catch (err) {
      console.error("Document persistence failed:", err);
      io.postMessage({ kind: "y-synced" });
    }
  } else {
    io.postMessage({ kind: "y-synced" });
  }

  return {
    doc,
    stop() {
      clearInterval(heartbeat);
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
