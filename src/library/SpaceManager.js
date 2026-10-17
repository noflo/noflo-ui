/**
 * @typedef {Object} Position
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} BoundingBox
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * Spatial record for a graph entity placed on the canvas.
 *
 * @typedef {Object} EntityRecord
 * @property {string} id
 * @property {Position} position
 * @property {number} size
 */

/**
 * SpaceManager handles the spatial math and indexing for the flow editor.
 */
export class SpaceManager {
  /**
   * @param {number} zoom
   * @param {Position} offset
   */
  constructor(zoom, offset) {
    /** @type {number} */
    this.zoom = zoom;
    /** @type {Position} */
    this.offset = offset;
    /** @type {Map<string, EntityRecord>} */
    this.entities = new Map();
  }

  /**
   * @param {number} zoom
   * @param {Position} offset
   */
  updateViewport(zoom, offset) {
    this.zoom = zoom;
    this.offset = offset;
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @param {DOMRect} rect
   * @returns {Position}
   */
  clientToGraph(clientX, clientY, rect) {
    const viewportX = clientX - rect.left;
    const viewportY = clientY - rect.top;
    return this.viewportToGraph(viewportX, viewportY);
  }

  /**
   * @param {number} viewportX
   * @param {number} viewportY
   * @returns {Position}
   */
  viewportToGraph(viewportX, viewportY) {
    return {
      x: (viewportX - this.offset.x) / this.zoom,
      y: (viewportY - this.offset.y) / this.zoom,
    };
  }

  /**
   * @param {number} graphX
   * @param {number} graphY
   * @returns {Position}
   */
  graphToViewport(graphX, graphY) {
    return {
      x: graphX * this.zoom + this.offset.x,
      y: graphY * this.zoom + this.offset.y,
    };
  }

  /**
   * @param {number} graphX
   * @param {number} graphY
   * @param {DOMRect} rect
   * @returns {Position}
   */
  graphToClient(graphX, graphY, rect) {
    const viewportPos = this.graphToViewport(graphX, graphY);
    return {
      x: viewportPos.x + rect.left,
      y: viewportPos.y + rect.top,
    };
  }

  /**
   * @param {string} id
   * @param {Position} position
   * @param {number} size
   */
  addEntity(id, position, size) {
    this.entities.set(id, { id, position, size });
  }

  /**
   * @param {string} id
   * @param {Position} position
   */
  updateEntity(id, position) {
    const el = this.entities.get(id);
    if (el) {
      el.position = position;
    }
  }

  /**
   * @param {string} id
   */
  removeEntity(id) {
    this.entities.delete(id);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {string[]}
   */
  getEntitiesAt(x, y) {
    const results = [];
    for (const el of this.entities.values()) {
      if (
        x >= el.position.x &&
        x <= el.position.x + el.size &&
        y >= el.position.y &&
        y <= el.position.y + el.size
      ) {
        results.push(el.id);
      }
    }
    return results;
  }

  /** @returns {string[]} ids of all placed graph entities. */
  getEntityIds() {
    return Array.from(this.entities.keys());
  }

  /**
   * @param {number} startX
   * @param {number} startY
   * @param {number} w
   * @returns {Position | null}
   */
  findEmptySpace(startX, startY, w) {
    const cellSize = 40;
    const startXSnapped = this.snapToGrid(startX, startY).x;
    const startYSnapped = this.snapToGrid(startX, startY).y;

    // Try expanding squares around the starting position
    for (let r = 0; r < 10; r++) {
      for (let i = -r; i <= r; i++) {
        for (let j = -r; j <= r; j++) {
          // Only check the boundary of the square of radius r
          if (r > 0 && Math.abs(i) !== r && Math.abs(j) !== r) continue;

          const testX = startXSnapped + i * cellSize;
          const testY = startYSnapped + j * cellSize;

          if (this.hasSpace(testX, testY, w)) {
            return { x: testX, y: testY };
          }
        }
      }
    }
    return null;
  }

  /**
   * @param {string[]} ids
   * @returns {BoundingBox}
   */
  getBoundingBox(ids) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const id of ids) {
      const el = this.entities.get(id);
      if (el) {
        minX = Math.min(minX, el.position.x);
        minY = Math.min(minY, el.position.y);
        maxX = Math.max(maxX, el.position.x + el.size);
        maxY = Math.max(maxY, el.position.y + el.size);
      }
    }

    return {
      x: minX === Infinity ? 0 : minX,
      y: minY === Infinity ? 0 : minY,
      width: maxX === -Infinity ? 0 : maxX - minX,
      height: maxY === -Infinity ? 0 : maxY - minY,
    };
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {Position}
   */
  snapToGrid(x, y) {
    const H = 40;
    return {
      x: Math.round(x / H) * H,
      y: Math.round(y / H) * H,
    };
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} size
   * @returns {boolean}
   */
  hasSpace(x, y, size = 80) {
    const snapped = this.snapToGrid(x - size / 2, y - size / 2);
    for (const el of this.entities.values()) {
      if (
        snapped.x < el.position.x + el.size &&
        snapped.x + size > el.position.x &&
        snapped.y < el.position.y + el.size &&
        snapped.y + size > el.position.y
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * The zone shape for a group (work document #35's tariff zones): the
   * members' occupied grid cells dilated by a padding ring, with
   * corridors connecting members that would otherwise form disconnected
   * blobs — routed around the blockers (nodes not in the group) by a
   * grid BFS that first keeps a clear ring around them, falling back to
   * a tighter path and finally a straight corridor, and never covering a
   * blocker's own cells. The blockers keep a clearance ring, so the
   * zone's boundary never touches a non-member's box — the dilation
   * clips against the keep-out and the 45° bevels never cut into it.
   * The same cell set answers the membership drop test, so the zone a
   * user sees is exactly the zone that joins.
   *
   * @param {Array<{ x: number, y: number, size?: number }>} members The
   *   member nodes' positions (80px boxes unless size says otherwise).
   * @param {Array<{ x: number, y: number, size?: number }>} blockers The
   *   non-member nodes' positions — the corridors route around them and
   *   their cells are never covered.
   * @param {{ cell?: number, dilate?: number }} [options] The grid cell
   *   size and the padding ring in cells (1 = 40px).
   * @returns {{ cells: Set<string>, d: string, labelCell: { i: number, j: number } | null }}
   *   The occupied cells (membership test), the beveled 45° contour path,
   *   and the zone's topmost-leftmost occupied cell for the label.
   */
  zoneShape(members, blockers = [], options = {}) {
    const cell = options.cell ?? 40;
    const dilate = options.dilate ?? 1;
    const memberCells = SpaceManager.rectCells(members, cell);
    const blockerCells = SpaceManager.rectCells(blockers, cell);
    // The keep-out: a blocker's cells plus a clearance ring, so the
    // zone's boundary stays a cell away from a non-member's box
    const keepOut = SpaceManager.dilateSet(blockerCells, 1);

    // The raw member cells, connected: components of the undilated union
    // join through corridors before the dilation ring goes on, so the
    // ring does not have to swallow the gap to connect the members
    const raw = new Set(memberCells);
    const components = SpaceManager.components(raw);
    /** @type {Set<string>} */
    const connected = new Set(components[0]);
    for (let k = 1; k < components.length; k++) {
      const target = components[k];
      // Tier 1: keep a clear ring around every blocker; tier 2: squeeze
      // between them; tier 3: a straight corridor — the zone stays one
      // region at almost any cost
      let path = SpaceManager.corridor(connected, target, keepOut);
      if (!path) path = SpaceManager.corridor(connected, target, blockerCells);
      if (!path) path = SpaceManager.straightCorridor(connected, target);
      for (const step of path) {
        raw.add(step);
        connected.add(step);
      }
      for (const step of target) connected.add(step);
    }
    // The dilation ring goes on the connected union last, clipped by the
    // keep-out: the zone never covers a blocker's clearance — except a
    // cell the raw union itself earned (a member's own body beside a
    // node, or a last-resort corridor)
    const cells = SpaceManager.dilateSet(raw, dilate);
    for (const key of keepOut) {
      if (!raw.has(key)) cells.delete(key);
    }

    // The contour: rectilinear loops, corners beveled at 45° where the
    // cut stays clear of members and the keep-out (Beck's world:
    // horizontals, verticals, and 45° turns)
    const loops = SpaceManager.zoneLoops(cells, cell);
    const d = SpaceManager.zoneContour(loops, cell, memberCells, keepOut);
    let labelCell = null;
    for (const key of cells) {
      const [i, j] = key.split(",").map(Number);
      if (
        !labelCell ||
        j < labelCell.j ||
        (j === labelCell.j && i < labelCell.i)
      ) {
        labelCell = { i, j };
      }
    }
    return { cells, d, labelCell };
  }

  /**
   * The grid cells a set of boxes occupies.
   *
   * @param {Array<{ x: number, y: number, size?: number }>} boxes
   * @param {number} cell
   * @returns {Set<string>}
   */
  static rectCells(boxes, cell) {
    /** @type {Set<string>} */
    const cells = new Set();
    for (const box of boxes) {
      const size = box.size ?? 80;
      const i0 = Math.floor(box.x / cell);
      const j0 = Math.floor(box.y / cell);
      const i1 = Math.floor((box.x + size - 1) / cell);
      const j1 = Math.floor((box.y + size - 1) / cell);
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          cells.add(`${i},${j}`);
        }
      }
    }
    return cells;
  }

  /**
   * Dilates a cell set by the given ring width in cells.
   *
   * @param {Set<string>} cells
   * @param {number} ring
   * @returns {Set<string>}
   */
  static dilateSet(cells, ring) {
    if (ring <= 0) return new Set(cells);
    /** @type {Set<string>} */
    const dilated = new Set(cells);
    for (const key of cells) {
      const [i, j] = key.split(",").map(Number);
      for (let di = -ring; di <= ring; di++) {
        for (let dj = -ring; dj <= ring; dj++) {
          dilated.add(`${i + di},${j + dj}`);
        }
      }
    }
    return dilated;
  }

  /**
   * The 4-connected components of a cell set.
   *
   * @param {Set<string>} cells
   * @returns {Array<Set<string>>}
   */
  static components(cells) {
    /** @type {Array<Set<string>>} */
    const components = [];
    /** @type {Set<string>} */
    const seen = new Set();
    for (const key of cells) {
      if (seen.has(key)) continue;
      const component = new Set([key]);
      seen.add(key);
      const queue = [key];
      while (queue.length > 0) {
        const current = /** @type {string} */ (queue.shift());
        const [i, j] = current.split(",").map(Number);
        for (const [di, dj] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const next = `${i + di},${j + dj}`;
          if (cells.has(next) && !seen.has(next)) {
            seen.add(next);
            component.add(next);
            queue.push(next);
          }
        }
      }
      components.push(component);
    }
    return components;
  }

  /**
   * A BFS corridor from the connected set to a target component through
   * cells not in `blocked`; null when no route exists. The path carries
   * the intermediate cells (the endpoints are the sets themselves).
   *
   * @param {Set<string>} from
   * @param {Set<string>} to
   * @param {Set<string>} blocked
   * @returns {Set<string>}
   */
  static corridor(from, to, blocked) {
    /** @type {Map<string, string | null>} */
    const cameFrom = new Map();
    const queue = [];
    for (const key of from) {
      if (blocked.has(key)) continue;
      cameFrom.set(key, null);
      queue.push(key);
    }
    let goal = null;
    while (queue.length > 0 && goal === null) {
      const current = /** @type {string} */ (queue.shift());
      const [i, j] = current.split(",").map(Number);
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const next = `${i + di},${j + dj}`;
        if (cameFrom.has(next) || blocked.has(next)) continue;
        cameFrom.set(next, current);
        if (to.has(next)) {
          goal = next;
          break;
        }
        queue.push(next);
      }
    }
    if (goal === null) return new Set();
    /** @type {Set<string>} */
    const path = new Set();
    let walk = goal;
    while (walk !== null) {
      path.add(walk);
      const previous = cameFrom.get(walk);
      if (previous === null || previous === undefined) break;
      walk = previous;
    }
    return path;
  }

  /**
   * The L-shaped corridor between the nearest pair of cells — the last
   * resort when the grid has no free route at all.
   *
   * @param {Set<string>} from
   * @param {Set<string>} to
   * @returns {Set<string>}
   */
  static straightCorridor(from, to) {
    const [fi, fj] = [...from][0].split(",").map(Number);
    const [ti, tj] = [...to][0].split(",").map(Number);
    /** @type {Set<string>} */
    const path = new Set();
    const stepI = fi <= ti ? 1 : -1;
    for (let i = fi; i !== ti + stepI; i += stepI) path.add(`${i},${fj}`);
    const stepJ = fj <= tj ? 1 : -1;
    for (let j = fj; j !== tj + stepJ; j += stepJ) path.add(`${ti},${j}`);
    return path;
  }

  /**
   * Traces the rectilinear contour loops of an occupied-cell set:
   * marching-edges chaining — every cell side facing an empty cell is a
   * boundary segment, chained greedily into closed loops (one per
   * contour, holes included).
   *
   * @param {Set<string>} cells
   * @param {number} cellSize
   * @returns {Array<Array<number[]>>} The loops as vertex lists.
   */
  static zoneLoops(cells, cellSize) {
    /** @type {Map<string, Array<number[]>>} */
    const edgesFrom = new Map();
    /** @param {number} fx @param {number} fy @param {number} tx @param {number} ty */
    const addEdge = (fx, fy, tx, ty) => {
      const key = `${fx},${fy}`;
      const list = edgesFrom.get(key) ?? [];
      list.push([tx, ty]);
      edgesFrom.set(key, list);
    };
    const occupied = (/** @type {number} */ i, /** @type {number} */ j) =>
      cells.has(`${i},${j}`);
    for (const key of cells) {
      const [i, j] = key.split(",").map(Number);
      const x = i * cellSize;
      const y = j * cellSize;
      if (!occupied(i, j - 1)) addEdge(x, y, x + cellSize, y);
      if (!occupied(i + 1, j))
        addEdge(x + cellSize, y, x + cellSize, y + cellSize);
      if (!occupied(i, j + 1))
        addEdge(x + cellSize, y + cellSize, x, y + cellSize);
      if (!occupied(i - 1, j)) addEdge(x, y + cellSize, x, y);
    }
    /** @type {Array<Array<number[]>>} */
    const loops = [];
    while (edgesFrom.size > 0) {
      const [startKey] = edgesFrom.keys();
      const [sx, sy] = startKey.split(",").map(Number);
      /** @type {Array<number[]>} */
      const loop = [[sx, sy]];
      let current = startKey;
      for (;;) {
        const list = edgesFrom.get(current);
        if (!list || list.length === 0) break;
        const next = /** @type {number[]} */ (list.shift());
        if (list.length === 0) edgesFrom.delete(current);
        loop.push([next[0], next[1]]);
        current = `${next[0]},${next[1]}`;
        if (current === startKey) break;
      }
      // The closing vertex repeats the start: drop it
      loop.pop();
      if (loop.length >= 3) loops.push(loop);
    }
    return loops;
  }

  /**
   * Renders contour loops as an SVG path with 45° bevels: every
   * perpendicular corner is cut at 45° where the cut stays clear of the
   * members' and blockers' cells — a member's corner is never exposed
   * and a non-member is never covered by a bevel. Staircases of unit
   * cells collapse into straight 45° runs; larger corners chamfer.
   *
   * @param {Array<Array<number[]>>} loops
   * @param {number} cellSize
   * @param {Set<string>} memberCells
   * @param {Set<string>} blockerCells
   * @returns {string} The path `d`.
   */
  /**
   * Renders contour loops as an SVG path with 45° bevels and slightly
   * rounded corners: every perpendicular corner is cut at 45° where the
   * cut stays clear of the members' and blockers' cells — a member's
   * corner is never exposed and a non-member is never covered by a
   * bevel. Staircases of unit cells collapse into straight 45° runs;
   * larger corners chamfer. Every emitted segment is verified to stay at
   * 45° or 90° — chained bevels would otherwise compound into shallower
   * angles — and the surviving corners round slightly (a quadratic per
   * vertex, capped at half the edge).
   *
   * @param {Array<Array<number[]>>} loops
   * @param {number} cellSize
   * @param {Set<string>} memberCells
   * @param {Set<string>} blockerCells
   * @returns {string} The path `d`.
   */
  static zoneContour(loops, cellSize, memberCells, blockerCells) {
    const safe = (/** @type {number} */ x, /** @type {number} */ y) => {
      const key = `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;
      return !memberCells.has(key) && !blockerCells.has(key);
    };
    // A segment stays in the grammar: horizontal, vertical, or 45°
    const ok = (/** @type {number[]} */ from, /** @type {number[]} */ to) => {
      const dx = Math.abs(to[0] - from[0]);
      const dy = Math.abs(to[1] - from[1]);
      return dx === 0 || dy === 0 || dx === dy;
    };
    let d = "";
    for (const loop of loops) {
      const n = loop.length;
      /** @type {Array<number[]>} */
      const out = [];
      let prevBeveled = false;
      for (let k = 0; k < n; k++) {
        const P = loop[(k - 1 + n) % n];
        const V = loop[k];
        const N = loop[(k + 1) % n];
        const d1x = Math.sign(V[0] - P[0]);
        const d1y = Math.sign(V[1] - P[1]);
        const d2x = Math.sign(N[0] - V[0]);
        const d2y = Math.sign(N[1] - V[1]);
        const collinear = d1x === d2x && d1y === d2y;
        const axisAligned =
          (d1x === 0 || d1y === 0) && (d2x === 0 || d2y === 0);
        const len1 = Math.abs(V[0] - P[0]) + Math.abs(V[1] - P[1]);
        const len2 = Math.abs(N[0] - V[0]) + Math.abs(N[1] - V[1]);
        const leg = Math.min(cellSize, len1, len2);
        const ax = V[0] - d1x * leg;
        const ay = V[1] - d1y * leg;
        const bx = V[0] + d2x * leg;
        const by = V[1] + d2y * leg;
        // The cut's cells must be clear of members and blockers: sample
        // the diagonal (the endpoints sit on boundary edges)
        const legal =
          safe(ax + (V[0] - ax) / 2, ay + (V[1] - ay) / 2) &&
          safe((ax + bx) / 2, (ay + by) / 2) &&
          safe(bx + (V[0] - bx) / 2, by + (V[1] - by) / 2);
        const last = out.length > 0 ? out[out.length - 1] : P;
        // Chained bevels compound into shallower angles: a vertex whose
        // incoming edge is already a bevel's diagonal keeps its corner
        const canBevel =
          axisAligned &&
          !collinear &&
          !prevBeveled &&
          legal &&
          ok(last, ax === P[0] && ay === P[1] ? [bx, by] : [ax, ay]);
        if (!canBevel) {
          if (V[0] !== last[0] || V[1] !== last[1]) out.push(V);
          prevBeveled = false;
          continue;
        }
        // A unit-staircase corner (both legs one cell) vanishes into the
        // diagonal; a longer corner keeps shortened edge stubs
        if (ax !== last[0] || ay !== last[1]) out.push([ax, ay]);
        if (bx !== N[0] || by !== N[1]) out.push([bx, by]);
        prevBeveled = true;
      }
      if (out.length < 3) continue;
      // The corners round slightly: a quadratic per vertex, capped at
      // half the edge so short segments stay well-formed
      const radius = 8;
      const m = out.length;
      for (let k = 0; k < m; k++) {
        const P = out[(k - 1 + m) % m];
        const V = out[k];
        const N = out[(k + 1) % m];
        const inLen = Math.hypot(V[0] - P[0], V[1] - P[1]) || 1;
        const outLen = Math.hypot(N[0] - V[0], N[1] - V[1]) || 1;
        const rIn = Math.min(radius, inLen / 2);
        const rOut = Math.min(radius, outLen / 2);
        const entryX = V[0] - ((V[0] - P[0]) / inLen) * rIn;
        const entryY = V[1] - ((V[1] - P[1]) / inLen) * rIn;
        const exitX = V[0] + ((N[0] - V[0]) / outLen) * rOut;
        const exitY = V[1] + ((N[1] - V[1]) / outLen) * rOut;
        d +=
          (k === 0 ? `M ${entryX} ${entryY} ` : `L ${entryX} ${entryY} `) +
          `Q ${V[0]} ${V[1]} ${exitX} ${exitY} `;
      }
      d += "Z ";
    }
    return d.trim();
  }

  /**
   * Whether a graph point lands in a zone's cells: the cell the point's
   * center falls in is the membership test, so the zone a user sees is
   * exactly the zone that joins.
   *
   * @param {Set<string>} cells The occupied cells as "i,j" grid indices.
   * @param {number} x
   * @param {number} y
   * @param {number} [cellSize]
   * @returns {boolean}
   */
  pointInZone(cells, x, y, cellSize = 40) {
    return cells.has(`${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`);
  }
}
