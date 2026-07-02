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
  addNode(id, position, size) {
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
   * @param {number} w
   * @param {number} h
   * @returns {Position | null}
   */
  findEmptySpace(w, h) {
    // Implementation left for later phases.
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
}
