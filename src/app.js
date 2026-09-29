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
import {
  addEdgeIntent,
  addExportIntent,
  addIIPIntent,
  addNodeIntent,
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
import { LibraryManager } from "./library/LibraryManager.js";
import { createSupervisor } from "./worker/EngineSupervisor.js";

// Register Web Components
customElements.define("noflo-editor", FlowEditor);
customElements.define("noflo-node", FlowNode);
customElements.define("noflo-radial-menu", FlowRadialMenu);
customElements.define("noflo-selection-pills", SelectionPills);
customElements.define("noflo-iip", FlowIIP);
customElements.define("noflo-exported-port", FlowExportedPort);

/** The graph the Glass currently displays. Multiple graphs come later. */
const GRAPH_ID = "main";
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
/** Intents held back until their target node appears in the replica. */
const pendingAfterNode = new Map();

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
 * Queues an intent to be sent once the given node exists in the replica, so
 * dependent intents (like connecting a freshly created node) don't bounce off
 * the engine's dangling-endpoint validation.
 *
 * @param {string} nodeId
 * @param {any} intent
 */
function afterNode(nodeId, intent) {
  const queue = pendingAfterNode.get(nodeId) ?? [];
  queue.push(intent);
  pendingAfterNode.set(nodeId, queue);
}

function flushPendingAfterNode() {
  for (const [nodeId, queue] of pendingAfterNode) {
    const graphView = projectGraph(mirrorDoc, GRAPH_ID);
    if (!graphView?.processes[nodeId]) continue;
    pendingAfterNode.delete(nodeId);
    for (const intent of queue) {
      sendIntent(intent);
    }
  }
}

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
 * Re-renders the editor from the replica document.
 */
async function render() {
  bootstrapLibrary();
  const view = projectGraph(mirrorDoc, GRAPH_ID) ?? {
    processes: {},
    connections: [],
    inports: {},
    outports: {},
    properties: { name: GRAPH_ID },
  };
  const replica = await graph.loadJSON(view);
  const app = document.getElementById("app");
  if (!app) return;
  app.querySelectorAll("noflo-editor").forEach((el) => el.remove());
  const ed = /** @type {FlowEditor} */ (document.createElement("noflo-editor"));
  app.appendChild(ed);
  ed.libraryManager = libraryManager;
  editor = ed;
  setupEditorEventListeners(ed);
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
 * Resolves the graph node hosting a port element.
 *
 * @param {HTMLElement} port
 * @returns {HTMLElement | null}
 */
function hostOf(port) {
  const root = port.getRootNode();
  if (root instanceof ShadowRoot) {
    return /** @type {HTMLElement | null} */ (root.host);
  }
  return port.closest("noflo-node") || port.closest("noflo-iip");
}

/**
 * Builds the Appendix A edge endpoint for a port element.
 *
 * @param {HTMLElement} port
 * @returns {{ node: string, port: string, index?: number }}
 */
function endpointFor(port) {
  const host = hostOf(port);
  const index = port.dataset.portIndex;
  return {
    node: host?.getAttribute("name") ?? "unknown",
    port: port.dataset.portName ?? "",
    ...(index !== undefined ? { index: Number.parseInt(index, 10) } : {}),
  };
}

/**
 * First outport/inport name of a component, used when wiring a brand-new node
 * whose signature comes from the library.
 *
 * @param {string} componentName
 * @param {"inports" | "outports"} direction
 * @returns {string}
 */
function defaultPortFor(componentName, direction) {
  const component = libraryManager?.getComponent(componentName);
  const ports = component?.[direction];
  return ports?.[0]?.name ?? (direction === "inports" ? "in" : "out");
}

/**
 * Wires the editor's interaction events to engine intents.
 *
 * @param {FlowEditor} ed
 */
function setupEditorEventListeners(ed) {
  ed.addEventListener("node-creation-attempt", async (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { x, y, startPort } = event.detail;
    const componentName = window.prompt(
      "Enter component name (or leave empty to use 'New Node'):",
    );
    if (componentName === null) return;
    const name = componentName.trim() || "New Node";
    const nodeId = `node_${Date.now()}`;
    sendIntent(addNodeIntent(GRAPH_ID, nodeId, name, { x, y }));

    if (startPort) {
      const port = /** @type {HTMLElement} */ (startPort);
      const isOut = port.classList.contains("port-out");
      const hostName = hostOf(port)?.getAttribute("name") ?? "unknown";
      const portName = port.dataset.portName ?? "";
      const index = port.dataset.portIndex;
      if (isOut) {
        afterNode(
          nodeId,
          addEdgeIntent(
            GRAPH_ID,
            {
              node: hostName,
              port: portName,
              ...(index !== undefined
                ? { index: Number.parseInt(index, 10) }
                : {}),
            },
            { node: nodeId, port: defaultPortFor(name, "inports") },
          ),
        );
      } else {
        afterNode(
          nodeId,
          addEdgeIntent(
            GRAPH_ID,
            { node: nodeId, port: defaultPortFor(name, "outports") },
            {
              node: hostName,
              port: portName,
              ...(index !== undefined
                ? { index: Number.parseInt(index, 10) }
                : {}),
            },
          ),
        );
      }
    }
  });

  ed.addEventListener("node-removal-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    for (const node of event.detail.nodes) {
      const name = node.getAttribute?.("name") ?? node.name;
      sendIntent(removeNodeIntent(GRAPH_ID, name));
    }
  });

  ed.addEventListener("nodes-moved", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    for (const node of event.detail.nodes) {
      if (node.type !== "noflo-node") continue;
      sendIntent(
        moveNodeIntent(GRAPH_ID, node.name, {
          x: node.position.x,
          y: node.position.y,
        }),
      );
    }
  });

  ed.addEventListener("wire-connection-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    sendIntent(
      addEdgeIntent(
        GRAPH_ID,
        endpointFor(event.detail.portA),
        endpointFor(event.detail.portB),
      ),
    );
  });

  ed.addEventListener("edge-removal-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const descriptor = ed.getEdgeDescriptor(event.detail.edge);
    if (!descriptor) return;
    sendIntent(
      removeEdgeIntent(
        GRAPH_ID,
        {
          node: descriptor.fromNode,
          port: descriptor.fromPort,
          ...(descriptor.fromIndex !== undefined
            ? { index: descriptor.fromIndex }
            : {}),
        },
        {
          node: descriptor.toNode,
          port: descriptor.toPort,
          ...(descriptor.toIndex !== undefined
            ? { index: descriptor.toIndex }
            : {}),
        },
      ),
    );
  });

  ed.addEventListener("iip-creation-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const value = window.prompt("Value for the initial information packet:");
    if (value === null) return;
    const startPort = /** @type {HTMLElement | undefined} */ (
      event.detail.startPort
    );
    if (!startPort) return;
    sendIntent(addIIPIntent(GRAPH_ID, value, endpointFor(startPort)));
  });

  ed.addEventListener("iip-edit-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const iip = /** @type {any} */ (event.detail.iip);
    const newValue = window.prompt("New value for the packet:", iip.value);
    if (newValue === null || typeof iip.id !== "string") return;
    sendIntent(updateIIPIntent(GRAPH_ID, iip.id, newValue));
  });

  ed.addEventListener("iip-removal-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const iip = /** @type {any} */ (event.detail.iip);
    if (typeof iip.id !== "string") return;
    sendIntent(removeIIPIntent(GRAPH_ID, iip.id));
  });

  ed.addEventListener("port-exported", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { name, direction, process, port } = event.detail;
    sendIntent(
      addExportIntent(
        GRAPH_ID,
        direction === "in" ? "inports" : "outports",
        name,
        process,
        port,
      ),
    );
  });

  ed.addEventListener("port-removed", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { name, direction } = event.detail;
    sendIntent(
      removeExportIntent(
        GRAPH_ID,
        direction === "in" ? "inports" : "outports",
        name,
      ),
    );
  });

  ed.addEventListener("port-renamed", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { oldName, newName, direction } = event.detail;
    sendIntent(
      renameExportIntent(
        GRAPH_ID,
        direction === "in" ? "inports" : "outports",
        oldName,
        newName,
      ),
    );
  });

  for (const kind of [
    "iip-send-attempt",
    "create-subgraph-attempt",
    "move-nodes-up-attempt",
    "navigate-down-attempt",
    "navigate-up-attempt",
  ]) {
    ed.addEventListener(kind, () => {
      console.info(
        `${kind} has no Engine IPC yet; not applied (see work document #18 SPEC gaps)`,
      );
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
      payload: { graphId: GRAPH_ID },
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
    flushPendingAfterNode();
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
  isLeader = coordinator.isLeader();

  if (isLeader) {
    supervisor = createSupervisor({
      createWorker: spawnEngineWorker,
      onMessage: onEngineMessage,
    });
    supervisor.send({
      type: "LIFECYCLE",
      command: "subscribe",
      payload: { graphId: GRAPH_ID },
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
