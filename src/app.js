/**
 * @file The Glass ("The Body"): the main-thread application shell. Per SPEC,
 * this layer has no write authority over the CRDT — editor interactions are
 * mapped to Appendix A intents for the Engine worker, and authoritative
 * `graph` protocol echoes (mirrored here as CRDT updates) drive rendering.
 */

import { yJedison } from "y-jedison";
import * as Y from "yjs";
import { getSchema, getSchemas, REGISTRY_MAP } from "./crdt/ProjectDoc.js";
import { checkEviction } from "./crdt/StorageGuard.js";
import { createTabCoordinator, newTabId } from "./crdt/TabCoordinator.js";
import { FlowContextChip } from "./elements/noflo-context-chip.js";
import { FlowEditor } from "./elements/noflo-editor.js";
import { schemaFormBinding } from "./library/formBinding.js";
import "./elements/noflo-exported-port.js";
import "./elements/noflo-iip.js";
import {
  basicSetup,
  EditorView,
  HighlightStyle,
  javascript,
  markdown,
  syntaxHighlighting,
  tags,
  yCollab,
  ySyncFacet,
} from "../vendor/codemirror.js";
import { NofloModal } from "./elements/noflo-modal.js";
import "./elements/noflo-json-form.js";
import "./elements/noflo-code-editor.js";
import "./elements/noflo-line-diagram.js";
import "./elements/noflo-lines-corner.js";
import "./elements/noflo-node.js";
import "./elements/noflo-radial-menu.js";
import {
  CREATE_NEW_COMPONENT,
  FlowComponentPicker,
} from "./elements/noflo-component-picker.js";
import { FlowProjectCorner } from "./elements/noflo-project-corner.js";
import { FlowRuntimeCorner } from "./elements/noflo-runtime-corner.js";
import "./elements/noflo-schema-view.js";
import "./elements/noflo-schema-form.js";
import { NofloComponentView } from "./elements/noflo-component-view.js";
import { FlowSyncPanel } from "./elements/noflo-sync-panel.js";
import { FlowWorkDocView } from "./elements/noflo-workdoc-view.js";
import {
  connectivityWord,
  installDiagnostics,
  recordMeshState,
} from "./glass/diagnostics.js";
import { openDiagnosticsStore } from "./glass/diagnosticsStore.js";
import { telemetryBus } from "./glass/telemetryBus.js";
import "./elements/noflo-mesh-settings.js";
import { createEchoHandlers, echoKey } from "./glass/echo-handlers.js";
import { trackInputState } from "./glass/input-state.js";
import "./elements/noflo-selection-pills.js";
import { CATALOGS } from "../vendor/fbp-protocol.js";
import { emit, on } from "./events.js";
import {
  compatibleComponents,
  createIntentMapper,
} from "./glass/intentMapping.js";
import { createPendingTracker } from "./glass/pendingState.js";
import {
  graphParent,
  makeSubgraphIntent,
  projectGraph,
  revokePermissionIntent,
  subgraphComponentFor,
} from "./glass/projectView.js";
import { renderGraphIntoEditor } from "./glass/renderGraph.js";
import { createRouter, routeToScreen } from "./glass/router.js";
import {
  openJsonPrompt,
  openTextPrompt,
  setModalFeedback,
  wireExportRename,
  wireGraphRename,
  wireGroupRename,
  wireNodeRename,
  wireRouteNaming,
} from "./glass/text-prompt.js";
import { validateMetadata } from "./library/forms/catalogs.js";
import { LibraryManager } from "./library/LibraryManager.js";
import { routeName as displayRouteName } from "./library/routes.js";
import { buildSignatureSchema } from "./library/schema.js";
import { schemaCache } from "./library/schemaCache.js";
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
// The debug handle (work document #56's diagnosability): the smoke layer
// and flight recorder read the Glass's live state through it. Named
// deliberately; not used by the application itself.
window.__nofloDebug = {
  get mirrorDoc() {
    return mirrorDoc;
  },
};

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
/** The last connectivity word the diagnostics log recorded — transitions
 * only, so a chatty ingest does not spam the log. */
let lastConnectivityWord = "";
/** Whether the diagnostics log holds anything (persisted entries from
 * earlier sessions count): the surface stays reachable even where the
 * mesh is unused. */
let diagnosticsPresent = false;
/** Main-thread identity recovery attempted at most once per session. */
let identityRecoveryAttempted = false;
/** Peers awaiting an access decision, reported by the Engine. */
let joinRequests =
  /** @type {Array<{ identityHash: string, destinationHash: string | null, firstSeen: number, source?: string }>} */ ([]);
/** Last generated invite URI, reported by the Engine. */
let meshInviteUri = "";
/** JSON Schemas per mesh interface type, for the settings dialog. */
let meshInterfaceSchemas = /** @type {{ [type: string]: any }} */ ({});
/** Interfaces the mesh layer attached by default (work document #47's
 * legibility): the settings dialog renders them read-only. */
let meshRuntimeInterfaces =
  /** @type {Array<{ type: string, options: Record<string, any>, reason: string }> | null} */ (
    null
  );
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
/** Connected peer ids, from the Engine's mesh-peers events. Peer ids are
 * the transport's link ids; identities arrive alongside (work document
 * #28). */
/** @type {Record<string, string>} */
let meshPeerIdentities = {};
/**
 * Narrates a worker death (work document #34 vocabulary, work document
 * #56's finding): a worker whose module graph fails to load dies
 * silently — the watchdog respawns it, but the Glass must say what
 * happened.
 *
 * @param {{ message: string, filename?: string, lineno?: number }} error
 */
function narrateWorkerError(error) {
  narration = {
    phrase: "The engine worker failed to load",
    operation: "engine.boot",
    stage: "failed",
    failed: true,
  };
  refreshSyncPanel();
  console.error(
    `Engine worker error: ${error.message}${error.filename ? ` (${error.filename}:${error.lineno ?? "?"})` : ""}`,
  );
}
/** Peer reachability (work document #47): granted peers are online or
 * offline — offline is the mesh's normal state, rendered as such instead
 * of a path request that looks stuck. */
/** @type {Record<string, "online" | "offline">} */
let peerReachability = {};
/** The discovered FBP runtime population (work document #59): the
 * Engine's `runtime-discovered` report, newest announce first. */
let runtimeRuntimes =
  /** @type {Array<{ destinationHash: string, nodeName: string, protocolVersion: number, lastSeen: number }>} */ ([]);
/** Per-runtime connection state (work document #59), keyed by the hex
 * destination hash: the `runtime-connection` echoes, latest per runtime. */
const runtimeConnections =
  /** @type {Map<string, { state: string, nodeName: string | null, capabilityMask?: number, capabilities?: string[], protocolVersion?: number, error?: string }>} */
  (new Map());
/** Per-runtime deploy state (work document #59 Phase A), keyed by the hex
 * destination hash: the latest `runtime-deploy` echo per runtime. */
const runtimeDeploys =
  /** @type {Map<string, { graphId: string, state: string, ops?: number, skipped?: number, error?: string }>} */
  (new Map());
/** Per-runtime process listings (work document #59 Phase A), keyed by the
 * hex destination hash: node id → { component, type, state }. */
const runtimeProcesses =
  /** @type {Map<string, Record<string, { component: string, type: string, state: number | string }>>} */
  (new Map());
/** Per-runtime run state (work document #59 Phase A), keyed by the hex
 * destination hash: the latest `runtime-run` echo per runtime. */
const runtimeRuns =
  /** @type {Map<string, { state: string, error?: string }>} */
  (new Map());
/** The Engine's undo-journal availability report (work document #39). */
let undoState = /** @type {any} */ (null);
/** The project's work documents (work document #9), newest edit first. */
let workDocs = /** @type {any[]} */ ([]);
/** Whether the next workdoc/created echo is this session's own creation. */
let pendingWorkDocCreate = false;
/** The document id whose first open should land in edit mode. */

/** A document route awaiting its data: a reload lands on the route before
 * the project loads from persistence (work document #9). */
let pendingWorkDocOpen = /** @type {string | null} */ (null);
/** Whether the deferred open lands in edit mode (a fresh creation). */
let pendingWorkDocEditing = false;
/** The freshly created document whose first open lands in edit mode (work
 * document #9: naming is the whole prompt). */
let pendingWorkDocEditId = /** @type {string | null} */ (null);
let meshPeers = /** @type {string[]} */ ([]);
/** @type {FlowSyncPanel | null} */
let syncPanel = null;
/** @type {FlowRuntimeCorner | null} */
let runtimeCorner = null;
/** The schema editor view (work document #57 update #1). */
let schemaView = null;
/** @type {NofloComponentView | null} The full-screen component editor
 * (work document #62): signature + code in one surface. */
let componentView = null;
/** The component route pending its mirror data (the workdoc flow's
 * deferred-open pattern, work document #57's boot lag). */
let pendingComponentOpen = /** @type {string | null} */ (null);

/** The pending schema-fetch awaiters (work document #57): the echoes
 * resolve them once the bodies ingest. */
const schemaCachePendingResolvers = /** @type {Array<() => void>} */ ([]);
/** @type {FlowContextChip | null} */
let contextChip = null;
/** @type {FlowEditor | null} */
let editor = null;
/** @type {NofloModal | null} */
let componentModal = null;
/** The component code editor (work document #29): CodeMirror bound to the
 * mirror's collaborative code buffer through yCollab; local deltas relay
 * as setComponentCode intents (the Worker holds write authority). */
/** @type {any} */
/** The vendored CodeMirror surface, handed to the editor element (one
 * module instance per context: the vendor bundle). */
