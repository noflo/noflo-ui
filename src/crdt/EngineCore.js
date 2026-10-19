/**
 * @file Engine core (work document #18): pure intent validation and
 * application over the project Y.Doc, producing the Appendix A echo messages.
 *
 * This module contains no Worker or DOM code — the NoFlo dispatcher graph in
 * the Worker is a thin wiring around these functions, and the tests run them
 * directly.
 */

import Ajv2020 from "../../vendor/ajv.js";
import { digestSchema } from "../../vendor/fbp-protocol.js";
import * as Y from "../../vendor/yjs.js";
import {
  addEdge,
  addGroupNodes,
  addIIP,
  addInport,
  addNode,
  addOutport,
  appendWorkDocUpdate,
  applySchemaBodyUpdate,
  applyWorkDocBodyUpdate,
  clearImplementationRequest,
  createGraph,
  createGroup,
  createSchema,
  createWorkDoc,
  dataToShared,
  deleteGraph,
  edgeIdFor,
  ensureComponent,
  ensureDoc,
  getComponent,
  getComponentCode,
  getComponentSignature,
  getGraph,
  getGroup,
  getNode,
  getSchema,
  getSchemas,
  getWorkDoc,
  graphChildren,
  moveExport,
  moveIIP,
  moveNode,
  parseRngitUrl,
  removeComponentSignature,
  removeDoc,
  removeEdge,
  removeExportedPort,
  removeGroup,
  removeGroupNodes,
  removeNode,
  removeNodeFromGroups,
  removeSchema,
  renameGroup,
  requestWorkDocScope,
  revokePermission,
  setComponentCode,
  setComponentSignature,
  setDocText,
  setEdgeRoute,
  setGraphMetadata,
  setImplementationRequest,
  setNodeComponent,
  setNodeMetadata,
  setPortRoute,
  setRouteName,
  setSchemaBody,
  setWorkDocTitle,
  transferNode,
  updateComponentMetadata,
} from "./ProjectDoc.js";
import { isUIWorkerMessage } from "./Protocol.js";

/**
 * Mutable Engine session state that is not part of the CRDT.
 *
 * @typedef {Object} EngineState
 * @property {Set<string>} subscriptions Graph ids the Glass has subscribed to.
 * @property {string} [intentOrigin] This device's Reticulum identity hash
 *   (the undo journal's tracked origin), set when the mesh config reports
 *   it.
 */

/**
 * @returns {EngineState}
 */
export function createEngineState() {
  return { subscriptions: new Set() };
}

/**
 * The per-document undo managers (work document #39). Keyed by document so
 * a project rebind (a new doc) gets a fresh journal and a dropped doc's
 * manager is collectable. The journal is session-scoped by decision: it is
 * not persisted, and a fresh boot starts with an empty stack.
 *
 * @type {WeakMap<Y.Doc, { manager: Y.UndoManager, lastCommand: string | null, ledger: Map<string, number> }>}
 */
const undoManagers = new WeakMap();

/**
 * Transaction origin for intents the Glass issued on this device: the only
 * origin the undo manager tracks (work document #39 — undo applies the
 * user's own changes, never anybody's). The origin is **this device's
 * Reticulum identity hash** — identity-attributable in Yjs internals,
 * stable across the tab leader's engine lifetime, and the door to per-peer
 * attribution later (work document #38's vocabulary). Remote CRDT updates,
 * persistence loads, and mesh-plane writes all carry other origins and
 * never enter the stack. The fallback covers the window before the mesh
 * config reports the identity (intents cannot realistically precede the
 * project bind, but the manager must not silently lose tracking).
 *
 * @type {symbol}
 */
const FALLBACK_INTENT_ORIGIN = Symbol("noflo-ui:intent");

/**
 * The tracked transaction origin for this device's intents: the Reticulum
 * identity hash once the mesh layer reports it, the process-local fallback
 * before then.
 *
 * @param {EngineState} state
 * @returns {string | symbol}
 */
function intentOrigin(state) {
  return state.intentOrigin ?? FALLBACK_INTENT_ORIGIN;
}

/**
 * Intents whose mutations are tracked by the undo manager (work document
 * #39 milestone 1: graph structure and attributes — nodes, edges, IIPs,
 * exported ports, groups, moves, graph lifecycle, subgraph structure).
 * Everything else applies with `SYSTEM_INTENT_ORIGIN` and is invisible to
 * undo — the Yjs scope set is the second gate (only the `graphs` and
 * `registry` subtrees are scoped), so a future tracked-classification bug
 * cannot pull grants or file-tree state into the stack.
 *
 * @type {Set<string>}
 */
const TRACKED_INTENTS = new Set([
  "addNode",
  "removeNode",
  "moveNode",
  "addEdge",
  "removeEdge",
  "addIIP",
  "updateIIP",
  "removeIIP",
  "addInport",
  "addOutport",
  "removeInport",
  "removeOutport",
  "renameInport",
  "renameOutport",
  "createGraph",
  "removeGraph",
  "makeSubgraph",
  "moveUp",
  "createGroup",
  "removeGroup",
  "updateGroup",
  "setEdgeRoute",
  "setPortRoute",
  "setRouteName",
  "moveIIP",
  "moveExport",
  "spliceNode",
]);

/** How long consecutive tracked transactions merge into one undo step
 * (work document #39's gesture grouping: one drag = one step, rapid
 * bursts collapse). The Glass emits a drag's node moves together at
 * pointer-up, so the burst lands well inside the window. */
const UNDO_CAPTURE_TIMEOUT_MS = 500;

/**
 * Transaction origin for intents that are deliberately outside the undo
 * journal (work document #39's milestone split): grants, code buffers,
 * project-file registry, signatures. They still apply authoritatively.
 *
 * @type {symbol}
 */
export const SYSTEM_INTENT_ORIGIN = Symbol("noflo-ui:system-intent");

/**
 * The graphs the intent currently being applied touches (the stack-item
 * metadata source). Null outside a tracked intent.
 *
 * @type {Set<string> | null}
 */
let pendingIntentGraphs = null;

/**
 * Monotonic logical clock for the conflict ledger (work document #39):
 * wall-clock timestamps collide inside one millisecond — the capture and
 * a peer edit routinely land on the same tick — so ordering uses a
 * process-local counter.
 *
 * @type {number}
 */
let undoClock = 0;

/** @returns {number} */
function undoTick() {
  undoClock += 1;
  return undoClock;
}

/**
 * The conflict ledger (work document #39): per graph, the timestamp of the
 * last remote-origin change inside it. An undo step whose graphs a peer
 * touched after the step was captured is skipped with narration — undo
 * never clobbers a peer's work, and it stops at the first conflict rather
 * than risk clobbering through an older enclosing step.
 *
 * @param {Y.Doc} doc
 * @param {{ manager: Y.UndoManager, ledger: Map<string, number> }} entry
 */
function wireUndoConflictLedger(doc, entry) {
  const graphs = doc.getMap("graphs");
  const watch = (/** @type {string} */ graphId) => {
    const graph = graphs.get(graphId);
    if (!(graph instanceof Y.Map)) return;
    graph.observeDeep((/** @type {any[]} */ _events, /** @type {any} */ tr) => {
      // Only changes we did not author poison the ledger: our intents
      // carry the tracked identity origin; the manager's own undo/redo
      // transactions carry the manager as their origin
      if (
        tr.origin === entry.manager ||
        entry.manager.trackedOrigins.has(tr.origin)
      ) {
        return;
      }
      entry.ledger.set(graphId, undoTick());
    });
  };
  graphs.observe((/** @type {any} */ event) => {
    event.changes.keys.forEach(
      (/** @type {any} */ change, /** @type {string} */ key) => {
        if (change.action === "add") watch(key);
      },
    );
  });
  for (const graphId of graphs.keys()) watch(graphId);
  // The stack items learn their graph scope from the dispatch side
  // (`pendingIntentGraphs`) and their capture time from here
  entry.manager.on(
    "stack-item-added",
    (/** @type {{ stackItem: any }} */ { stackItem }) => {
      stackItem.meta.graphs = pendingIntentGraphs
        ? new Set(pendingIntentGraphs)
        : new Set(["*"]);
      stackItem.meta.t = undoTick();
    },
  );
  entry.manager.on(
    "stack-item-updated",
    (/** @type {{ stackItem: any }} */ { stackItem }) => {
      if (pendingIntentGraphs) {
        const graphs = stackItem.meta.graphs ?? new Set();
        for (const g of pendingIntentGraphs) graphs.add(g);
        stackItem.meta.graphs = graphs;
      }
    },
  );
}

/**
 * The undo manager for the bound document, created lazily on the first
 * intent — after persistence load and the initial mesh sync, so neither
 * ever enters the stack. Scoped to the graphs and registry subtrees with
 * this device's identity as the only tracked origin: the shared-stack trap
 * from the Yjs undo discussions cannot occur, because each device's manager
 * only ever sees that device's own Glass intents. The identity can arrive
 * after the manager did (mesh config is asynchronous), so the tracked-origin
 * set is reconciled on every call — an earlier origin (the fallback, or a
 * pre-rekey identity) stays tracked and its stack items remain undoable.
 *
 * @param {Y.Doc} doc
 * @param {EngineState} state
 * @returns {Y.UndoManager}
 */
function ensureUndoManager(doc, state) {
  let entry = undoManagers.get(doc);
  if (!entry) {
    const manager = new Y.UndoManager(
      [doc.getMap("graphs"), doc.getMap("registry")],
      {
        trackedOrigins: new Set(),
        captureTimeout: UNDO_CAPTURE_TIMEOUT_MS,
      },
    );
    entry = { manager, lastCommand: null, ledger: new Map() };
    wireUndoConflictLedger(doc, entry);
    undoManagers.set(doc, entry);
  }
  const origin = intentOrigin(state);
  if (!entry.manager.trackedOrigins.has(origin)) {
    entry.manager.trackedOrigins.add(origin);
  }
  return entry.manager;
}

/**
 * Forces the next tracked transaction into a fresh undo step (work
 * document #39): the worker calls it on project rebind and graph switch so
 * a step never spans a navigation boundary. The Glass's own gesture
 * boundaries come from the command-change rule in `handleIntent`.
 *
 * @param {Y.Doc} doc
 * @param {EngineState} state
 */
export function stopUndoCapture(doc, state) {
  undoManagers.get(doc)?.manager.stopCapturing();
}

/**
 * The undo/redo availability report appended to every intent's echoes (work
 * document #39): the Glass renders the corner chips from it and never
 * guesses stack state.
 *
 * @param {Y.UndoManager | null} manager
 * @returns {import("./Protocol.js").UndoStateEcho}
 */
function undoStateEcho(manager) {
  if (!manager) {
    return {
      kind: "undo",
      canUndo: false,
      canRedo: false,
      undoDepth: 0,
      redoDepth: 0,
    };
  }
  return {
    kind: "undo",
    canUndo: manager.canUndo(),
    canRedo: manager.canRedo(),
    undoDepth: manager.undoStack.length,
    redoDepth: manager.redoStack.length,
  };
}

/**
 * Result of handling one message.
 *
 * @typedef {Object} EngineResult
 * @property {boolean} accepted Whether the message was valid and applied.
 * @property {Array<import("./Protocol.js").EngineUIMessage | import("./Protocol.js").SignatureMessage>} echoes
 */

/**
 * @param {EngineState} state
 * @param {string} graphId
 * @returns {EngineResult}
 */
function subscribe(state, graphId) {
  state.subscriptions.add(graphId);
  return { accepted: true, echoes: [] };
}

/**
 * Validates and applies one Glass message, returning the authoritative echo
 * messages the Engine sends back. Invalid messages never mutate the document.
 *
 * Graphs are created lazily on first intent targeting them: Appendix A has no
 * explicit graph-creation message (noted as a SPEC gap in the work document).
 *
 * @param {Y.Doc} doc
 * @param {EngineState} state
 * @param {import("./Protocol.js").UIWorkerMessage} message
 * @returns {EngineResult}
 */
export function handleMessage(doc, state, message) {
  if (!isUIWorkerMessage(message)) {
    return { accepted: false, echoes: [] };
  }

  const handler = CORE_TYPE_HANDLERS[message.type];
  if (!handler) {
    return { accepted: false, echoes: [] };
  }
  return handler(doc, state, message);
}

