/**
 * @file Pending-state tracking (work document #21, SPEC "High-Latency Mesh
 * UX (Pending States)"): optimistic UI updates enter an unconfirmed/pending
 * visual state until the change is observed in the Glass's read replica —
 * the cryptographic confirmation of the CRDT merge. Dependent logic cannot
 * build on pending entities.
 *
 * Pure module: `markIntent` records what the Glass sent, `reconcile` clears
 * everything the replica now confirms and returns the still-pending sets for
 * the editor to render. Entries past the TTL are dropped, so intents the
 * engine rejected do not linger forever.
 */

import { edgeIdFor, iipEdgeIdFor } from "../crdt/ProjectDoc.js";

/** How long an unconfirmed intent stays pending before giving up. */
export const PENDING_TTL_MS = 10_000;

/**
 * @typedef {"add" | "move" | "remove"} PendingState
 */

/**
 * @typedef {Object} PendingEntry
 * @property {string} kind "node" | "move" | "noderemove" | "edge" |
 *   "edgeremove" | "iip" | "iipremove"
 * @property {string} graphId
 * @property {string} nodeId Node id for node-flavored entries
 * @property {string} edgeId Deterministic edge id for edge-flavored entries
 * @property {string} iipId Deterministic IIP id for IIP-flavored entries
 * @property {number} x
 * @property {number} y
 * @property {number} markedAt
 */

/**
 * @returns {{
 *   markIntent: (message: any, graphId: string) => void,
 *   reconcile: (view: any, graphId: string) => {
 *     nodes: Map<string, PendingState>,
 *     iips: Map<string, PendingState>,
 *     edges: Map<string, PendingState>,
 *   },
 *   size: number,
 * }}
 */
/**
 * @param {{ ttlMs?: number }} [options]
 */
export function createPendingTracker(options = {}) {
  const ttlMs = options.ttlMs ?? PENDING_TTL_MS;
  /** @type {Map<string, PendingEntry>} */
  const pending = new Map();

  /**
   * @param {string} kind
   * @param {string} graphId
   * @param {Partial<PendingEntry>} detail
   */
  function mark(kind, graphId, detail = {}) {
    const key = `${kind}:${graphId}:${detail.nodeId ?? detail.edgeId ?? detail.iipId ?? ""}`;
    pending.set(key, {
      kind,
      graphId,
      nodeId: detail.nodeId ?? "",
      edgeId: detail.edgeId ?? "",
      iipId: detail.iipId ?? "",
      x: detail.x ?? 0,
      y: detail.y ?? 0,
      markedAt: Date.now(),
    });
  }

  /**
   * Records the entities an outgoing intent will touch. Only graph-mutating
   * commands carry pending state; CONFIG/AWARENESS/LIFECYCLE messages are
   * ignored.
   *
   * @param {any} message
   * @param {string} graphId The graph the Glass is editing
   */
  function markIntent(message, graphId) {
    const { command, payload } = message ?? {};
    if (!payload || typeof graphId !== "string") return;
    // The payload's graphId is what the engine applies to; the tracker
    // parameter is the Glass's editing context and only a fallback
    const targetGraph =
      typeof payload.graphId === "string" ? payload.graphId : graphId;
    switch (command) {
      case "addNode":
        mark("node", targetGraph, { nodeId: payload.nodeId });
        break;
      case "moveNode":
        mark("move", targetGraph, {
          nodeId: payload.nodeId,
          x: payload.metadata?.x,
          y: payload.metadata?.y,
        });
        break;
      case "removeNode":
        mark("noderemove", targetGraph, { nodeId: payload.nodeId });
        break;
      case "addEdge": {
        const edgeId = edgeIdFor(payload.src, payload.tgt);
        mark("edge", targetGraph, { edgeId });
        break;
      }
      case "removeEdge":
        // The removal payload carries the deterministic id itself
        mark("edgeremove", targetGraph, { edgeId: payload.id });
        break;
      case "addIIP":
        mark("iip", targetGraph, { iipId: iipEdgeIdFor(payload.tgt) });
        break;
      case "removeIIP":
        mark("iipremove", targetGraph, { iipId: payload.id });
        break;
      default:
        break;
    }
  }

  /**
   * Checks whether a projected connection matches a deterministic edge id.
   *
   * @param {any} connection
   * @param {string} edgeId
   * @returns {boolean}
   */
  function connectionMatches(connection, edgeId) {
    if (!connection?.src || !connection?.tgt) return false;
    return (
      edgeIdFor(
        {
          node: connection.src.process,
          port: connection.src.port,
          index: connection.src.index,
        },
        {
          node: connection.tgt.process,
          port: connection.tgt.port,
          index: connection.tgt.index,
        },
      ) === edgeId
    );
  }

  /**
   * Drops confirmed and expired entries, then returns the still-pending
   * entities for the given graph.
   *
   * @param {any} view Projection of the active graph (may be null while
   *   the replica has not synced yet)
   * @param {string} graphId
   */
  function reconcile(view, graphId) {
    const now = Date.now();
    for (const [key, entry] of [...pending.entries()]) {
      if (now - entry.markedAt > ttlMs) {
        pending.delete(key);
        continue;
      }
      if (entry.graphId !== graphId) continue;
      const processes = view?.processes ?? {};
      const connections = view?.connections ?? [];
      let confirmed = false;
      switch (entry.kind) {
        case "node":
          confirmed = Boolean(processes[entry.nodeId]);
          break;
        case "noderemove":
          confirmed = !processes[entry.nodeId];
          break;
        case "move": {
          const metadata = processes[entry.nodeId]?.metadata;
          confirmed =
            Boolean(metadata) &&
            metadata.x === entry.x &&
            metadata.y === entry.y;
          break;
        }
        case "edge":
          confirmed = connections.some((/** @type {any} */ c) =>
            connectionMatches(c, entry.edgeId),
          );
          break;
        case "edgeremove":
          confirmed = !connections.some((/** @type {any} */ c) =>
            connectionMatches(c, entry.edgeId),
          );
          break;
        case "iip":
          confirmed = connections.some(
            (/** @type {any} */ c) => c.metadata?.id === entry.iipId,
          );
          break;
        case "iipremove":
          confirmed = !connections.some(
            (/** @type {any} */ c) => c.metadata?.id === entry.iipId,
          );
          break;
        default:
          confirmed = true;
          break;
      }
      if (confirmed) pending.delete(key);
    }

    /** @type {Map<string, PendingState>} */
    const nodes = new Map();
    /** @type {Map<string, PendingState>} */
    const iips = new Map();
    /** @type {Map<string, PendingState>} */
    const edges = new Map();
    for (const entry of pending.values()) {
      if (entry.graphId !== graphId) continue;
      /** @type {PendingState} */
      let state = "add";
      if (entry.kind === "move") state = "move";
      if (entry.kind.endsWith("remove")) state = "remove";
      if (
        entry.kind === "node" ||
        entry.kind === "move" ||
        entry.kind === "noderemove"
      ) {
        nodes.set(entry.nodeId, state);
      } else if (entry.kind === "iip" || entry.kind === "iipremove") {
        iips.set(entry.iipId, state);
      } else {
        edges.set(entry.edgeId, state);
      }
    }
    return { nodes, iips, edges };
  }

  return {
    markIntent,
    reconcile,
    get size() {
      return pending.size;
    },
  };
}
