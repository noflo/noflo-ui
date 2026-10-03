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
import { FlowMeshSettings } from "./elements/noflo-mesh-settings.js";
import "./elements/noflo-json-form.js";
import { FlowNode } from "./elements/noflo-node.js";
import { FlowRadialMenu } from "./elements/noflo-radial-menu.js";
import { SelectionPills } from "./elements/noflo-selection-pills.js";
import { createIntentMapper } from "./glass/intentMapping.js";
import { createPendingTracker } from "./glass/pendingState.js";
import {
  addEdgeIntent,
  addExportIntent,
  addIIPIntent,
  addNodeIntent,
  grantPermissionIntent,
  graphParent,
  makeSubgraphIntent,
  moveNodeIntent,
  projectGrants,
  projectGraph,
  removeEdgeIntent,
  removeExportIntent,
  removeIIPIntent,
  removeNodeIntent,
  renameExportIntent,
  revokePermissionIntent,
  subgraphComponentFor,
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
customElements.define("noflo-mesh-settings", FlowMeshSettings);

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

/** Tracks optimistic intent state until the replica confirms it. */
const pendingTracker = createPendingTracker();

/** Last mesh config reported by the Engine, for the settings dialog. */
let meshConfig = /** @type {any} */ (null);
/** Identity hash reported by the Engine, for the settings dialog. */
let meshIdentityHash = "";
/** Per-project sync room reported by the Engine, for the settings dialog. */
let meshRoom = "";
/** Mesh error reported by the Engine (e.g. WebCrypto without Ed25519). */
let meshError = "";
/** Peers awaiting an access decision, reported by the Engine. */
let joinRequests =
  /** @type {Array<{ identityHash: string, destinationHash: string | null, firstSeen: number }>} */ ([]);
/** JSON Schemas per mesh interface type, for the settings dialog. */
let meshInterfaceSchemas = /** @type {{ [type: string]: any }} */ ({});
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
  // Optimistic pending state (work document #21): track what this intent
  // will touch until the replica confirms the CRDT merge
  pendingTracker.markIntent(message, activeGraphId);
  applyPendingState();
  supervisor.send(message);
}

/**
 * Reconciles pending entities against the replica and renders the visual
 * state on the editor.
 */
function applyPendingState() {
  if (!editor) return;
  const view = projectGraph(mirrorDoc, activeGraphId);
  editor.applyPendingState(pendingTracker.reconcile(view, activeGraphId));
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
  } else if (data?.kind === "awareness") {
    // Remote peer drag ghosts; only the graph being rendered matters
    if (!editor) return;
    const states = (data.states ?? []).filter(
      (/** @type {any} */ state) =>
        state?.dragging?.graphId === activeGraphId || state?.dragging == null,
    );
    editor.setPeerGhosts(states);
  } else if (data?.kind === "mesh-config") {
    meshConfig = data.config ?? null;
    meshIdentityHash = data.identityHash ?? "";
    meshRoom = data.room ?? "";
    meshInterfaceSchemas = data.interfaceSchemas ?? {};
    refreshMeshSettings();
  } else if (data?.kind === "mesh-requests") {
    joinRequests = data.requests ?? [];
    refreshMeshSettings();
  } else if (data?.kind === "mesh-status") {
    meshError = data.error ?? "";
    refreshMeshSettings();
    if (meshError) {
      console.warn("Mesh error:", meshError);
    }
  } else {
    console.debug("Engine message (no Glass handling yet):", data);
  }
}

/**
 * Sends ephemeral drag telemetry to the Engine for mesh awareness. No-ops in
 * observer tabs, which have no Engine to talk to.
 *
 * @param {Array<{ node: string, x: number, y: number }>} nodes
 */
