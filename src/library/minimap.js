/**
 * @file The minimap layout (work document #5, deferred until the CRDT
 * landed): the shared geometry behind the canvas navigation minimap and the
 * expanded-node subgraph depiction — "single unit of work" per the
 * deferral note, so both surfaces render the same graph language.
 *
 * Pure math: a projected graph view plus the visible viewport (in graph
 * coordinates) becomes dots, lines, and a viewport rectangle in minimap
 * coordinates. Visual guidelines §12: tiny node/edge dots and lines,
 * everything muted except the viewport — the styling lives with the
 * renderer, this module only computes geometry.
 */

/**
 * @typedef {Object} MinimapView
 * @property {Record<string, { metadata?: { x?: number, y?: number } }>} processes
 * @property {Array<{ src?: { process?: string }, tgt?: { process?: string } }>} connections
 */

/**
 * @typedef {Object} MinimapViewportRect
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 */

/**
 * @typedef {Object} MinimapLayout
 * @property {Array<{ id: string, x: number, y: number }>} nodes Node dots in
 *   minimap coordinates.
 * @property {Array<{ x1: number, y1: number, x2: number, y2: number }>} edges
 *   Node-to-node lines in minimap coordinates.
 * @property {MinimapViewportRect | null} viewport The visible viewport as a
 *   rectangle in minimap coordinates; null when no viewport was given or
 *   the graph is empty.
 * @property {number} scale Graph units → minimap units.
 */

/** Padding around the content bounds, in graph units. */
const CONTENT_PADDING = 80;
/** The largest dot scale: a small graph must not blow up into giant dots. */
const MAX_SCALE = 0.35;

/**
 * Computes the minimap layout for a projected graph view.
 *
 * @param {Object} options
 * @param {MinimapView} options.view The projected graph view (`projectGraph`).
 * @param {MinimapViewportRect | null} options.viewport The visible viewport
 *   in graph coordinates (from the camera), or null to omit it.
 * @param {{ width: number, height: number }} options.size The minimap box
 *   size in CSS pixels.
 * @returns {MinimapLayout}
 */
export function minimapLayout({ view, viewport, size }) {
  const positions = new Map();
  for (const [id, process] of Object.entries(view?.processes ?? {})) {
    const { x, y } = process?.metadata ?? {};
    if (typeof x === "number" && typeof y === "number") {
      positions.set(id, { x, y });
    }
  }

  if (positions.size === 0) {
    return { nodes: [], edges: [], viewport: null, scale: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { x, y } of positions.values()) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const contentWidth = maxX - minX + CONTENT_PADDING * 2;
  const contentHeight = maxY - minY + CONTENT_PADDING * 2;
  const scale = Math.min(
    size.width / contentWidth,
    size.height / contentHeight,
    MAX_SCALE,
  );

  // The content centers in the box when the capped scale leaves room
  const offsetX = (size.width - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = (size.height - (maxY - minY) * scale) / 2 - minY * scale;
  const project = (/** @type {number} */ x, /** @type {number} */ y) => ({
    x: x * scale + offsetX,
    y: y * scale + offsetY,
  });

  const nodes = [...positions.entries()].map(([id, { x, y }]) => ({
    id,
    ...project(x, y),
  }));

  const edges = [];
  for (const connection of view?.connections ?? []) {
    const from = positions.get(connection?.src?.process ?? "");
    const to = positions.get(connection?.tgt?.process ?? "");
    if (!from || !to) continue;
    const start = project(from.x, from.y);
    const end = project(to.x, to.y);
    edges.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
  }

  let mappedViewport = null;
  if (viewport) {
    mappedViewport = {
      x: viewport.x * scale + offsetX,
      y: viewport.y * scale + offsetY,
      w: viewport.w * scale,
      h: viewport.h * scale,
    };
  }

  return { nodes, edges, viewport: mappedViewport, scale };
}

/**
 * The visible viewport rectangle in graph coordinates, from the camera's
 * transform and the editor's pixel size: the same convention
 * `SpaceManager.viewportToGraph` uses, as one rectangle.
 *
 * @param {{ x: number, y: number }} offset The camera offset in pixels.
 * @param {number} zoom
 * @param {{ width: number, height: number }} pixels The editor viewport size.
 * @returns {MinimapViewportRect}
 */
export function viewportRectFromCamera(offset, zoom, pixels) {
  return {
    x: -offset.x / zoom,
    y: -offset.y / zoom,
    w: pixels.width / zoom,
    h: pixels.height / zoom,
  };
}

/**
 * Converts a minimap-local point back into graph coordinates: the inverse
 * of the layout's projection, used for tap/drag navigation.
 *
 * @param {{ x: number, y: number }} point A minimap-local point.
 * @param {MinimapLayout} layout The layout the point was clicked in.
 * @param {{ width: number, height: number }} size The minimap box size.
 * @param {MinimapView} view The same view the layout was computed from.
 * @returns {{ x: number, y: number }}
 */
export function minimapPointToGraph(point, layout, size, view) {
  const positions = new Map();
  for (const [id, process] of Object.entries(view?.processes ?? {})) {
    const { x, y } = process?.metadata ?? {};
    if (typeof x === "number" && typeof y === "number") {
      positions.set(id, { x, y });
    }
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { x, y } of positions.values()) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const contentWidth = maxX - minX + CONTENT_PADDING * 2;
  const contentHeight = maxY - minY + CONTENT_PADDING * 2;
  const offsetX =
    (size.width - (maxX - minX) * layout.scale) / 2 - minX * layout.scale;
  const offsetY =
    (size.height - (maxY - minY) * layout.scale) / 2 - minY * layout.scale;
  return {
    x: (point.x - offsetX) / layout.scale,
    y: (point.y - offsetY) / layout.scale,
  };
}