const codeMirrorSurface = {
  EditorView,
  basicSetup,
  javascript,
  markdown,
  yCollab,
  ySyncFacet,
  HighlightStyle,
  syntaxHighlighting,
  tags,
};
// The boot log (work document #56's diagnosability thrust): what the
// RUNNING app actually holds — a stale served copy or cached modules
// show up here as missing surface members instead of silent breakage.
console.info(
  `[noflo-ui] boot — codemirror surface: ${[
    "EditorView",
    "basicSetup",
    "javascript",
    "markdown",
    "yCollab",
    "ySyncFacet",
    "HighlightStyle",
    "syntaxHighlighting",
    "tags",
  ]
    .map(
      (name) =>
        `${name}=${typeof codeMirrorSurface[/** @type {keyof typeof codeMirrorSurface} */ (name)]}`,
    )
    .join(", ")}`,
);
/** @type {FlowComponentPicker | null} */
let componentPicker = null;
/** Node ids seen per graph, so freshly appeared nodes (local or synced)
 * spring in and shimmer exactly once (work document #5 update #16). */
const seenNodes = new Map();
/** A radial menu is open: renders defer until it closes, so cycling
 * (routes) doesn't destroy the menu and the selection. */
let menuOpen = false;
let renderQueuedWhileMenuOpen = false;
/** @type {import("./events.js").SelectionSnapshot} */
let currentSelection = { nodes: [], iips: [], edges: [], ports: [] };
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
  // Catalog conformance (work document #57): metadata-bearing intents
  // validate against the shipped ui catalog at send time — Tier B, hard
  // enforcement, an invalid payload is never silently sent
  if (message.type === "INTENT" && !validateIntentMetadata(message)) {
    return;
  }
  // Optimistic pending state (work document #21): track what this intent
  // will touch until the replica confirms the CRDT merge
  pendingTracker.markIntent(message, activeGraphId);
  applyPendingState();
  supervisor.send(message);
}

/**
 * The entity kind each metadata-bearing intent writes (work document #57).
 *
 * @type {Record<string, { kind: import("./library/forms/catalogs.js").EntityKind, strip: string[] }>}
 *   `strip` names payload fields checked as top-level values (the route
 *   keys that ride the intent body rather than a metadata map).
 */
const METADATA_INTENTS = {
  addNode: { kind: "node", strip: [] },
  moveNode: { kind: "node", strip: [] },
  addIIP: { kind: "iip", strip: [] },
  moveIIP: { kind: "iip", strip: [] },
  moveExport: { kind: "export", strip: [] },
};

/**
 * Validates a metadata-bearing intent against the ui catalog. Returns
 * false when the payload fails — the caller refuses the send.
 *
 * @param {any} message
 * @returns {boolean}
 */
function validateIntentMetadata(message) {
  const mapping = METADATA_INTENTS[message.command];
  if (!mapping) return true;
  const metadata = message.payload?.metadata;
  if (!metadata) return true;
  const errors = validateMetadata("ui", metadata, mapping.kind);
  if (errors.length === 0) return true;
  console.warn(
    `[catalog] ${message.command} refused: ${errors.map((e) => `${e.key} ${e.message}`).join("; ")}`,
  );
  return false;
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
 * @param {(error: { message: string, filename?: string, lineno?: number }) => void} onError
 *   The worker's error-event surface (work document #56: a module-graph
 *   failure dies silently without it).
 * @returns {import("./worker/EngineSupervisor.js").WorkerLike}
 */