function sendDraggingAwareness(nodes) {
  supervisor?.send({
    type: "AWARENESS",
    command: "dragging",
    payload: {
      graphId: activeGraphId,
      nodeId: nodes[0]?.node ?? null,
      x: nodes[0]?.x ?? 0,
      y: nodes[0]?.y ?? 0,
    },
  });
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
  ed.unpackEnabled = true;
  editor = ed;
  intentMapper?.wire(ed);
  renderGraphIntoEditor(replica, ed, (name) =>
    libraryManager?.getComponent(name),
  );
  applyPendingState();
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
 * Opens the mesh settings dialog with the current Engine config and the
 * CRDT-resident grants. Observer tabs see a read-only config (the Engine is
 * owned by the leader) but can still view grants.
 */
function openMeshSettings() {
  const dialog = /** @type {FlowMeshSettings | null} */ (
    /** @type {any} */ (document.getElementById("mesh-settings-dialog"))
  );
  if (!dialog) return;
  supervisor?.send({ type: "MESH", command: "status" });
  dialog.open(
    meshConfig,
    projectGrants(mirrorDoc),
    meshIdentityHash,
    meshInterfaceSchemas,
    meshRoom,
    joinRequests,
    meshError,
  );
}

/**
 * Refreshes the grants list while the settings dialog is open.
 */
function refreshMeshSettings() {
  const dialog = /** @type {FlowMeshSettings | null} */ (
    /** @type {any} */ (document.getElementById("mesh-settings-dialog"))
  );
  if (!dialog || !dialog._open) return;
  dialog.setGrants(projectGrants(mirrorDoc));
  if (meshConfig) {
    dialog._config = meshConfig;
    dialog._identityHash = meshIdentityHash;
    dialog._interfaceSchemas = meshInterfaceSchemas;
    dialog._room = meshRoom;
    dialog._meshError = meshError;
    dialog._joinRequests = joinRequests;
    dialog.render();
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
    onDragging: (nodes) => sendDraggingAwareness(nodes),
    onDragEnd: () => sendDraggingAwareness([]),
    navigation: {
      // Opening a node only makes sense when its component is a subgraph:
      // navigate to the graph registered under the component's name
      down: (node) => {
        const component = subgraphComponentFor(mirrorDoc, activeGraphId, node);
        if (component) router?.navigate(component);
      },
      up: () => {
        const parent = graphParent(mirrorDoc, activeGraphId);
        if (parent) router?.navigate(parent);
      },
      // Make subgraph: one atomic engine op moves the selected nodes into
      // the child graph and rewires boundary connections; the Glass
      // navigates in optimistically
      createSubgraph: (nodes) => {
        const names = nodes
          .map((/** @type {any} */ n) =>
            typeof n === "string" ? n : n?.getAttribute?.("name"),
          )
          .filter((/** @type {any} */ n) => typeof n === "string");
        if (names.length === 0) return;
        const childId = `${activeGraphId}/${names[0]}`;
        sendIntent(makeSubgraphIntent(activeGraphId, names));
        router?.navigate(childId);
      },

      // Move up: lift the selection from this subgraph into its parent
      moveUp: (nodes) => {
        const names = nodes
          .map((/** @type {any} */ n) =>
            typeof n === "string" ? n : n?.getAttribute?.("name"),
          )
          .filter((/** @type {any} */ n) => typeof n === "string");
        if (names.length === 0) return;
        if (!graphParent(mirrorDoc, activeGraphId)) return;
        sendIntent({
          type: "INTENT",
          command: "moveUp",
          payload: { graphId: activeGraphId, nodeIds: names },
        });
      },

      // Unpack: lift every node of a subgraph instance into its parent and
      // remove the subgraph. Only for instances whose graph is a child of
      // the graph being edited
      unpack: (node) => {
        const childId = subgraphComponentFor(mirrorDoc, activeGraphId, node);
        if (!childId || !childId.startsWith(`${activeGraphId}/`)) return;
        const childView = projectGraph(mirrorDoc, childId);
        const nodeIds = Object.keys(childView?.processes ?? {});
        if (nodeIds.length === 0) {
          // An empty subgraph has nothing to lift; remove it outright
          sendIntent({
            type: "INTENT",
            command: "removeGraph",
            payload: { graphId: childId },
          });
          return;
        }
        sendIntent({
          type: "INTENT",
          command: "moveUp",
          payload: { graphId: childId, nodeIds },
        });
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

  // Mesh settings dialog wiring (work document #21)
  document
    .getElementById("mesh-settings")
    ?.addEventListener("click", () => openMeshSettings());
  const settingsDialog = /** @type {FlowMeshSettings | null} */ (
    /** @type {any} */ (document.getElementById("mesh-settings-dialog"))
  );
  settingsDialog?.addEventListener("mesh-configure", (/** @type {any} */ e) => {
    supervisor?.send({
      type: "MESH",
      command: "configure",
      payload: e.detail.config,
    });
  });
  settingsDialog?.addEventListener("mesh-grant", (/** @type {any} */ e) => {
    sendIntent(grantPermissionIntent(e.detail.peerHash, e.detail.role));
  });
  settingsDialog?.addEventListener("mesh-revoke", (/** @type {any} */ e) => {
    sendIntent(revokePermissionIntent(e.detail.id));
  });
  settingsDialog?.addEventListener("mesh-join", (/** @type {any} */ e) => {
    supervisor?.send({ type: "MESH", command: "join", payload: e.detail });
  });
  settingsDialog?.addEventListener("mesh-approve", (/** @type {any} */ e) => {
    sendIntent(grantPermissionIntent(e.detail.identityHash, "operator"));
    supervisor?.send({
      type: "MESH",
      command: "resolveRequest",
      payload: { identityHash: e.detail.identityHash },
    });
  });
  settingsDialog?.addEventListener("mesh-deny", (/** @type {any} */ e) => {
    supervisor?.send({
      type: "MESH",
      command: "resolveRequest",
      payload: { identityHash: e.detail.identityHash },
    });
  });
  settingsDialog?.addEventListener("mesh-close", () => {});

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
