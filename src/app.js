/**
 * @file The Glass ("The Body"): the main-thread application shell. Per SPEC,
 * this layer has no write authority over the CRDT — editor interactions are
 * mapped to Appendix A intents for the Engine worker, and authoritative
 * `graph` protocol echoes (mirrored here as CRDT updates) drive rendering.
 */

import { graph } from "noflo";
import * as Y from "yjs";

import { checkEviction } from "./crdt/StorageGuard.js";
import { createTabCoordinator, newTabId } from "./crdt/TabCoordinator.js";
import { FlowEditor } from "./elements/noflo-editor.js";
import { FlowExportedPort } from "./elements/noflo-exported-port.js";
import { FlowIIP } from "./elements/noflo-iip.js";
import { FlowNode } from "./elements/noflo-node.js";
import { FlowRadialMenu } from "./elements/noflo-radial-menu.js";
import { SelectionPills } from "./elements/noflo-selection-pills.js";
import { createIntentMapper } from "./glass/intentMapping.js";
import {
  addEdgeIntent,
  addExportIntent,
  addIIPIntent,
  addNodeIntent,
  createGraphIntent,
  graphParent,
  moveNodeIntent,
  projectGraph,
  removeEdgeIntent,
  removeExportIntent,
  removeIIPIntent,
  removeNodeIntent,
  renameExportIntent,
  updateIIPIntent,
} from "./glass/projectView.js";
import { renderGraphIntoEditor } from "./glass/renderGraph.js";
import { createRouter } from "./glass/router.js";
import { LibraryManager } from "./library/LibraryManager.js";
import { createSupervisor } from "./worker/EngineSupervisor.js";

// Register Web Components
customElements.define("noflo-editor", FlowEditor);
customElements.define("noflo-node", FlowNode);
customElements.define("noflo-radial-menu", FlowRadialMenu);
customElements.define("noflo-selection-pills", SelectionPills);
customElements.define("noflo-iip", FlowIIP);
customElements.define("noflo-exported-port", FlowExportedPort);

/** The graph the Glass currently displays; driven by the URL router. */
let activeGraphId = "main";
const CHANNEL_NAME = "noflo-ui-tabs";
const RENDER_DEBOUNCE_MS = 30;

/** Handler for coordinator traffic, wired by the TabCoordinator wrapper. */
let coordinatorHandler =
  /** @type {((event: { data: any }) => void) | null} */ (null);
/** Handler for mirror protocol traffic, wired by setupCrossTabMirror. */
let mirrorHandler = /** @type {((event: { data: any }) => void) | null} */ (
  null
);

/** @type {Y.Doc} */
let mirrorDoc = new Y.Doc();

/** @type {ReturnType<typeof createRouter> | null} */
let router = null;
/** @type {FlowEditor | null} */
let editor = null;
/** @type {LibraryManager | null} */
let libraryManager = null;
/** @type {ReturnType<typeof createTabCoordinator> | null} */
let coordinator = null;
/** @type {ReturnType<typeof createSupervisor> | null} */
let supervisor = null;
/** @type {BroadcastChannel | null} */
let channel = null;
let isLeader = false;
/** @type {ReturnType<typeof setTimeout> | null} */
let renderTimer = null;

/**
 * Sends an intent to the Engine. Only the leader has write authority; other
 * tabs are read-only observers of the leader's state.
 *
 * @param {any} message
 */
function sendIntent(message) {
  if (!isLeader || !supervisor) {
    console.info("Read-only tab: dropping intent", message.command);
    return;
  }
  supervisor.send(message);
}

/**
 * Adapts a real Worker to the supervisor's messaging interface.
 *
 * @returns {import("./worker/EngineSupervisor.js").WorkerLike}
 */
function spawnEngineWorker() {
  const worker = new Worker("src/worker/engine.js", { type: "module" });
  return {
    postMessage: (/** @type {any} */ message) => worker.postMessage(message),
    onMessage: (/** @type {(event: { data: any }) => void} */ handler) => {
      worker.onmessage = (event) => handler(event);
    },
    terminate: () => worker.terminate(),
  };
}

/**
 * The intent mapper: editor events to Appendix A intents, with queued
 * follow-up intents for brand-new nodes.
 *
 * @type {import("./glass/intentMapping.js").IntentMapper | null}
 */
let intentMapper = null;

/**
 * Applies one engine message to the read replica.
 *
 * @param {any} data
 */
