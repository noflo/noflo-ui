/**
 * @file Glass-side projection: renders the CRDT project document into the
 * fbp-graph JSON shape the editor understands, and maps editor events into
 * Appendix A intent messages.
 *
 * Pure module — no DOM, no Worker.
 */

import { edgeIdFor, getNode } from "../crdt/ProjectDoc.js";

/**
 * Converts a Y.Map into a plain recursive object (Yjs values are exposed as
 * types, so reads need projection).
 *
 * @param {any} value
 * @returns {any}
 */
function toPlain(value) {
  if (
    value &&
    typeof value === "object" &&
    typeof value.toJSON === "function"
  ) {
    return value.toJSON();
  }
  return value;
}

/**
 * Projects one CRDT graph into the fbp-graph JSON format (processes,
 * connections, inports, outports) so it can be loaded with
 * `noflo.graph.loadJSON` and rendered into the editor.
 *
 * @param {import("yjs").Doc} doc
 * @param {string} graphId
 * @returns {any | null} fbp-graph JSON, or null when the graph does not exist.
 */
export function projectGraph(doc, graphId) {
  const graph = doc.getMap("graphs").get(graphId);
  if (!graph) return null;

  const nodes = graph.get("nodes");
  const edges = graph.get("edges");

  /** @type {Record<string, any>} */
  const processes = {};
  for (const [nodeId, node] of nodes.entries()) {
    const plain = toPlain(node);
    processes[nodeId] = {
      component: plain.component,
      metadata: plain.metadata ?? {},
    };
  }

  /** @type {any[]} */
  const connections = [];
  for (const [, edge] of edges.entries()) {
    const plain = toPlain(edge);
    if (typeof plain.id === "string" && plain.id.startsWith("DATA->")) {
      connections.push({
        data: plain.data,
        tgt: plain.tgt,
        metadata: plain.metadata ?? {},
      });
    } else {
      connections.push({
        src: plain.src,
        tgt: plain.tgt,
        metadata: plain.metadata ?? {},
      });
    }
  }

  /** @type {any} */
  const result = { processes, connections };

  for (const direction of ["inports", "outports"]) {
    const ports = graph.get(direction);
    /** @type {Record<string, any>} */
    const projected = {};
    for (const [name, info] of ports.entries()) {
      projected[name] = toPlain(info);
    }
    result[direction] = projected;
  }

  result.properties = toPlain(graph.get("metadata"));
  return result;
}

// ---- intent constructors --------------------------------------------------

/**
 * @param {string} graphId
 * @param {string} nodeId
 * @param {string} componentName
 * @param {{ x: number, y: number }} metadata
 * @returns {import("../crdt/Protocol.js").IntentAddNodeMessage}
 */
export function addNodeIntent(graphId, nodeId, componentName, metadata) {
  return {
    type: "INTENT",
    command: "addNode",
    payload: { graphId, nodeId, componentName, metadata },
  };
}

/**
 * @param {string} graphId
 * @param {string} nodeId
 * @returns {import("../crdt/Protocol.js").IntentRemoveNodeMessage}
 */
export function removeNodeIntent(graphId, nodeId) {
  return {
    type: "INTENT",
    command: "removeNode",
    payload: { graphId, nodeId },
  };
}

/**
 * @param {string} graphId
 * @param {string} nodeId
 * @param {{ x: number, y: number }} metadata
 * @returns {import("../crdt/Protocol.js").IntentMoveNodeMessage}
 */
export function moveNodeIntent(graphId, nodeId, metadata) {
  return {
    type: "INTENT",
    command: "moveNode",
    payload: { graphId, nodeId, metadata },
  };
}

/**
 * @param {string} graphId
 * @param {{ node: string, port: string, index?: number }} src
 * @param {{ node: string, port: string, index?: number }} tgt
 * @returns {import("../crdt/Protocol.js").IntentAddEdgeMessage}
 */
export function addEdgeIntent(graphId, src, tgt) {
  return { type: "INTENT", command: "addEdge", payload: { graphId, src, tgt } };
}

/**
 * Builds the removeEdge intent for an edge identified by its endpoints. The
 * deterministic id rule must match the one the Engine applied on creation.
 *
 * @param {string} graphId
 * @param {{ node: string, port: string, index?: number }} src
 * @param {{ node: string, port: string, index?: number }} tgt
 * @returns {import("../crdt/Protocol.js").IntentRemoveEdgeMessage}
 */
export function removeEdgeIntent(graphId, src, tgt) {
  return {
    type: "INTENT",
    command: "removeEdge",
    payload: { graphId, id: edgeIdFor(src, tgt) },
  };
}

/**
 * Convenience: checks whether a node exists in the projected graph (used to
 * resolve components when opening intents).
 *
 * @param {import("yjs").Doc} doc
 * @param {string} graphId
 * @param {string} nodeId
 */
export function nodeExists(doc, graphId, nodeId) {
  const graph = doc.getMap("graphs").get(graphId);
  if (!graph) return false;
  return getNode(graph, nodeId) !== undefined;
}
