/**
 * @typedef {Object} Position
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} Edge
 * @property {SVGPathElement} hitPath
 * @property {SVGPathElement} visualPath
 * @property {HTMLElement} portA
 * @property {HTMLElement} portB
 * @property {number} [routeId] The route index (0-9) coloring the edge.
 */

/**
 * @typedef {Object} IIPWire
 * @property {SVGPathElement} hitPath
 * @property {SVGPathElement} visualPath
 * @property {HTMLElement} iip
 * @property {HTMLElement} port
 * @property {number} [routeId] The route index coloring the wire.
 */

/**
 * @typedef {Object} EdgeManagerDeps
 * @property {SVGElement} edgesGroup `<g>` container for node-to-node edges.
 * @property {SVGElement} iipWiresGroup `<g>` container for IIP / exported-port wires.
 * @property {(port: HTMLElement) => Position} getPortPosition Resolve a port element to graph-space coordinates.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * EdgeManager owns the graph's wired connections: node-to-node `edges` and
 * IIP / exported-port `iipWires`, including their SVG path rendering and
 * lifecycle (add / remove / update / disconnect).
 *
 * It centralises the cubic-bezier path math and the wire-cleanup logic that
 * was previously duplicated (and inconsistent — see `_hostOf`) across the
 * editor. The manager is pure rendering/state: it resolves port positions via
 * the injected `getPortPosition` callback and never touches the editor's
 * pan/zoom state directly.
 */
export class EdgeManager {
  /**
   * @param {EdgeManagerDeps} deps
   */
  constructor({ edgesGroup, iipWiresGroup, getPortPosition }) {
    /** @type {Edge[]} */
    this.edges = [];
    /** @type {IIPWire[]} */
    this.iipWires = [];
    /** @type {SVGElement} */
    this.edgesGroup = edgesGroup;
    /** @type {SVGElement} */
    this.iipWiresGroup = iipWiresGroup;
    /** @type {(port: HTMLElement) => Position} */
    this.getPortPosition = getPortPosition;
  }

  /**
   * Create and register an edge outport -> inport.
   * @param {HTMLElement} portA outport
   * @param {HTMLElement} portB inport
   * @param {number} [routeId]
   * @returns {Edge | undefined}
   */
  addEdge(portA, portB, /** @type {number | undefined} */ routeId) {
    if (
      !portA.classList.contains("port-out") ||
      !portB.classList.contains("port-in")
    ) {
      console.error("Invalid connection: expected outport -> inport");
      return;
    }

    if (portA.dataset.portType === "array") {
      const existing = this.edges.filter((e) => e.portA === portA);
      if (existing.length >= 1) {
        alert(`ArrayPort ${portA.dataset.portName} already has a connection.`);
        return;
      }
    }
    if (portB.dataset.portType === "array") {
      const existing = this.edges.filter((e) => e.portB === portB);
      if (existing.length >= 1) {
        alert(`ArrayPort ${portB.dataset.portName} already has a connection.`);
        return;
      }
    }

    const hitPath = this._createPath("edge-hit-area");
    const visualPath = this._createPath("edge-flow");

    this._updatePathBetween(hitPath, visualPath, portA, portB);

    if (routeId !== undefined) {
      visualPath.style.setProperty("--edge-color", `var(--route-${routeId})`);
    }

    this.edgesGroup.appendChild(hitPath);
    this.edgesGroup.appendChild(visualPath);

    /** @type {Edge} */
    const edge = { hitPath, visualPath, portA, portB, routeId };
    this.edges.push(edge);
    return edge;
  }

  /**
   * Connect two nodes by port name (and optional arrayport index), looking the
   * port elements up in each node's shadow root.
   * @param {HTMLElement} nodeA
   * @param {string} portAName
   * @param {HTMLElement} nodeB
   * @param {string} portBName
   * @param {number} [routeId]
   * @param {number | undefined} [portAIndex]
   * @param {number | undefined} [portBIndex]
   * @returns {Edge | undefined}
   */
  connectNodes(
    nodeA,
    portAName,
    nodeB,
    portBName,
    routeId,
    portAIndex,
    portBIndex,
  ) {
    const portA = this._findPort(nodeA, portAName, portAIndex);
    const portB = this._findPort(nodeB, portBName, portBIndex);

    if (portA && portB) {
      return this.addEdge(
        /** @type {HTMLElement} */ (portA),
        /** @type {HTMLElement} */ (portB),
        routeId,
      );
    }
    console.warn(`Could not connect ${portAName} to ${portBName}`);
    return;
  }