/**
 * The Engine core's type dispatch table. The contract registry's non-MESH
 * types must match its keys exactly (work document #37): MESH commands are
 * routed in the Engine's message router before the dispatcher graph.
 *
 * @type {Record<string, (doc: Y.Doc, state: EngineState, message: any) => EngineResult>}
 */
export const CORE_TYPE_HANDLERS = {
  LIFECYCLE: (_doc, state, message) => handleLifecycle(state, message),
  QUERY: (doc, _state, message) => handleQuery(doc, message),
  // Ephemeral: accepted for mesh rebroadcast (mesh work document), never
  // echoes back and never mutates the CRDT.
  AWARENESS: () => ({ accepted: true, echoes: [] }),
  INTENT: (doc, state, message) => handleIntent(doc, state, message),
};

/**
 * The Engine core's intent dispatch table. The contract registry's INTENT
 * commands must match its keys exactly (work document #37).
 *
 * @type {Record<string, (doc: Y.Doc, payload: any) => EngineResult>}
 */
export const INTENT_HANDLERS = {
  addNode: intentAddNode,
  removeNode: intentRemoveNode,
  moveNode: intentMoveNode,
  addEdge: intentAddEdge,
  removeEdge: intentRemoveEdge,
  addIIP: intentAddIIP,
  updateIIP: intentUpdateIIP,
  removeIIP: intentRemoveIIP,
  addInport: (doc, payload) => intentAddExport(doc, "addInport", payload),
  addOutport: (doc, payload) => intentAddExport(doc, "addOutport", payload),
  removeInport: (doc, payload) =>
    intentRemoveExport(doc, "removeInport", payload),
  removeOutport: (doc, payload) =>
    intentRemoveExport(doc, "removeOutport", payload),
  renameInport: (doc, payload) =>
    intentRenameExport(doc, "renameInport", payload),
  renameOutport: (doc, payload) =>
    intentRenameExport(doc, "renameOutport", payload),
  createGraph: intentCreateGraph,
  removeGraph: intentRemoveGraph,
  makeSubgraph: intentMakeSubgraph,
  moveUp: intentMoveUp,
  revokePermission: intentRevokePermission,
  implementAsGraph: intentImplementAsGraph,
  setEdgeRoute: intentSetEdgeRoute,
  setPortRoute: intentSetPortRoute,
  setRouteName: intentSetRouteName,
  moveIIP: intentMoveIIP,
  moveExport: intentMoveExport,
  spliceNode: intentSpliceNode,
  createWorkDoc: intentCreateWorkDoc,
  updateWorkDoc: intentUpdateWorkDoc,
  setWorkDocScope: intentSetWorkDocScope,
  setWorkDocBody: intentSetWorkDocBody,
  setWorkDocTitle: intentSetWorkDocTitle,
  setWorkdocsRepo: intentSetWorkdocsRepo,
  setProjectDependency: intentSetProjectDependency,
  setImplementationRequest: intentSetImplementationRequest,
  undo: intentUndo,
  redo: intentRedo,
  createGroup: intentCreateGroup,
  removeGroup: intentRemoveGroup,
  updateGroup: intentUpdateGroup,
  implementInCode: intentImplementInCode,
  setComponentCode: intentSetComponentCode,
  setSchema: intentSetSchema,
  updateSchema: intentUpdateSchema,
  removeSchema: intentRemoveSchema,
  setDoc: intentSetDoc,
  removeDoc: intentRemoveDoc,
  forkComponent: intentForkComponent,
  setSignature: intentSetSignature,
  setNodeMetadata: intentSetNodeMetadata,
  setGraphMetadata: intentSetGraphMetadata,
};

/**
 * @param {EngineState} state
 * @param {import("./Protocol.js").LifecycleSubscribeMessage} message
 * @returns {EngineResult}
 */
export function handleLifecycle(state, message) {
  if (message.command !== "subscribe") {
    return { accepted: false, echoes: [] };
  }
  const graphId = message.payload?.graphId;
  if (typeof graphId !== "string" || graphId.length === 0) {
    return { accepted: false, echoes: [] };
  }
  return subscribe(state, graphId);
}

/**
 * @param {Y.Doc} doc
 * @param {import("./Protocol.js").QueryGetSignatureMessage} message
 * @returns {EngineResult}
 */
export function handleQuery(doc, message) {
  if (message.command !== "getSignature") {
    return { accepted: false, echoes: [] };
  }
  const componentName = message.payload?.componentName;
  if (typeof componentName !== "string") {
    return { accepted: false, echoes: [] };
  }
  const signature = getComponentSignature(doc, componentName) || null;
  /** @type {import("./Protocol.js").SignatureMessage} */
  const echo = {
    protocol: "system",
    command: "signature",
    payload: { componentName, signature },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * @param {Y.Doc} doc
 * @param {import("./Protocol.js").UIWorkerMessage} message
 * @returns {EngineResult}
 */
/**
 * Pops the journal's latest step and applies its inverse at the CRDT
 * operation level (work document #39). The manager's own transactions are
 * untracked by construction, so undo-of-undo composes through redo. An
 * empty stack is a valid no-op: the availability echo tells the Glass why
 * the chip is inert.
 *
 * @param {Y.Doc} doc
 * @returns {EngineResult}
 */
function intentUndo(doc) {
  const entry = undoManagers.get(doc);
  if (!entry) {
    return { accepted: true, echoes: [undoStateEcho(null)] };
  }
  const conflict = undoConflict(entry);
  if (conflict) {
    // Skip-and-report (work document #39): the step is not applied and is
    // removed from the stack — undo never clobbers a peer's work, and it
    // stops at the first conflict rather than risk clobbering through an
    // older enclosing step
    entry.manager.undoStack.pop();
    return {
      accepted: true,
      echoes: [
        {
          kind: "progress",
          operation: "graph.undo",
          stage: "conflict",
          state: "failed",
          detail: { graphs: [...conflict] },
        },
        undoStateEcho(entry.manager),
      ],
    };
  }
  return undoRedoResult(entry.manager, entry.manager.undo(), "undo");
}

/**
 * The top stack item's conflict verdict (work document #39): the graphs a
 * peer touched after the step was captured, or null when the step is
 * clean.
 *
 * @param {{ manager: Y.UndoManager, ledger: Map<string, number> }} entry
 * @returns {Set<string> | null}
 */
function undoConflict(entry) {
  const item = entry.manager.undoStack.at(-1);
  if (!item) return null;
  /** @type {Set<string>} */
  const scope = /** @type {any} */ (item.meta).graphs ?? new Set(["*"]);
  const conflicted = new Set();
  for (const graphId of scope) {
    const touchedAt =
      graphId === "*"
        ? Math.max(0, ...entry.ledger.values())
        : (entry.ledger.get(graphId) ?? 0);
    const capturedAt = /** @type {any} */ (item.meta).t ?? 0;
    if (touchedAt > capturedAt) {
      conflicted.add(graphId);
    }
  }
  return conflicted.size > 0 ? conflicted : null;
}

/**
 * The symmetric forward stack (work document #39): a new tracked operation
 * clears it — Yjs semantics, enforced by the manager.
 *
 * @param {Y.Doc} doc
 * @returns {EngineResult}
 */
function intentRedo(doc) {
  const entry = undoManagers.get(doc);
  if (!entry) {
    return { accepted: true, echoes: [undoStateEcho(null)] };
  }
  return undoRedoResult(entry.manager, entry.manager.redo(), "redo");
}

/**
 * Assembles the undo/redo result: narration (work document #34 — undo/redo
 * are operations like any other; per-entity step phrases land with the
 * detail work) plus the availability report.
 *
 * @param {Y.UndoManager} manager
 * @param {any} applied
 * @param {"undo" | "redo"} op
 * @returns {EngineResult}
 */
function undoRedoResult(manager, applied, op) {
  if (!applied) {
    return { accepted: true, echoes: [undoStateEcho(manager)] };
  }
  return {
    accepted: true,
    echoes: [
      {
        kind: "progress",
        operation: `graph.${op}`,
        stage: op,
        state: "done",
      },
      undoStateEcho(manager),
    ],
  };
}

/**
 * Validates and applies one Glass intent.
 *
 * Undo/redo (work document #39) route to the Engine-owned Y.UndoManager:
 * the manager tracks only `INTENT_ORIGIN` transactions scoped to the graphs
 * and registry subtrees, so undoing applies this device's own changes at the
 * operation level — concurrent remote edits are preserved by CRDT merge
 * semantics, and a peer's work is never destroyed by another participant's
 * undo. Tracked intents apply inside a transaction tagged with that origin;
 * everything outside the milestone-1 scope applies untracked. Every
 * accepted intent's echoes carry the undo-state report for the corner chips.
 *
 * @param {Y.Doc} doc
 * @param {EngineState} state
 * @param {any} message
 * @returns {EngineResult}
 */
export function handleIntent(doc, state, message) {
  const payload = message.payload;
  const handler = INTENT_HANDLERS[message.command];
  if (!handler) {
    return { accepted: false, echoes: [] };
  }
  if (message.command === "undo" || message.command === "redo") {
    // Ensure the manager (and its tracked-origin set) exists before the
    // handler pops it; the manager applies its own transactions
    ensureUndoManager(doc, state);
    return handler(doc, payload);
  }
  // Work-document operations attribute their author from the device
  // identity (work document #9); they apply outside the undo journal
  // like the other registry-family intents
  pendingWorkDocAuthor =
    message.command === "createWorkDoc" ||
    message.command === "updateWorkDoc" ||
    message.command === "setWorkDocScope" ||
    message.command === "setWorkDocTitle"
      ? typeof intentOrigin(state) === "string"
        ? /** @type {string} */ (intentOrigin(state))
        : null
      : null;
  const tracked = TRACKED_INTENTS.has(message.command);
  let manager = null;
  if (tracked) {
    manager = ensureUndoManager(doc, state);
    const entry = /** @type {{ lastCommand: string | null }} */ (
      undoManagers.get(doc)
    );
    // A command change is a gesture boundary (work document #39): one
    // drag's move burst merges into one step, but an add followed by a
    // drag never shares a step — even inside the capture window
    if (entry.lastCommand !== message.command) {
      manager.stopCapturing();
    }
    entry.lastCommand = message.command;
    // The stack-item metadata learns the touched graphs from the intent
    // payload (the conflict ledger's granularity)
    pendingIntentGraphs =
      typeof payload?.graphId === "string" ? new Set([payload.graphId]) : null;
  }
  /** @type {EngineResult} */
  let result = { accepted: false, echoes: [] };
  try {
    doc.transact(
      () => {
        result = handler(doc, payload);
      },
      tracked ? intentOrigin(state) : SYSTEM_INTENT_ORIGIN,
    );
  } finally {
    pendingIntentGraphs = null;
    pendingWorkDocAuthor = null;
  }
  if (result.accepted && manager) {
    result.echoes.push(undoStateEcho(manager));
  }
  return result;
}

/**
 * Turns nodes into a subgraph: creates a child graph containing the moved
 * nodes, rewires connections that cross the boundary into exported ports,
 * and replaces the moved nodes in the parent with a single subgraph node
 * (id of the first moved node, component switched to the child graph id,
 * position at the bounding-box center of the moved nodes). The subgraph
 * component signature is registered so the node renders with ports and is
 * openable.
 *
 * Exported ports are connection-driven: every boundary connection exports
 * the port it crosses. With no boundary connections at all, the default
 * in/out ports are exported, matching what the editor renders for
 * signature-less components.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentMakeSubgraph(doc, payload) {
  const { graphId, nodeIds } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    !Array.isArray(nodeIds) ||
    nodeIds.length === 0 ||
    !nodeIds.every((/** @type {any} */ id) => typeof id === "string") ||
    new Set(nodeIds).size !== nodeIds.length
  ) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  const movedData = nodeIds.map((/** @type {string} */ id) =>
    getNode(graph, id),
  );
  if (movedData.some((/** @type {any} */ node) => !node)) {
    return { accepted: false, echoes: [] };
  }
  const knownNodes = /** @type {Y.Map<any>[]} */ (movedData);
  const components = knownNodes.map((node) => node.get("component"));
  if (
    components.some(
      (/** @type {any} */ component) =>
        typeof component !== "string" || getGraph(doc, component),
    )
  ) {
    // Unknown component, or a node is already a subgraph instance
    return { accepted: false, echoes: [] };
  }
  const replacementId = /** @type {string} */ (nodeIds[0]);
  const childId = `${graphId}/${replacementId}`;
  if (getGraph(doc, childId)) {
    return { accepted: false, echoes: [] };
  }

  /** @type {import("./Protocol.js").EngineUIMessage[]} */
  const echoes = [];
  createGraph(doc, childId, replacementId, graphId);
  const child = getGraph(doc, childId);
  if (!child) {
    return { accepted: false, echoes: [] };
  }

  /** @type {import("./Protocol.js").GraphCreateGraphMessage} */
  const createEcho = {
    protocol: "graph",
    command: "creategraph",
    payload: { id: childId, name: replacementId, parent: graphId },
  };
  echoes.push(createEcho);

  // Move the node entries; edges are handled explicitly below
  /** @type {Array<{ id: string, component: string, metadata: { [key: string]: any } }>} */
  const moved = [];
  for (const id of /** @type {string[]} */ (nodeIds)) {
    const info = transferNode(graph, child, id);
    if (!info) {
      return { accepted: false, echoes: [] };
    }
    moved.push({ id, ...info });
    /** @type {import("./Protocol.js").GraphAddNodeMessage} */
    const addNodeEcho = {
      protocol: "graph",
      command: "addnode",
      payload: { id, component: info.component, metadata: info.metadata },
    };
    echoes.push(addNodeEcho);
  }

  // The replacement node takes over the first moved node's id, positioned
  // at the bounding-box center of the moved nodes. It must exist before
  // boundary edges are rewired to it.
  const xs = moved
    .map((m) => m.metadata?.x)
    .filter((/** @type {any} */ x) => typeof x === "number");
  const ys = moved
    .map((m) => m.metadata?.y)
    .filter((/** @type {any} */ y) => typeof y === "number");
  addNode(graph, replacementId, childId, {
    x: xs.length > 0 ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0,
    y: ys.length > 0 ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0,
  });

  const movedIds = new Set(/** @type {string[]} */ (nodeIds));
  const edges = /** @type {Y.Map<any>} */ (graph.get("edges"));
  /** @type {Set<string>} */
  const inPortNames = new Set();
  /** @type {Set<string>} */
  const outPortNames = new Set();
  /** @type {(base: string, used: Set<string>) => string} */
  const uniqueName = (base, used) => {
    if (!used.has(base)) return base;
    let counter = 2;
    while (used.has(`${base}${counter}`)) counter++;
    return `${base}${counter}`;
  };

  /**
   * Exports a child port for a boundary connection.
   *
   * @param {"addinport" | "addoutport"} command
   * @param {string} name
   * @param {string} nodeId
   * @param {string} port
   * @param {number} [index] The addressable slot when the boundary
   *   connection targets one
   */
  const exportPort = (command, name, nodeId, port, index) => {
    if (command === "addinport") {
      addInport(child, name, nodeId, port, {}, index);
      inPortNames.add(name);
    } else {
      addOutport(child, name, nodeId, port, {}, index);
      outPortNames.add(name);
    }
    /** @type {import("./Protocol.js").GraphAddExportMessage} */
    const echo = {
      protocol: "graph",
      command,
      payload: { name, nodeId, port, metadata: {} },
    };
    echoes.push(echo);
  };

  // Snapshot edge ids: the loop below deletes from the same map
  for (const edgeId of [...edges.keys()]) {
    const edge = /** @type {Y.Map<any>} */ (edges.get(edgeId));
    const plain = edge.toJSON();
    const srcMoved = plain.src ? movedIds.has(plain.src.node) : false;
    const tgtMoved = movedIds.has(plain.tgt.node);
    if (!srcMoved && !tgtMoved) continue;
    const metadata = /** @type {Y.Map<any> | undefined} */ (
      edge.get("metadata")
    )?.toJSON();

    if (srcMoved && tgtMoved) {
      // Internal wiring follows the nodes into the subgraph
      removeEdge(graph, edgeId);
      addEdge(child, plain.src, plain.tgt, metadata ?? {});
      continue;
    }

    if (srcMoved) {
      const movedNode = /** @type {string} */ (plain.src.node);
      if (movedNode !== replacementId) {
        // Retarget the parent edge to the replacement node
        removeEdge(graph, edgeId);
        addEdge(
          graph,
          {
            node: replacementId,
            port: plain.src.port,
            index: plain.src.index,
          },
          plain.tgt,
          metadata ?? {},
        );
      }
      exportPort(
        "addoutport",
        uniqueName(plain.src.port, outPortNames),
        movedNode,
        plain.src.port,
        plain.src.index,
      );
      continue;
    }

    // In boundary (including IIPs)
    const movedNode = /** @type {string} */ (plain.tgt.node);
    if (movedNode !== replacementId) {
      removeEdge(graph, edgeId);
      if (plain.src) {
        addEdge(
          graph,
          plain.src,
          {
            node: replacementId,
            port: plain.tgt.port,
            index: plain.tgt.index,
          },
          metadata ?? {},
        );
      } else {
        addIIP(
          graph,
          plain.data,
          {
            node: replacementId,
            port: plain.tgt.port,
            index: plain.tgt.index,
          },
          metadata ?? {},
        );
      }
    }
    exportPort(
      "addinport",
      uniqueName(plain.tgt.port, inPortNames),
      movedNode,
      plain.tgt.port,
      plain.tgt.index,
    );
  }

  // With no boundary connections at all, export the default ports the
  // editor renders for signature-less components
  if (inPortNames.size === 0 && outPortNames.size === 0) {
    addInport(child, "in", replacementId, "in");
    addOutport(child, "out", replacementId, "out");
    inPortNames.add("in");
    outPortNames.add("out");
  }

  /** @type {import("./Protocol.js").GraphSetComponentMessage} */
  const setComponentEcho = {
    protocol: "graph",
    command: "setcomponent",
    payload: { id: replacementId, component: childId },
  };
  echoes.push(setComponentEcho);

  setComponentSignature(doc, childId, {
    ...deriveGraphSignature(doc, child),
    description: `Subgraph of ${graphId}`,
  });

  return { accepted: true, echoes };
}

