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