function onEngineMessage(data) {
  if (data?.kind === "y-sync") {
    // Full state: establishes clock contiguity for the incremental stream
    Y.applyUpdate(mirrorDoc, data.update);
  } else if (data?.kind === "y-update") {
    Y.applyUpdate(mirrorDoc, data.update);
  } else {
    console.debug("Engine message (no Glass handling yet):", data);
  }
}

/**
 * Schedules a debounced re-render of the editor from the replica.
 */
function scheduleRender() {
  if (renderTimer !== null) return;
  renderTimer = setTimeout(() => {
    renderTimer = null;
    render().catch((err) => console.error("Render failed:", err));
  }, RENDER_DEBOUNCE_MS);
}

/**
 * Falls back from a graph that no longer exists in the replica (removed
 * while active, or the route pointed at a graph the engine never had). Only
 * kicks in once the replica has any graphs at all — an empty mirror just
 * means the initial sync has not arrived yet.
 */
function resolveActiveGraph() {
  const graphs = mirrorDoc.getMap("graphs");
  if (graphs.size === 0) return;
  if (graphs.has(activeGraphId)) return;
  const parent = graphParent(mirrorDoc, activeGraphId);
  const fallback = parent || "main";
  activeGraphId = fallback;
  router?.navigate(fallback, { replace: true });
}

/**
 * Enters a subgraph, creating it in the CRDT when it does not exist yet.
 * Moving existing nodes into the subgraph is a follow-up operation.
 *
 * @param {string} childId
 */
function enterSubgraph(childId) {
  if (!router || childId === activeGraphId) return;
  if (!projectGraph(mirrorDoc, childId)) {
    const name = childId.split("/").pop() ?? childId;
    sendIntent(createGraphIntent(childId, name, activeGraphId));
  }
  router.navigate(childId);
}

/**
 * Re-renders the editor from the replica document.
 */
async function render() {
  resolveActiveGraph();
  bootstrapLibrary();
  const view = projectGraph(mirrorDoc, activeGraphId) ?? {
    processes: {},
    connections: [],
    inports: {},
    outports: {},
    properties: { name: activeGraphId },
  };
  const replica = await graph.loadJSON(view);
  const app = document.getElementById("app");
  if (!app) return;
  app.querySelectorAll("noflo-editor").forEach((el) => el.remove());
  const ed = /** @type {FlowEditor} */ (document.createElement("noflo-editor"));
  app.appendChild(ed);
  ed.libraryManager = libraryManager;
  editor = ed;
  intentMapper?.wire(ed);
  renderGraphIntoEditor(replica, ed, (name) =>
    libraryManager?.getComponent(name),
  );
  ed.fitEntitiesToViewport();
}

/**
 * Rebuilds the Glass-side library view from the CRDT registry.
 */
function bootstrapLibrary() {
  libraryManager = new LibraryManager();
  const registry = mirrorDoc.getMap("registry");
  for (const [name, entry] of registry.entries()) {
    const plain = entry.toJSON();
    const isSubgraph = mirrorDoc.getMap("graphs").has(name);
    libraryManager.setComponent(name, {
      name,
      type: isSubgraph ? "subgraph" : "stub",
      icon: plain.icon || "gear",
      description: plain.description,
      inports: (plain.inports ?? []).map((/** @type {any} */ p) => ({
        name: p.name,
        type: p.type ?? "all",
        addressable: Boolean(p.addressable),
      })),
      outports: (plain.outports ?? []).map((/** @type {any} */ p) => ({
        name: p.name,
        type: p.type ?? "all",
        addressable: Boolean(p.addressable),
      })),
    });
  }
}

/**
 * Shows the leadership role in the top bar.
 */
function updateRoleBadge() {
  const badge = document.getElementById("role-badge");
  if (!badge) return;
  if (isLeader) {
    badge.textContent = "Leader — engine running";
  } else {
    badge.textContent = `Observer — read-only (leader: ${coordinator?.leaderId() ?? "?"})`;
  }
}

/**
 * Wires the cross-tab mirror: the leader broadcasts replica updates to
 * followers; followers apply them read-only. A follower that joins mid-stream
 * requests full state, since incremental updates alone cannot converge a
 * fresh replica (Yjs clock contiguity).
 */