function spawnEngineWorker(onError) {
  const worker = new Worker("src/worker/engine.js", { type: "module" });
  // Register the error handler on the worker's error event (work
  // document #56): a worker whose module graph fails to load dies
  // silently without it
  worker.onerror = (event) =>
    onError?.({
      message: event.message ?? "unknown worker error",
      filename: event.filename,
      lineno: event.lineno,
    });
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
    refreshProjectCorner();
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
    meshRuntimeInterfaces = data.runtimeInterfaces ?? null;
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
    // The Runtime corner shares the disclosure gate (work document #59):
    // the mesh coming up is when the corner may show, even before any
    // runtime has announced
    refreshRuntimeCorner();
  },
  setMeshInvite: (uri) => {
    meshInviteUri = uri;
    refreshMeshSettings();
    refreshSyncPanel();
  },
  updateMeshPeers: (
    added,
    removed,
    /** @type {number} */ _peers = 0,
    /** @type {Record<string, string>} */ identities = {},
  ) => {
    meshPeers = meshPeers.filter((peerId) => !removed.includes(peerId));
    for (const peerId of added) {
      if (!meshPeers.includes(peerId)) meshPeers.push(peerId);
    }
    // The Glass renders identities: the mapping merges with what arrived
    // before (peer ids are the transport's link ids, work document #28)
    meshPeerIdentities = { ...meshPeerIdentities, ...identities };
    for (const peerId of removed) {
      delete meshPeerIdentities[peerId];
    }
    refreshSyncPanel();
  },
  updatePeerReachability: (states) => {
    peerReachability = states ?? {};
    refreshSyncPanel();
  },
  setJoinRequests: (requests) => {
    joinRequests = requests;
    refreshMeshSettings();
    refreshSyncPanel();
  },
  setRuntimeDiscovery: (runtimes) => {
    runtimeRuntimes = runtimes;
    refreshRuntimeCorner();
  },
  setRuntimeConnection: (connection) => {
    runtimeConnections.set(connection.destinationHash, connection);
    refreshRuntimeCorner();
  },
  setRuntimeDeploy: (deploy) => {
    runtimeDeploys.set(deploy.destinationHash, deploy);
    refreshRuntimeCorner();
  },
  setRuntimeProcesses: (report) => {
    runtimeProcesses.set(report.destinationHash, report.entries ?? {});
    refreshRuntimeCorner();
  },
  setRuntimeRun: (report) => {
    runtimeRuns.set(report.destinationHash, {
      state: report.state,
      error: report.error,
    });
    refreshRuntimeCorner();
  },
  // The telemetry bus (work document #63): the segment accordions'
  // fan-out — the echo dispatch publishes, the bus buffers and fans out
  emitTelemetry: (stream, entry) => {
    telemetryBus().publish(stream, entry);
  },
  runtimeSchemasFetched: (_destinationHash, schemas) => {
    for (const { body } of schemas) {
      schemaCache().put(body);
      if (schemaCachePendingResolvers.length > 0) {
        const resolve = schemaCachePendingResolvers.shift();
        resolve?.();
      }
    }
  },
  reloadIntoFreshBoot: () => {
    location.reload();
  },
  setDacarState: (state) => {
    dacarState = state;
    refreshMeshSettings();
    refreshSyncPanel();
  },
  setUndoState: (state) => {
    undoState = state;
    refreshSyncPanel();
  },
  schemaChanged: (name, action) => {
    refreshProjectCorner();
    refreshSchemaView(name, action);
  },
  workDocCreated: (payload) => {
    if (!pendingWorkDocCreate) return;
    pendingWorkDocCreate = false;
    // The document exists: navigate to its screen (the route change
    // activates it — edit mode for a fresh creation rides the deferred
    // open, since the replica may confirm after the echo)
    pendingWorkDocEditId = payload.id;
    router?.navigate({ kind: "doc", id: payload.id });
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
  if (menuOpen) {
    renderQueuedWhileMenuOpen = true;
    return;
  }
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
  // The document route (work document #9) is not a graph route: the
  // workdoc view owns it, the graph fallback must not redirect it
  if (activeGraphId.startsWith("doc/")) return;
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

/**
 * Opens the component code editor (work document #29): CodeMirror bound
 * to the mirror's Y.Text via yCollab — remote edits stream in through
 * the y-update echo channel, local keystrokes relay as delta intents.
 *
 * @param {string} componentName
 * @param {string} language
 */

/**
 * Projects the mirror's work documents for the Project corner (work
 * document #9): the rows the corner renders, newest edit first.
 */
function refreshProjectCorner() {
  const projectCorner = /** @type {any} */ (
    document.getElementById("project-corner")
  );
  if (!projectCorner) return;
  projectCorner.setRngitRemote(
    String(mirrorDoc?.getMap("metadata")?.get("workdocsRepo") ?? ""),
  );
  const workdocs = mirrorDoc?.getMap("workdocs");
  if (!workdocs) {
    projectCorner.setWorkDocs([]);
    return;
  }
  workDocs = [...workdocs.values()].map((/** @type {any} */ record) => {
    const plain = record.toJSON();
    return {
      id: plain.id,
      title: plain.title,
      scope: plain.scope,
      pendingScope: plain.pendingScope,
      boardId: plain.boardId ?? null,
      edited: plain.edited ?? 0,
    };
  });
  projectCorner.setWorkDocs(workDocs);
  projectCorner.setSchemas(
    getSchemas(mirrorDoc).map(({ name, provenance }) => ({ name, provenance })),
  );
  // A deferred component route opens once its data exists: the mirror
  // lags the route at boot (work document #57's editor)
  if (
    pendingComponentOpen &&
    mirrorDoc.getMap("registry").has(pendingComponentOpen)
  ) {
    const name = pendingComponentOpen;
    pendingComponentOpen = null;
    activateScreen({ kind: "component", id: name });
  }
  // A deferred document route opens once its data exists: a reload lands
  // on the route before the project loads from persistence (work
  // document #9)
  if (pendingWorkDocOpen && workdocs.get(pendingWorkDocOpen)) {
    const docId = pendingWorkDocOpen;
    const editing = pendingWorkDocEditing;
    pendingWorkDocOpen = null;
    pendingWorkDocEditing = false;
    activateScreen({ kind: "doc", id: docId }, { editing });
  }
  // The open document view's metadata refreshes from the replica (work
  // document #9): the body renders live through the collaborative
  // binding, so only the thread and governance state refresh
  const view = /** @type {any} */ (document.getElementById("workdoc-view"));
  if (!view?._doc) return;
  const record = /** @type {any} */ (workdocs.get(view._doc.id));
  if (record) {
    const plain = record.toJSON();
    view.refresh?.({
      title: plain.title,
      scope: plain.scope,
      pendingScope: plain.pendingScope,
      boardId: plain.boardId ?? null,
      updates: plain.updates ?? [],
    });
  }
}

/**
 * Opens a work document's view (work document #9): the primary element
 * with the title, the scope state, and the collaborative content.
 *
 * @param {string} docId
 */
function openWorkDoc(docId, editing = false) {
  const view = /** @type {any} */ (document.getElementById("workdoc-view"));
  const workdocs = mirrorDoc?.getMap("workdocs");
  const record = /** @type {any} */ (workdocs?.get(docId));
  if (!view || !record) {
    console.warn(`[workdoc] ${docId} not found`);
    return;
  }
  const plain = record.toJSON();
  view.open({
    doc: {
      id: plain.id,
      title: plain.title,
      scope: plain.scope,
      pendingScope: plain.pendingScope,
      boardId: plain.boardId ?? null,
      edited: plain.edited,
      updates: plain.updates ?? [],
    },
    ytext: record.get("content"),
    cm: codeMirrorSurface,
    // A freshly created document lands in edit mode: naming it is the
    // whole prompt, writing the body is the point
    editing,
  });
  updateContextChip();
}

/**
 * Opens the schema view (work document #57 update #1): the mirror's
 * record binds as the collaborative buffer; the meta-schema gate lives in
 * the view.
 *
 * @param {string} name
 */
function openSchemaView(name) {
  const view = /** @type {any} */ (document.getElementById("schema-view"));
  const record = /** @type {any} */ (getSchema(mirrorDoc, name));
  if (!view || !record) {
    console.warn(`[schema] ${name} not found`);
    return;
  }
  view.open({
    name,
    provenance: record.get("provenance") ?? "authored",
    origin: record.get("origin") ?? null,
    digest: record.get("digest") ?? "",
    ytext: record.get("body"),
    cm: codeMirrorSurface,
    readOnly: record.get("provenance") !== "authored",
  });
  updateContextChip();
}

/**
 * Closes the work document view (back to the graph route).
 */
function closeWorkDoc() {
  /** @type {any} */ (document.getElementById("workdoc-view"))?.close();
}

/**
 * Re-renders the editor from the replica document.
 */
async function render() {
  resolveActiveGraph();
  bootstrapLibrary();
  const view = projectGraph(mirrorDoc, activeGraphId) ?? {
    processes: {},
    nodes: [],
    edges: [],
    initializers: [],
    connections: [],
    inports: {},
    outports: {},
    groups: [],
    properties: { name: activeGraphId },
  };
  const app = document.getElementById("app");
  if (!app) return;
  app.querySelectorAll("noflo-editor").forEach((el) => {
    el.remove();
  });
  const ed = /** @type {FlowEditor} */ (document.createElement("noflo-editor"));
  app.appendChild(ed);
  ed.libraryManager = libraryManager;
  // The expanded nodes' subgraph depictions render the child graph's
  // actual layout (work document #5): the shared minimap geometry
  ed.depictionSource = (name) => projectGraph(mirrorDoc, name);
  ed.unpackEnabled = true;
  // Move up needs a parent: the root graph has none
  ed.moveUpEnabled = Boolean(graphParent(mirrorDoc, activeGraphId));
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
    componentView = /** @type {NofloComponentView} */ (
      /** @type {any} */ (document.createElement("noflo-component-view"))
    );
    // The view lives on the body: #app hides while non-graph screens are
    // active, and a display:none ancestor would hide the view with it
    // (the modals' hosting rule). Its event wiring rides the creation —
    // render() runs deferred, so the init-time on(componentView) would
    // attach to a null element (the events.on no-op)
    componentView.hidden = true;
    document.body.appendChild(/** @type {Node} */ (componentView));
    on(componentView, "component-action", async (e) => {
      const { action, component } = e.detail;
      const current = String(componentView?._component ?? component);
      if (action === "close") {
        router?.navigate({ kind: "graph", id: activeGraphId });
        return;
      }
      if (action === "save") {
        const data = /** @type {any} */ (componentView?._form?.data);
        if (!data) return;
        const newName = String(data.name || component);
        const renamed = newName !== component;
        let target = component;
        if (renamed) {
          sendIntent({
            type: "INTENT",
            command: "forkComponent",
            payload: { component, to: newName },
          });
          target = newName;
        }
        sendIntent({
          type: "INTENT",
          command: "setSignature",
          payload: {
            component: target,
            signature: {
              inports: data.inports,
              outports: data.outports,
              description: data.description,
              icon: data.icon,
            },
          },
        });
        if (renamed) {
          // The fork takes over: the route follows the new name
          router?.navigate({ kind: "component", id: newName });
        }
        return;
      }
      if (action === "fork") {
        const to = `${component}-fork`;
        sendIntent({
          type: "INTENT",
          command: "forkComponent",
          payload: { component, to },
        });
        router?.navigate({ kind: "component", id: to });
        return;
      }
      if (action === "implement-code") {
        sendIntent({
          type: "INTENT",
          command: "implementInCode",
          payload: {
            component,
            language: "javascript",
            scaffold: codeScaffold(component),
          },
        });
        // The scaffold lands through the intent path; the code area binds
        // when the mirror picks the buffer up
        const map = /** @type {any} */ (mirrorDoc.getMap("components"));
        const ytext = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            map.unobserve(observe);
            resolve(null);
          }, 2000);
          const observe = (/** @type {any} */ event) => {
            if (event.target === map && map.get(component)?.get("code")) {
              clearTimeout(timeout);
              map.unobserve(observe);
              resolve(map.get(component).get("code"));
            }
          };
          map.observe(observe);
          if (map.get(component)?.get("code")) {
            clearTimeout(timeout);
            map.unobserve(observe);
            resolve(map.get(component).get("code"));
          }
        });
        if (ytext) componentView?.bindCode(ytext, "javascript");
        return;
      }
      if (action === "implement-graph") {
        sendIntent({
          type: "INTENT",
          command: "implementAsGraph",
          payload: { component, parentGraph: activeGraphId },
        });
        router?.navigate(component);
        return;
      }
      if (action === "open-implementation") {
        router?.navigate(component);
      }
    });
    on(componentView, "component-code-update", (e) => {
      sendIntent({
        type: "INTENT",
        command: "setComponentCode",
        payload: { component: e.detail.component, update: e.detail.update },
      });
    });
    // The signature form's collaborative writes (work document #64):
    // the binding's binary updates relay as the signature intent, the
    // Engine applying them with item structure intact — the same
    // pattern as the code buffer
    on(componentView, "signature-update", (e) => {
      sendIntent({
        type: "INTENT",
        command: "setSignature",
        payload: { component: e.detail.component, update: e.detail.update },
      });
    });
  }
  on(ed, "edge-menu-open", () => {
    menuOpen = true;
  });
  on(ed, "canvas-menu-open", () => {
    menuOpen = true;
  });
  window.addEventListener(
    "pointerdown",
    () => {
      if (!menuOpen) return;
      menuOpen = false;
      if (renderQueuedWhileMenuOpen) {
        renderQueuedWhileMenuOpen = false;
        scheduleRender();
      }
    },
    true,
  );
  on(ed, "selection-changed", (e) => {
    currentSelection = e.detail;
  });
  on(ed, "set-edge-route", (e) => {
    /** @type {any} */ (ed).previewEdgeRoute?.(e.detail.edgeId, e.detail.route);
  });
  on(ed, "edit-component-attempt", (e) => {
    const node = e.detail.node;
    const componentName = node?.getAttribute?.("component");
    if (!componentName) return;
    // One "Edit Component" per component kind (work document #5): a
    // subgraph opens its graph editor; a code implementation opens the
    // collaborative code editor; everything else opens the signature
    // editor — the sketch→specify step for stubs (work document #29)
    if (mirrorDoc.getMap("graphs").has(componentName)) {
      router?.navigate(componentName);
      return;
    }
    const implementation = /** @type {any} */ (
      mirrorDoc.getMap("components").get(componentName)
    )
      ?.get("metadata")
      ?.get("implementation");
    router?.navigate({ kind: "component", id: componentName });
  });
  // Exported-port rename (work document #5 update #36): the shell asks
  // for the new name in a modal, then rides the mapper's port-renamed path
  wireExportRename(ed, (direction, name) => {
    // Port names are unique per direction (work document #5): check
    // against the replica's current exports before sending the intent
    const view = projectGraph(mirrorDoc, activeGraphId);
    const ports = direction === "in" ? view?.inports : view?.outports;
    return Boolean(ports?.[name]);
  });
  // Route naming (work document #35's route context): the modal prefills
  // with the route's current display name — custom when the graph's route
  // table names it, the Tube line default otherwise
  wireRouteNaming(ed, (route) => {
    const table = /** @type {Record<string, { name?: string }> | undefined} */ (
      projectGraph(mirrorDoc, activeGraphId)?.properties?.routes
    );
    return displayRouteName(route, table);
  });
  // Group naming (work document #35's zone labels): the group menu's
  // Rename opens the modal prefilled with the group's current name
  wireGroupRename(ed, (groupId) => {
    const group = projectGraph(mirrorDoc, activeGraphId)?.groups?.find(
      (/** @type {any} */ entry) => entry.id === groupId,
    );
    return group?.name ?? "";
  });
  // The node's display-label rename (work document #64's small editors):
  // the modal prefills with the metadata label, defaulting to the id
  wireNodeRename(ed, (nodeId) => {
    const view = projectGraph(mirrorDoc, activeGraphId);
    const label = view?.processes?.[nodeId]?.metadata?.label;
    return typeof label === "string" && label.length > 0 ? label : nodeId;
  });
  // The graph's display-name rename: the routing id stays
  wireGraphRename(
    ed,
    (graphId) =>
      String(projectGraph(mirrorDoc, graphId)?.properties?.name ?? graphId),
    () => activeGraphId,
  );
  // The lines corner (work document #35 update #14): the per-line
  // diagrams' editor wiring rides the per-render editor — the corner's
  // data provider lives in init (it reads the projection fresh per
  // panel render), but the editor element is recreated per render
  const linesCorner = /** @type {any} */ (
    document.getElementById("lines-corner")
  );
  if (linesCorner) {
    linesCorner.editor = ed;
    on(ed, "line-selection-changed", (/** @type {any} */ e) => {
      linesCorner.setSelection(e.detail);
    });
  }
  // The small editors (work document #64): the metadata inspector opens
  // from the node menu, schema-driven per the component's declared
  // config schema
  on(ed, "node-metadata-attempt", (/** @type {any} */ e) => {
    const nodeId =
      /** @type {any} */ (e.detail.node).getAttribute("name") ?? "";
    _openNodeMetadataEditor(nodeId);
  });
  renderGraphIntoEditor(view, ed, (name) => libraryManager?.getComponent(name));
  // The minimap tracks the same projection (work document #5)
  ed.updateMinimap?.(view);
  // Groups render behind the nodes (work document #5 update #16)
  ed.setGroups(view.groups ?? []);
  // Freshly appeared nodes spring in and shimmer (work document #5
  // update #16): the diff against what this graph showed before. The
  // first sight of a graph seeds silently — a boot or a graph switch is
  // not a set of new nodes.
  const currentNodes = Object.keys(view.processes);
  let seen = seenNodes.get(activeGraphId);
  const firstSight = !seen;
  if (!seen) {
    seen = new Set();
    seenNodes.set(activeGraphId, seen);
  }
  const fresh = firstSight ? [] : currentNodes.filter((id) => !seen.has(id));
  for (const id of currentNodes) seen.add(id);
  if (fresh.length > 0) ed.animateNewNodes(fresh);
  applyPendingState();
  // Exported-port and IIP positions come from the view's metadata: the
  // noflo graph's loadJSON may not preserve custom metadata on
  // inports/outports, so the positions are applied from the projection
  // directly (work document #5 follow-up)
  for (const [name, info] of Object.entries(view.inports ?? {})) {
    if (info.metadata?.x === undefined) continue;
    const ep = /** @type {any} */ (
      ed.shadowRoot?.querySelector(`noflo-exported-port[name="${name}"]`)
    );
    if (!ep) continue;
    ep.position = { x: info.metadata.x, y: info.metadata.y };
    ed.spaceManager.updateEntity(name, ep.position);
  }
  for (const [name, info] of Object.entries(view.outports ?? {})) {
    if (info.metadata?.x === undefined) continue;
    const ep = /** @type {any} */ (
      ed.shadowRoot?.querySelector(`noflo-exported-port[name="${name}"]`)
    );
    if (!ep) continue;
    ep.position = { x: info.metadata.x, y: info.metadata.y };
    ed.spaceManager.updateEntity(name, ep.position);
  }
  for (const conn of view.connections ?? []) {
    if (conn.data === undefined || !conn.metadata?.id) continue;
    if (conn.metadata?.x === undefined) continue;
    const iip = /** @type {any} */ (
      ed.shadowRoot?.querySelector(`noflo-iip[id="${conn.metadata.id}"]`)
    );
    if (!iip) continue;
    iip.position = { x: conn.metadata.x, y: conn.metadata.y };
    ed.spaceManager.updateEntity(conn.metadata.id, iip.position);
  }
  // Restore the selection the previous editor element held (the Glass
  // carries it across rebuilds)
  const selection = currentSelection;
  if (selection.nodes.length > 0) {
    for (const id of selection.nodes) {
      ed.selectionManager.select("nodes", id, true);
    }
  }
  for (const id of selection.iips) {
    ed.selectionManager.select("iips", id, true);
  }
  for (const id of selection.edges) {
    ed.selectionManager.select("edges", id, true);
  }
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
  const dialog = /** @type {any} */ (
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
  const dialog = /** @type {any} */ (
    /** @type {any} */ (document.getElementById("mesh-settings-dialog"))
  );
  if (!dialog?._open) return;
  dialog.setDacarState(dacarState);
  if (meshConfig) {
    dialog._config = meshConfig;
    dialog._identityHash = meshIdentityHash;
    dialog._interfaceSchemas = meshInterfaceSchemas;
    dialog._runtimeInterfaces = meshRuntimeInterfaces;
    dialog._meshError = meshError;
    dialog.render();
  }
}

