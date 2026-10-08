/**
 * @file File → intent deltas (work document #43, "the important half"):
 * edited materialized files are diffed against the last-materialized
 * snapshot and produce minimal Appendix A intents — structural
 * per-node/per-edge add/remove/modify for graphs, whole-buffer code
 * replacement for components. Deterministic edge keys make the structural
 * diffing reliable; pre-validation turns invalid files into diagnostics
 * instead of a rejected-intent storm into the CRDT.
 *
 * Pure module: every function takes parsed content and returns plain intent
 * messages. The materializer (watcher.js) owns snapshots and submission.
 */

/**
 * Parses and pre-validates a graph file's content.
 *
 * @param {string} text
 * @returns {{ ok: true, graph: any } | { ok: false, diagnostic: string }}
 */
export function parseGraphFile(text) {
  /** @type {any} */
  let graph;
  try {
    graph = JSON.parse(text);
  } catch (error) {
    return { ok: false, diagnostic: `not valid JSON: ${String(error)}` };
  }
  if (!graph || typeof graph !== "object") {
    return { ok: false, diagnostic: "not a graph object" };
  }
  if (!graph.processes || typeof graph.processes !== "object") {
    return { ok: false, diagnostic: "missing processes" };
  }
  if (!Array.isArray(graph.connections)) {
    return { ok: false, diagnostic: "missing connections" };
  }
  return { ok: true, graph };
}

/**
 * The canonical edge key (the deterministic `ProjectDoc` rule): node:port
 * pairs with the addressable slot, defaulting to 0.
 *
 * @param {{ node: string, port: string, index?: number }} endpoint
 * @returns {string}
 */
function endpointKey(endpoint) {
  return `${endpoint.node}:${endpoint.port}[${endpoint.index ?? 0}]`;
}

/**
 * The metadata an add/move intent carries: the position only. Other
 * metadata keys ride the file but are not intent-addressable yet.
 *
 * @param {any} metadata
 * @returns {{ x: number, y: number }}
 */
function positionOf(metadata) {
  return {
    x: typeof metadata?.x === "number" ? metadata.x : 0,
    y: typeof metadata?.y === "number" ? metadata.y : 0,
  };
}

/**
 * Diffs two parsed graph files into minimal Appendix A intents.
 *
 * @param {string} graphId
 * @param {any} base The last-materialized graph (parsed snapshot).
 * @param {any} next The edited graph (parsed file content).
 * @returns {any[]} Intent messages, in submission order (removals first,
 *   so add/remove pairs of the same id never collide).
 */