function setupCrossTabMirror() {
  if (!channel) return;
  if (isLeader) {
    mirrorDoc.on("update", (update) => {
      channel?.postMessage({ kind: "y-update", update });
    });
    mirrorHandler = (event) => {
      if (event.data?.kind === "y-request") {
        channel?.postMessage({
          kind: "y-sync",
          update: Y.encodeStateAsUpdate(mirrorDoc),
        });
      }
    };
  } else {
    channel.postMessage({ kind: "y-request" });
    mirrorHandler = (event) => {
      if (event.data?.kind === "y-sync") {
        Y.applyUpdate(mirrorDoc, event.data.update);
      }
    };
  }
}

/**
 * Leadership may flip at runtime (leader death); re-evaluate on change.
 */
function onRoleChange() {
  const wasLeader = isLeader;
  isLeader = /** @type {any} */ (coordinator).isLeader();
  if (!wasLeader && isLeader) {
    // This tab was promoted to leader: spin up the engine
    supervisor = createSupervisor({
      createWorker: spawnEngineWorker,
      onMessage: onEngineMessage,
    });
    supervisor.send({
      type: "LIFECYCLE",
      command: "subscribe",
      payload: { graphId: activeGraphId },
    });
  }
  updateRoleBadge();
}

async function init() {
  const app = document.getElementById("app");
  if (!app) {
    console.error("App element not found");
    return;
  }

  mirrorDoc = new Y.Doc();
  mirrorDoc.on("update", () => {
    intentMapper?.flushPending((nodeId) =>
      Boolean(projectGraph(mirrorDoc, activeGraphId)?.processes[nodeId]),
    );
    scheduleRender();
  });

  channel = new BroadcastChannel(CHANNEL_NAME);
  // One dispatcher on the raw channel: coordinator traffic and mirror
  // protocol messages share it
  channel.onmessage = (event) => {
    const data = event.data;
    if (data?.kind === "tab") {
      coordinatorHandler?.({ data: data.message });
    } else {
      mirrorHandler?.(event);
    }
  };
  coordinator = createTabCoordinator({
    channel: wrapChannel(channel),
    id: newTabId(),
    onChange: () => onRoleChange(),
  });

  router = createRouter({
    onRouteChange: (route) => {
      if (route.graphId === activeGraphId) return;
      activeGraphId = route.graphId;
      intentMapper?.flushPending((nodeId) =>
        Boolean(projectGraph(mirrorDoc, activeGraphId)?.processes[nodeId]),
      );
      scheduleRender();
    },
  });
  activeGraphId = router.graphId();

  intentMapper = createIntentMapper({
    sendIntent,
    graphId: () => activeGraphId,
    getLibrary: () => libraryManager,
    navigation: {
      down: (node) => enterSubgraph(`${activeGraphId}/${node}`),
      up: () => {
        const parent = graphParent(mirrorDoc, activeGraphId);
        if (parent) router?.navigate(parent);
      },
      // Creating a subgraph currently creates an empty child graph and
      // enters it; moving existing nodes into it is a follow-up
      createSubgraph: (nodes) => {
        const first = nodes[0];
        const name =
          typeof first === "string"
            ? first
            : /** @type {HTMLElement | undefined} */ (first)?.getAttribute(
                "name",
              );
        if (name) enterSubgraph(`${activeGraphId}/${name}`);
      },
    },
  });
  isLeader = coordinator.isLeader();

  if (isLeader) {
    supervisor = createSupervisor({
      createWorker: spawnEngineWorker,
      onMessage: onEngineMessage,
    });
    supervisor.send({
      type: "LIFECYCLE",
      command: "subscribe",
      payload: { graphId: activeGraphId },
    });
  } else {
    console.info("Read-only tab: the leader runs the engine");
  }

  setupCrossTabMirror();
  updateRoleBadge();

  const eviction = await checkEviction(/** @type {any} */ (navigator).storage);
  if (eviction?.level === "warning") {
    const banner = document.getElementById("banner");
    if (banner) {
      banner.hidden = false;
      banner.textContent =
        "Storage is almost full — export your critical data to avoid eviction.";
    }
  }

  await render();
}

/**
 * TabCoordinator needs only a subset of BroadcastChannel; wrap it so the
 * coordinator's heartbeats don't collide with the mirror protocol messages.
 *
 * @param {BroadcastChannel} raw
 */
function wrapChannel(raw) {
  return {
    postMessage: (/** @type {any} */ message) =>
      raw.postMessage({ kind: "tab", message }),
    set onmessage(/** @type {any} */ handler) {
      coordinatorHandler = handler;
    },
    close: () => raw.close(),
  };
}

init().catch((err) => console.error("Failed to start the Glass:", err));
