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
    // fbp-graph JSON names the endpoint node "process"; the CRDT (SPEC
    // Appendix B) calls it "node", so the projection translates
    if (typeof plain.id === "string" && plain.id.startsWith("DATA->")) {
      connections.push({
        data: plain.data,
        tgt: {
          process: plain.tgt.node,
          port: plain.tgt.port,
          index: plain.tgt.index,
        },
        metadata: { id: plain.id, ...(plain.metadata ?? {}) },
      });
    } else {
      connections.push({
        src: {
          process: plain.src.node,
          port: plain.src.port,
          index: plain.src.index,
        },
        tgt: {
          process: plain.tgt.node,
          port: plain.tgt.port,
          index: plain.tgt.index,
        },
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
 * @param {string} graphId
 * @param {any} data
 * @param {{ node: string, port: string, index?: number }} tgt
 * @returns {import("../crdt/Protocol.js").IntentAddIIPMessage}
 */
export function addIIPIntent(graphId, data, tgt) {
  return { type: "INTENT", command: "addIIP", payload: { graphId, data, tgt } };
}

/**
 * @param {string} graphId
 * @param {string} id
 * @param {any} data
 * @returns {import("../crdt/Protocol.js").IntentUpdateIIPMessage}
 */
export function updateIIPIntent(graphId, id, data) {
  return {
    type: "INTENT",
    command: "updateIIP",
    payload: { graphId, id, data },
  };
}

/**
 * @param {string} graphId
 * @param {string} id
 * @returns {import("../crdt/Protocol.js").IntentRemoveIIPMessage}
 */
export function removeIIPIntent(graphId, id) {
  return { type: "INTENT", command: "removeIIP", payload: { graphId, id } };
}

/**
 * Returns the component name of a node whose component is a registered
 * graph — i.e. the node is a subgraph — or null otherwise.
 *
 * @param {import("yjs").Doc} doc
 * @param {string} graphId
 * @param {string} nodeId
 * @returns {string | null}
 */
export function subgraphComponentFor(doc, graphId, nodeId) {
  const component = projectGraph(doc, graphId)?.processes[nodeId]?.component;
  if (typeof component !== "string") return null;
  return doc.getMap("graphs").has(component) ? component : null;
}

/**
 * Returns the parent graph id of a graph, or the empty string for root
 * graphs and unknown ids.
 *
 * @param {import("yjs").Doc} doc
 * @param {string} graphId
 * @returns {string}
 */
export function graphParent(doc, graphId) {
  const graph = doc.getMap("graphs").get(graphId);
  const parent = graph?.get("metadata")?.get("parent");
  return typeof parent === "string" ? parent : "";
}

/**
 * @param {string} graphId
 * @param {string} name
 * @param {string} parent Parent graph id, empty string for root graphs.
 * @returns {import("../crdt/Protocol.js").IntentCreateGraphMessage}
 */
export function createGraphIntent(graphId, name, parent = "") {
  return {
    type: "INTENT",
    command: "createGraph",
    payload: { graphId, name, parent },
  };
}

/**
 * @param {string} graphId
 * @param {string[]} nodeIds
 * @returns {import("../crdt/Protocol.js").IntentMakeSubgraphMessage}
 */
export function makeSubgraphIntent(graphId, nodeIds) {
  return {
    type: "INTENT",
    command: "makeSubgraph",
    payload: { graphId, nodeIds },
  };
}

/**
 * @param {string} graphId
 * @param {"inports" | "outports"} direction
 * @param {string} name
 * @param {string} nodeId
 * @param {string} port
 * @returns {import("../crdt/Protocol.js").IntentAddExportMessage}
 */
export function addExportIntent(graphId, direction, name, nodeId, port) {
  return {
    type: "INTENT",
    command: direction === "inports" ? "addInport" : "addOutport",
    payload: { graphId, name, nodeId, port },
  };
}

/**
 * @param {string} graphId
 * @param {"inports" | "outports"} direction
 * @param {string} name
 * @returns {import("../crdt/Protocol.js").IntentRemoveExportMessage}
 */
export function removeExportIntent(graphId, direction, name) {
  return {
    type: "INTENT",
    command: direction === "inports" ? "removeInport" : "removeOutport",
    payload: { graphId, name },
  };
}

/**
 * @param {string} graphId
 * @param {"inports" | "outports"} direction
 * @param {string} from
 * @param {string} to
 * @returns {import("../crdt/Protocol.js").IntentRenameExportMessage}
 */
export function renameExportIntent(graphId, direction, from, to) {
  return {
    type: "INTENT",
    command: direction === "inports" ? "renameInport" : "renameOutport",
    payload: { graphId, from, to },
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

/**
 * Projects all Dacar capability grants as plain data.
 *
 * @param {import("yjs").Doc} doc
 * @returns {Array<{ id: string, peerHash: string, role: string, issued: number, revoked: number | null }>}
 */
export function projectGrants(doc) {
  const grants = [];
  for (const [id, entry] of doc.getMap("grants").entries()) {
    const plain = entry.toJSON();
    grants.push({
      id,
      peerHash: plain.peerHash,
      role: plain.role,
      issued: plain.issued,
      revoked: plain.revoked ?? null,
    });
  }
  return grants;
}

/**
 * @param {string} peerHash
 * @param {"observer" | "operator" | "developer"} role
 * @returns {import("../crdt/Protocol.js").IntentGrantPermissionMessage}
 */
export function grantPermissionIntent(peerHash, role) {
  return {
    type: "INTENT",
    command: "grantPermission",
    payload: { peerHash, role },
  };
}

/**
 * @param {string} grantId
 * @returns {import("../crdt/Protocol.js").IntentRevokePermissionMessage}
 */
export function revokePermissionIntent(grantId) {
  return {
    type: "INTENT",
    command: "revokePermission",
    payload: { grantId },
  };
}
