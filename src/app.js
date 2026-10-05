/**
 * @file The Glass ("The Body"): the main-thread application shell. Per SPEC,
 * this layer has no write authority over the CRDT — editor interactions are
 * mapped to Appendix A intents for the Engine worker, and authoritative
 * `graph` protocol echoes (mirrored here as CRDT updates) drive rendering.
 */

import * as Y from "yjs";
import { graph } from "../vendor/noflo.js";

import { checkEviction } from "./crdt/StorageGuard.js";
import { createTabCoordinator, newTabId } from "./crdt/TabCoordinator.js";
import { FlowContextChip } from "./elements/noflo-context-chip.js";
import { FlowEditor } from "./elements/noflo-editor.js";
import "./elements/noflo-exported-port.js";
import "./elements/noflo-iip.js";
import { FlowMeshSettings } from "./elements/noflo-mesh-settings.js";
import { NofloModal } from "./elements/noflo-modal.js";
import "./elements/noflo-json-form.js";
import "./elements/noflo-node.js";
import "./elements/noflo-radial-menu.js";
import {
  CREATE_NEW_COMPONENT,
  FlowComponentPicker,
} from "./elements/noflo-component-picker.js";
import { FlowSyncPanel } from "./elements/noflo-sync-panel.js";
import { createEchoHandlers, echoKey } from "./glass/echo-handlers.js";
import "./elements/noflo-selection-pills.js";
import { on } from "./events.js";
import {
  compatibleComponents,
  createIntentMapper,
} from "./glass/intentMapping.js";
import { createPendingTracker } from "./glass/pendingState.js";
import { progressPhrase } from "./glass/progressPhrases.js";
import {
  addEdgeIntent,
  addExportIntent,
  addIIPIntent,
  addNodeIntent,
  graphParent,
  makeSubgraphIntent,
  moveNodeIntent,
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
import { ComponentSignature } from "./library/schema.js";
import { createSupervisor } from "./worker/EngineSupervisor.js";

// Element modules self-register their custom elements on import (the
// tag name and its class are defined in the same module).

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
/** Mesh error reported by the Engine (e.g. WebCrypto without Ed25519). */
let meshError = "";
/** Main-thread identity recovery attempted at most once per session. */
let identityRecoveryAttempted = false;
/** Peers awaiting an access decision, reported by the Engine. */
let joinRequests =
  /** @type {Array<{ identityHash: string, destinationHash: string | null, firstSeen: number, source?: string }>} */ ([]);
/** Last generated invite URI, reported by the Engine. */
let meshInviteUri = "";
/** JSON Schemas per mesh interface type, for the settings dialog. */
let meshInterfaceSchemas = /** @type {{ [type: string]: any }} */ ({});
/** Live sync status reported by the Engine, for the settings dialog. */
let syncStatus =
  /** @type {{ connected?: boolean, synced?: boolean, peers?: number, stage?: string } | null} */ (
    null
  );
/** Join progress reported by the Engine, for the sync panel. */
const joinProgress =
  /** @type {{ stage: string, reason?: string, project?: any, error?: string } | null} */ (
    null
  );
/** The current operation narration (work document #34), rendered by the
 * sync panel's stage segment; null when no operation is in flight. */
let narration =
  /** @type {{ phrase: string, operation: string, stage: string, failed?: boolean } | null} */ (
    null
  );
/** Dacar authorization state (anchor, grants, wallet) reported by the Engine. */
let dacarState = /** @type {any} */ (null);
/** Connected peer identity hashes, from the Engine's mesh-peers events. */
let meshPeers = /** @type {string[]} */ ([]);
/** @type {FlowSyncPanel | null} */
let syncPanel = null;
/** @type {FlowContextChip | null} */
let contextChip = null;
/** @type {FlowEditor | null} */
let editor = null;
/** @type {NofloModal | null} */
let componentModal = null;
/** @type {FlowComponentPicker | null} */
let componentPicker = null;
/** @type {any} */
let componentForm = null;
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
  syncPanel?.setPendingIntents(pendingTracker.size);
}

/**
 * Adapts a real Worker to the supervisor's messaging interface.
 *
 * @returns {import("./worker/EngineSupervisor.js").WorkerLike}
 */
