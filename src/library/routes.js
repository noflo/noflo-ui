/**
 * @file The route vocabulary (work documents #6, #35): the ten routes'
 * default names and the helpers the route-identity channel consumes.
 * Per the guidelines §6 rule, route identity never rests on hue alone —
 * the name is the redundant channel, and the default names are the Tube
 * line names (work document #6's palette) regardless of the active
 * theme, used whenever the user has not named a route.
 */

/**
 * The default route names, index-aligned with `--route-0`…`--route-9`:
 * the Tube line names from work document #6's palette.
 *
 * @type {string[]}
 */
export const ROUTE_LINE_NAMES = [
  "Northern",
  "Central",
  "London Overground",
  "Circle",
  "District",
  "DLR",
  "Victoria",
  "Piccadilly",
  "Elizabeth",
  "Metropolitan",
];

/**
 * Resolves a route's display name: the graph's own route table wins
 * (`{ "0": { name } }` from the CRDT metadata), the Tube line name is
 * the default.
 *
 * @param {number} route The route index 0-9.
 * @param {Record<string, { name?: string } | undefined> | undefined} table
 *   The graph's projected route table, when it carries one.
 * @returns {string}
 */
export function routeName(route, table) {
  const custom = table?.[String(route)]?.name;
  if (custom) return custom;
  return ROUTE_LINE_NAMES[route] ?? `Route ${route}`;
}

/**
 * Computes the termini of every route line from a graph's wired
 * connections: the roundel unit is the route terminus, not the edge —
 * a line A→B→C→D gets its name roundel at A and D, the way Tube maps
 * label termini. A route's terminus is the node carrying exactly one of
 * the route's attachments (edges count both endpoints; IIPs and
 * exported ports count the node they feed — the IIP chip and the export
 * dock are the line's other end, and neither is a station).
 *
 * @param {Array<{ route: number, nodeId: string }>} attachments Every
 *   (route, node) attachment on the graph's wired connections.
 * @returns {Map<number, Set<string>>} Route index -> the terminus node
 *   ids (a node with a single attachment on the route's subgraph).
 */
export function routeTermini(attachments) {
  /** @type {Map<number, Map<string, number>>} */
  const degree = new Map();
  for (const { route, nodeId } of attachments) {
    let perRoute = degree.get(route);
    if (!perRoute) {
      perRoute = new Map();
      degree.set(route, perRoute);
    }
    perRoute.set(nodeId, (perRoute.get(nodeId) ?? 0) + 1);
  }
  /** @type {Map<number, Set<string>>} */
  const termini = new Map();
  for (const [route, perRoute] of degree) {
    const ends = new Set();
    for (const [nodeId, count] of perRoute) {
      if (count === 1) ends.add(nodeId);
    }
    if (ends.size > 0) termini.set(route, ends);
  }
  return termini;
}