  /**
   * Finds a port element inside a node's shadow root by name, optionally
   * narrowed to a specific arrayport index.
   *
   * @param {HTMLElement} node
   * @param {string} portName
   * @param {number | undefined} [index]
   * @returns {Element | null | undefined}
   */
  _findPort(node, portName, index) {
    let selector = `.port[data-port-name="${portName}"]`;
    if (index !== undefined) {
      selector += `[data-port-index="${index}"]`;
    }
    return node.shadowRoot?.querySelector(selector);
  }

  /**
   * Structured graph identity of an edge, derived from its endpoint port
   * elements: node names, port names, and arrayport indexes. Indexes are
   * `undefined` for regular ports. This is what the app layer uses to mirror
   * editor-side edge changes onto the `fbp-graph` Graph object.
   *
   * @param {Edge} edge
   * @returns {{ fromNode: string, fromPort: string, fromIndex: number | undefined, toNode: string, toPort: string, toIndex: number | undefined }}
   */
  getEdgeDescriptor(edge) {
    const { portA, portB } = edge;
    const nodeA = this._hostOf(portA);
    const nodeB = this._hostOf(portB);

    return {
      fromNode: nodeA ? nodeA.getAttribute("name") || "unknown" : "unknown",
      fromPort: portA.dataset.portName || "",
      fromIndex: this._indexOf(portA),
      toNode: nodeB ? nodeB.getAttribute("name") || "unknown" : "unknown",
      toPort: portB.dataset.portName || "",
      toIndex: this._indexOf(portB),
    };
  }

  /**
   * @param {HTMLElement} port
   * @returns {number | undefined}
   */
  _indexOf(port) {
    const raw = port.dataset.portIndex;
    if (raw === undefined) return undefined;
    const index = Number.parseInt(raw, 10);
    return Number.isNaN(index) ? undefined : index;
  }

  /**
   * Create and register an IIP wire (IIP or exported-port -> port).
   * @param {HTMLElement} iip
   * @param {HTMLElement} port
   * @param {number} [routeId] The route index coloring the wire (work
   *   document #35).
   * @returns {IIPWire}
   */
  connectIIP(iip, port, routeId) {
    const hitPath = this._createPath("edge-hit-area");
    const visualPath = this._createPath("edge-flow");

    this._updatePathBetween(hitPath, visualPath, iip, port);
    if (routeId !== undefined && routeId !== null) {
      visualPath.style.setProperty("--edge-color", `var(--route-${routeId})`);
    }

    this.iipWiresGroup.appendChild(hitPath);
    this.iipWiresGroup.appendChild(visualPath);

    /** @type {IIPWire} */
    const wire = { hitPath, visualPath, iip, port, routeId };
    this.iipWires.push(wire);
    return wire;
  }

  /**
   * Stable identifier for an edge, derived from its endpoint graph elements
   * and port metadata.
   * @param {Edge} edge
   * @returns {string}
   */
  getEdgeId(edge) {
    const { portA, portB } = edge;
    const nodeA = this._hostOf(portA);
    const nodeB = this._hostOf(portB);

    const nameA = nodeA ? nodeA.getAttribute("name") : "unknown";
    const nameB = nodeB ? nodeB.getAttribute("name") : "unknown";
    const portAName = portA.dataset.portName;
    const portBName = portB.dataset.portName;
    const portAIdx = portA.dataset.portIndex || "0";
    const portBIdx = portB.dataset.portIndex || "0";

    return `${nameA}:${portAName}[${portAIdx}]->${nameB}:${portBName}[${portBIdx}]`;
  }

  /** Re-render every edge's path from current port positions. */
  updateEdges() {
    for (const edge of this.edges) {
      this._updatePathBetween(
        edge.hitPath,
        edge.visualPath,
        edge.portA,
        edge.portB,
      );
    }
  }

  /** Re-render every IIP wire's path from current endpoint positions. */
  updateIIPWires() {
    for (const wire of this.iipWires) {
      this._updatePathBetween(
        wire.hitPath,
        wire.visualPath,
        wire.iip,
        wire.port,
      );
    }
  }