/**
 * A project schema changed (work document #57): the schema view refreshes
 * from the mirror; the route's schema screens re-open their replica
 * state.
 *
 * @param {string | undefined} _name
 * @param {string} _action
 */
function refreshSchemaView(_name, _action) {
  const view = /** @type {any} */ (document.getElementById("schema-view"));
  if (router?.route()?.kind !== "schema") return;
  view?.refresh();
}

/**
 * Feeds the project explorer (work document #63): the mirror's navigable
 * contents — graphs with their subgraph hierarchy, components, schemas,
 * specs, and work documents.
 */
function refreshProjectExplorer() {
  if (!contextChip || !mirrorDoc) return;
  const graphs = [...mirrorDoc.getMap("graphs").entries()].map(
    ([graphId, graph]) => ({
      name: graphId,
      parent: String(
        /** @type {any} */ (graph)?.get?.("metadata")?.get("parent") ?? "",
      ),
    }),
  );
  const components = [...mirrorDoc.getMap("registry").keys()];
  const schemas = getSchemas(mirrorDoc).map((record) => record.name);
  const specs = [...mirrorDoc.getMap("specs").keys()];
  const workDocs = [...mirrorDoc.getMap("workdocs").entries()].map(
    ([id, record]) => ({
      id,
      title: String(/** @type {any} */ (record)?.get?.("title") ?? id),
    }),
  );
  contextChip.setContents({
    projectName: String(mirrorDoc.getMap("metadata").get("name") ?? "Project"),
    graphs,
    components,
    schemas,
    specs,
    workDocs,
  });
  const route = router?.route();
  contextChip.setActive(
    route?.kind && route.kind !== "graph"
      ? { kind: route.kind, id: String(route.id ?? "") }
      : { kind: "graph", id: String(route?.graphId ?? "") },
  );
}

/**
 * Opens the full-screen component editor (work document #62): the
 * signature form and, once the component carries code, the collaborative
 * buffer — the implementation ladder in one surface.
 *
 * @param {string} componentName
 */
async function openComponentView(componentName) {
  if (!componentView || !mirrorDoc) return;
  const entry = /** @type {any} */ (
    mirrorDoc.getMap("registry").get(componentName)
  );
  const plain = entry?.toJSON() ?? {};
  const isSubgraph = mirrorDoc.getMap("graphs").has(componentName);
  const implementationMeta = /** @type {any} */ (
    mirrorDoc.getMap("components").get(componentName)
  )
    ?.get("metadata")
    ?.get("implementation");
  const implementation = isSubgraph
    ? "graph"
    : implementationMeta?.kind === "code"
      ? "code"
      : "stub";
  const signature = {
    name: componentName,
    icon: plain.icon || "gear",
    description: plain.description || "",
    inports: (plain.inports ?? []).map((/** @type {any} */ port) => ({
      name: port.name,
      type: port.type ?? "all",
      addressable: Boolean(port.addressable),
      schema: port.schema?.id ?? "",
    })),
    outports: (plain.outports ?? []).map((/** @type {any} */ port) => ({
      name: port.name,
      type: port.type ?? "all",
      addressable: Boolean(port.addressable),
      schema: port.schema?.id ?? "",
    })),
  };
  const schemaNames = getSchemas(mirrorDoc).map(
    (/** @type {any} */ record) => record.name,
  );
  await componentView.open({
    component: componentName,
    implementation,
    formSchema: buildSignatureSchema(schemaNames),
    signature,
    codeYtext:
      implementation === "code"
        ? /** @type {any} */ (
            mirrorDoc.getMap("components").get(componentName)?.get("code") ??
              null
          )
        : null,
    // The signature form binds to the mirror's registry entry (work
    // document #64): granular writes relay as binary updates; the
    // whole-write Save flow stays for creation and fork
    signatureYtype: mirrorDoc.getMap("components").get(componentName) ?? null,
    cm: codeMirrorSurface,
    codeLanguage: implementationMeta?.language ?? "javascript",
  });
  updateContextChip();
}

/**
 * Re-queries the runtime population from the Engine (work document #59):
 * discovery is push-based (announces echo as they arrive), but the Glass
 * asks on panel expansion so a quiet mesh still shows its cached
 * population.
 */
function refreshRuntimes() {
  supervisor?.send({ type: "MESH", command: "runtimeDiscover" });
}

/**
 * Feeds the Runtime corner (work documents #59/#15/#28, top-right) from
 * the Glass's runtime state: the FBP runtime population's home — the sync
 * panel stays the mesh peers' surface.
 */
