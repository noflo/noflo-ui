/**
 * @file Engine core (work document #18): pure intent validation and
 * application over the project Y.Doc, producing the Appendix A echo messages.
 *
 * This module contains no Worker or DOM code — the NoFlo dispatcher graph in
 * the Worker is a thin wiring around these functions, and the tests run them
 * directly.
 */

import * as Y from "../../vendor/yjs.js";

import {
  addEdge,
  addIIP,
  addInport,
  addNode,
  addOutport,
  createGraph,
  deleteGraph,
  getComponentSignature,
  getGraph,
  getNode,
  graphChildren,
  moveNode,
  removeComponentSignature,
  removeEdge,
  removeExportedPort,
  removeNode,
  revokePermission,
  setComponentSignature,
  setNodeComponent,
  transferNode,
} from "./ProjectDoc.js";
import { isUIWorkerMessage } from "./Protocol.js";

/**
 * Mutable Engine session state that is not part of the CRDT.
 *
 * @typedef {Object} EngineState
 * @property {Set<string>} subscriptions Graph ids the Glass has subscribed to.
 */

/**
 * @returns {EngineState}
 */
export function createEngineState() {
  return { subscriptions: new Set() };
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
  INTENT: (doc, _state, message) => handleIntent(doc, message),
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
};

/**
 * @param {EngineState} state
 * @param {import("./Protocol.js").LifecycleSubscribeMessage} message
 * @returns {EngineResult}
 */
function handleLifecycle(state, message) {
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
function handleQuery(doc, message) {
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
function handleIntent(doc, message) {
  const payload = message.payload;
  const handler = INTENT_HANDLERS[message.command];
  if (!handler) {
    return { accepted: false, echoes: [] };
  }
  return handler(doc, payload);
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
 * in0/out0 ports are exported, matching what the editor renders for
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
   */
  const exportPort = (command, name, nodeId, port) => {
    if (command === "addinport") {
      addInport(child, name, nodeId, port);
      inPortNames.add(name);
    } else {
      addOutport(child, name, nodeId, port);
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
    );
  }

  // With no boundary connections at all, export the default ports the
  // editor renders for signature-less components
  if (inPortNames.size === 0 && outPortNames.size === 0) {
    addInport(child, "in0", replacementId, "in0");
    addOutport(child, "out0", replacementId, "out0");
    inPortNames.add("in0");
    outPortNames.add("out0");
  }

  /** @type {import("./Protocol.js").GraphSetComponentMessage} */
  const setComponentEcho = {
    protocol: "graph",
    command: "setcomponent",
    payload: { id: replacementId, component: childId },
  };
  echoes.push(setComponentEcho);

  setComponentSignature(doc, childId, {
    inports: [...inPortNames].map((name) => ({ name })),
    outports: [...outPortNames].map((name) => ({ name })),
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
  /** @type {Map<string, { process: string, port: string }>} */
  const inportInfo = new Map();
  for (const [name, info] of /** @type {Y.Map<any>} */ (
    child.get("inports")
  ).entries()) {
    const plain = info.toJSON();
    if (typeof plain.process === "string" && typeof plain.port === "string") {
      inportInfo.set(name, { process: plain.process, port: plain.port });
    }
  }
  /** @type {Map<string, { process: string, port: string }>} */
  const outportInfo = new Map();
  for (const [name, info] of /** @type {Y.Map<any>} */ (
    child.get("outports")
  ).entries()) {
    const plain = info.toJSON();
    if (typeof plain.process === "string" && typeof plain.port === "string") {
      outportInfo.set(name, { process: plain.process, port: plain.port });
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
  // on the staying side
  const childEdges = /** @type {Y.Map<any>} */ (child.get("edges"));
  /** @type {Map<string, string>} */
  const newInportNames = new Map();
  /** @type {Map<string, string>} */
  const newOutportNames = new Map();
  const usedInNames = new Set([...inportInfo.keys()]);
  const usedOutNames = new Set([...outportInfo.keys()]);
  // Reverse lookups for reusing an existing export
  /** @type {Map<string, string>} */
  const existingInportFor = new Map(
    [...inportInfo.entries()].map(([name, info]) => [
      `${info.process}:${info.port}`,
      name,
    ]),
  );
  /** @type {Map<string, string>} */
  const existingOutportFor = new Map(
    [...outportInfo.entries()].map(([name, info]) => [
      `${info.process}:${info.port}`,
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
      const key = `${plain.tgt.node}:${plain.tgt.port}`;
      const existing = existingInportFor.get(key);
      const name =
        existing ?? uniqueName(plain.tgt.port, usedInNames) ?? plain.tgt.port;
      if (!existing) {
        newInportNames.set(key, name);
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
    const key = `${plain.src.node}:${plain.src.port}`;
    const existing = existingOutportFor.get(key);
    const name =
      existing ?? uniqueName(plain.src.port, usedOutNames) ?? plain.src.port;
    if (!existing) {
      newOutportNames.set(key, name);
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
    addInport(child, name, nodeId, port);
  }
  for (const [key, name] of newOutportNames) {
    const [nodeId, port] = /** @type {string[]} */ (key.split(":"));
    addOutport(child, name, nodeId, port);
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
      inports: [.../** @type {Y.Map<any>} */ (child.get("inports")).keys()].map(
        (name) => ({ name }),
      ),
      outports: [
        .../** @type {Y.Map<any>} */ (child.get("outports")).keys(),
      ].map((name) => ({ name })),
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
 * Registers the default port signature (in0/out0) for a component that has
 * none, matching what the editor renders for signature-less components.
 * Components with real signatures keep them untouched.
 *
 * @param {Y.Doc} doc
 * @param {string} componentName
 */
function ensureDefaultSignature(doc, componentName) {
  if (getComponentSignature(doc, componentName)) return;
  setComponentSignature(doc, componentName, {
    inports: [{ name: "in0", type: "all" }],
    outports: [{ name: "out0", type: "all" }],
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
function intentUpdateIIP(doc, payload) {
  const { graphId, id, data } = payload ?? {};
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
  doc.transact(() => {
    edge.set("data", data);
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
 * @param {Y.Doc} doc
 * @param {'addInport' | 'addOutport'} command
 * @param {any} payload
 * @returns {EngineResult}
 */
function intentAddExport(doc, command, payload) {
  const { graphId, name, nodeId, port, metadata } = payload ?? {};
  if (
    typeof graphId !== "string" ||
    typeof name !== "string" ||
    typeof nodeId !== "string" ||
    typeof port !== "string"
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
      ? addInport(graph, name, nodeId, port, metadata ?? {})
      : addOutport(graph, name, nodeId, port, metadata ?? {});
  if (!added) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").GraphAddExportMessage} */
  const echo = {
    protocol: "graph",
    command: /** @type {'addinport' | 'addoutport'} */ (command.toLowerCase()),
    payload: { name, nodeId, port, metadata: metadata ?? {} },
  };
  return { accepted: true, echoes: [echo] };
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
  return { accepted: true, echoes: [echo] };
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
  // Yjs types cannot be re-integrated under a new key; copy the record
  const plain = info.toJSON();
  doc.transact(() => {
    ports.delete(from);
    const moved = new Y.Map();
    for (const key of Object.keys(plain)) {
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
  return { accepted: true, echoes: [echo] };
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
