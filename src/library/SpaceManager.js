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
   * The zone cells for a group (work document #35's tariff zones): the
   * members' occupied grid cells dilated by a padding ring — the union of
   * the members' areas, so the zone hugs its stations and flows around
   * nodes that are not in the group instead of covering them. The same
   * cell set answers the membership drop test, so the zone a user sees is
   * exactly the zone that joins.
   *
   * @param {Array<{ x: number, y: number, size?: number }>} members The
   *   member nodes' positions (80px boxes unless size says otherwise).
   * @param {{ cell?: number, dilate?: number }} [options] The grid cell
   *   size and the padding ring in cells (1 = 40px).
   * @returns {Set<string>} The occupied cells as "i,j" grid indices.
   */
  zoneCells(members, options = {}) {
    const cell = options.cell ?? 40;
    const dilate = options.dilate ?? 1;
    /** @type {Set<string>} */
    const cells = new Set();
    for (const member of members) {
      const size = member.size ?? 80;
      const i0 = Math.floor(member.x / cell);
      const j0 = Math.floor(member.y / cell);
      const i1 = Math.floor((member.x + size - 1) / cell);
      const j1 = Math.floor((member.y + size - 1) / cell);
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          cells.add(`${i},${j}`);
        }
      }
    }
    if (dilate <= 0) return cells;
    /** @type {Set<string>} */
    const dilated = new Set(cells);
    for (const key of cells) {
      const [i, j] = key.split(",").map(Number);
      for (let di = -dilate; di <= dilate; di++) {
        for (let dj = -dilate; dj <= dilate; dj++) {
          dilated.add(`${i + di},${j + dj}`);
        }
      }
    }
    return dilated;
  }

  /**
   * Traces the rectilinear outline of an occupied-cell set into an SVG
   * path: marching-edges chaining — every cell side facing an empty cell
   * is a boundary segment, chained greedily into loops (one subpath per
   * contour, holes included, `fill-rule: evenodd`-ready).
   *
   * @param {Set<string>} cells The occupied cells as "i,j" grid indices.
   * @param {number} [cellSize]
   * @returns {string} The path `d`.
   */
  zoneOutline(cells, cellSize = 40) {
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
    let d = "";
    while (edgesFrom.size > 0) {
      const [startKey] = edgesFrom.keys();
      const [sx, sy] = startKey.split(",").map(Number);
      d += `M ${sx} ${sy} `;
      let current = startKey;
      for (;;) {
        const list = edgesFrom.get(current);
        if (!list || list.length === 0) break;
        const next = /** @type {number[]} */ (list.shift());
        if (list.length === 0) edgesFrom.delete(current);
        d += `L ${next[0]} ${next[1]} `;
        current = `${next[0]},${next[1]}`;
        if (current === startKey) break;
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
