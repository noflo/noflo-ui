/**
 * @file The line-diagram computation (work document #35's per-line maps):
 * a route's edges — free association, not enforced continuity — resolve
 * into connected components ordered by flow, each walked from its source
 * terminus into a top-to-bottom strip structure. Pure topology: no node
 * positions, no spatial math — the diagram reads the line, the canvas
 * keeps the space.
 *
 * The strip grammar: the spine is a straight vertical rail; a split (one
 * station, several outgoing on the line) keeps its main run — the branch
 * with the most stations downstream — on the spine and lets the others
 * leave as 45° spurs; converging flows and chains that run into an
 * already-drawn station render as spurs joining into it. Isolated
 * stragglers render as their own strips, never fused into a fake
 * continuous line.
 */

/**
 * An edge as the line computation sees it: directed source → target with
 * the route index when one is set. Boundary wires (IIPs, exports) use
 * pseudo-station ids for the boundary end.
 *
 * @typedef {{ source: string, target: string, route: number | null | undefined, id?: string }} LineEdgeInput
 */

/**
 * A station on a strip.
 *
 * `kind` — terminus: a chain's end (a source or a sink); stop: one in,
 * one out; split: several outs on the line (the main run continues down
 * the spine, the rest leave as spurs); join: the chain ran into an
 * already-drawn station (`joinsAt` names it).
 *
 * @typedef {{
 *   id: string,
 *   kind: "terminus" | "stop" | "split" | "join",
 *   spurs: LineSpur[],
 *   joinsAt: string | null,
 *   interchange: number[],
 *   label: string,
 *   via: string | null,
 * }} LineStation
 */

/**
 * A branch beside the spine: its own ordered stations, top-to-bottom.
 * A spur whose flow merges into a drawn station carries `joinsAt`; a
 * bare join (no new stations) marks an extra arrival at a drawn station.
 *
 * @typedef {{ stations: LineStation[], joinsAt: string | null }} LineSpur
 */

/**
 * One connected run of the line: an ordered station chain (the spine)
 * with spurs hanging off its stations. `cyclic` marks a component with
 * no source terminus — a closed loop, walked from the smallest station
 * id; the walk closes with a join back to the start.
 *
 * @typedef {{ stations: LineStation[], cyclic: boolean }} LineComponent
 */

/**
 * The connected components of one route's edges, largest first (the main
 * run) — isolated stragglers follow.
 *
 * @param {LineEdgeInput[]} edges Every wired connection, any route.
 * @param {number} routeIndex The line's route index (0–9).
 * @returns {LineComponent[]}
 */
export function buildRouteLines(edges, routeIndex) {
  const lineEdges = edges.filter((edge) => edge.route === routeIndex);
  /** @type {LineComponent[]} */
  const components = [];
  const seen = /** @type {Set<string>} */ (new Set());
  const adjacency = undirectedAdjacency(lineEdges);
  for (const edge of lineEdges) {
    if (seen.has(edge.source)) continue;
    /** @type {string[]} */
    const queue = [edge.source];
    /** @type {Set<string>} */
    const members = new Set();
    while (queue.length > 0) {
      const id = /** @type {string} */ (queue.pop());
      if (members.has(id)) continue;
      members.add(id);
      seen.add(id);
      for (const other of adjacency.get(id) ?? []) queue.push(other);
    }
    const memberEdges = lineEdges.filter(
      (candidate) =>
        members.has(candidate.source) && members.has(candidate.target),
    );
    components.push(walkLine(memberEdges, edges, routeIndex));
  }
  // Largest first: the main run leads, stragglers follow
  components.sort((a, b) => b.stations.length - a.stations.length);
  return components;
}

/**
 * The undirected adjacency over one route's edges.
 *
 * @param {LineEdgeInput[]} lineEdges
 * @returns {Map<string, Set<string>>}
 */
function undirectedAdjacency(lineEdges) {
  /** @type {Map<string, Set<string>>} */
  const adjacency = new Map();
  const touch = (/** @type {string} */ a, /** @type {string} */ b) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    /** @type {Set<string>} */ (adjacency.get(a)).add(b);
    /** @type {Set<string>} */ (adjacency.get(b)).add(a);
  };
  for (const edge of lineEdges) touch(edge.source, edge.target);
  return adjacency;
}

/**
 * Walks one component into the strip structure: the directed flow from
 * the source terminus (or, for a closed loop, the smallest station id)
 * down the spine, splits keeping their main run with the rest as spurs,
 * and every additional source — a flow converging into a drawn station —
 * rendering as a spur into it.
 *
 * @param {LineEdgeInput[]} componentEdges
 * @param {LineEdgeInput[]} allEdges Every wired connection, for the
 *   interchange ticks.
 * @param {number} routeIndex
 * @returns {LineComponent}
 */