/**
 * Moves nodes from a subgraph back into its parent graph (the reverse of
 * makeSubgraph). Internal wiring moves with the nodes; connections between
 * moved and staying nodes reroute through new exports on the staying side;
 * parent connections routed through the subgraph node's exported ports
 * reconnect directly when their far end moves up. When the move empties the
 * subgraph, its graph, registry signature, and the parent's subgraph node
 * are removed (a full unnest, also used by the Unpack action).
 *
 * Moving a node whose id collides with the parent's subgraph node is only
 * allowed when the move empties the subgraph: the subgraph node is removed
 * and the moved node takes over its id.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentMoveUp(doc, payload) {
  const { graphId, nodeIds } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    !Array.isArray(nodeIds) ||
    nodeIds.length === 0 ||
    !nodeIds.every((/** @type {any} */ id) => typeof id === "string") ||
    new Set(nodeIds).size !== nodeIds.length
  ) {
    return { accepted: false, echoes: [] };
  }
  const child = getGraph(doc, graphId);
  if (!child) {
    return { accepted: false, echoes: [] };
  }
  const parentId = child.get("metadata")?.get("parent");
  if (typeof parentId !== "string" || parentId === "") {
    // Root graphs have nowhere to move up to
    return { accepted: false, echoes: [] };
  }
  const parent = getGraph(doc, parentId);
  if (!parent) {
    return { accepted: false, echoes: [] };
  }
  for (const id of /** @type {string[]} */ (nodeIds)) {
    if (!getNode(child, id)) {
      return { accepted: false, echoes: [] };
    }
  }

  // Snapshot the pieces the rewiring logic needs before any mutation
  /** @type {Map<string, { process: string, port: string, index?: number }>} */
  const inportInfo = new Map();
  for (const [name, info] of /** @type {Y.Map<any>} */ (
    child.get("inports")
  ).entries()) {
    const plain = info.toJSON();
    if (typeof plain.process === "string" && typeof plain.port === "string") {
      inportInfo.set(name, {
        process: plain.process,
        port: plain.port,
        index: plain.index,
      });
    }
  }
  /** @type {Map<string, { process: string, port: string, index?: number }>} */
  const outportInfo = new Map();
  for (const [name, info] of /** @type {Y.Map<any>} */ (
    child.get("outports")
  ).entries()) {
    const plain = info.toJSON();
    if (typeof plain.process === "string" && typeof plain.port === "string") {
      outportInfo.set(name, {
        process: plain.process,
        port: plain.port,
        index: plain.index,
      });
    }
  }
  const parentEdges = [
    .../** @type {Y.Map<any>} */ (parent.get("edges")).entries(),
  ].map(([id, edge]) => ({
    id,
    plain: /** @type {Y.Map<any>} */ (edge).toJSON(),
  }));
  const movedIds = new Set(/** @type {string[]} */ (nodeIds));

  // Subgraph node instances in the parent
  const subNodes = [
    .../** @type {Y.Map<any>} */ (parent.get("nodes")).entries(),
  ]
    .filter(([, node]) => node.get("component") === graphId)
    .map(([id]) => id);

  // An id collision with a parent node is only resolvable when the collision
  // is with a subgraph node instance and the move empties the subgraph
  const emptiesSubgraph = /** @type {string[]} */ ([
    .../** @type {Y.Map<any>} */ (child.get("nodes")).keys(),
  ]).every((id) => movedIds.has(id));
  for (const id of /** @type {string[]} */ (nodeIds)) {
    const occupant = getNode(parent, id);
    if (!occupant) continue;
    if (
      occupant.get("component") === graphId &&
      subNodes.includes(id) &&
      emptiesSubgraph
    ) {
      continue;
    }
    return { accepted: false, echoes: [] };
  }

  // Full unnest with an id collision: the subgraph node is removed first
  // (its routed connections are snapshotted above and recreated below)
  if (emptiesSubgraph) {
    for (const id of subNodes) {
      if (getNode(parent, id)) {
        removeNode(parent, id);
      }
    }
  }

  // Move the nodes
  /** @type {import("./Protocol.js").EngineUIMessage[]} */
  const echoes = [];
  for (const id of /** @type {string[]} */ (nodeIds)) {
    const node = /** @type {Y.Map<any>} */ (getNode(child, id));
    const metadata =
      /** @type {Y.Map<any> | undefined} */ (node.get("metadata"))?.toJSON() ??
      {};
    const info = transferNode(child, parent, id);
    if (!info) {
      return { accepted: false, echoes: [] };
    }
    /** @type {import("./Protocol.js").GraphRemoveNodeMessage} */
    const removeEcho = {
      protocol: "graph",
      command: "removenode",
      payload: { id },
    };
    echoes.push(removeEcho);
    /** @type {import("./Protocol.js").GraphAddNodeMessage} */
    const addEcho = {
      protocol: "graph",
      command: "addnode",
      payload: { id, component: info.component, metadata },
    };
    echoes.push(addEcho);
  }

  // Recreate the parent connections that were routed through subgraph node
  // exported ports whose far end moved up: the moved endpoint takes over
  // the subgraph node's slot in the connection
  for (const { id, plain } of parentEdges) {
    const metadata = plain.metadata ?? {};
    if (
      subNodes.includes(plain.tgt.node) &&
      movedIds.has(inportInfo.get(plain.tgt.port)?.process ?? "")
    ) {
      const info = /** @type {{ process: string, port: string }} */ (
        inportInfo.get(plain.tgt.port)
      );
      // The direct connection replaces the routed one
      removeEdge(parent, id);
      addEdge(
        parent,
        plain.src,
        { node: info.process, port: info.port },
        metadata,
      );
      continue;
    }
    if (
      plain.src &&
      subNodes.includes(plain.src.node) &&
      movedIds.has(outportInfo.get(plain.src.port)?.process ?? "")
    ) {
      const info = /** @type {{ process: string, port: string }} */ (
        outportInfo.get(plain.src.port)
      );
      removeEdge(parent, id);
      addEdge(
        parent,
        { node: info.process, port: info.port },
        plain.tgt,
        metadata,
      );
    }
  }

  // Connections between moved and staying nodes reroute through new exports
  // on the staying side. Addressable slots are part of port identity, so
  // the keys and the reuse lookups carry the index
  const childEdges = /** @type {Y.Map<any>} */ (child.get("edges"));
  /** @type {Map<string, string>} */
  const newInportNames = new Map();
  /** @type {Map<string, string>} */
  const newOutportNames = new Map();
  /** @type {Map<string, number>} */
  const newInportIndexes = new Map();
  /** @type {Map<string, number>} */
  const newOutportIndexes = new Map();
  const usedInNames = new Set([...inportInfo.keys()]);
  const usedOutNames = new Set([...outportInfo.keys()]);
  // Reverse lookups for reusing an existing export
  /** @type {Map<string, string>} */
  const existingInportFor = new Map(
    [...inportInfo.entries()].map(([name, info]) => [
      `${info.process}:${info.port}:${info.index ?? ""}`,
      name,
    ]),
  );
  /** @type {Map<string, string>} */
  const existingOutportFor = new Map(
    [...outportInfo.entries()].map(([name, info]) => [
      `${info.process}:${info.port}:${info.index ?? ""}`,
      name,
    ]),
  );
  /** @type {(base: string, used: Set<string>) => string} */
  const uniqueName = (base, used) => {
    if (!used.has(base)) return base;
    let counter = 2;
    while (used.has(`${base}${counter}`)) counter++;
    return `${base}${counter}`;
  };

  // Snapshot child edge ids: they are removed while iterating
  for (const edgeId of [...childEdges.keys()]) {
    const edge = /** @type {Y.Map<any>} */ (childEdges.get(edgeId));
    const plain = edge.toJSON();
    const srcMoved = plain.src ? movedIds.has(plain.src.node) : false;
    const tgtMoved = movedIds.has(plain.tgt.node);
    if (!srcMoved && !tgtMoved) continue;
    const metadata = /** @type {Y.Map<any> | undefined} */ (
      edge.get("metadata")
    )?.toJSON();
    removeEdge(child, edgeId);

    if (srcMoved && tgtMoved) {
      // Internal wiring moves to the parent with the nodes
      addEdge(parent, plain.src, plain.tgt, metadata ?? {});
      continue;
    }

    if (srcMoved) {
      // Moved node feeds a staying node: export an inport into the staying
      // node and wire the moved node to the subgraph node
      const key = `${plain.tgt.node}:${plain.tgt.port}:${plain.tgt.index ?? ""}`;
      const existing = existingInportFor.get(key);
      const name =
        existing ?? uniqueName(plain.tgt.port, usedInNames) ?? plain.tgt.port;
      if (!existing) {
        newInportNames.set(key, name);
        if (plain.tgt.index !== undefined) {
          newInportIndexes.set(key, plain.tgt.index);
        }
        usedInNames.add(name);
      }
      for (const sub of subNodes) {
        addEdge(
          parent,
          {
            node: plain.src.node,
            port: plain.src.port,
            index: plain.src.index,
          },
          { node: sub, port: name },
          metadata ?? {},
        );
      }
      continue;
    }

    // A staying node feeds the moved node: export an outport from the
    // staying node and wire it into the moved node
    const key = `${plain.src.node}:${plain.src.port}:${plain.src.index ?? ""}`;
    const existing = existingOutportFor.get(key);
    const name =
      existing ?? uniqueName(plain.src.port, usedOutNames) ?? plain.src.port;
    if (!existing) {
      newOutportNames.set(key, name);
      if (plain.src.index !== undefined) {
        newOutportIndexes.set(key, plain.src.index);
      }
      usedOutNames.add(name);
    }
    for (const sub of subNodes) {
      addEdge(
        parent,
        { node: sub, port: name },
        { node: plain.tgt.node, port: plain.tgt.port, index: plain.tgt.index },
        metadata ?? {},
      );
    }
  }

  for (const [key, name] of newInportNames) {
    const [nodeId, port] = /** @type {string[]} */ (key.split(":"));
    addInport(child, name, nodeId, port, {}, newInportIndexes.get(key));
  }
  for (const [key, name] of newOutportNames) {
    const [nodeId, port] = /** @type {string[]} */ (key.split(":"));
    addOutport(child, name, nodeId, port, {}, newOutportIndexes.get(key));
  }

  // Exports whose far end moved up are no longer routed through the
  // subgraph node; remove them
  for (const [name, info] of inportInfo) {
    if (movedIds.has(info.process)) {
      removeExportedPort(child, "inports", name);
    }
  }
  for (const [name, info] of outportInfo) {
    if (movedIds.has(info.process)) {
      removeExportedPort(child, "outports", name);
    }
  }

  // An emptied subgraph is deleted along with its signature
  if (/** @type {Y.Map<any>} */ (child.get("nodes")).size === 0) {
    deleteGraph(doc, graphId);
    removeComponentSignature(doc, graphId);
    /** @type {import("./Protocol.js").GraphRemoveGraphMessage} */
    const removeGraphEcho = {
      protocol: "graph",
      command: "removegraph",
      payload: { id: graphId },
    };
    echoes.push(removeGraphEcho);
  } else {
    // Keep the signature in sync with the remaining exports
    setComponentSignature(doc, graphId, {
      ...deriveGraphSignature(doc, child),
      description: `Subgraph of ${parentId}`,
    });
  }

  return { accepted: true, echoes };
}

