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
    /** @type {Map<string, {id: string, position: Position, size: number}>} */
    this.elements = new Map();
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
  addElement(id, position, size) {
    this.elements.set(id, { id, position, size });
  }

  /**
   * @param {string} id
   * @param {Position} position
   */
  updateNode(id, position) {
    const el = this.elements.get(id);
    if (el) {
      el.position = position;
    }
  }

  /**
   * @param {string} id
   */
  removeNode(id) {
    this.elements.delete(id);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {string[]}
   */
  getElementsAt(x, y) {
    const results = [];
    for (const el of this.elements.values()) {
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

  /**
   * @param {number} startX
   * @param {number} startY
   * @param {number} w
   * @param {number} h
   * @returns {Position | null}
   */
  findEmptySpace(startX, startY, w, h) {
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
      const el = this.elements.get(id);
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
    for (const el of this.elements.values()) {
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
   * @param {DOMRect} rect
   * @param {number} padding
   */
  fitElements(rect, padding = 100) {
    if (this.elements.size === 0) return;

    const bbox = this.getBoundingBox(Array.from(this.elements.keys()));
    const contentWidth = bbox.width + padding * 2;
    const contentHeight = bbox.height + padding * 2;

    const viewportWidth = rect.width;
    const viewportHeight = rect.height;

    const zoomX = viewportWidth / contentWidth;
    const zoomY = viewportHeight / contentHeight;
    this.zoom = Math.min(zoomX, zoomY, 1.0);

    const contentCenterX = bbox.x + bbox.width / 2;
    const contentCenterY = bbox.y + bbox.height / 2;

    this.offset.x = viewportWidth / 2 - contentCenterX * this.zoom;
    this.offset.y = viewportHeight / 2 - contentCenterY * this.zoom;
  }
}