export function diffGraphFile(graphId, base, next) {
  /** @type {any[]} */
  const intents = [];

  const baseNodes = new Map(Object.entries(base?.processes ?? {}));
  const nextNodes = new Map(Object.entries(next?.processes ?? {}));

  // Removals first: a replaced node's remove+add never collides on id
  for (const [nodeId, node] of baseNodes) {
    if (!nextNodes.has(nodeId)) {
      intents.push({
        type: "INTENT",
        command: "removeNode",
        payload: { graphId, nodeId },
      });
    }
  }

  for (const [nodeId, node] of nextNodes) {
    const baseNode = baseNodes.get(nodeId);
    if (!baseNode) {
      intents.push({
        type: "INTENT",
        command: "addNode",
        payload: {
          graphId,
          nodeId,
          componentName: node.component ?? "",
          metadata: positionOf(node.metadata),
        },
      });
      continue;
    }
    const before = positionOf(baseNode.metadata);
    const after = positionOf(node.metadata);
    if (before.x !== after.x || before.y !== after.y) {
      intents.push({
        type: "INTENT",
        command: "moveNode",
        payload: { graphId, nodeId, metadata: after },
      });
    }
  }

  // Edges by canonical key; metadata (routes) is not structural
  const baseEdges = new Map(
    (base?.connections ?? [])
      .filter((/** @type {any} */ c) => c.data === undefined)
      .map((/** @type {any} */ c) => [
        `${endpointKey(c.src ?? c)}->${endpointKey(c.tgt)}`,
        c,
      ]),
  );
  const nextEdges = new Map(
    (next?.connections ?? [])
      .filter((/** @type {any} */ c) => c.data === undefined)
      .map((/** @type {any} */ c) => [
        `${endpointKey(c.src ?? c)}->${endpointKey(c.tgt)}`,
        c,
      ]),
  );
  for (const [key] of baseEdges) {
    if (!nextEdges.has(key)) {
      intents.push({
        type: "INTENT",
        command: "removeEdge",
        payload: { graphId, id: key },
      });
    }
  }
  for (const [key, edge] of nextEdges) {
    if (!baseEdges.has(key)) {
      intents.push({
        type: "INTENT",
        command: "addEdge",
        payload: {
          graphId,
          src: {
            node: edge.src?.node ?? "",
            port: edge.src?.port ?? "",
            ...(edge.src?.index !== undefined ? { index: edge.src.index } : {}),
          },
          tgt: {
            node: edge.tgt?.node ?? "",
            port: edge.tgt?.port ?? "",
            ...(edge.tgt?.index !== undefined ? { index: edge.tgt.index } : {}),
          },
        },
      });
    }
  }

  // IIPs by their deterministic DATA-> key; data changes update in place
  const baseIips = new Map(
    (base?.connections ?? [])
      .filter((/** @type {any} */ c) => c.data !== undefined)
      .map((/** @type {any} */ c) => [`${endpointKey(c.tgt)}`, c]),
  );
  const nextIips = new Map(
    (next?.connections ?? [])
      .filter((/** @type {any} */ c) => c.data !== undefined)
      .map((/** @type {any} */ c) => [`${endpointKey(c.tgt)}`, c]),
  );
  for (const [key, iip] of baseIips) {
    if (!nextIips.has(key)) {
      intents.push({
        type: "INTENT",
        command: "removeIIP",
        payload: { graphId, id: `DATA->${key}` },
      });
    }
  }
  for (const [key, iip] of nextIips) {
    const baseIip = baseIips.get(key);
    if (!baseIip) {
      intents.push({
        type: "INTENT",
        command: "addIIP",
        payload: {
          graphId,
          data: iip.data,
          tgt: {
            node: iip.tgt?.node ?? "",
            port: iip.tgt?.port ?? "",
            ...(iip.tgt?.index !== undefined ? { index: iip.tgt.index } : {}),
          },
        },
      });
    } else if (baseIip.data !== iip.data) {
      intents.push({
        type: "INTENT",
        command: "updateIIP",
        payload: {
          graphId,
          id: `DATA->${key}`,
          data: iip.data,
        },
      });
    }
  }

  // Exports: keyed by public name; a changed endpoint is remove+add —
  // public renames surface the same way until rename intents land
  const direction = (
    /** @type {"inports" | "outports"} */ name,
    /** @type {"addInport" | "addOutport"} */ addCommand,
    /** @type {"removeInport" | "removeOutport"} */ removeCommand,
  ) => {
    const baseExports = new Map(Object.entries(base?.[name] ?? {}));
    const nextExports = new Map(Object.entries(next?.[name] ?? {}));
    for (const [publicName, info] of baseExports) {
      if (nextExports.has(publicName)) continue;
      intents.push({
        type: "INTENT",
        command: removeCommand,
        payload: { graphId, name: publicName },
      });
    }
    for (const [publicName, info] of nextExports) {
      const baseInfo = baseExports.get(publicName);
      if (baseInfo) continue;
      intents.push({
        type: "INTENT",
        command: addCommand,
        payload: {
          graphId,
          name: publicName,
          nodeId: info.process ?? "",
          port: info.port ?? "",
        },
      });
    }
  };
  direction("inports", "addInport", "removeInport");
  direction("outports", "addOutport", "removeOutport");

  return intents;
}

/**
 * Diffs a component code buffer: `null` when unchanged, the new code when
 * it differs (the intent replaces the whole buffer atomically).
 *
 * @param {string | null} base
 * @param {string} next
 * @returns {string | null}
 */
export function diffCode(base, next) {
  return base === next ? null : next;
}

/**
 * Diffs a component signature file: `null` when unchanged, the parsed
 * signature when it differs.
 *
 * @param {string | null} baseText
 * @param {string} nextText
 * @returns {any | null}
 */
export function diffSignature(baseText, nextText) {
  if (baseText === nextText) return null;
  try {
    return JSON.parse(nextText);
  } catch {
    return null;
  }
}