function refreshRuntimeCorner() {
  const corner = /** @type {any} */ (document.getElementById("runtime-corner"));
  if (!corner) return;
  // The same disclosure gate as the sync panel: the mesh unused means no
  // corner UI
  corner.setVisible(Boolean(meshConfig && (meshConfig.enabled || meshError)));
  corner.setRuntimes(runtimeRuntimes, runtimeConnections);
  corner.setRuntimeActivity(runtimeProcesses, runtimeRuns, runtimeDeploys);
}

/**
 * Records a connectivity transition into the diagnostics log (work
 * document #63's app diagnostics tenant): the connectivity word changes
 * are the history — offline, syncing, up to date, mesh error — each with
 * the peer count as the detail when one exists.
 */
function diagnoseConnectivity() {
  const word = connectivityWord(syncStatus, meshError);
  if (word === lastConnectivityWord) return;
  lastConnectivityWord = word;
  const peers = syncStatus?.peers;
  const detail =
    typeof peers === "number" && peers > 0
      ? `${peers} peer${peers === 1 ? "" : "s"}`
      : "";
  recordMeshState(word, detail);
  diagnosticsPresent = true;
}

/**
 * Feeds the corner sync/presence panel (work document #28) from the Glass's
 * mesh state: a pure view over the Engine's existing messages.
 */
function refreshSyncPanel() {
  if (!syncPanel) return;
  // The connectivity history rides the same feed: record the transition
  // when the connectivity word changes (transitions only, never ticks)
  diagnoseConnectivity();
  // Hidden until the mesh is in use: a device that never enabled sync
  // shows no corner UI (work document #28's disclosure rules) — but the
  // diagnostics log keeps the corner reachable (no silent failures)
  syncPanel.setVisible(
    Boolean(meshConfig && (meshConfig.enabled || meshError)) ||
      diagnosticsPresent,
  );
  syncPanel.setSyncStatus(syncStatus);
  syncPanel.setNarration(narration);
  syncPanel.setPeers(meshPeers, meshPeerIdentities, peerReachability);
  syncPanel.setJoinRequests(joinRequests);
  syncPanel.setJoinProgress(joinProgress);
  syncPanel.setDacarState(dacarState);
  syncPanel.setUndoState(undoState);
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
  // The workdoc screen (work document #9, #62's unified nav): the chip's
  // label is the document's title and up navigates back to the graph
  // The open document's id: the deferred route (pending) or the live view
  const openView = /** @type {any} */ (document.getElementById("workdoc-view"));
  const workdocId = pendingWorkDocOpen ?? openView?._doc?.id ?? null;
  if (workdocId) {
    const record = /** @type {any} */ (
      mirrorDoc?.getMap("workdocs")?.get(workdocId)
    );
    const title = record?.toJSON().title ?? "Work document";
    contextChip.setWorkDoc(workdocId, `${projectName} · ${title}`);
    return;
  }
  contextChip.clearWorkDoc();
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
      onError: narrateWorkerError,
    });
    supervisor.send({
      type: "LIFECYCLE",
      command: "subscribe",
      payload: { graphId: activeGraphId },
    });
  }
}

/**
 * Applies a theme to the whole Glass (work document #5 follow-up): the
 * themes are the body's data-theme values — cyberpunk is dark, tube is
 * light. Remembered per device through localStorage and synced across
 * tabs through the storage event.
 *
 * @param {string} theme
 */
/**
 * The datatypes the std catalog declares opaque: no form is rendered,
 * IIP validation is skipped — a defined outcome, not a gap (work document
 * #37 §3.3).
 *
 * @param {string} dataType
 * @returns {boolean}
 */
function isOpaqueDatatype(dataType) {
  const entry = /** @type {any} */ (CATALOGS.std.types[dataType]);
  return entry?.opaque === true;
}

/**
 * Fetches schema bodies from every connected runtime (work document #57):
 * the bridge fetches over 0x28/0x29 digest-verified, and the echoes
 * ingest into the Glass's schema cache.
 *
 * @param {string[]} digests
 * @returns {Promise<void>} Resolves once the echoes have had their window.
 */