function spawnEngineWorker() {
  const worker = new Worker("src/worker/engine.js", { type: "module" });
  return {
    postMessage: (message) => worker.postMessage(message),
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

// ---- Echo dispatch (work document #37) -------------------------------------
//
// The Glass handles Engine messages through the contract's echo dispatch
// table (src/glass/echo-handlers.js): one handler per Engine → Glass
// message in the registry, with the Glass's state supplied as dependencies.
// The bodies below are those dependencies — the state mutations they wrap
// are unchanged from the previous inline chain.

/**
 * @type {Record<string, (data: any) => void>}
 */
const echoHandlers = createEchoHandlers({
  getNarration: () => narration,
  setNarration: (next) => {
    narration = next;
  },
  refreshSyncPanel,
  refreshMeshSettings,
  applyMirrorUpdate: (update) => {
    Y.applyUpdate(mirrorDoc, update);
    updateContextChip();
  },
  showPeerGhosts: (states) => {
    // Remote peer drag ghosts; only the graph being rendered matters
    if (!editor) return;
    const visible = (states ?? []).filter(
      (state) =>
        state?.dragging?.graphId === activeGraphId || state?.dragging == null,
    );
    editor.setPeerGhosts(visible);
  },
  ingestMeshConfig: (data) => {
    meshConfig = data.config ?? null;
    meshIdentityHash = data.identityHash ?? "";
    meshInterfaceSchemas = data.interfaceSchemas ?? {};
    joinRequests = data.joinRequests ?? joinRequests;
    // The engine's identity state is authoritative: recovered or still
    // failing, the dialog reflects it
    if (data.identityError) {
      meshError = data.identityError;
    } else if (data.identityHash) {
      meshError = "";
    }
    refreshMeshSettings();
    refreshSyncPanel();
  },
  setMeshInvite: (uri) => {
    meshInviteUri = uri;
    refreshMeshSettings();
    refreshSyncPanel();
  },
  updateMeshPeers: (added, removed) => {
    meshPeers = meshPeers.filter((hash) => !removed.includes(hash));
    for (const hash of added) {
      if (!meshPeers.includes(hash)) meshPeers.push(hash);
    }
    refreshSyncPanel();
  },
  setJoinRequests: (requests) => {
    joinRequests = requests;
    refreshMeshSettings();
    refreshSyncPanel();
  },
  reloadIntoFreshBoot: () => {
    location.reload();
  },
  setDacarState: (state) => {
    dacarState = state;
    refreshMeshSettings();
    refreshSyncPanel();
  },
  ingestMeshStatus: (data) => {
    if (data.connected !== undefined) {
      syncStatus = {
        connected: data.connected === true,
        synced: data.synced === true,
        peers: data.peers,
      };
    }
    meshError = data.error ?? "";
    // Recovery clears a stuck failure narration: the chip must not keep
    // claiming a dial failed when sync demonstrably works again
    if (data.connected === true && data.synced === true && narration?.failed) {
      narration = null;
    }
    refreshMeshSettings();
    refreshSyncPanel();
    if (meshError) {
      console.warn("Mesh error:", meshError);
    }
  },
});

/**
 * Applies one engine message to the read replica through the contract's
 * echo dispatch table (work document #37).
 *
 * @param {any} data
 */
function onEngineMessage(data) {
  const handler = echoHandlers[echoKey(data)];
  if (handler) {
    handler(data);
    return;
  }
  console.debug("Engine message (no Glass handling yet):", data);
}

/**
 * Generates the Reticulum identity on the main thread (once) and hands the
 * raw private key to the Engine, for browsers whose worker WebCrypto cannot
 * generate Ed25519 keys. Uses the same @reticulum/core library as the
 * Engine, so the key format matches exactly.
 */
async function recoverIdentityOnMainThread() {
  if (identityRecoveryAttempted) return;
  identityRecoveryAttempted = true;
  try {
    // Probe the exact operation the Engine failed on, so the dialog can
    // report whether the main thread even has Ed25519
    await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
      "sign",
      "verify",
    ]);
    // The vendored reticulum-core's crypto shim routes X25519 through the
    // RFC 7748 fallback, so Identity.generate() works on the main thread too
    const { Identity } = await import("../vendor/reticulum-core.js");
    const identity = await Identity.generate();
    const key = await identity.getPrivateKey();
    let binary = "";
    for (const byte of key) binary += String.fromCharCode(byte);
    supervisor?.send({
      type: "MESH",
      command: "importIdentity",
      payload: { identity: btoa(binary) },
    });
  } catch (err) {
    // Main-thread generation failed too: say so where the user looks
    const reason = /** @type {any} */ (err)?.message ?? err;
    meshError = `Main-thread identity recovery also failed: ${reason}`;
    refreshMeshSettings();
    console.warn("Main-thread identity recovery failed:", err);
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
 * A default code scaffold for the "Implement in code" action (work document
 * #29). The runtime language matrix is owned by the runtime work; stub mode
 * scaffolds JavaScript.
 *
 * @param {string} componentName
 * @returns {string}
 */
function codeScaffold(componentName) {
  return `// ${componentName} — implemented in code (work document #29)\n// Replace this scaffold with the component's implementation. The ports\n// follow the declared signature.\nexport default function setup(runtime) {\n  // Register port handlers here.\n}\n`;
}

/**
 * The component signature editor (work document #29): the adopted
 * modal + JSON-form flow from the editor surface, now with the primary
 * implementation actions. Save writes the declared interface through the
 * `setSignature` intent; "Implement as graph" and "Implement in code"
 * leave the Inferred era; renaming through the editor forks so references
 * follow; graph-implemented components open instead of re-implementing.
 *
 * @param {string} componentName
 * @returns {Promise<void>}
 */
async function openSignatureEditor(componentName) {
  if (!componentModal || !componentForm) return;
  const entry = mirrorDoc.getMap("registry").get(componentName);
  const plain = entry?.toJSON() ?? {};
  const implemented = Boolean(mirrorDoc.getMap("graphs").has(componentName));
  const ports = (/** @type {any} */ list) =>
    (list ?? []).map((/** @type {any} */ port) => ({
      name: port.name,
      type: port.type ?? "all",
      addressable: Boolean(port.addressable),
    }));

  componentModal.setActions(
    implemented
      ? [
          { value: "cancel", label: "Cancel", kind: "btn-secondary" },
          { value: "fork", label: "Fork", kind: "btn-action" },
          { value: "open", label: "Open implementation", kind: "btn-primary" },
        ]
      : [
          { value: "cancel", label: "Cancel", kind: "btn-secondary" },
          { value: "fork", label: "Fork", kind: "btn-action" },
          {
            value: "implement-code",
            label: "Implement in code",
            kind: "btn-action",
          },
          {
            value: "implement-graph",
            label: "Implement as graph",
            kind: "btn-action",
          },
          { value: "save", label: "Save", kind: "btn-primary" },
        ],
  );
  componentModal.open(`Component: ${componentName}`);
  componentForm.schema = ComponentSignature;
  componentForm.data = {
    name: componentName,
    icon: plain.icon || "gear",
    description: plain.description || "",
    inports: ports(plain.inports),
    outports: ports(plain.outports),
  };

  const action = await componentModal.submit();
  if (!action) return;
  const newData = componentForm.data;
  const newName = String(newData.name || componentName);
  const renamed = newName !== componentName;

  // Renaming through the editor forks: the fork takes over where the
  // original was used, and the action applies to the fork. An explicit
  // Fork with an unchanged name forks to a `-fork` variant. The fork
  // copies the original's signature, so the editor's edits are applied to
  // the fork; a plain Save on an unrenamed original edits it directly.
  let target = componentName;
  const wantsSignatureWrite =
    action === "save" ||
    action === "fork" ||
    action === "implement-graph" ||
    action === "implement-code";
  if (renamed || action === "fork") {
    const to = renamed ? newName : `${componentName}-fork`;
    sendIntent({
      type: "INTENT",
      command: "forkComponent",
      payload: { component: componentName, to },
    });
    target = to;
  }
  if (
    wantsSignatureWrite &&
    (renamed || action === "fork" || action === "save")
  ) {
    sendIntent({
      type: "INTENT",
      command: "setSignature",
      payload: {
        component: target,
        signature: {
          inports: newData.inports,
          outports: newData.outports,
          description: newData.description,
          icon: newData.icon,
        },
      },
    });
  }

  if (action === "open") {
    router?.navigate(componentName);
    return;
  }

  // The graph-implemented branch never reaches Save or the implement
  // actions (they are not offered); guard anyway — the Engine refuses
  if (mirrorDoc.getMap("graphs").has(target)) return;

  if (action === "implement-graph") {
    sendIntent({
      type: "INTENT",
      command: "implementAsGraph",
      payload: { component: target, parentGraph: activeGraphId },
    });
    router?.navigate(target);
  }
  if (action === "implement-code") {
    sendIntent({
      type: "INTENT",
      command: "implementInCode",
      payload: {
        component: target,
        language: "javascript",
        scaffold: codeScaffold(target),
      },
    });
  }
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
  // The component signature editor (work document #29): the shell hosts the
  // modal; nodes open it through the editor's edit-component-attempt event
  if (!componentModal) {
    componentModal = /** @type {NofloModal} */ (
      /** @type {any} */ (document.createElement("noflo-modal"))
    );
    componentForm = document.createElement("noflo-json-form");
    componentModal.appendChild(componentForm);
    app.appendChild(componentModal);
  }
  on(ed, "edit-component-attempt", (e) => {
    const node = e.detail.node;
    const componentName = node?.getAttribute?.("component");
    if (componentName) openSignatureEditor(componentName);
  });
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
  if (meshError && /Identity generation failed/.test(meshError)) {
    recoverIdentityOnMainThread();
  }
  supervisor?.send({ type: "MESH", command: "status" });
  dialog.open(meshConfig, meshIdentityHash, meshInterfaceSchemas, meshError);
  dialog.setDacarState(dacarState);
}

/**
 * Refreshes the grants list while the settings dialog is open.
 */
function refreshMeshSettings() {
  const dialog = /** @type {FlowMeshSettings | null} */ (
    /** @type {any} */ (document.getElementById("mesh-settings-dialog"))
  );
  if (!dialog || !dialog._open) return;
  dialog.setDacarState(dacarState);
  if (meshConfig) {
    dialog._config = meshConfig;
    dialog._identityHash = meshIdentityHash;
    dialog._interfaceSchemas = meshInterfaceSchemas;
    dialog._meshError = meshError;
    dialog.render();
  }
}

/**
 * Feeds the corner sync/presence panel (work document #28) from the Glass's
 * mesh state: a pure view over the Engine's existing messages.
 */
function refreshSyncPanel() {
  if (!syncPanel) return;
  // Hidden until the mesh is in use: a device that never enabled sync
  // shows no corner UI (work document #28's disclosure rules)
  syncPanel.setVisible(
    Boolean(meshConfig && (meshConfig.enabled || meshError)),
  );
  syncPanel.setSyncStatus(syncStatus);
  syncPanel.setNarration(narration);
  syncPanel.setPeers(meshPeers);
  syncPanel.setJoinRequests(joinRequests);
  syncPanel.setJoinProgress(joinProgress);
  syncPanel.setDacarState(dacarState);
  syncPanel.setInvite(meshInviteUri);
  syncPanel.setMeshError(meshError);
  syncPanel.setIdentityHash(meshIdentityHash);
}

/**
 * Updates the context chip (work document #28, top-left corner): what the
 * user is editing plus the tab's engine role. Replaces the former top bar.
 */
function updateContextChip() {
  if (!contextChip) return;
  const projectName = String(mirrorDoc?.getMap("metadata")?.get("name") ?? "");
  contextChip.setLabel(
    projectName && activeGraphId
      ? `${projectName} · ${activeGraphId}`
      : projectName || activeGraphId || "",
  );
  // The up button navigates one level up (WD #28's app-level navigation);
  // at root graphs it hides until the Home graph exists (WD #32)
  contextChip.setUp(mirrorDoc ? graphParent(mirrorDoc, activeGraphId) : "");
}

/**
 * Shows the leadership role in the context chip.
 */
function updateRoleBadge() {
  contextChip?.setRole({
    leader: isLeader,
    leaderId: coordinator?.leaderId() ?? undefined,
  });
  updateContextChip();
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
      updateContextChip();
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
    // Typed-port guiding (work document #29 update #1): the candidate list
    // narrows to compatible components, ending with the create option
    pickComponent: async ({ x, y, startPort }) => {
      if (!startPort) return window.prompt("Enter component name:");
      if (!componentPicker) {
        componentPicker = /** @type {FlowComponentPicker} */ (
          /** @type {any} */ (document.createElement("noflo-component-picker"))
        );
        document.getElementById("app")?.appendChild(componentPicker);
      }
      const candidates = compatibleComponents(libraryManager, startPort);
      const choice = await componentPicker.open({ x, y, candidates });
      if (choice === CREATE_NEW_COMPONENT) {
        const name = window.prompt(
          "Enter component name (or leave empty to use 'New Node'):",
        );
        if (!name) return null;
        // Spec the new component to match the dragged port's shape (work
        // document #29 update #1): the port on the connecting side carries
        // the dragged port's datatype; the opposite side keeps the default.
        // The names stay the engine defaults (in/out), so the wire the
        // mapper adds stays valid.
        const dataType = startPort.dataset.portDataType || "all";
        const draggingOut = startPort.classList.contains("port-out");
        const signature = draggingOut
          ? {
              inports: [{ name: "in", type: dataType }],
              outports: [{ name: "out", type: "all" }],
            }
          : {
              inports: [{ name: "in", type: "all" }],
              outports: [{ name: "out", type: dataType }],
            };
        return { name: name.trim(), signature };
      }
      return choice;
    },
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
          .map((n) => (typeof n === "string" ? n : n?.getAttribute?.("name")))
          .filter((n) => typeof n === "string");
        if (names.length === 0) return;
        const childId = `${activeGraphId}/${names[0]}`;
        sendIntent(makeSubgraphIntent(activeGraphId, names));
        router?.navigate(childId);
      },

      // Move up: lift the selection from this subgraph into its parent
      moveUp: (nodes) => {
        const names = nodes
          .map((n) => (typeof n === "string" ? n : n?.getAttribute?.("name")))
          .filter((n) => typeof n === "string");
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

  // Context chip (work document #28, top-left corner): what am I editing,
  // the tab's engine role, and the entry into configuration — replaces the
  // former top bar
  contextChip = /** @type {FlowContextChip | null} */ (
    /** @type {any} */ (document.getElementById("context-chip"))
  );
  on(contextChip, "open-settings", () => openMeshSettings());
  // Up navigation from the Context corner: one level up, same path the
  // keyboard/gesture up-navigation takes
  on(contextChip, "navigate-up", () => {
    const parent = graphParent(mirrorDoc, activeGraphId);
    if (parent) router?.navigate(parent);
  });
  // Corner sync/presence panel (work document #28): actions route to the
  // same Engine commands the settings dialog uses
  syncPanel = /** @type {FlowSyncPanel | null} */ (
    /** @type {any} */ (document.getElementById("sync-panel"))
  );
  on(syncPanel, "sync-approve", (e) => {
    const request = joinRequests.find(
      (entry) => entry.identityHash === e.detail.identityHash,
    );
    if (request?.source === "bootstrap") {
      // A bootstrap knocker is granted by the host decision engine
      // itself when the approval resolves; the grant is born verified
      supervisor?.send({
        type: "MESH",
        command: "resolveRequest",
        payload: {
          identityHash: e.detail.identityHash,
          decision: "approved",
        },
      });
      return;
    }
    // A sync-refusal peer holds no bootstrap link: the grant is minted
    // through the mesh layer, and resolving clears the request entry
    supervisor?.send({
      type: "MESH",
      command: "grant",
      payload: { identityHash: e.detail.identityHash, role: "operator" },
    });
    supervisor?.send({
      type: "MESH",
      command: "resolveRequest",
      payload: {
        identityHash: e.detail.identityHash,
        decision: "approved",
      },
    });
  });
  on(syncPanel, "sync-decline", (e) => {
    supervisor?.send({
      type: "MESH",
      command: "resolveRequest",
      payload: {
        identityHash: e.detail.identityHash,
        decision: "declined",
      },
    });
  });
  on(syncPanel, "sync-invite", () => {
    supervisor?.send({ type: "MESH", command: "createInvite" });
  });
  on(syncPanel, "sync-join", (e) => {
    supervisor?.send({ type: "MESH", command: "join", payload: e.detail });
  });
  on(syncPanel, "sync-settings", () => openMeshSettings());
  // Graceful mesh shutdown on page unload: the Engine tears its links down
  // immediately, so peers clean their room state instead of waiting out the
  // Reticulum link timeout after this worker dies mid-session (Safari reload)
  globalThis.addEventListener("pagehide", () => {
    supervisor?.send({ type: "MESH", command: "stop" });
  });
  const settingsDialog = /** @type {FlowMeshSettings | null} */ (
    /** @type {any} */ (document.getElementById("mesh-settings-dialog"))
  );
  on(settingsDialog, "mesh-configure", (e) => {
    supervisor?.send({
      type: "MESH",
      command: "configure",
      payload: e.detail.config,
    });
  });
  on(settingsDialog, "mesh-grant", (e) => {
    // Grants are minted directly through the mesh layer (work document
    // #27): the Trust Anchor's device signs the authorization and writes
    // the born-verified entry — no unsigned intermediate grant
    supervisor?.send({
      type: "MESH",
      command: "grant",
      payload: { identityHash: e.detail.peerHash, role: e.detail.role },
    });
  });
  on(settingsDialog, "mesh-revoke", (e) => {
    sendIntent(revokePermissionIntent(e.detail.id ?? ""));
  });
  on(settingsDialog, "mesh-factory-reset", () => {
    supervisor?.send({ type: "MESH", command: "factoryReset" });
  });
  on(settingsDialog, "mesh-close", () => {});

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
