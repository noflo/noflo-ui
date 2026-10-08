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
 * Normalizes a legacy port reference: array instances were once stored
 * with the indexed form (`in[1]`) as the port name; the canonical ref
 * carries the base name plus the slot index. The suffix merges into the
 * index when the record has none, so records written before the
 * normalization keep resolving against the rendered instances.
 *
 * @param {{ node?: string, port?: string, index?: number } | undefined} ref
 * @returns {{ node?: string, port?: string, index?: number } | undefined}
 */
function normalizePortRef(ref) {
  if (!ref) return ref;
  const match = /(.*)\[(\d+)\]$/.exec(ref.port ?? "");
  if (!match) return ref;
  return {
    ...ref,
    port: match[1],
    index: ref.index ?? Number.parseInt(match[2], 10),
  };
}

/**
 * Projects one CRDT graph into the render view: the render-shaped fields
 * (nodes, edges, initializers) feed `renderGraphIntoEditor` directly — no
 * legacy graph round-trip, which was lossy for addressable ports (work
 * document #5) — plus `processes`/`connections` for the Glass's own
 * consumers (pending reconciliation, position restore, intent mapping).
 *
 * @param {import("yjs").Doc} doc
 * @param {string} graphId
 * @returns {any | null} The projected view, or null when the graph does not exist.
 */
export function projectGraph(doc, graphId) {
  const graph = doc.getMap("graphs").get(graphId);
  if (!graph) return null;

  const nodes = graph.get("nodes");
  const edges = graph.get("edges");

  /** @type {Record<string, any>} */
  const processes = {};
  /** @type {any[]} */
  const nodeList = [];
  for (const [nodeId, node] of nodes.entries()) {
    const plain = toPlain(node);
    processes[nodeId] = {
      component: plain.component,
      metadata: plain.metadata ?? {},
    };
    nodeList.push({
      id: nodeId,
      component: plain.component,
      metadata: plain.metadata ?? {},
    });
  }

  /** @type {any[]} */
  const connections = [];
  /** @type {any[]} */
  const edgeList = [];
  /** @type {any[]} */
  const initializers = [];
  for (const [, edge] of edges.entries()) {
    const plain = toPlain(edge);
    // Edges carry both endpoints structurally; the cast keeps the
    // normalized refs' types honest for the accesses below
    const src = /** @type {{ node: string, port: string, index?: number }} */ (
      normalizePortRef(plain.src)
    );
    const tgt = /** @type {{ node: string, port: string, index?: number }} */ (
      normalizePortRef(plain.tgt)
    );
    // fbp-graph JSON names the endpoint node "process"; the CRDT (SPEC
    // Appendix B) calls it "node", so the projection translates
    if (typeof plain.id === "string" && plain.id.startsWith("DATA->")) {
      connections.push({
        data: plain.data,
        tgt: {
          process: tgt.node,
          port: tgt.port,
          index: tgt.index,
        },
        metadata: { id: plain.id, ...(plain.metadata ?? {}) },
      });
      initializers.push({
        from: { data: plain.data },
        to: {
          node: tgt.node,
          port: tgt.port,
          index: tgt.index,
        },
        metadata: { id: plain.id, ...(plain.metadata ?? {}) },
      });
    } else {
      connections.push({
        src: {
          process: src.node,
          port: src.port,
          index: src.index,
        },
        tgt: {
          process: tgt.node,
          port: tgt.port,
          index: tgt.index,
        },
        metadata: plain.metadata ?? {},
      });
      edgeList.push({
        from: { node: src.node, port: src.port, index: src.index },
        to: { node: tgt.node, port: tgt.port, index: tgt.index },
        metadata: plain.metadata ?? {},
      });
    }
  }

  /** @type {any} */
  const result = {
    processes,
    nodes: nodeList,
    edges: edgeList,
    initializers,
    connections,
  };

  for (const direction of ["inports", "outports"]) {
    const ports = graph.get(direction);
    /** @type {Record<string, any>} */
    const projected = {};
    for (const [name, info] of ports.entries()) {
      const plain = toPlain(info);
      projected[name] = {
        ...plain,
        // Exports may carry legacy suffixed port names too
        ...normalizePortRef(plain),
      };
    }
    result[direction] = projected;
  }

  // Groups (work document #5 update #16): the graph's groups projected as
  // { id, name, nodes } for the editor's region rendering
  const groups = graph.get("groups");
  result.groups = groups
    ? [...groups.entries()].map(([id, group]) => {
        const plain = toPlain(group);
        return {
          id,
          name: plain.name ?? "",
          nodes: plain.nodes ?? [],
        };
      })
    : [];

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
