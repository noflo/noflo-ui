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
  removeEdge,
  removeExportedPort,
  removeNode,
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

  switch (message.type) {
    case "LIFECYCLE":
      return handleLifecycle(state, message);
    case "QUERY":
      return handleQuery(doc, message);
    case "AWARENESS":
      // Ephemeral: accepted for mesh rebroadcast (mesh work document), never
      // echoes back and never mutates the CRDT.
      return { accepted: true, echoes: [] };
    case "INTENT":
      return handleIntent(doc, message);
    default:
      return { accepted: false, echoes: [] };
  }
}

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
  switch (message.command) {
    case "addNode":
      return intentAddNode(doc, payload);
    case "removeNode":
      return intentRemoveNode(doc, payload);
    case "moveNode":
      return intentMoveNode(doc, payload);
    case "addEdge":
      return intentAddEdge(doc, payload);
    case "removeEdge":
      return intentRemoveEdge(doc, payload);
    case "addIIP":
      return intentAddIIP(doc, payload);
    case "updateIIP":
      return intentUpdateIIP(doc, payload);
    case "removeIIP":
      return intentRemoveIIP(doc, payload);
    case "addInport":
    case "addOutport":
      return intentAddExport(doc, message.command, payload);
    case "removeInport":
    case "removeOutport":
      return intentRemoveExport(doc, message.command, payload);
    case "renameInport":
    case "renameOutport":
      return intentRenameExport(doc, message.command, payload);
    case "createGraph":
      return intentCreateGraph(doc, payload);
    case "removeGraph":
      return intentRemoveGraph(doc, payload);
    case "makeSubgraph":
      return intentMakeSubgraph(doc, payload);
    default:
      return { accepted: false, echoes: [] };
  }
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
