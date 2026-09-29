/**
 * @file Engine core (work document #18): pure intent validation and
 * application over the project Y.Doc, producing the Appendix A echo messages.
 *
 * This module contains no Worker or DOM code — the NoFlo dispatcher graph in
 * the Worker is a thin wiring around these functions, and the tests run them
 * directly.
 */

import * as Y from "yjs";

import {
  addEdge,
  addNode,
  createGraph,
  getComponentSignature,
  getGraph,
  moveNode,
  removeEdge,
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
 * @param {import("./Protocol.js").IntentAddNodeMessage | import("./Protocol.js").IntentRemoveNodeMessage | import("./Protocol.js").IntentMoveNodeMessage | import("./Protocol.js").IntentAddEdgeMessage | import("./Protocol.js").IntentRemoveEdgeMessage} message
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
