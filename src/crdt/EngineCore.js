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
  getComponentSignature,
  getGraph,
  moveNode,
  removeEdge,
  removeExportedPort,
  removeNode,
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
    default:
      return { accepted: false, echoes: [] };
  }
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
  /** @type {import("./Protocol.js").GraphAddNodeMessage} */
  const echo = {
    protocol: "graph",
    command: "addnode",
    payload: { id: nodeId, component: componentName, metadata },
  };
  return { accepted: true, echoes: [echo] };
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
  const { graphId, data, tgt } = payload ?? {};
  if (typeof graphId !== "string" || !isValidEndpoint(tgt)) {
    return { accepted: false, echoes: [] };
  }
  const graph = getGraph(doc, graphId);
  if (!graph) {
    return { accepted: false, echoes: [] };
  }
  const id = addIIP(graph, data, tgt);
  if (!id) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").GraphAddIIPMessage} */
  const echo = {
    protocol: "graph",
    command: "addiip",
    payload: { id, data, tgt },
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
  const { graphId, name, nodeId, port } = payload ?? {};
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
      ? addInport(graph, name, nodeId, port)
      : addOutport(graph, name, nodeId, port);
  if (!added) {
    return { accepted: false, echoes: [] };
  }
  /** @type {import("./Protocol.js").GraphAddExportMessage} */
  const echo = {
    protocol: "graph",
    command: /** @type {'addinport' | 'addoutport'} */ (command.toLowerCase()),
    payload: { name, nodeId, port },
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