  /**
   * Remove a single edge: detach its SVG paths and drop it from the registry.
   * @param {Edge} edge
   */
  removeEdge(edge) {
    edge.visualPath?.remove();
    edge.hitPath?.remove();
    const index = this.edges.indexOf(edge);
    if (index > -1) {
      this.edges.splice(index, 1);
    }
  }

  /**
   * Remove all edges and IIP wires attached to a port (in either direction).
   * @param {HTMLElement} port
   */
  disconnectPort(port) {
    this._removeEdges((e) => e.portA === port || e.portB === port);
    this._removeIIPWires((w) => w.port === port);
  }

  /**
   * Remove all node-to-node edges touching a graph element (noflo-node /
   * noflo-iip), matched by host identity so shadow-root ports resolve
   * correctly.
   * @param {HTMLElement} nodeEl
   */
  removeEdgesForNode(nodeEl) {
    this._removeEdges(
      (e) =>
        this._hostOf(e.portA) === nodeEl || this._hostOf(e.portB) === nodeEl,
    );
  }

  /**
   * Remove IIP wires whose `iip` endpoint is the given element.
   * @param {HTMLElement} iipEl
   */
  removeIIPWiresForIIP(iipEl) {
    this._removeIIPWires((w) => w.iip === iipEl);
  }

  /**
   * Remove IIP wires attached to an exported port (matched on either endpoint).
   * @param {HTMLElement} epEl
   */
  removeIIPWiresForExportedPort(epEl) {
    this._removeIIPWires((w) => w.port === epEl || w.iip === epEl);
  }

  // ---- internals -------------------------------------------------------

  /**
   * @param {string} className
   * @returns {SVGPathElement}
   */
  _createPath(className) {
    const path = /** @type {SVGPathElement} */ (
      document.createElementNS(SVG_NS, "path")
    );
    path.classList.add(className);
    return path;
  }

  /**
   * Write the cubic-bezier `d` attribute onto a hit + visual path pair
   * spanning two endpoint elements. (Unifies the old `updatePathData` and
   * `updateIIPPathData`, which were identical.)
   * @param {SVGPathElement} hitPath
   * @param {SVGPathElement} visualPath
   * @param {HTMLElement} elA
   * @param {HTMLElement} elB
   */
  _updatePathBetween(hitPath, visualPath, elA, elB) {
    const posA = this.getPortPosition(elA);
    const posB = this.getPortPosition(elB);

    const dx = Math.abs(posB.x - posA.x) * 0.5;
    const cp1x = posA.x + (posB.x > posA.x ? dx : -dx);
    const cp1y = posA.y;
    const cp2x = posB.x + (posB.x > posA.x ? -dx : dx);
    const cp2y = posB.y;

    const d = `M ${posA.x} ${posA.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${posB.x} ${posB.y}`;
    hitPath.setAttribute("d", d);
    visualPath.setAttribute("d", d);
  }

  /**
   * Resolve the graph element (noflo-node / noflo-iip / noflo-exported-port)
   * that hosts a port element, crossing the shadow-DOM boundary.
   *
   * This replaces the editor's old `port.closest("noflo-node")` lookups, which
   * silently returned `null` for ports living inside a shadow root and so left
   * edges orphaned when their node was removed.
   * @param {HTMLElement} port
   * @returns {HTMLElement | null}
   */
  _hostOf(port) {
    const root = port.getRootNode();
    if (root instanceof ShadowRoot) {
      return /** @type {HTMLElement | null} */ (root.host);
    }
    return (
      /** @type {HTMLElement | null} */ (
        port.closest("noflo-node") || port.closest("noflo-iip")
      ) || null
    );
  }

  /**
   * Detach SVG paths for and drop all edges matching `predicate`.
   * @param {(edge: Edge) => boolean} predicate
   */
  _removeEdges(predicate) {
    for (const edge of this.edges.filter(predicate)) {
      edge.visualPath?.remove();
      edge.hitPath?.remove();
    }
    this.edges = this.edges.filter((e) => !predicate(e));
  }

  /**
   * Detach SVG paths for and drop all IIP wires matching `predicate`.
   * @param {(wire: IIPWire) => boolean} predicate
   */
  _removeIIPWires(predicate) {
    for (const wire of this.iipWires.filter(predicate)) {
      wire.hitPath?.remove();
      wire.visualPath?.remove();
    }
    this.iipWires = this.iipWires.filter((w) => !predicate(w));
  }
}