async function fetchRuntimeSchemas(digests) {
  const destinations = [...runtimeConnections.entries()]
    .filter(([, connection]) => connection.state === "connected")
    .map(([hash]) => hash);
  if (destinations.length === 0) return;
  const awaiters = digests.map(
    () =>
      new Promise((resolve) => {
        schemaCachePendingResolvers.push(() => resolve(undefined));
      }),
  );
  for (const hash of destinations) {
    supervisor?.send({
      type: "MESH",
      command: "runtimeSchemas",
      payload: { destinationHash: hash, digests },
    });
  }
  // The echoes ingest as they arrive; a quiet window is the ladder's
  // miss — the editor falls through to the fallback
  await Promise.race([
    Promise.all(awaiters),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  schemaCachePendingResolvers.length = 0;
}

/**
 * Opens the node metadata inspector (work document #64's small editors):
 * a schema-driven form over the node's metadata — the schema resolves
 * from the component's config-schema composition when the library
 * carries one (work document #44's catalogs, advertised via the
 * component details), falling back to the built-in display keys until
 * the runtime feeds it. The form binds to the node's metadata Y.Map via
 * y-jedison with `keys` scoping: the form manages only its declared
 * keys, the intent-managed position stays untouched, and the binding's
 * writes relay as the setNodeMetadata intent's binary update.
 *
 * @param {string} nodeId The node's id.
 * @returns {Promise<void>}
 */
async function _openNodeMetadataEditor(nodeId) {
  if (!componentModal) return;
  const view = projectGraph(mirrorDoc, activeGraphId);
  const process = view?.processes?.[nodeId];
  if (!process) return;
  const component = libraryManager?.getComponent(process.component);
  // The display keys ride every schema (work document #64): the
  // component's config-schema composition (work document #44's
  // catalogs) carries its own keys, but the label — the display
  // rename — and the description are the Glass's UI concerns and are
  // always editable. The label leads so it renders first and takes the
  // focus
  const configProps =
    component?.configSchema && typeof component.configSchema === "object"
      ? /** @type {any} */ (component.configSchema.properties ?? {})
      : {};
  const schema = {
    title: "Node metadata",
    type: "object",
    additionalProperties: false,
    properties: {
      label: {
        type: "string",
        title: "Label",
        description:
          "The station's display name; the id stays the wire identity",
      },
      description: {
        type: "string",
        title: "Description",
      },
      ...configProps,
    },
  };
  // The form's keys scope the binding: the intent-managed position
  // (`x`/`y`) and anything else outside the schema stays untouched
  const formKeys = Object.keys(/** @type {any} */ (schema).properties ?? {});

  // The form's data is the metadata's FORM KEYS ONLY: the intent-managed
  // position (`x`/`y`) and any other foreign keys never enter the form,
  // so the declared schema's `additionalProperties: false` can never
  // reject the editor's own bookkeeping
  const allMetadata = /** @type {Record<string, any>} */ ({
    ...(process.metadata ?? {}),
  });
  const current = /** @type {Record<string, any>} */ ({});
  for (const key of formKeys) {
    const value = allMetadata[key];
    if (value !== undefined && value !== null) current[key] = value;
  }

  let schemaFormEl = /** @type {any} */ (
    componentModal.querySelector("noflo-schema-form")
  );
  if (!schemaFormEl) {
    schemaFormEl = /** @type {any} */ (
      document.createElement("noflo-schema-form")
    );
    componentModal.appendChild(schemaFormEl);
  }
  componentForm.style.display = "none";
  schemaFormEl.style.display = "block";
  schemaFormEl.refResolver = (/** @type {string} */ ref) =>
    schemaCache().getRef(ref);
  schemaFormEl.schema = schema;
  schemaFormEl.data = current;
  let lastChange = { data: current, isValid: true, errors: [] };
  schemaFormEl.addEventListener("form-change", (/** @type {any} */ e) => {
    lastChange = e.detail;
  });

  const metadataYmap = /** @type {any} */ (
    mirrorDoc
      .getMap("graphs")
      .get(activeGraphId)
      ?.get("nodes")
      ?.get(nodeId)
      ?.get("metadata")
  );
  /** @type {any} */
  let binding = null;
  /** @type {((update: Uint8Array, origin: any) => void) | null} */
  let relay = null;
  if (metadataYmap && formKeys.length > 0) {
    const origin = `node-metadata:${nodeId}`;
    binding = yJedison(schemaFormBinding(schemaFormEl, "yjs"), metadataYmap, {
      origin,
      keys: formKeys,
    });
    // The label prefills with the current effective name — the id when
    // the metadata carries no label yet. The prefill is form-only: the
    // suppression echoes it back with the binding's initiator, so
    // nothing writes to the shared type merely by opening the editor
    const reconciled = schemaFormEl.data;
    if (reconciled && reconciled.label === undefined) {
      schemaFormEl.data = { ...reconciled, label: nodeId };
    }
    relay = (
      /** @type {Uint8Array} */ update,
      /** @type {any} */ transactionOrigin,
    ) => {
      if (transactionOrigin !== origin) return;
      sendIntent({
        type: "INTENT",
        command: "setNodeMetadata",
        payload: { graphId: activeGraphId, nodeId, update },
      });
    };
    mirrorDoc.on("update", relay);
  }

  componentModal.setActions([
    { value: "cancel", label: "Cancel", kind: "btn-secondary" },
    { value: "save", label: "Save", kind: "btn-primary" },
  ]);
  componentModal.open(`Edit metadata · ${nodeId}`);
  // The rename's continuity: the label field takes the focus, so the
  // menu item reads as a rename that happens to carry the metadata
  await (async () => {
    try {
      await schemaFormEl.building;
      const label =
        schemaFormEl.shadowRoot?.querySelector(".schema-form input");
      label?.focus();
    } catch {
      // The form's preparation failed; the render is still visible
    }
  })();
  const action = await componentModal.submit();
  if (binding) {
    binding.destroy();
    binding = null;
  }
  if (relay) {
    mirrorDoc.off("update", relay);
    relay = null;
  }
  schemaFormEl.style.display = "none";
  componentForm.style.display = "";
  if (action !== "save") return;
  if (!lastChange.isValid) {
    setModalFeedback(
      componentModal,
      "The metadata fails the component's schema",
      schemaFormEl,
    );
    return _openNodeMetadataEditor(nodeId);
  }
  sendIntent({
    type: "INTENT",
    command: "setNodeMetadata",
    payload: {
      graphId: activeGraphId,
      nodeId,
      metadata: lastChange.data,
    },
  });
}

/**
 * Opens the IIP value editor (work document #5 follow-up, upgraded per
 * #57): the schema-driven form renders from the port's schema reference
 * when one is declared — resolved through the project's schemas and the
 * schema cache — else from the std catalog's datatype mapping, else the
 * raw JSON prompt takes the value (the declared opaque and unconstrained
 * path). Tier B validation gates the save: an invalid value is never
 * silently sent.
 *
 * @param {string} title
 * @param {string} rawValue The IIP's stored value.
 * @param {string} dataType The target port's datatype.
 * @param {{ id: string, digest?: string }} [schemaRef] The port's schema
 *   artifact reference.
 * @returns {Promise<any | null>}
 */
async function _openIIPValueEditor(
  title,
  rawValue,
  dataType,
  schemaRef,
  iipId = /** @type {string | undefined} */ (undefined),
) {
  if (!componentModal) return null;
  /** @type {any} */
  let schema = null;
  /** @type {string | null} */
  let schemaLabel = null;
  if (schemaRef?.id) {
    const record = /** @type {any} */ (getSchema(mirrorDoc, schemaRef.id));
    if (record) {
      try {
        schema = JSON.parse(record.get("body") ?? "");
        schemaLabel = schemaRef.id;
      } catch {
        // The authored body is unparseable: fall through to the catalog
      }
    } else if (schemaRef.digest) {
      // A foreign pin: the schema cache resolves by digest; a miss asks
      // the connected runtimes (the 0x28/0x29 fetch — the offline
      // ladder's exception path) and re-reads once the echoes ingest
      let body = await schemaCache().get(schemaRef.digest);
      if (!body) {
        await fetchRuntimeSchemas([schemaRef.digest]);
        body = await schemaCache().get(schemaRef.digest);
      }
      if (body) {
        schema = body;
        schemaLabel = schemaRef.id;
      }
    }
  }
  if (!schema) {
    const entry = /** @type {any} */ (CATALOGS.std.types[dataType]);
    if (entry?.schema) {
      schema = entry.schema;
      schemaLabel = `std/${dataType}`;
    }
  }
  // The declared opaque path and the unconstrained datatype: the raw
  // JSON prompt takes the value, evaluated on save
  if (!schema || dataType === "all") {
    return openJsonPrompt({
      title,
      value: rawValue ?? "",
      confirmLabel: "Save",
    });
  }

  let schemaFormEl = /** @type {any} */ (
    componentModal.querySelector("noflo-schema-form")
  );
  if (!schemaFormEl) {
    schemaFormEl = /** @type {any} */ (
      document.createElement("noflo-schema-form")
    );
    componentModal.appendChild(schemaFormEl);
  }
  // The incumbent jedison form hides while the schema form shows
  componentForm.style.display = "none";
  schemaFormEl.style.display = "block";
  schemaFormEl.refResolver = (/** @type {string} */ ref) =>
    schemaCache().getRef(ref);
  schemaFormEl.schema = schema;
  schemaFormEl.data = parseIIPValue(rawValue);
  /** The live change report: Tier B's validity gates the save. */
  let lastChange = { data: parseIIPValue(rawValue), isValid: true, errors: [] };
  schemaFormEl.addEventListener("form-change", (/** @type {any} */ e) => {
    lastChange = e.detail;
  });

  // The collaborative value (work document #64): when the IIP's data is
  // a granular shared type (objects and arrays — scalars stay plain),
  // the declared form binds to it via y-jedison through an adapter that
  // satisfies the binding's editor contract on top of the schema form's
  // own. The binding's writes relay as the updateIIP intent's binary
  // update, origin-scoped so nothing else on the mirror document is
  // mistaken for this editor's work. #57's architecture stands: the
  // schema-driven rendering, the Tier B gating, and the raw-JSON
  // fallback for the unconstrained datatype are untouched
  let binding = null;
  let relay = null;
  if (iipId) {
    const dataYtype = /** @type {any} */ (
      mirrorDoc
        .getMap("graphs")
        .get(activeGraphId)
        ?.get("edges")
        ?.get(iipId)
        ?.get("data")
    );
    const isGranularMap =
      dataYtype &&
      typeof dataYtype.set === "function" &&
      typeof dataYtype.size === "number";
    const isGranularArray = dataYtype && typeof dataYtype.insert === "function";
    if (isGranularMap || isGranularArray) {
      const origin = `iip:${iipId}`;
      binding = yJedison(schemaFormBinding(schemaFormEl), dataYtype, {
        origin,
      });

      relay = (
        /** @type {Uint8Array} */ update,
        /** @type {any} */ transactionOrigin,
      ) => {
        if (transactionOrigin !== origin) return;
        sendIntent({
          type: "INTENT",
          command: "updateIIP",
          payload: { graphId: activeGraphId, id: iipId, update },
        });
      };
      mirrorDoc.on("update", relay);
    }
  }

  componentModal.setActions([
    { value: "cancel", label: "Cancel", kind: "btn-secondary" },
    { value: "save", label: "Save", kind: "btn-primary" },
  ]);
  componentModal.open(title);
  const action = await componentModal.submit();
  if (binding) {
    binding.destroy();
    binding = null;
  }
  if (relay) {
    mirrorDoc.off("update", relay);
    relay = null;
  }
  componentForm.style.display = "";
  schemaFormEl.style.display = "none";
  if (action !== "save") return null;
  if (!lastChange.isValid) {
    // Tier B hard enforcement: an invalid value is never silently sent —
    // the editor re-opens with the failure beside the controls
    setModalFeedback(
      componentModal,
      "The value fails the port's schema",
      schemaFormEl,
    );
    return _openIIPValueEditor(title, rawValue, dataType, schemaRef);
  }
  return lastChange.data;
}

/**
 * Opens the signature editor in create mode (work document #5 follow-up):
 * the component does not exist yet — the user names it in the form, and
 * the resolved data carries the name plus the declared signature.
 * Replaces the window.prompt in node creation and splicing.
 *
 * @param {any} prefillPorts Optional inport/outport prefill from the
 *   typed-port guiding.
 * @returns {Promise<{ name: string, signature: any } | null>}
 */
async function openSignatureEditorCreate(prefillPorts) {
  if (!componentModal || !componentForm) return null;
  componentModal.setActions([
    { value: "cancel", label: "Cancel", kind: "btn-secondary" },
    { value: "save", label: "Create", kind: "btn-primary" },
  ]);
  componentModal.open("New component");
  componentForm.schema = buildSignatureSchema(
    getSchemas(mirrorDoc).map((/** @type {any} */ record) => record.name),
  );
  componentForm.data = {
    name: "New Node",
    icon: "gear",
    description: "",
    inports: prefillPorts?.inports ?? [{ name: "in", type: "all" }],
    outports: prefillPorts?.outports ?? [{ name: "out", type: "all" }],
  };
  let action = await componentModal.submit();
  while (action === "save") {
    const duplicates = duplicatePortNames(componentForm.data);
    if (duplicates.length === 0) break;
    setModalFeedback(
      componentModal,
      `Port names must be unique per direction: ${duplicates.join(", ")}`,
      componentForm,
    );
    componentModal.open("New component");
    action = await componentModal.submit();
  }
  setModalFeedback(componentModal, "", componentForm);
  if (action !== "save") return null;
  const data = componentForm.data;
  const name = String(data.name || "").trim();
  if (!name) return null;
  return {
    name,
    signature: {
      inports: data.inports,
      outports: data.outports,
      description: data.description,
      icon: data.icon,
    },
  };
}

/**
 * Port names duplicated within one direction (work document #5): the same
 * name across directions is fine — one "in" inport and one "in" outport
 * coexist. Used by the signature editor's save validation; the Engine
 * enforces the same rule on `setSignature`.
 *
 * @param {any} data The signature editor's form data.
 * @returns {string[]} Duplicated names, in first-seen order.
 */
function duplicatePortNames(data) {
  /** @type {string[]} */
  const duplicates = [];
  for (const direction of ["inports", "outports"]) {
    const names = (data?.[direction] ?? [])
      .map((/** @type {any} */ p) => p?.name)
      .filter(Boolean);
    const seen = new Set();
    for (const name of names) {
      if (seen.has(name) && !duplicates.includes(name)) duplicates.push(name);
      seen.add(name);
    }
  }
  return duplicates;
}

/**
 * Parses an IIP's stored value into the form's initial value: JSON when
 * it parses, the raw string otherwise.
 *
 * @param {string} raw
 * @returns {any}
 */
function parseIIPValue(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** @param {string} theme */
function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("noflo.theme", theme);
  } catch {
    // Storage may be unavailable (privacy mode); the choice then lasts
    // for the session only
  }
}

/**
 * Applies the remembered theme at boot, before the first render, so the
 * Glass never paints in the wrong theme. The environment age stays
 * abstract: without runtimes there is nothing to depict (work document
 * #3; WD #15's runtime status drives the age once they exist).
 */
function applyAppearance() {
  let theme = null;
  try {
    theme = localStorage.getItem("noflo.theme");
  } catch {
    theme = null;
  }
  document.body.setAttribute(
    "data-theme",
    theme === "cyberpunk" || theme === "tube" ? theme : "tube",
  );
  document.body.setAttribute("data-age", "abstract");
}

/**
 * Activates a screen (work document #62): the single transition point —
 * exactly one screen owns the viewport, and every per-screen concern
 * (the graph editor's yield, the workdoc view's deferred open when the
 * mirror has not loaded the document yet, the corner's active marker)
 * lives here rather than in scattered per-surface flags.
 *
 * @param {{ kind: string, id: string | null }} screen
 * @param {{ editing?: boolean }} [options] For fresh workdocs: naming is
 *   the whole prompt, the body editor is the point.
 * @returns {void}
 */
function activateScreen(screen, options = {}) {
  const view = /** @type {any} */ (document.getElementById("workdoc-view"));
  if (screen.kind === "doc") {
    const appElement = document.getElementById("app");
    if (appElement) appElement.style.display = "none";
    /** @type {any} */ (
      document.getElementById("project-corner")
    )?.setActiveDoc(screen.id);
    const workdocs = mirrorDoc?.getMap("workdocs");
    // A fresh creation's first open lands in edit mode (naming is the
    // whole prompt); the pairing consumes once
    const editing = options.editing ?? screen.id === pendingWorkDocEditId;
    if (screen.id === pendingWorkDocEditId) {
      pendingWorkDocEditId = null;
    }
    if (mirrorDoc && workdocs?.get(screen.id ?? "")) {
      openWorkDoc(screen.id ?? "", editing);
    } else {
      // The mirror has not loaded the document yet: the first projection
      // opens the view (the reload path, work document #9)
      pendingWorkDocOpen = screen.id;
      pendingWorkDocEditing = editing;
    }
    return;
  }
  if (screen.kind === "schema") {
    const appElement = document.getElementById("app");
    if (appElement) appElement.style.display = "none";
    if (mirrorDoc && getSchema(mirrorDoc, screen.id ?? "")) {
      openSchemaView(screen.id ?? "");
    }
    return;
  }
  if (screen.kind === "component") {
    const appElement = document.getElementById("app");
    if (appElement) appElement.style.display = "none";
    if (mirrorDoc?.getMap("registry").has(screen.id ?? "")) {
      openComponentView(screen.id ?? "");
    } else {
      // The mirror lags the route at boot (the persistence sync is
      // async): the deferred-open pattern the workdoc flow uses — the
      // refresh re-activates the screen once the registry lands
      pendingComponentOpen = screen.id;
    }
    return;
  }
  // The graph screen
  pendingWorkDocOpen = null;
  pendingWorkDocEditing = false;
  /** @type {any} */ (document.getElementById("project-corner"))?.setActiveDoc(
    null,
  );
  if (view && !view.hidden) view.close();
  const schemaView = /** @type {any} */ (
    document.getElementById("schema-view")
  );
  if (schemaView && !schemaView.hidden) schemaView.close();
  if (componentView && !componentView.hidden) componentView.close();
  pendingComponentOpen = null;
  const appElement = document.getElementById("app");
  if (appElement) appElement.style.display = "";
  if (screen.id && screen.id !== activeGraphId) {
    activeGraphId = screen.id;
    intentMapper?.flushPending((nodeId) =>
      Boolean(projectGraph(mirrorDoc, activeGraphId)?.processes[nodeId]),
    );
    updateContextChip();
    scheduleRender();
  }
}

async function init() {
  applyAppearance();
  trackInputState();
  // The Glass error boundary (work document #63's app diagnostics
  // tenant): crash reports and connectivity history persist locally, and
  // an unacknowledged crash badges the diagnostics accordion
  installDiagnostics({
    onCrash: () => {
      diagnosticsPresent = true;
      syncPanel?.crashAttention();
      refreshSyncPanel();
    },
  });
  openDiagnosticsStore()
    .then((store) => store.any())
    .then((any) => {
      // A past crash or connectivity entry keeps the diagnostics surface
      // reachable even where the mesh is unused (no silent failures)
      if (!any) return;
      diagnosticsPresent = true;
      refreshSyncPanel();
    })
    .catch(() => {
      // Storage refused: the boundary still records in memory
    });
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
    refreshProjectExplorer();
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
      activateScreen(routeToScreen(route));
      refreshProjectExplorer();
    },
  });
  // The initial route activates exactly like a route change (work
  // document #62): a reload on a document route re-opens the document.
  // The workdocs arrive with the project load, so the activation defers
  // its open until the projection has data
  activateScreen(routeToScreen(router.route()));

  intentMapper = createIntentMapper({
    sendIntent,
    graphId: () => activeGraphId,
    getLibrary: () => libraryManager,
    onDragging: (nodes) => sendDraggingAwareness(nodes),
    onDragEnd: () => sendDraggingAwareness([]),
    // IIP values edit in the datatype-aware shell editor (work document #5
    // update #36): no window.prompt fallback in the Glass
    editIIP: ({ title, datatype, value, schemaRef, id }) =>
      _openIIPValueEditor(title, value ?? "", datatype, schemaRef, id),
    // Typed-port guiding (work document #29 update #1): the candidate list
    // narrows to compatible components, ending with the create option
    pickComponent: async ({ x, y, startPort, edge }) => {
      // The canvas Add Node also goes through the picker: all components
      // are candidates (no compatibility filter), ending with the create
      // option (work document #5 follow-up)
      if (!componentPicker) {
        componentPicker = /** @type {FlowComponentPicker} */ (
          /** @type {any} */ (document.createElement("noflo-component-picker"))
        );
        document.getElementById("app")?.appendChild(componentPicker);
      }
      /** @param {any} ports @param {string} dataType */
      const hasCompatible = (ports, dataType) =>
        (ports ?? []).some((/** @type {any} */ port) => {
          const type = port.type || "all";
          return type === "all" || dataType === "all" || type === dataType;
        });
      /** Splice guiding (work document #5 update #15): candidates must fit
       * the edge's datatype chain — an inport matching the source's output
       * and an outport matching the target's input */
      /** @param {any} comp */
      const fits = (comp) =>
        hasCompatible(comp?.inports, edge?.srcType ?? "all") &&
        hasCompatible(comp?.outports, edge?.tgtType ?? "all");
      const candidates = edge
        ? (libraryManager?.listComponents() ?? []).filter((name) =>
            fits(libraryManager?.getComponent(name)),
          )
        : startPort
          ? compatibleComponents(libraryManager, /** @type {any} */ (startPort))
          : (libraryManager?.listComponents() ?? []);
      const choice = await componentPicker.open({ x, y, candidates });
      if (choice === CREATE_NEW_COMPONENT) {
        // The user names the component in the signature editor (work
        // document #5 follow-up): no window.prompt. The prefill comes from
        // the guiding context: a port drag carries the dragged port's
        // datatype on the connecting side; an edge splice carries the
        // edge's datatypes on both sides.
        const prefill = edge
          ? {
              inports: [{ name: "in", type: edge.srcType }],
              outports: [{ name: "out", type: edge.tgtType }],
            }
          : startPort?.classList.contains("port-out")
            ? {
                inports: [
                  { name: "in", type: startPort.dataset.portDataType || "all" },
                ],
              }
            : startPort
              ? {
                  outports: [
                    {
                      name: "out",
                      type: startPort.dataset.portDataType || "all",
                    },
                  ],
                }
              : undefined;
        const created = await openSignatureEditorCreate(prefill);
        if (!created) return null;
        const name = created.name;
        if (edge) {
          return {
            name: name.trim(),
            signature: {
              inports: [{ name: "in", type: edge.srcType }],
              outports: [{ name: "out", type: edge.tgtType }],
            },
          };
        }
        // A canvas-menu add carries no port context (work document #56's
        // smoke found this crash: the create-new-component path threw
        // before placing the node when startPort was null)
        const dataType = startPort?.dataset.portDataType || "all";
        const draggingOut = startPort?.classList.contains("port-out") === true;
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
        if (!childId?.startsWith(`${activeGraphId}/`)) return;
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
      onError: narrateWorkerError,
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

  // Context chip (work document #28, top-left corner): what am I editing,
  // the tab's engine role, and the entry into configuration — replaces the
  // former top bar
  contextChip = /** @type {FlowContextChip | null} */ (
    /** @type {any} */ (document.getElementById("context-chip"))
  );
  on(contextChip, "open-settings", () => openMeshSettings());
  // The project explorer (work document #63): the Context corner's
  // navigation tree — the navigation branches per kind: graphs and
  // schemas route; components open the signature editor (the component
  // screen is the editor, work document #29); specs stay inert until
  // their runner lands (#16)
  on(contextChip, "explorer-navigate", (e) => {
    router?.navigate({ kind: e.detail.kind, id: e.detail.id });
  });
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
  on(syncPanel, "sync-revoke-grant", (e) => {
    // Revocation tombstones the grant in the CRDT: the tombstone
    // propagates through Yjs sync to every participant, and y-reticulum
    // 0.5.0's teardown evicts the revoked peer's live links on their
    // next reconcile (work document #54)
    sendIntent({
      type: "INTENT",
      command: "revokePermission",
      payload: { grantId: e.detail.grantId },
    });
  });
  // Runtime corner (work documents #59/#15/#28, top-right): the FBP
  // runtime population's home — discovery refreshes on corner expansion,
  // connect/disconnect address the runtime by its destination hash
  runtimeCorner = /** @type {FlowRuntimeCorner | null} */ (
    /** @type {any} */ (document.getElementById("runtime-corner"))
  );
  on(runtimeCorner, "runtime-refresh", () => {
    refreshRuntimes();
  });
  on(runtimeCorner, "runtime-connect", (e) => {
    supervisor?.send({
      type: "MESH",
      command: "runtimeConnect",
      payload: { destinationHash: e.detail.destinationHash },
    });
  });
  on(runtimeCorner, "runtime-disconnect", (e) => {
    supervisor?.send({
      type: "MESH",
      command: "runtimeDisconnect",
      payload: { destinationHash: e.detail.destinationHash },
    });
  });
  // Deploy + observe (work document #59 Phase A): the deploy targets the
  // active graph — the corner addresses the runtime, the Glass knows what
  // is on the canvas
  on(runtimeCorner, "runtime-deploy", (e) => {
    if (!activeGraphId) return;
    supervisor?.send({
      type: "MESH",
      command: "runtimeDeploy",
      payload: {
        destinationHash: e.detail.destinationHash,
        graphId: activeGraphId,
      },
    });
  });
  on(runtimeCorner, "runtime-run", (e) => {
    supervisor?.send({
      type: "MESH",
      command: "runtimeRun",
      payload: {
        destinationHash: e.detail.destinationHash,
        action: e.detail.action,
      },
    });
  });
  // The lines corner (work document #35 update #14): the per-line
  // diagrams. The provider re-reads the active graph's projection fresh
  // on every render of the panel, so the diagram never shows a stale
  // line; rename attempts re-emit onto the editor, where the existing
  // route-naming flow handles the modal
  const linesCorner = /** @type {any} */ (
    document.getElementById("lines-corner")
  );
  linesCorner.setProvider(() => {
    const view = projectGraph(mirrorDoc, activeGraphId);
    if (!view) return null;
    // The strip's rail segments select the wire they carry: the id is
    // the canonical edge key (the editor's selection vocabulary), IIPs
    // ride their DATA-> id, exports their pseudo-station
    const edgeIdOf = (
      /** @type {{ node: string, port: string, index?: number }} */ from,
      /** @type {{ node: string, port: string, index?: number }} */ to,
    ) =>
      `${from.node}:${from.port}[${from.index ?? 0}]->${to.node}:${to.port}[${to.index ?? 0}]`;
    const edges = [];
    for (const edge of view.edges ?? []) {
      edges.push({
        source: edge.from.node,
        target: edge.to.node,
        route: edge.metadata?.route ?? null,
        id: edgeIdOf(edge.from, edge.to),
      });
    }
    for (const init of view.initializers ?? []) {
      const iipId =
        init.metadata?.id ??
        `DATA->${init.to.node}:${init.to.port}[${init.to.index ?? 0}]`;
      edges.push({
        source: iipId,
        target: init.to.node,
        route: init.metadata?.route ?? null,
        id: iipId,
      });
    }
    for (const name in view.outports ?? {}) {
      const info = view.outports[name];
      edges.push({
        source: info.process,
        target: `export:${name}`,
        route: info.metadata?.route ?? null,
        id: `export:${name}`,
      });
    }
    for (const name in view.inports ?? {}) {
      const info = view.inports[name];
      edges.push({
        source: `export:${name}`,
        target: info.process,
        route: info.metadata?.route ?? null,
        id: `export:${name}`,
      });
    }
    return {
      edges,
      labelFor: (/** @type {string} */ id) =>
        id.startsWith("DATA->")
          ? "data"
          : id.startsWith("export:")
            ? id.slice(7)
            : id,
      routeTable: view.properties?.routes,
    };
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
  // The Project corner (work document #9): the work-document read client.
  // Opening a document is the document view's route (step B of the plan)
  const projectCorner = /** @type {any} */ (
    document.getElementById("project-corner")
  );
  projectCorner?.addEventListener("workdoc-open", (/** @type {any} */ e) => {
    // Navigating away from the accordion's context collapses it (work
    // document #62's dismissal: the document screen owns the viewport)
    projectCorner.expanded = false;
    projectCorner.render();
    router?.navigate({ kind: "doc", id: e.detail.docId });
  });
  // Creation: the title prompt, then the intent — the document appears in
  // the corner as proposed and the view opens (work document #9)
  // Project schemas (work document #57 update #1): opening navigates to
  // the schema screen; creation prompts for the ns/name and lands there
  projectCorner?.addEventListener("schema-open", (/** @type {any} */ e) => {
    projectCorner.expanded = false;
    projectCorner.render();
    router?.navigate({ kind: "schema", id: e.detail.name });
  });
  projectCorner?.addEventListener("schema-create", async () => {
    projectCorner.expanded = false;
    projectCorner.render();
    const name = await openTextPrompt({
      title: "New schema",
      message: "Name the schema (ns/name):",
      value: "project/",
    });
    if (!name) return;
    sendIntent({
      type: "INTENT",
      command: "setSchema",
      payload: {
        name,
        body: JSON.stringify({ type: "object", properties: {} }, null, 2),
      },
    });
    router?.navigate({ kind: "schema", id: name });
  });
  // The schema view's events (work document #57 update #1): the live
  // draft delta and the whole-save round
  schemaView = /** @type {any} */ (document.getElementById("schema-view"));
  on(schemaView, "schema-body-update", (e) => {
    sendIntent({
      type: "INTENT",
      command: "updateSchema",
      payload: { name: e.detail.name, update: e.detail.update },
    });
  });
  on(schemaView, "schema-save", (e) => {
    sendIntent({
      type: "INTENT",
      command: "setSchema",
      payload: { name: e.detail.name, body: e.detail.body },
    });
  });
  on(schemaView, "schema-close", () => {
    router?.navigate({ kind: "graph", id: activeGraphId });
  });
  // The component view (work document #62): the actions ride the
  // sketch → specify → implement ladder. Save applies the rename-fork
  // rule; implement actions carry the scaffold and navigate
  projectCorner?.addEventListener("workdoc-create", () => {
    // No naming gate: the document is created untitled and the view opens
    // in edit mode, where the title field and the body are both at hand
    // (work document #9)
    projectCorner.expanded = false;
    projectCorner.render();
    pendingWorkDocCreate = true;
    sendIntent({
      type: "INTENT",
      command: "createWorkDoc",
      payload: { title: "Untitled" },
    });
  });
  // The document view's flows ride the intent path (work document #9):
  // body edits relay as binary diffs, the composer posts thread entries,
  // the title renames
  const workdocView = /** @type {any} */ (
    document.getElementById("workdoc-view")
  );
  workdocView?.addEventListener(
    "workdoc-body-update",
    (/** @type {any} */ e) => {
      sendIntent({
        type: "INTENT",
        command: "setWorkDocBody",
        payload: { docId: e.detail.docId, update: e.detail.update },
      });
    },
  );
  workdocView?.addEventListener("workdoc-post", (/** @type {any} */ e) => {
    sendIntent({
      type: "INTENT",
      command: "updateWorkDoc",
      payload: { docId: e.detail.docId, content: e.detail.content },
    });
  });
  workdocView?.addEventListener("workdoc-title", (/** @type {any} */ e) => {
    sendIntent({
      type: "INTENT",
      command: "setWorkDocTitle",
      payload: { docId: e.detail.docId, title: e.detail.title },
    });
  });
  contextChip?.addEventListener("workdoc-close", (/** @type {any} */ e) => {
    router?.navigate(activeGraphId || "main");
  });
  // The rngit remote (work document #60's project scope): the intent
  // writes project metadata, propagating to peers
  projectCorner?.addEventListener("workdoc-repo", (/** @type {any} */ e) => {
    sendIntent({
      type: "INTENT",
      command: "setWorkdocsRepo",
      payload: { url: e.detail.url || null },
    });
  });
  // Corner dismissal on the static screens (work document #62): an
  // interaction with the screen's content collapses the expanded corners
  // — chips never overlap content, expanded forms may but dismiss in one
  // interaction. The graph editor is exempt: corners overlay the canvas
  // freely, pan and zoom is its own dismissal
  const collapseExpandedCorners = (/** @type {Event} */ e) => {
    const path = e.composedPath();
    for (const corner of [projectCorner, syncPanel]) {
      if (!corner || path.includes(corner)) continue;
      if (corner.expanded) {
        corner.expanded = false;
        corner.render();
      }
    }
  };
  workdocView?.addEventListener("pointerdown", collapseExpandedCorners);
  window.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
    if (e.key === "Escape") collapseExpandedCorners(e);
  });
  // Undo/redo (work document #39): the Engine owns the journal; the Glass
  // only requests
  on(syncPanel, "undo-attempt", () => {
    sendIntent({ type: "INTENT", command: "undo", payload: {} });
  });
  on(syncPanel, "redo-attempt", () => {
    sendIntent({ type: "INTENT", command: "redo", payload: {} });
  });
  on(syncPanel, "sync-settings", () => openMeshSettings());
  // Graceful mesh shutdown on page unload: the Engine tears its links down
  // immediately, so peers clean their room state instead of waiting out the
  // Reticulum link timeout after this worker dies mid-session (Safari reload)
  globalThis.addEventListener("pagehide", () => {
    supervisor?.send({ type: "MESH", command: "stop" });
  });
  const settingsDialog = /** @type {any} */ (
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
  // Appearance (work document #5 follow-up): the theme is a device
  // preference — applied, remembered on this device, and synced across
  // the device's tabs
  on(settingsDialog, "appearance-theme", (e) => {
    applyTheme(e.detail.theme);
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "noflo.theme" && event.newValue) {
      applyTheme(event.newValue);
    }
  });

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