/**
 * Creates a graph (root or subgraph). Idempotent: creating an existing graph
 * echoes it without mutating, so concurrent subgraph creation converges.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentCreateGraph(doc, payload) {
  const { graphId, name, parent } = payload ?? {};
  if (typeof graphId !== "string" || graphId.length === 0) {
    return { accepted: false, echoes: [] };
  }
  if (parent !== undefined && typeof parent !== "string") {
    return { accepted: false, echoes: [] };
  }
  const parentGraph = parent ? getGraph(doc, parent) : undefined;
  if (parent && !parentGraph) {
    return { accepted: false, echoes: [] };
  }
  createGraph(
    doc,
    graphId,
    typeof name === "string" ? name : graphId,
    parent ?? "",
  );
  /** @type {import("./Protocol.js").GraphCreateGraphMessage} */
  const echo = {
    protocol: "graph",
    command: "creategraph",
    payload: {
      id: graphId,
      name: typeof name === "string" ? name : graphId,
      parent: parent ?? "",
    },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * Removes a graph and its contents. Graphs with children must have their
 * children removed first, keeping subgraph lifecycles explicit.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentRemoveGraph(doc, payload) {
  const { graphId } = payload ?? {};
  if (typeof graphId !== "string" || !getGraph(doc, graphId)) {
    return { accepted: false, echoes: [] };
  }
  if (graphChildren(doc, graphId).length > 0) {
    return { accepted: false, echoes: [] };
  }
  deleteGraph(doc, graphId);
  /** @type {import("./Protocol.js").GraphRemoveGraphMessage} */
  const echo = {
    protocol: "graph",
    command: "removegraph",
    payload: { id: graphId },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentAddNode(doc, payload) {
  const { graphId, nodeId, componentName, metadata } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    typeof nodeId !== "string" ||
    typeof componentName !== "string" ||
    typeof metadata?.x !== "number" ||
    typeof metadata?.y !== "number"
  ) {
    return { accepted: false, echoes: [] };
  }
  const graph = createGraph(doc, graphId);
  const created = addNode(graph, nodeId, componentName, metadata);
  if (!created) {
    return { accepted: false, echoes: [] };
  }
  ensureDefaultSignature(doc, componentName);
  /** @type {import("./Protocol.js").GraphAddNodeMessage} */
  const echo = {
    protocol: "graph",
    command: "addnode",
    payload: { id: nodeId, component: componentName, metadata },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * Registers the default port signature (in/out) for a component that has
 * none, matching what the editor renders for signature-less components.
 * Components with real signatures keep them untouched.
 *
 * @param {Y.Doc} doc
 * @param {string} componentName
 */
function ensureDefaultSignature(doc, componentName) {
  if (getComponentSignature(doc, componentName)) return;
  setComponentSignature(doc, componentName, {
    inports: [{ name: "in", type: "all" }],
    outports: [{ name: "out", type: "all" }],
  });
}

/**
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentRemoveNode(doc, payload) {
  const { graphId, nodeId } = payload ?? {};
  if (typeof graphId !== "string" || typeof nodeId !== "string") {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  const removed = removeNode(graph, nodeId);
  removeNodeFromGroups(graph, nodeId);
  if (!removed) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").GraphRemoveNodeMessage} */
  const echo = {
    protocol: "graph",
    command: "removenode",
    payload: { id: nodeId },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentMoveNode(doc, payload) {
  const { graphId, nodeId, metadata } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    typeof nodeId !== "string" ||
    typeof metadata?.x !== "number" ||
    typeof metadata?.y !== "number"
  ) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  const moved = moveNode(graph, nodeId, metadata.x, metadata.y);
  if (!moved) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").GraphMoveNodeMessage} */
  const echo = {
    protocol: "graph",
    command: "movenode",
    payload: { id: nodeId, metadata: { x: metadata.x, y: metadata.y } },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentAddEdge(doc, payload) {
  const { graphId, src, tgt } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    !isValidEndpoint(src) ||
    !isValidEndpoint(tgt)
  ) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  const edgeId = addEdge(graph, src, tgt);
  if (!edgeId) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").GraphAddEdgeMessage} */
  const echo = {
    protocol: "graph",
    command: "addedge",
    payload: { id: edgeId, src, tgt, metadata: {} },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentRemoveEdge(doc, payload) {
  const { graphId, id } = payload ?? {};
  if (typeof graphId !== "string" || typeof id !== "string") {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  const removed = removeEdge(graph, id);
  if (!removed) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").GraphRemoveEdgeMessage} */
  const echo = {
    protocol: "graph",
    command: "removeedge",
    payload: { id },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * The work-document operations' author (work document #9): the device's
 * identity hash, set by `handleIntent` alongside the tracked-transaction
 * origin. The update threads attribute materialized changes per author.
 *
 * @type {string | null}
 */
let pendingWorkDocAuthor = null;

/**
 * Creates a work document (work document #9): title, optional Markdown
 * content, the author from the device identity, optional entity links.
 * The document starts proposed; scope transitions to the governed states
 * ride `setWorkDocScope` + materialization.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentCreateWorkDoc(doc, payload) {
  const { title, content, links } = payload ?? {};
  const author = pendingWorkDocAuthor;
  if (!author) {
    return { accepted: false, echoes: [] };
  }
  const record = createWorkDoc(doc, {
    title,
    content,
    author,
    links,
  });
  if (!record) {
    return { accepted: false, echoes: [] };
  }
  return {
    accepted: true,
    echoes: [
      {
        protocol: "workdoc",
        command: "created",
        payload: {
          id: record.get("id"),
          title: record.get("title"),
          scope: record.get("scope"),
          author,
          created: record.get("created"),
        },
      },
    ],
  };
}

/**
 * Appends an update to a work document's thread (work document #9):
 * updates are append-only — content changes land as new thread entries,
 * one-to-one with rngit's comments on materialization.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentUpdateWorkDoc(doc, payload) {
  const { docId, content } = payload ?? {};
  const author = pendingWorkDocAuthor;
  if (!author || typeof docId !== "string" || typeof content !== "string") {
    return { accepted: false, echoes: [] };
  }
  const ordinal = appendWorkDocUpdate(doc, docId, { author, content });
  if (ordinal === null) {
    return { accepted: false, echoes: [] };
  }
  return {
    accepted: true,
    echoes: [
      {
        protocol: "workdoc",
        command: "updated",
        payload: { id: docId, updateId: ordinal, author },
      },
    ],
  };
}

/**
 * Sets the project's rngit remote (work document #9, per work document
 * #60's scope rule): the materialization target is PROJECT state — CRDT
 * metadata, propagated to peers, edited through intents. Null clears it.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSetWorkdocsRepo(doc, payload) {
  const { url } = payload ?? {};
  if (url !== null && url !== undefined && typeof url !== "string") {
    return { accepted: false, echoes: [] };
  }
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (trimmed && !parseRngitUrl(trimmed)) {
    return { accepted: false, echoes: [] };
  }
  doc.transact(() => {
    const metadata = doc.getMap("metadata");
    if (trimmed) {
      metadata.set("workdocsRepo", trimmed);
    } else {
      metadata.delete("workdocsRepo");
    }
  });
  return {
    accepted: true,
    echoes: [
      {
        protocol: "workdoc",
        command: "repo",
        payload: { url: trimmed || null },
      },
    ],
  };
}

/**
 * Declares (or clears) a component-library dependency of the project
 * (work document #43): the module prefix component names use ("mylib" in
 * "mylib/Parser") mapped to the npm spec the materialized package.json
 * installs. The registry's signatures stay distinct — this is the
 * install-time list, not the component catalog.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSetProjectDependency(doc, payload) {
  const { module: moduleName, spec } = payload ?? {};
  if (
    typeof moduleName !== "string" ||
    !/^[a-z0-9][a-z0-9._-]*$/.test(moduleName)
  ) {
    return { accepted: false, echoes: [] };
  }
  const normalizedSpec =
    spec === null || spec === undefined ? null : String(spec).trim();
  if (normalizedSpec !== null && normalizedSpec.length === 0) {
    return { accepted: false, echoes: [] };
  }
  if (normalizedSpec !== null && normalizedSpec.length > 200) {
    return { accepted: false, echoes: [] };
  }
  doc.transact(() => {
    const metadata = doc.getMap("metadata");
    let dependencies = metadata.get("dependencies");
    if (!dependencies) {
      dependencies = new Y.Map();
      metadata.set("dependencies", dependencies);
    }
    if (normalizedSpec === null) {
      dependencies.delete(moduleName);
    } else {
      dependencies.set(moduleName, normalizedSpec);
    }
  });
  return {
    accepted: true,
    echoes: [
      {
        protocol: "project",
        command: "dependency",
        payload: { module: moduleName, spec: normalizedSpec },
      },
    ],
  };
}

/**
 * Relays a binary Yjs update into a work document's body (work document
 * #9): the live editing path — the document view's collaborative binding
 * relays local transactions as binary diffs (the component code editor's
 * pattern), so the engine's authoritative buffer integrates the SAME
 * items and its echo reconciles every mirror idempotently. The update
 * thread is untouched: body edits are live state, the composer at the
 * bottom posts the immutable thread entries.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSetWorkDocBody(doc, payload) {
  const { docId, update } = payload ?? {};
  if (typeof docId !== "string" || !(update instanceof Uint8Array)) {
    return { accepted: false, echoes: [] };
  }
  const applied = applyWorkDocBodyUpdate(doc, docId, update);
  if (!applied) {
    return { accepted: false, echoes: [] };
  }
  return {
    accepted: true,
    echoes: [
      {
        protocol: "workdoc",
        command: "edited",
        payload: { id: docId },
      },
    ],
  };
}

/**
 * Sets a work document's title (work document #9): user-owned data edited
 * in the document view; materialization carries it as-is.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSetWorkDocTitle(doc, payload) {
  const { docId, title } = payload ?? {};
  if (typeof docId !== "string" || typeof title !== "string") {
    return { accepted: false, echoes: [] };
  }
  const record = setWorkDocTitle(doc, docId, title);
  if (!record) {
    return { accepted: false, echoes: [] };
  }
  return {
    accepted: true,
    echoes: [
      {
        protocol: "workdoc",
        command: "titled",
        payload: { id: docId, title: record.get("title") },
      },
    ],
  };
}

/**
 * Requests a work document's scope transition (work document #9): the
 * request rides `pendingScope` — rngit's stricter rules are authoritative
 * ("theirs"), and the materialization loop confirms or the reconciliation
 * reverts. The intent records the request; it does not decide it.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSetWorkDocScope(doc, payload) {
  const { docId, scope } = payload ?? {};
  if (typeof docId !== "string") {
    return { accepted: false, echoes: [] };
  }
  if (scope !== "proposed" && scope !== "active" && scope !== "completed") {
    return { accepted: false, echoes: [] };
  }
  const record = requestWorkDocScope(doc, docId, scope);
  if (!record) {
    return { accepted: false, echoes: [] };
  }
  return {
    accepted: true,
    echoes: [
      {
        protocol: "workdoc",
        command: "scoped",
        payload: { id: docId, pendingScope: scope },
      },
    ],
  };
}

/**
 * Links (or clears) a component's implementation-request pointer (work
 * document #9, step D): the registry anchor #29's request flow reads. The
 * pointer rides the registry record; the document itself was created (or
 * will be) through the ordinary workdoc intents.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSetImplementationRequest(doc, payload) {
  const { component, request } = payload ?? {};
  if (typeof component !== "string" || !component) {
    return { accepted: false, echoes: [] };
  }
  if (request === null || request === undefined) {
    clearImplementationRequest(doc, component);
    return {
      accepted: true,
      echoes: [
        {
          protocol: "workdoc",
          command: "requested",
          payload: { component, docId: null },
        },
      ],
    };
  }
  const applied = setImplementationRequest(doc, component, request);
  if (!applied) {
    return { accepted: false, echoes: [] };
  }
  return {
    accepted: true,
    echoes: [
      {
        protocol: "workdoc",
        command: "requested",
        payload: { component, docId: request.docId },
      },
    ],
  };
}

/**
 * The datatype of one of a component's ports (work document #5's splice):
 * read from the registry signature; a missing signature or port type is
 * the permissive `all`, matching the Glass library's convention.
 *
 * @param {Y.Doc} doc
 * @param {string} componentName
 * @param {"inports" | "outports"} direction
 * @param {string} portName
 * @returns {string}
 */
/**
 * A component signature's port list as plain records: the registry stores
 * port collections as Y.Arrays of Y.Maps (named records) — normalize both
 * that and the keyed-map form into `{ name, type }` pairs.
 *
 * @param {Y.Map<any> | undefined} signature
 * @param {"inports" | "outports"} direction
 * @returns {Array<{ name: string, type: string }> | null}
 */
function signaturePorts(signature, direction) {
  if (!signature) return null;
  const raw = signature.get(direction);
  if (raw instanceof Y.Map) {
    return [...raw.entries()].map(([name, port]) => ({
      name,
      type: /** @type {any} */ (port)?.get?.("type"),
    }));
  }
  if (raw instanceof Y.Array) {
    return raw.toJSON().map((/** @type {any} */ port) => ({
      name: port?.name,
      type: port?.type,
    }));
  }
  return null;
}

/**
 * @param {Y.Doc} doc
 * @param {string} componentName
 * @param {"inports" | "outports"} direction
 * @param {string} portName
 * @returns {string}
 */
function componentPortType(doc, componentName, direction, portName) {
  const ports = signaturePorts(
    getComponentSignature(doc, componentName),
    direction,
  );
  if (!ports) return "all";
  const port = ports.find((candidate) => candidate.name === portName);
  return typeof port?.type === "string" && port.type ? port.type : "all";
}

/**
 * Whether one of a component's ports is compatible with a datatype (work
 * document #5): `all` wildcards match anything, otherwise the types are
 * equal.
 *
 * @param {Y.Doc} doc
 * @param {string} componentName
 * @param {"inports" | "outports"} direction
 * @param {string} portName
 * @param {string} dataType
 * @returns {boolean}
 */
function portIsCompatible(doc, componentName, direction, portName, dataType) {
  const portType = componentPortType(doc, componentName, direction, portName);
  return portType === "all" || dataType === "all" || portType === dataType;
}

/**
 * The most compatible port of a component for a datatype (work document #5
 * update #15's preference order): the canonical `in`/`out` port first,
 * then the first compatible one. There is NO default-port fallback — an
 * incompatible component refuses the splice outright instead of silently
 * mismatching.
 *
 * @param {Y.Doc} doc
 * @param {string} componentName
 * @param {"inports" | "outports"} direction
 * @param {string} dataType
 * @returns {string | null}
 */
function compatiblePort(doc, componentName, direction, dataType) {
  const ports = signaturePorts(
    getComponentSignature(doc, componentName),
    direction,
  );
  if (!ports) return null;
  const canonical = direction === "inports" ? "in" : "out";
  if (
    ports.some((port) => port.name === canonical) &&
    portIsCompatible(doc, componentName, direction, canonical, dataType)
  ) {
    return canonical;
  }
  for (const port of ports) {
    if (portIsCompatible(doc, componentName, direction, port.name, dataType)) {
      return port.name;
    }
  }
  return null;
}

/**
 * Routes an edge through a node (work document #5's splice — the edge
 * menu's create-a-node path and the drag's existing-node path share the
 * intent): the original edge is removed, the node is created or moved to
 * the splice position, and the edge's endpoints reconnect through the
 * node's most compatible ports. One intent = one transaction = one undo
 * step (work document #39).
 *
 * Type-aware: the splice is refused unless the node has ports compatible
 * with the edge's endpoint datatypes — an incompatible component never
 * half-splices the graph. All validation runs before the first mutation:
 * a refusal leaves the transaction empty.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSpliceNode(doc, payload) {
  const { graphId, edgeId, nodeId, componentName, x, y, inPort, outPort } =
    payload ?? {};
  if (
    typeof graphId !== "string" ||
    typeof edgeId !== "string" ||
    typeof nodeId !== "string" ||
    typeof x !== "number" ||
    typeof y !== "number" ||
    (componentName !== undefined && typeof componentName !== "string") ||
    (inPort !== undefined && typeof inPort !== "string") ||
    (outPort !== undefined && typeof outPort !== "string")
  ) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  const edgeRecord = /** @type {Y.Map<any> | undefined} */ (
    graph.get("edges").get(edgeId)
  );
  if (!edgeRecord) {
    return { accepted: false, echoes: [] };
  }
  const edge = edgeRecord.toJSON();
  const src = edge.src;
  const tgt = edge.tgt;
  if (!src?.node || !tgt?.node) {
    return { accepted: false, echoes: [] };
  }

  // The spliced node: created (menu path) or moved into place (drag path)
  const creating = componentName !== undefined;
  const existing = getNode(graph, nodeId);
  if (creating && existing) {
    // addNode would refuse duplicates mid-splice: refuse before mutating
    return { accepted: false, echoes: [] };
  }
  const component = creating ? componentName : existing?.get("component");
  if (typeof component !== "string") {
    return { accepted: false, echoes: [] };
  }

  // The edge endpoints' datatypes come from their nodes' components
  const srcNode = getNode(graph, src.node);
  const tgtNode = getNode(graph, tgt.node);
  if (!srcNode || !tgtNode) {
    return { accepted: false, echoes: [] };
  }
  const srcType = componentPortType(
    doc,
    /** @type {string} */ (srcNode.get("component")),
    "outports",
    src.port,
  );
  const tgtType = componentPortType(
    doc,
    /** @type {string} */ (tgtNode.get("component")),
    "inports",
    tgt.port,
  );

  // Port selection: the Glass may pin the ports; the engine otherwise
  // picks the most compatible — and refuses when the node has none or a
  // pinned port is incompatible
  const chosenIn = inPort ?? compatiblePort(doc, component, "inports", srcType);
  const chosenOut =
    outPort ?? compatiblePort(doc, component, "outports", tgtType);
  if (
    !chosenIn ||
    !chosenOut ||
    !portIsCompatible(doc, component, "inports", chosenIn, srcType) ||
    !portIsCompatible(doc, component, "outports", chosenOut, tgtType)
  ) {
    return { accepted: false, echoes: [] };
  }

  // The new edges' deterministic ids must not collide with existing edges
  const newEdgeAId = edgeIdFor(src, { node: nodeId, port: chosenIn });
  const newEdgeBId = edgeIdFor({ node: nodeId, port: chosenOut }, tgt);
  const edges = graph.get("edges");
  if (edges.has(newEdgeAId) || edges.has(newEdgeBId)) {
    return { accepted: false, echoes: [] };
  }

  // ---- mutations (one transaction, one undo step) ----
  removeEdge(graph, edgeId);
  if (creating) {
    const created = addNode(graph, nodeId, component, { x, y });
    if (!created) {
      return { accepted: false, echoes: [] };
    }
    ensureDefaultSignature(doc, component);
  } else {
    moveNode(graph, nodeId, x, y);
  }
  const edgeA = addEdge(graph, src, { node: nodeId, port: chosenIn });
  const edgeB = addEdge(graph, { node: nodeId, port: chosenOut }, tgt);
  if (!edgeA || !edgeB) {
    // Unreachable after the pre-validation, but never half-report
    return { accepted: false, echoes: [] };
  }

  /** @type {Array<import("./Protocol.js").EngineUIMessage>} */
  const echoes = [
    {
      protocol: "graph",
      command: "removeedge",
      payload: { id: edgeId },
    },
  ];
  if (creating) {
    echoes.push({
      protocol: "graph",
      command: "addnode",
      payload: { id: nodeId, component, metadata: { x, y } },
    });
  } else {
    echoes.push({
      protocol: "graph",
      command: "movenode",
      payload: { id: nodeId, metadata: { x, y } },
    });
  }
  echoes.push({
    protocol: "graph",
    command: "addedge",
    payload: {
      id: edgeA,
      src,
      tgt: { node: nodeId, port: chosenIn },
      metadata: {},
    },
  });
  echoes.push({
    protocol: "graph",
    command: "addedge",
    payload: {
      id: edgeB,
      src: { node: nodeId, port: chosenOut },
      tgt,
      metadata: {},
    },
  });
  return { accepted: true, echoes };
}

/**
 * @param {any} endpoint
 * @returns {boolean}
 */
function isValidEndpoint(endpoint) {
  return (
    !!endpoint &&
    typeof endpoint.node === "string" &&
    typeof endpoint.port === "string" &&
    (endpoint.index === undefined || typeof endpoint.index === "number")
  );
}

/**
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentAddIIP(doc, payload) {
  const { graphId, data, tgt, metadata } = payload ?? {};
  if (typeof graphId !== "string" || !isValidEndpoint(tgt)) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  const id = addIIP(graph, data, tgt, metadata ?? {});
  if (!id) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").GraphAddIIPMessage} */
  const echo = {
    protocol: "graph",
    command: "addiip",
    payload: { id, data, tgt, metadata: metadata ?? {} },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
/**
 * Merges a patch into a node's metadata (work document #64's small
 * editors): the collaborative metadata editor's binding writes
 * granularly into the mirror's metadata map and relays the raw Yjs
 * update — applied with item structure intact; the whole-merge patch
 * reconciles per key, so a save never orphans the binding's item
 * structure. The position keys (`x`/`y`) stay the move intent's — a
 * patch that carries them moves the node through the same write path
 * the editor already uses.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSetNodeMetadata(doc, payload) {
  const { graphId, nodeId, metadata, update } = payload ?? {};
  if (typeof graphId !== "string" || typeof nodeId !== "string") {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  // The collaborative editor's binary update (work document #64)
  if (update !== undefined) {
    if (!(update instanceof Uint8Array) || update.length === 0) {
      return { accepted: false, echoes: [] };
    }
    Y.applyUpdate(doc, update);
    /** @type {import("./Protocol.js").GraphSetNodeMetadataMessage} */
    const echo = {
      protocol: "graph",
      command: "setnodemetadata",
      payload: { graphId, nodeId },
    };
    return { accepted: true, echoes: [echo] };
  }
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { accepted: false, echoes: [] };
  }
  if (!setNodeMetadata(graph, nodeId, metadata)) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").GraphSetNodeMetadataMessage} */
  const echo = {
    protocol: "graph",
    command: "setnodemetadata",
    payload: { graphId, nodeId, metadata },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * Merges a patch into a graph's metadata (work document #64's graph
 * properties): the display name is one key among the patch's. The
 * collaborative properties editor's binding writes granularly into the
 * mirror's graph metadata and relays the raw Yjs update — applied with
 * item structure intact; the whole-merge patch reconciles per key, so
 * a save never orphans the binding's item structure. The graph's id
 * (the routing and the subgraph hierarchy's address) stays stable.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSetGraphMetadata(doc, payload) {
  const { graphId, metadata, update } = payload ?? {};
  if (typeof graphId !== "string") {
    return { accepted: false, echoes: [] };
  }
  // The collaborative properties editor's binary update (work document
  // #64)
  if (update !== undefined) {
    if (!(update instanceof Uint8Array) || update.length === 0) {
      return { accepted: false, echoes: [] };
    }
    Y.applyUpdate(doc, update);
    /** @type {import("./Protocol.js").GraphSetGraphMetadataMessage} */
    const echo = {
      protocol: "graph",
      command: "setgraphmetadata",
      payload: { graphId },
    };
    return { accepted: true, echoes: [echo] };
  }
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { accepted: false, echoes: [] };
  }
  if (!setGraphMetadata(doc, graphId, metadata)) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").GraphSetGraphMetadataMessage} */
  const echo = {
    protocol: "graph",
    command: "setgraphmetadata",
    payload: { graphId, metadata },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * Reconciles a shared Y.Map in place with a plain object (work document
 * #64): per-key writes, missing keys deleted, nested shared types
 * recursing — a save never orphans the collaborative editor's item
 * structure.
 *
 * @param {any} yMap The shared map.
 * @param {Record<string, any>} value The target plain object.
 * @returns {void}
 */
function applyMapGranular(yMap, value) {
  for (const key of Object.keys(yMap.toJSON())) {
    if (!Object.hasOwn(value, key)) yMap.delete(key);
  }
  for (const key of Object.keys(value)) {
    const child = yMap.get(key);
    const after = value[key];
    const childIsMap =
      child &&
      typeof child === "object" &&
      typeof child.set === "function" &&
      typeof child.size === "number";
    const childIsArray =
      child &&
      typeof child === "object" &&
      typeof child.insert === "function" &&
      typeof child.length === "number";
    if (
      childIsMap &&
      after &&
      typeof after === "object" &&
      !Array.isArray(after)
    ) {
      applyMapGranular(child, after);
    } else if (childIsArray && Array.isArray(after)) {
      applyArrayGranular(child, after);
    } else {
      const current = yMap.get(key);
      if (current !== after) yMap.set(key, dataToShared(after));
    }
  }
}

/**
 * Reconciles a shared Y.Array in place with a plain array (work document
 * #64): matching positions recurse into shared children, scalars splice.
 *
 * @param {any} yArray The shared array.
 * @param {any[]} value The target plain array.
 * @returns {void}
 */
function applyArrayGranular(yArray, value) {
  const shared = Math.min(yArray.length, value.length);
  for (let index = 0; index < shared; index++) {
    const child = yArray.get(index);
    const after = value[index];
    const childIsMap =
      child &&
      typeof child === "object" &&
      typeof child.set === "function" &&
      typeof child.size === "number";
    if (
      childIsMap &&
      after &&
      typeof after === "object" &&
      !Array.isArray(after)
    ) {
      applyMapGranular(child, after);
    } else {
      const current = yArray.get(index);
      if (current !== after) {
        yArray.delete(index, 1);
        yArray.insert(index, [dataToShared(after)]);
      }
    }
  }
  if (value.length > yArray.length) {
    const additions = value
      .slice(yArray.length)
      .map((item) => dataToShared(item));
    yArray.insert(yArray.length, additions);
  } else if (value.length < yArray.length) {
    yArray.delete(value.length, yArray.length - value.length);
  }
}

/**
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentUpdateIIP(doc, payload) {
  const { graphId, id, data, update } = payload ?? {};
  if (typeof graphId !== "string" || typeof id !== "string") {
    return { accepted: false, echoes: [] };
  }
  if (!id.startsWith("DATA->")) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  const edge = /** @type {Y.Map<any> | undefined} */ (
    graph.get("edges").get(id)
  );
  if (!edge) {
    return { accepted: false, echoes: [] };
  }
  // The collaborative value editor's binary update (work document #64):
  // the binding writes granularly into the mirror's data type and
  // relays the raw Yjs update — applied here with item structure
  // intact, the setComponentCode pattern
  if (update !== undefined) {
    if (!(update instanceof Uint8Array) || update.length === 0) {
      return { accepted: false, echoes: [] };
    }
    Y.applyUpdate(doc, update);
    return { accepted: true, echoes: [] };
  }
  doc.transact(() => {
    // The granular write (work document #64): an existing shared data
    // type reconciles in place — per-key for objects, so a save never
    // orphans the collaborative editor's item structure — while kind
    // changes and scalars replace wholesale
    const current = edge.get("data");
    const currentIsMap =
      current &&
      typeof current === "object" &&
      typeof current.set === "function" &&
      typeof current.delete === "function" &&
      typeof current.size === "number" &&
      !Array.isArray(current);
    const currentIsArray =
      current &&
      typeof current === "object" &&
      typeof current.insert === "function" &&
      typeof current.length === "number";
    if (
      currentIsMap &&
      data &&
      typeof data === "object" &&
      !Array.isArray(data)
    ) {
      applyMapGranular(current, data);
    } else if (currentIsArray && Array.isArray(data)) {
      applyArrayGranular(current, data);
    } else {
      edge.set("data", dataToShared(data));
    }
  });
  /** @type {import("./Protocol.js").GraphUpdateIIPMessage} */
  const echo = {
    protocol: "graph",
    command: "updateiip",
    payload: { id, data },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentRemoveIIP(doc, payload) {
  const { graphId, id } = payload ?? {};
  if (typeof graphId !== "string" || typeof id !== "string") {
    return { accepted: false, echoes: [] };
  }
  if (!id.startsWith("DATA->")) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  if (!removeEdge(graph, id)) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").GraphRemoveIIPMessage} */
  const echo = {
    protocol: "graph",
    command: "removeiip",
    payload: { id },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * @param {'addInport' | 'addOutport' | 'removeInport' | 'removeOutport' | 'renameInport' | 'renameOutport'} command
 * @returns {"inports" | "outports"}
 */
function directionForCommand(command) {
  return command.toLowerCase().endsWith("inport") ? "inports" : "outports";
}

/**
 * Derives a graph-implemented component's signature from its exports
 * (work document #29): the interface is the exports, and each port
 * inherits the datatype of the internal component port the export
 * references. An exported port is a single address slot, so
 * addressability never carries over to the derived signature.
 *
 * @param {Y.Doc} doc
 * @param {Y.Map<any>} graph
 * @returns {{ inports: Array<{ name: string, type?: string }>, outports: Array<{ name: string, type?: string }> }}
 */
function deriveGraphSignature(doc, graph) {
  const readDirection = (/** @type {"inports" | "outports"} */ direction) =>
    [.../** @type {Y.Map<any>} */ (graph.get(direction)).entries()].map(
      ([name, info]) => {
        // Export records are Y.Maps (ProjectDoc's writes), but tolerate
        // plain-object records set directly
        const plain = typeof info?.toJSON === "function" ? info.toJSON() : info;
        /** @type {{ name: string, type?: string }} */
        const port = { name };
        // The datatype comes from the referenced component's port; the
        // export's port name may carry a legacy slot suffix
        const internalName = String(plain.port ?? "").replace(/\[\d+\]$/, "");
        const component = getNode(graph, plain.process)?.get("component");
        const nodeSignature = component
          ? (getComponentSignature(doc, component)?.toJSON?.() ?? {})
          : {};
        const internal = (
          direction === "inports"
            ? nodeSignature.inports
            : nodeSignature.outports
        )?.find((/** @type {any} */ p) => p?.name === internalName);
        if (internal && internal.type !== undefined) {
          port.type = internal.type;
        }
        return port;
      },
    );
  return {
    inports: readDirection("inports"),
    outports: readDirection("outports"),
  };
}

/**
 * Computes a graph-implemented component's full derived signature: the
 * exported ports (with inherited datatypes) plus the preserved
 * description/icon. Null for graphs that are not components.
 *
 * @param {Y.Doc} doc
 * @param {string} graphId
 * @returns {{ inports: Array<{ name: string, type?: string }>, outports: Array<{ name: string, type?: string }>, description?: string, icon?: string } | null}
 */
function derivedSignature(doc, graphId) {
  const graph = getGraph(doc, graphId);
  const existing = getComponentSignature(doc, graphId);
  if (!graph || !existing) return null;
  const plain = existing.toJSON?.() ?? {};
  return {
    ...deriveGraphSignature(doc, graph),
    description:
      typeof plain.description === "string"
        ? plain.description
        : `Subgraph of ${graphId}`,
    icon: typeof plain.icon === "string" ? plain.icon : undefined,
  };
}

/**
 * Re-derives a graph-implemented component's signature from its exports
 * (work document #29): a graph's signature is derived, never declared —
 * the same rule `intentSetSignature` enforces by refusing graphs. Called
 * whenever a graph's exports change so the parent graph's subgraph nodes
 * render the current interface. No-op for graphs that are not components.
 *
 * @param {Y.Doc} doc
 * @param {string} graphId
 * @returns {import("./Protocol.js").SignatureMessage | null} The
 *   signature echo, or null when the graph has no registered signature.
 */
function syncGraphSignature(doc, graphId) {
  const signature = derivedSignature(doc, graphId);
  if (!signature) return null;
  setComponentSignature(doc, graphId, signature);
  return {
    protocol: "system",
    command: "signature",
    payload: {
      componentName: graphId,
      signature: getComponentSignature(doc, graphId)?.toJSON() ?? null,
    },
  };
}

/**
 * Refreshes every graph-implemented component's derived signature (work
 * document #29): derived state can go stale across engine upgrades — the
 * pre-datatype-inheritance derivations wrote name-only signatures — so
 * the boot refresh brings every derived interface back in step with its
 * graph's exports. Signatures whose derivation matches are left
 * untouched, so an unchanged project boots without CRDT churn.
 *
 * @param {Y.Doc} doc
 * @returns {void}
 */
export function refreshDerivedSignatures(doc) {
  for (const graphId of doc.getMap("graphs").keys()) {
    const signature = derivedSignature(doc, graphId);
    if (!signature) continue;
    const existing = getComponentSignature(doc, graphId)?.toJSON?.() ?? {};
    if (JSON.stringify(signature) === JSON.stringify(existing)) continue;
    setComponentSignature(doc, graphId, signature);
  }
}

/**
 * @param {Y.Doc} doc
 * @param {'addInport' | 'addOutport'} command
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentAddExport(doc, command, payload) {
  const { graphId, name, nodeId, port, metadata, index } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    typeof name !== "string" ||
    typeof nodeId !== "string" ||
    typeof port !== "string"
  ) {
    return { accepted: false, echoes: [] };
  }
  if (
    index !== undefined &&
    (typeof index !== "number" || !Number.isInteger(index) || index < 0)
  ) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  const direction = directionForCommand(command);
  const added =
    direction === "inports"
      ? addInport(graph, name, nodeId, port, metadata ?? {}, index)
      : addOutport(graph, name, nodeId, port, metadata ?? {}, index);
  if (!added) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").GraphAddExportMessage} */
  const echo = {
    protocol: "graph",
    command: /** @type {'addinport' | 'addoutport'} */ (command.toLowerCase()),
    payload: { name, nodeId, port, metadata: metadata ?? {} },
  };
  if (index !== undefined) {
    echo.payload.index = index;
  }
  const signatureEcho = syncGraphSignature(doc, graphId);
  return {
    accepted: true,
    echoes: signatureEcho ? [echo, signatureEcho] : [echo],
  };
}

/**
 * @param {Y.Doc} doc
 * @param {'removeInport' | 'removeOutport'} command
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentRemoveExport(doc, command, payload) {
  const { graphId, name } = payload ?? {};
  if (typeof graphId !== "string" || typeof name !== "string") {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  if (!removeExportedPort(graph, directionForCommand(command), name)) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").GraphRemoveExportMessage} */
  const echo = {
    protocol: "graph",
    command: /** @type {'removeinport' | 'removeoutport'} */ (
      command.toLowerCase()
    ),
    payload: { name },
  };
  const signatureEcho = syncGraphSignature(doc, graphId);
  return {
    accepted: true,
    echoes: signatureEcho ? [echo, signatureEcho] : [echo],
  };
}

/**
 * @param {Y.Doc} doc
 * @param {'renameInport' | 'renameOutport'} command
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentRenameExport(doc, command, payload) {
  const { graphId, from, to } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    typeof from !== "string" ||
    typeof to !== "string"
  ) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  const direction = directionForCommand(command);
  const ports = /** @type {Y.Map<any>} */ (graph.get(direction));
  const info = ports.get(from);
  if (!info || ports.has(to)) {
    return { accepted: false, echoes: [] };
  }
  // Yjs types cannot be re-integrated under a new key; copy the record.
  // The metadata keeps its Y.Map form: plain-object metadata would break
  // later in-place updates (the route cycler hit this)
  const plain = info.toJSON();
  doc.transact(() => {
    ports.delete(from);
    const moved = new Y.Map();
    for (const key of Object.keys(plain)) {
      if (key === "metadata") {
        const metadataMap = new Y.Map();
        for (const metaKey of Object.keys(plain[key] ?? {})) {
          metadataMap.set(metaKey, plain[key]?.[metaKey]);
        }
        moved.set("metadata", metadataMap);
        continue;
      }
      moved.set(key, plain[key]);
    }
    ports.set(to, moved);
  });
  /** @type {import("./Protocol.js").GraphRenameExportMessage} */
  const echo = {
    protocol: "graph",
    command: /** @type {'renameinport' | 'renameoutport'} */ (
      command.toLowerCase()
    ),
    payload: { from, to },
  };
  const signatureEcho = syncGraphSignature(doc, graphId);
  return {
    accepted: true,
    echoes: signatureEcho ? [echo, signatureEcho] : [echo],
  };
}

/**
 * Tombstone-revokes a grant (work document #27): revocation stays a CRDT
 * tombstone intent, while granting happens through the mesh layer's born-
 * verified `MESH grant`. Revoking an already-revoked grant is a no-op
 * that still reports success.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentRevokePermission(doc, payload) {
  const { grantId } = payload ?? {};
  if (!revokePermission(doc, grantId)) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").AclRevokeMessage} */
  const echo = {
    protocol: "acl",
    command: "revoke",
    payload: { id: grantId },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * Creates a group over a selection (work document #5 update #16): the
 * grouping interaction's engine side. The group is graph structure; its
 * tariff-zone rendering is WD #35's.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentCreateGroup(doc, payload) {
  const { graphId, nodeIds, name } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    !Array.isArray(nodeIds) ||
    nodeIds.length === 0 ||
    !nodeIds.every((/** @type {any} */ id) => typeof id === "string")
  ) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  const groupId = `group_${Date.now()}`;
  if (
    !createGroup(graph, groupId, typeof name === "string" ? name : "", nodeIds)
  ) {
    return { accepted: false, echoes: [] };
  }
  return { accepted: true, echoes: [] };
}

/**
 * Removes a group; its members stay in the graph (the "ungroup" action).
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentRemoveGroup(doc, payload) {
  const { graphId, groupId } = payload ?? {};
  if (typeof graphId !== "string" || typeof groupId !== "string") {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  if (!removeGroup(graph, groupId)) {
    return { accepted: false, echoes: [] };
  }
  return { accepted: true, echoes: [] };
}

/**
 * Updates a group's membership: nodes dragged into the group's area join it,
 * nodes dragged out leave it (work document #5 update #16).
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentUpdateGroup(doc, payload) {
  const { graphId, groupId, add, remove, name } = payload ?? {};
  if (typeof graphId !== "string" || typeof groupId !== "string") {
    return { accepted: false, echoes: [] };
  }
  if (name !== undefined && typeof name !== "string") {
    return { accepted: false, echoes: [] };
  }
  const idsOk = (/** @type {any} */ ids) =>
    ids === undefined ||
    (Array.isArray(ids) &&
      ids.every((/** @type {any} */ id) => typeof id === "string"));
  if (!idsOk(add) || !idsOk(remove)) {
    return { accepted: false, echoes: [] };
  }
  if (!add && !remove && name === undefined) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph || !getGroup(graph, groupId)) {
    return { accepted: false, echoes: [] };
  }
  if (name !== undefined && !renameGroup(graph, groupId, name)) {
    return { accepted: false, echoes: [] };
  }
  if (add && !addGroupNodes(graph, groupId, add)) {
    return { accepted: false, echoes: [] };
  }
  if (remove && !removeGroupNodes(graph, groupId, remove)) {
    return { accepted: false, echoes: [] };
  }
  return { accepted: true, echoes: [] };
}

/**
 * Sets an exported port's route (work document #35): the route index
 * colors the export wire. Null clears the route.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSetPortRoute(doc, payload) {
  const { graphId, name, direction, route } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    typeof name !== "string" ||
    (direction !== "inports" && direction !== "outports") ||
    ((typeof route !== "number" ||
      !Number.isInteger(route) ||
      route < 0 ||
      route > 9) &&
      route !== null)
  ) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  if (!setPortRoute(graph, direction, name, route)) {
    return { accepted: false, echoes: [] };
  }
  return { accepted: true, echoes: [] };
}

/**
 * Moves an IIP (work document #5 follow-up): IIP positions sync like node
 * positions.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentMoveIIP(doc, payload) {
  const { graphId, id, metadata } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    typeof id !== "string" ||
    typeof metadata?.x !== "number" ||
    typeof metadata?.y !== "number"
  ) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  if (!moveIIP(graph, id, metadata.x, metadata.y)) {
    return { accepted: false, echoes: [] };
  }
  return { accepted: true, echoes: [] };
}

/**
 * Moves an exported port (work document #5 follow-up): export positions
 * sync like node positions.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentMoveExport(doc, payload) {
  const { graphId, name, direction, metadata } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    typeof name !== "string" ||
    typeof metadata?.x !== "number" ||
    typeof metadata?.y !== "number"
  ) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  const resolved = directionForCommand(
    direction === "in" ? "addInport" : "addOutport",
  );
  if (!moveExport(graph, resolved, name, metadata.x, metadata.y)) {
    return { accepted: false, echoes: [] };
  }
  return { accepted: true, echoes: [] };
}

/**
 * Sets an edge's route (work document #35): the route index colors the
 * edge and drives the route highlighting. Null clears the route.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSetEdgeRoute(doc, payload) {
  const { graphId, edgeId, route } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    typeof edgeId !== "string" ||
    ((typeof route !== "number" ||
      !Number.isInteger(route) ||
      route < 0 ||
      route > 9) &&
      route !== null)
  ) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  if (!setEdgeRoute(graph, edgeId, route)) {
    return { accepted: false, echoes: [] };
  }
  return { accepted: true, echoes: [] };
}

/**
 * Names a route (work document #35's route context): the per-graph route
 * table in the graph's metadata carries the custom names the roundels
 * render — route identity beyond hue (guidelines §6).
 *
 * @param {Y.Doc} doc
 * @param {{ graphId?: string, route?: number, name?: string, description?: string }} payload
 * @returns {{ accepted: boolean, echoes: never[] }}
 */
function intentSetRouteName(doc, payload) {
  const { graphId, route, name, description } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    typeof route !== "number" ||
    !Number.isInteger(route) ||
    route < 0 ||
    route > 9 ||
    typeof name !== "string"
  ) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  if (!setRouteName(graph, route, name, description)) {
    return { accepted: false, echoes: [] };
  }
  return { accepted: true, echoes: [] };
}

/**
 * Sets a component's signature (work document #29's "specify" step): the
 * Glass's signature editor writes the declared interface through this
 * intent. Graph-implemented components are refused: their signatures are
 * derived from the graph's exports by the subgraph lifecycle.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSetSignature(doc, payload) {
  const { component, signature, update } = payload ?? {};
  if (typeof component !== "string" || component.length === 0) {
    return { accepted: false, echoes: [] };
  }
  // The collaborative form's binary update (work document #64): the
  // Glass's y-jedison binding writes granularly into the mirror's
  // registry entry and relays the raw Yjs update — applied here with
  // item structure intact, so the mirror and this authoritative
  // registry share the same items and the echo is idempotent (the
  // setComponentCode pattern). The whole-write below stays the
  // validated path: creation, fork, and explicit saves
  if (update !== undefined) {
    if (!(update instanceof Uint8Array) || update.length === 0) {
      return { accepted: false, echoes: [] };
    }
    if (getGraph(doc, component)) {
      // A graph's signature is derived from its exports, not declared
      return { accepted: false, echoes: [] };
    }
    if (!getComponentSignature(doc, component)) {
      return { accepted: false, echoes: [] };
    }
    Y.applyUpdate(doc, update);
    return { accepted: true, echoes: [] };
  }
  if (!signature || typeof signature !== "object") {
    return { accepted: false, echoes: [] };
  }
  const portsOk = (/** @type {any} */ ports) =>
    ports === undefined ||
    (Array.isArray(ports) &&
      ports.every(
        (/** @type {any} */ port) =>
          port && typeof port.name === "string" && port.name.length > 0,
      ));
  // Port schema references (work document #57): an `id` must exist in the
  // project's schemas section, and its digest resolves from that record —
  // digests pin bytes, and the pinned form is what sig_hash covers
  // Port schema references (work document #57): an `id` must exist in
  // the project's schemas section — the digest pins bytes at reference
  // time and travels with the ref (the Glass computes it from the CRDT
  // record; the sync intent boundary verifies the id only)
  const portsSchemaOk = (/** @type {any} */ ports) =>
    ports === undefined ||
    (Array.isArray(ports) &&
      ports.every((/** @type {any} */ port) => {
        if (!port?.schema) return true;
        return (
          typeof port.schema.id === "string" &&
          Boolean(getSchema(doc, port.schema.id))
        );
      }));
  if (!portsOk(signature.inports) || !portsOk(signature.outports)) {
    return { accepted: false, echoes: [] };
  }
  if (!portsSchemaOk(signature.inports) || !portsSchemaOk(signature.outports)) {
    return { accepted: false, echoes: [] };
  }
  // Port names are unique per direction (work document #5): one "in"
  // inport, one "foo" outport — the same name across directions is fine
  const uniquePerDirection = (/** @type {any[]} */ ports) =>
    new Set((ports ?? []).map((/** @type {any} */ p) => p.name)).size ===
    (ports ?? []).length;
  if (
    !uniquePerDirection(signature.inports) ||
    !uniquePerDirection(signature.outports)
  ) {
    return { accepted: false, echoes: [] };
  }
  if (getGraph(doc, component)) {
    // A graph's signature is derived from its exports, not declared
    return { accepted: false, echoes: [] };
  }
  setComponentSignature(doc, component, {
    inports: signature.inports ?? [],
    outports: signature.outports ?? [],
    description:
      typeof signature.description === "string"
        ? signature.description
        : undefined,
    icon: typeof signature.icon === "string" ? signature.icon : undefined,
  });
  /** @type {import("./Protocol.js").SignatureMessage} */
  const echo = {
    protocol: "system",
    command: "signature",
    payload: {
      componentName: component,
      signature: getComponentSignature(doc, component)?.toJSON() ?? null,
    },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * Implements a component as a graph (work document #29): creates the
 * component's subgraph under the implementing graph, so the component
 * leaves the "Inferred" era and nodes referencing it become navigable
 * subgraph instances. The declared signature stays as the component's
 * interface; the graph's own exports grow as the implementation is wired.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentImplementAsGraph(doc, payload) {
  const { component, parentGraph } = payload ?? {};
  if (
    typeof component !== "string" ||
    component.length === 0 ||
    typeof parentGraph !== "string" ||
    component === parentGraph
  ) {
    return { accepted: false, echoes: [] };
  }
  if (!getComponentSignature(doc, component) || !getGraph(doc, parentGraph)) {
    return { accepted: false, echoes: [] };
  }
  if (getGraph(doc, component)) {
    // Already implemented as a graph: idempotent echo, no mutation
    /** @type {import("./Protocol.js").GraphCreateGraphMessage} */
    const existing = {
      protocol: "graph",
      command: "creategraph",
      payload: {
        id: component,
        name: String(
          getGraph(doc, component)?.get("metadata")?.get("name") ?? component,
        ),
        parent: String(
          getGraph(doc, component)?.get("metadata")?.get("parent") ?? "",
        ),
      },
    };
    return { accepted: true, echoes: [existing] };
  }
  createGraph(doc, component, component, parentGraph);
  /** @type {import("./Protocol.js").GraphCreateGraphMessage} */
  const echo = {
    protocol: "graph",
    command: "creategraph",
    payload: { id: component, name: component, parent: parentGraph },
  };
  return { accepted: true, echoes: [echo] };
}

/**
 * Sets a component's code buffer (work document #43): the file-facing
 * code delta from the bridge's materializer. Ensures the component exists
 * (a file may materialize a new component) and replaces the buffer
 * atomically. No echo: the components-map mutation rides the CRDT stream,
 * the same surface every component code edit already rides.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSetComponentCode(doc, payload) {
  const { component, code, update } = payload ?? {};
  if (typeof component !== "string" || component.length === 0) {
    return { accepted: false, echoes: [] };
  }
  if (getGraph(doc, component)) {
    // A graph implementation cannot also be a code implementation
    return { accepted: false, echoes: [] };
  }
  const componentEntry = ensureComponent(doc, component, { name: component });
  if (update !== undefined) {
    // A binary Yjs update carrying the collaborative editor's local
    // transaction (work document #29): applied with item structure
    // intact, so the Glass's mirror and this authoritative buffer share
    // the same items and the echo is idempotent. A content delta would
    // re-create the edit with the engine's clientID and diverge from
    // the mirror — the reason the delta form is gone.
    if (!(update instanceof Uint8Array) || update.length === 0) {
      return { accepted: false, echoes: [] };
    }
    Y.applyUpdate(doc, update);
    return { accepted: true, echoes: [] };
  }
  if (typeof code !== "string") {
    return { accepted: false, echoes: [] };
  }
  setComponentCode(componentEntry, code);
  return { accepted: true, echoes: [] };
}

/**
 * Validates a Y.Text delta for the intent path: an array of retain /
 * insert / delete operations, inserts string-only (the editor's edits
 * are plain text).
 *
 * @param {any} delta
 * @returns {boolean}
 */
function isValidTextDelta(delta) {
  if (!Array.isArray(delta)) return false;
  return delta.every(
    (op) =>
      op !== null &&
      typeof op === "object" &&
      ((typeof op.retain === "number" && op.retain >= 0) ||
        typeof op.insert === "string" ||
        (typeof op.delete === "number" && op.delete >= 0)),
  );
}

/**
 * Sets a project-carried documentation document's content (work document
 * #43): collaborative Markdown keyed by a path-safe name.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
/**
 * The Tier B meta-schema enforcement (work document #57 update #1): a
 * schema body is valid JSON Schema 2020-12 or it is not saved. Ajv
 * bundles the 2020-12 meta natively; the noflo extension vocabulary is
 * declared optional, so our keywords are ignored rather than refused.
 *
 * @type {((data: any) => boolean) | null}
 */
let metaSchemaValidator = null;

/**
 * Validates a schema body against the 2020-12 meta-schema.
 *
 * @param {any} body The parsed schema body.
 * @returns {string | null} The first error message, or null when valid.
 */
function validateSchemaBody(body) {
  if (!metaSchemaValidator) {
    metaSchemaValidator = new Ajv2020({
      allErrors: true,
      strict: false,
    }).compile({ $ref: "https://json-schema.org/draft/2020-12/schema" });
  }
  const valid = metaSchemaValidator(body);
  if (valid) return null;
  const errors = /** @type {any} */ (metaSchemaValidator).errors;
  return errors?.[0]?.message ?? "not a valid 2020-12 schema";
}

/**
 * Creates or whole-save updates a project schema (work document #57
 * update #1): the body must parse as JSON and pass the 2020-12
 * meta-schema (Tier B, hard enforcement at send time — an invalid body
 * is never silently saved); the digest derives from the body and lands
 * on the record. Creating requires the `ns/name` vocabulary form.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {{ accepted: boolean, echoes: any[] }}
 */
// biome-ignore lint/correctness/noExplicitAny: the payload crosses the IPC boundary untyped
function intentSetSchema(doc, payload) {
  const { name, body } = payload ?? {};
  if (typeof name !== "string" || typeof body !== "string") {
    return { accepted: false, echoes: [] };
  }
  /** @type {any} */
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { accepted: false, echoes: [] };
  }
  const metaError = validateSchemaBody(parsed);
  if (metaError) {
    console.warn(`[engine] schema ${name} refused: ${metaError}`);
    return { accepted: false, echoes: [] };
  }
  const existing = getSchema(doc, name);
  // The digest is not stored at write time: it derives from the body
  // (content-addressed by definition), and the sync intent boundary
  // cannot await the async canonicalization — readers compute it on
  // demand via digestSchema
  const ok = existing
    ? setSchemaBody(doc, name, body)
    : createSchema(doc, { name, body, provenance: "authored" }) !== null;
  if (!ok) {
    return { accepted: false, echoes: [] };
  }
  return {
    accepted: true,
    echoes: [
      {
        protocol: "schema",
        command: existing ? "edited" : "created",
        payload: { name },
      },
    ],
  };
}

/**
 * Applies a live Yjs delta to a schema's body buffer (work document #57
 * update #1): collaborators converge through the CRDT; the record's
 * digest stays stale by design until the next whole-save.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {{ accepted: boolean, echoes: any[] }}
 */
function intentUpdateSchema(doc, payload) {
  const { name, update } = payload ?? {};
  if (typeof name !== "string" || !(update instanceof Uint8Array)) {
    return { accepted: false, echoes: [] };
  }
  const applied = applySchemaBodyUpdate(doc, name, update);
  if (!applied) {
    return { accepted: false, echoes: [] };
  }
  return {
    accepted: true,
    echoes: [{ protocol: "schema", command: "edited", payload: { name } }],
  };
}

/**
 * Removes a project schema.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {{ accepted: boolean, echoes: any[] }}
 */
function intentRemoveSchema(doc, payload) {
  const { name } = payload ?? {};
  if (typeof name !== "string") {
    return { accepted: false, echoes: [] };
  }
  if (!removeSchema(doc, name)) {
    return { accepted: false, echoes: [] };
  }
  return {
    accepted: true,
    echoes: [{ protocol: "schema", command: "removed", payload: { name } }],
  };
}

/**
 * Sets a project-carried documentation document's content (work document
 * #43): collaborative Markdown keyed by a path-safe name.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentSetDoc(doc, payload) {
  const { name, content } = payload ?? {};
  if (
    typeof name !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) ||
    name.endsWith(".md") ||
    typeof content !== "string"
  ) {
    return { accepted: false, echoes: [] };
  }
  setDocText(ensureDoc(doc, name), content);
  return { accepted: true, echoes: [] };
}

/**
 * Removes a project-carried documentation document.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentRemoveDoc(doc, payload) {
  const { name } = payload ?? {};
  if (
    typeof name !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) ||
    name.endsWith(".md")
  ) {
    return { accepted: false, echoes: [] };
  }
  removeDoc(doc, name);
  return { accepted: true, echoes: [] };
}

/**
 * Implements a component in code (work document #29): records the
 * implementation kind and language in the component's metadata and writes
 * the scaffold into its collaborative code buffer. The runtime language
 * matrix is the Glass's concern; the Engine stores what it is given.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentImplementInCode(doc, payload) {
  const { component, language, scaffold } = payload ?? {};
  if (
    typeof component !== "string" ||
    component.length === 0 ||
    typeof language !== "string" ||
    typeof scaffold !== "string"
  ) {
    return { accepted: false, echoes: [] };
  }
  if (!getComponentSignature(doc, component) || getGraph(doc, component)) {
    // A graph implementation cannot also be a code implementation
    return { accepted: false, echoes: [] };
  }
  const componentEntry = ensureComponent(doc, component, { name: component });
  updateComponentMetadata(componentEntry, {
    implementation: { kind: "code", language },
  });
  setComponentCode(componentEntry, scaffold);
  return { accepted: true, echoes: [] };
}

/**
 * Forks a component (work document #29): copies its signature and code into
 * the forked name and renames every reference in the project's graphs, so
 * the fork immediately takes over where the original was used. The original
 * component is untouched — a library component stays in the library.
 *
 * @param {Y.Doc} doc
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentForkComponent(doc, payload) {
  const { component, to } = payload ?? {};
  if (
    typeof component !== "string" ||
    typeof to !== "string" ||
    to.length === 0 ||
    component === to
  ) {
    return { accepted: false, echoes: [] };
  }
  const signature = getComponentSignature(doc, component);
  if (!signature || getComponentSignature(doc, to) || getGraph(doc, to)) {
    return { accepted: false, echoes: [] };
  }
  const plain = signature.toJSON();
  setComponentSignature(doc, to, {
    inports: plain.inports ?? [],
    outports: plain.outports ?? [],
    description: plain.description,
    icon: plain.icon,
  });

  // Copy the implementation entry, if the original has one
  const original = getComponent(doc, component);
  if (original) {
    const forked = ensureComponent(doc, to, {
      .../** @type {Record<string, any>} */ (
        original.get("metadata")?.toJSON()
      ),
      name: to,
    });
    const metadata =
      /** @type {Record<string, any> | undefined} */
      (original.get("metadata")?.toJSON());
    if (metadata) updateComponentMetadata(forked, metadata);
    setComponentCode(forked, getComponentCode(original).toString());
  }

  // The fork takes over: rename every reference in the project's graphs
  /** @type {import("./Protocol.js").EngineUIMessage[]} */
  const echoes = [];
  const graphs = doc.getMap("graphs");
  for (const [_graphId, graph] of graphs.entries()) {
    const nodes = /** @type {Y.Map<any>} */ (graph.get("nodes"));
    for (const [nodeId, node] of nodes.entries()) {
      if (node.get("component") !== component) continue;
      setNodeComponent(/** @type {Y.Map<any>} */ (graph), nodeId, to);
      /** @type {import("./Protocol.js").GraphSetComponentMessage} */
      const echo = {
        protocol: "graph",
        command: "setcomponent",
        payload: { id: nodeId, component: to },
      };
      echoes.push(echo);
    }
  }
  return { accepted: true, echoes };
}