function walkLine(componentEdges, allEdges, routeIndex) {
  const out = /** @type {Map<string, string[]>} */ (new Map());
  const inDegree = /** @type {Map<string, number>} */ (new Map());
  /** @type {Set<string>} */
  const stations = new Set();
  for (const edge of componentEdges) {
    stations.add(edge.source);
    stations.add(edge.target);
    if (!out.has(edge.source)) out.set(edge.source, []);
    const targets = /** @type {string[]} */ (out.get(edge.source));
    if (!targets.includes(edge.target)) targets.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }
  const outs = (/** @type {string} */ id) => out.get(id) ?? [];
  /** The edge flowing into a connection — the strip's rail segments
   * select it on click. */
  const edgeIdFor = (/** @type {string} */ src, /** @type {string} */ tgt) => {
    for (const edge of componentEdges) {
      if (edge.source === src && edge.target === tgt) return edge.id ?? null;
    }
    return null;
  };

  /** How many stations a branch reaches downstream — used to rank the
   * main run at a split. */
  const reach = (/** @type {string} */ from) => {
    /** @type {Set<string>} */
    const seen = new Set([from]);
    /** @type {string[]} */
    const queue = [from];
    while (queue.length > 0) {
      const id = /** @type {string} */ (queue.pop());
      for (const next of outs(id)) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    return seen.size;
  };

  const sources = [...stations].filter((id) => (inDegree.get(id) ?? 0) === 0);
  const cyclic = sources.length === 0;
  let start;
  if (cyclic) {
    // A closed loop has no source: the smallest id walks it, and the
    // chain closes with a join back to the start
    start = [...stations].sort()[0];
  } else {
    // The source terminus with the most stations downstream; ties break
    // by id so the diagram is deterministic
    start = sources
      .map((id) => /** @type {const} */ ([id, reach(id)]))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  }

  /** Other routes serving a station — the interchange ticks. */
  const interchangesFor = (/** @type {string} */ id) => {
    /** @type {Set<number>} */
    const routes = new Set();
    for (const edge of allEdges) {
      if (edge.source !== id && edge.target !== id) continue;
      if (typeof edge.route !== "number" || edge.route === routeIndex) continue;
      routes.add(edge.route);
    }
    return [...routes].sort((a, b) => a - b);
  };

  const visited = /** @type {Set<string>} */ (new Set());
  /** @type {(id: string, via: string | null) => LineStation} */
  const make = (/** @type {string} */ id, /** @type {string | null} */ via) => {
    // Degree speaks first: a source (nothing flows in) and a sink
    // (nothing flows out) are the strip's termini, wherever they sit
    /** @type {LineStation} */
    const node = {
      id,
      kind: "stop",
      spurs: [],
      joinsAt: null,
      interchange: interchangesFor(id),
      label: id,
      via: via ?? null,
    };
    if (outs(id).length === 0 || (inDegree.get(id) ?? 0) === 0) {
      node.kind = "terminus";
    }
    return node;
  };

  /** Finds a drawn station by id along a chain's spine and spurs. */
  /** @type {(chainStations: LineStation[], id: string) => LineStation | null} */
  const findDrawn = (
    /** @type {LineStation[]} */ chainStations,
    /** @type {string} */ id,
  ) => {
    for (const node of chainStations) {
      if (node.id === id) return node;
      for (const spur of node.spurs) {
        const hit = findDrawn(spur.stations, id);
        if (hit) return hit;
      }
    }
    return null;
  };

  /**
   * Walks a chain from a station: the spine and, at splits, the spurs.
   *
   * @param {string} id
   * @returns {LineStation[]}
   */
  const chain = (
    /** @type {string} */ id,
    /** @type {string | null} */ via = null,
  ) => {
    if (visited.has(id)) {
      // The chain starts on a drawn station: nothing new renders — the
      // caller marks the join instead
      return [];
    }
    visited.add(id);
    const node = make(id, via);
    const targets = outs(id);
    const fresh = targets.filter((t) => !visited.has(t));
    const joins = targets.filter((t) => visited.has(t));
    if (fresh.length === 0) {
      if (joins.length > 0) {
        // The chain ran into a drawn station: the tick marks the join
        node.kind = "join";
        node.joinsAt = joins[0];
      } else {
        node.kind = "terminus";
      }
      return [node];
    }
    if (fresh.length === 1 && joins.length === 0) {
      return [node, ...chain(fresh[0], edgeIdFor(id, fresh[0]))];
    }
    // A split (possibly with an extra arrival): the main run — the
    // branch reaching the most stations, ties by id — continues down
    // the spine; the rest leave as 45° spurs, and every arrival into a
    // drawn station marks a bare join spur
    node.kind = "split";
    const ranked = fresh
      .map((t) => /** @type {const} */ ([t, reach(t)]))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const result = [node, ...chain(ranked[0][0], edgeIdFor(id, ranked[0][0]))];
    node.spurs = ranked.slice(1).map((entry) => {
      const stations = chain(entry[0], edgeIdFor(id, entry[0]));
      return {
        stations,
        // The branch re-enters a station the spine already drew: a bare
        // join connector marks it
        joinsAt: stations.length === 0 ? entry[0] : null,
      };
    });
    for (const target of joins)
      node.spurs.push({ stations: [], joinsAt: target });
    return result;
  };

  const spine = chain(start);

  // Every additional source — a flow converging into the drawn line —
  // walks as a spur attached at the station it joins into
  for (const source of sources.sort()) {
    if (visited.has(source)) continue;
    const spurChain = chain(source, null);
    const last = spurChain[spurChain.length - 1];
    const host =
      last.kind === "join" && last.joinsAt
        ? findDrawn(spine, last.joinsAt)
        : null;
    if (host) {
      host.spurs.push({ stations: spurChain, joinsAt: null });
    } else {
      // Defensive: a directed fragment that never joins renders as its
      // own strip below the spine
      spine.push(...spurChain);
    }
  }

  return { stations: spine, cyclic };
}
