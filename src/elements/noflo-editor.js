import { SelectionManager } from "../library/SelectionManager.js";
import { SpaceManager } from "../library/SpaceManager.js";

/** @typedef {any} FlowExportedPort */
/**
 * @typedef {Object} Position
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} PortConfig
 * @property {string} [name]
 * @property {boolean} [addressable]
 * @property {string} [type]
 * @property {number} [size]
 */

/**
 * @typedef {HTMLElement & {
 *   position: Position,
 *   size: number,
 *   setPorts: (inPorts: PortConfig[], outPorts: PortConfig[]) => void,
 *   shadowRoot: ShadowRoot | null
 * }} NoFloNode
 */

/**
 * @typedef {HTMLElement & {
 *   position: Position,
 *   size: number,
 *   value: string,
 *   shadowRoot: ShadowRoot | null
 * }} NoFloIIP
 */

/**
 * @typedef {Object} Edge
 * @property {SVGPathElement} hitPath
 * @property {SVGPathElement} visualPath
 * @property {HTMLElement} portA
 * @property {HTMLElement} portB
 * @property {string} [routeId]
 */

/**
 * @typedef {Object} IIPWire
 * @property {SVGPathElement} hitPath
 * @property {SVGPathElement} visualPath
 * @property {NoFloIIP | FlowExportedPort} iip
 * @property {HTMLElement} port
 */

/**
 * @typedef {HTMLElement & {
 *   isOpen: boolean,
 *   open: (x: number, y: number, items: any[], centerContent: string | null) => void,
 *   close: () => void
 * }} NoFloRadialMenu
 */

/**
 * FlowEditor Web Component

 * A zoomable canvas for editing NoFlo graphs.
 * Follows the architecture defined in SPEC.md and work document #1.
 *
 * @extends HTMLElement
 */
export class FlowEditor extends HTMLElement {
  static INTEREST_AREA_TYPES = {
    NONE: "none",
    PORT: "port",
    NODE: "node",
  };

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {number} */
    this.zoom = 1.0;
    /** @type {Position} */
    this.offset = { x: 0, y: 0 };
    /** @type {SpaceManager} */
    this.spaceManager = new SpaceManager(this.zoom, this.offset);
    /** @type {SelectionManager} */
    this.selectionManager = new SelectionManager();
    /** @type {boolean} */
    this.isPanning = false;
    /** @type {boolean} */
    this.isDraggingNode = false;
    /** @type {boolean} */
    this.isDraggingWire = false;
    /** @type {Position} */
    this.lastPointerPos = { x: 0, y: 0 };
    /** @type {Map<number, PointerEvent>} */
    this.activePointers = new Map();
    /** @type {number} */
    this.initialPinchDistance = 0;
    /** @type {number} */
    this.initialZoom = 1.0;
    /** @type {Position} */
    this.initialOffset = { x: 0, y: 0 };
    /** @type {boolean} */
    this.selectMode = false;
    /** @type {HTMLElement | null} */
    this.ghostNode = null;
    /** @type {number | null} */
    this.stillnessTimer = null;
    /** @type {number} */
    this.panDistance = 0;
    /** @type {boolean} */
    this.didPinch = false;
    /** @type {Position | null} */
    this.lastPinchCenter = null;
    /** @type {number} */
    this.lastPinchDistance = 0;
    /** @type {Map<string, number>} */
    this.activityMap = new Map();
    /** @type {Map<NoFloNode | NoFloIIP | FlowExportedPort, Position>} */
    this.draggingNodesInitialPositions = new Map();
    /** @type {Map<NoFloNode | NoFloIIP | FlowExportedPort, Position>} */
    this.draggingNodesTargetPositions = new Map();
    /** @type {Map<NoFloNode | NoFloIIP | FlowExportedPort, {x: number, y: number}>} */
    this.nodeVelocities = new Map();
    /** @type {Position | null} */
    this.draggingStartPointerPos = null;
    /** @type {number | null} */
    this.animationFrameId = null;
    /** @type {boolean} */
    this.isDraggingNodeInCollision = false;
    /** @type {number | null} */
    this.panningPointerId = null;
    /** @type {number | null} */
    this.draggingNodePointerId = null;
    /** @type {number | null} */
    this.draggingWirePointerId = null;
    /** @type {NoFloRadialMenu | null} */
    this.radialMenu = null;
    /** @type {number | null} */
    this.longPressTimer = null;
    /** @type {boolean} */
    this.selectionChangedOnDown = false;
    /** @type {HTMLElement | null} */
    this.pendingDragPort = null;

    // Elements
    /** @type {HTMLElement | null} */
    this.viewport = null;
    /** @type {HTMLElement | null} */
    this.transformLayer = null;
    /** @type {HTMLCanvasElement | null} */
    this.heatmapCanvas = null;
    /** @type {SVGElement | null} */
    this.gridLayer = null;
    /** @type {SVGElement | null} */
    this.iipWiresGroup = null;
    /** @type {SVGElement | null} */
    this.svgLayer = null;
    /** @type {SVGElement | null} */
    this.edgesGroup = null;
    /** @type {HTMLElement | null} */
    this.nodeLayer = null;

    // Data
    /** @type {Edge[]} */
    this.edges = [];
    /** @type {IIPWire[]} */
    this.iipWires = [];
    /** @type {SVGPathElement | null} */
    this.activeWire = null;
    /** @type {HTMLElement | null} */
    this.dragPort = null;
    /** @type {Position | null} */
    this.ghostPos = null;
    /** @type {MutationObserver | null} */
    this._bodyObserver = null;
  }

  connectedCallback() {
    this._syncWithBody();
    this.render();
    this.setupInteractions();

    const pills = this.shadowRoot.querySelector("noflo-selection-pills");
    if (pills) {
      pills.selectionManager = this.selectionManager;
      pills.addEventListener("clear-selection", (e) => {
        this.selectionManager.clearType(e.detail.type);
      });
    }

    this.selectionManager.addEventListener("selection-changed", (e) => {
      this._applySelection(e.detail);
    });

    this.radialMenu = /** @type {NoFloRadialMenu} */ (
      document.createElement("noflo-radial-menu")
    );
    if (this.radialMenu) {
      /** @type {ShadowRoot} */ (this.shadowRoot).appendChild(this.radialMenu);
    }

    // Observe changes on body
    this._bodyObserver = new MutationObserver(() => this._syncWithBody());
    this._bodyObserver.observe(document.body, { attributes: true });

    window.addEventListener("resize", this._resizeHandler);
  }

  disconnectedCallback() {
    if (this._bodyObserver) {
      this._bodyObserver.disconnect();
    }
    if (this.heatmapInterval) {
      clearInterval(this.heatmapInterval);
    }
    window.removeEventListener("resize", this._resizeHandler);
  }

  /**
   * @private
   */
  _resizeHandler = () => {
    if (!this.viewport) return;

    // 1. Calculate current graph center
    const rect = this.viewport.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const graphCenter = this.viewportToGraph(centerX, centerY);

    // 2. Update offset to keep graph center at new viewport center
    // New viewport dimensions
    const newWidth = rect.width;
    const newHeight = rect.height;

    // We want: (newWidth / 2 - newOffset.x) / zoom = graphCenter.x
    // newOffset.x = newWidth / 2 - graphCenter.x * zoom
    this.offset.x = newWidth / 2 - graphCenter.x * this.zoom;
    this.offset.y = newHeight / 2 - graphCenter.y * this.zoom;

    this.updateTransform();
  };

  _syncWithBody() {
    const theme = document.body.getAttribute("data-theme") || "cyberpunk";
    const age = document.body.getAttribute("data-age") || "abstract";

    if (this.getAttribute("data-theme") !== theme) {
      this.setAttribute("data-theme", theme);
    }

    // Handle age class
    const ageClass = `state-${age}`;

    // Always remove existing state-xxx classes first
    const stateClasses = Array.from(this.classList).filter((cls) =>
      cls.startsWith("state-"),
    );
    stateClasses.forEach((cls) => {
      this.classList.remove(cls);
    });

    this.classList.add(ageClass);
  }

  /**
   * @param {{nodes: string[], iips: string[], edges: string[]}} selection
   * @private
   */
  _applySelection({ nodes, iips, edges }) {
    // 1. Update nodes and exported ports
    const allNodes = /** @type {NodeListOf<HTMLElement>} */ (
      this.nodeLayer?.querySelectorAll("noflo-node, noflo-exported-port") || []
    );
    allNodes.forEach((node) => {
      const name = node.getAttribute("name");
      if (nodes.includes(name)) {
        node.setAttribute("selected", "");
      } else {
        node.removeAttribute("selected");
      }
    });

    // 2. Update iips
    const allIips = /** @type {NodeListOf<HTMLElement>} */ (
      this.nodeLayer?.querySelectorAll("noflo-iip") || []
    );
    allIips.forEach((iip) => {
      const name = iip.getAttribute("name");
      if (iips.includes(name)) {
        iip.setAttribute("selected", "");
      } else {
        iip.removeAttribute("selected");
      }
    });

    // 3. Update edges
    this.edges.forEach((edge) => {
      const edgeId = this.getEdgeId(edge);
      if (edges.includes(edgeId)) {
        edge.visualPath.setAttribute("selected", "");
      } else {
        edge.visualPath.removeAttribute("selected");
      }
    });
  }

  render() {
    /** @type {ShadowRoot} */ (this.shadowRoot).innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          --zoom-scale: 1.0;
          background-color: var(--ui-bg);
        }

        #viewport {
          width: 100%;
          height: 100%;
          position: relative;
          cursor: grab;
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
        }
        #viewport:active {
          cursor: grabbing;
        }
        #transform-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transform-origin: 0 0;
          pointer-events: auto;
        }
        #svg-layer, #iip-wire-layer, #grid-layer, #heatmap-canvas {
          position: absolute;
          top: -8000px;
          left: -8000px;
          width: 16000px;
          height: 16000px;
          pointer-events: none;
        }
        noflo-selection-pills {
          z-index: 4;
        }
        #svg-layer {
          z-index: 3;
          overflow: visible;
        }
        #iip-wire-layer {
          z-index: 2;
          overflow: visible;
        }
        #grid-layer {
          z-index: 1;
        }
        #node-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 4;
          pointer-events: auto;
        }
        #heatmap-canvas {
          z-index: 0;
          image-rendering: pixelated;
        }
        .grid-pattern {
          fill: url(#grid);
        }
        @keyframes ghost-appear {
          from {
            transform: scale(0.5);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes ghost-pulse {
          0%, 100% {
            box-shadow: 0 0 5px var(--ui-accent);
            border-color: var(--ui-accent);
          }
          50% {
            box-shadow: 0 0 15px var(--ui-accent);
            border-color: var(--ui-accent);
            filter: brightness(1.2);
          }
        }
        .ghost-node {
          position: absolute;
          width: var(--ghost-size, 80px);
          height: var(--ghost-size, 80px);
          border-radius: var(--ghost-radius, 50%);
          border: 2px dashed var(--ui-accent);
          background-color: rgba(var(--ui-accent), 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: var(--ui-accent);
          pointer-events: none;
          z-index: 3;
          box-sizing: border-box;
          animation: ghost-appear 0.2s ease-out, ghost-pulse 2s infinite ease-in-out;
          box-shadow: 0 0 5px var(--ui-accent);
        }
        .edge-flow {
          fill: none;
          stroke: var(--flow-color, var(--edge-color));
          stroke-width: calc(var(--edge-width, 4px) - 2px);
          stroke-dasharray: var(--flow-dash);
          pointer-events: none;
        }
        .edge-hit-area {
          stroke: transparent;
          stroke-width: var(--edge-hit-width, 40px);
          fill: none;
          pointer-events: auto;
        }
      </style>
      <div id="viewport">
        <noflo-selection-pills></noflo-selection-pills>
        <div id="transform-layer">
          <canvas id="heatmap-canvas"></canvas>
          <svg id="grid-layer">
            <defs>
              <pattern id="dot-grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <circle cx="40" cy="40" r="1.5" fill="var(--dot-color)" />
                <circle cx="0" cy="0" r="1" fill="var(--dot-color)" />
                <circle cx="40" cy="0" r="1" fill="var(--dot-color)" />
                <circle cx="0" cy="40" r="1" fill="var(--dot-color)" />
                <circle cx="40" cy="40" r="1" fill="var(--dot-color)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dot-grid)" />
          </svg>
          <svg id="iip-wire-layer">
            <g id="iip-wires-group" transform="translate(8000, 8000)"></g>
          </svg>
          <div id="node-layer"></div>
          <svg id="svg-layer">
            <g id="edges-group" transform="translate(8000, 8000)"></g>
          </svg>
        </div>
      </div>
    `;
    this.viewport = /** @type {ShadowRoot} */ (this.shadowRoot).querySelector(
      "#viewport",
    );
    this.transformLayer = /** @type {ShadowRoot} */ (
      this.shadowRoot
    ).querySelector("#transform-layer");
    this.heatmapCanvas = /** @type {any} */ (
      /** @type {ShadowRoot} */ (this.shadowRoot).querySelector(
        "#heatmap-canvas",
      )
    );
    this.gridLayer = /** @type {any} */ (
      /** @type {ShadowRoot} */ (this.shadowRoot).querySelector("#grid-layer")
    );
    this.iipWiresGroup = /** @type {any} */ (
      /** @type {ShadowRoot} */ (this.shadowRoot).querySelector(
        "#iip-wires-group",
      )
    );
    this.svgLayer = /** @type {any} */ (
      /** @type {ShadowRoot} */ (this.shadowRoot).querySelector("#svg-layer")
    );
    this.edgesGroup = /** @type {any} */ (
      /** @type {ShadowRoot} */ (this.shadowRoot).querySelector("#edges-group")
    );
    this.nodeLayer = /** @type {ShadowRoot} */ (this.shadowRoot).querySelector(
      "#node-layer",
    );

    if (this.heatmapCanvas) {
      this.heatmapCanvas.width = 800;
      this.heatmapCanvas.height = 800;
    }

    this.startHeatmapLoop();
    this.updateTransform();
  }

  startHeatmapLoop() {
    const gridSize = 40;
    const canvas = this.heatmapCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    this.heatmapInterval = setInterval(() => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const heatmapColor = getComputedStyle(this)
        .getPropertyValue("--heatmap-color")
        .trim();

      for (const [key, heat] of this.activityMap.entries()) {
        if (heat <= 0.05) {
          this.activityMap.delete(key);
          continue;
        }

        const [col, row] = key.split(",").map(Number);

        const color = heatmapColor.startsWith("rgba")
          ? heatmapColor.replace(/[\d.]+\)$/, `${heat * 0.6})`)
          : heatmapColor.replace(/\)$/, `, ${heat * 0.6})`);

        ctx.fillStyle = color;
        ctx.fillRect(
          (col * gridSize + 8000) / 20,
          (row * gridSize + 8000) / 20,
          2,
          2,
        );

        this.activityMap.set(key, heat - 0.1);
      }
    }, 500);
  }

  /**
   * @param {number} worldX
   * @param {number} worldY
   */
  recordActivity(worldX, worldY) {
    const gridSize = 40;
    const col = Math.floor(worldX / gridSize);
    const row = Math.floor(worldY / gridSize);
    const key = `${col},${row}`;

    const currentHeat = this.activityMap.get(key) || 0;
    this.activityMap.set(key, Math.min(currentHeat + 0.25, 1.0));
  }

  updateTransform() {
    if (this.transformLayer) {
      this.transformLayer.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.zoom})`;
    }
    this.style.setProperty("--zoom-scale", this.zoom.toString());
    this.spaceManager.updateViewport(this.zoom, this.offset);
  }

  _animationLoop() {
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(() =>
        this._animationLoop(),
      );
      return;
    }

    const springStiffness = 0.15;
    const springDamping = 0.8;

    let active = false;

    this.draggingNodesTargetPositions.forEach((targetPos, node) => {
      const currentPos = node.position;
      const velocity = this.nodeVelocities.get(node) || { x: 0, y: 0 };

      const ax = (targetPos.x - currentPos.x) * springStiffness;
      const ay = (targetPos.y - currentPos.y) * springStiffness;

      velocity.x = (velocity.x + ax) * springDamping;
      velocity.y = (velocity.y + ay) * springDamping;

      const nextX = currentPos.x + velocity.x;
      const nextY = currentPos.y + velocity.y;

      if (
        Math.abs(nextX - currentPos.x) > 0.01 ||
        Math.abs(nextY - currentPos.y) > 0.01
      ) {
        node.position = { x: nextX, y: nextY };
        this.spaceManager.updateNode(
          node.getAttribute("name") || "",
          node.position,
        );
        this.nodeVelocities.set(node, velocity);
        active = true;
      } else {
        node.position = { x: targetPos.x, y: targetPos.y };
        this.nodeVelocities.set(node, { x: 0, y: 0 });
      }
    });

    if (active) {
      this.updateEdges();
      this.updateIIPWires();
      this.animationFrameId = requestAnimationFrame(() =>
        this._animationLoop(),
      );
    } else {
      if (this.isDraggingNodeInCollision) {
        this.isDraggingNodeInCollision = false;
      }
      this.animationFrameId = null;
    }
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @returns {Position}
   */
  clientToGraph(clientX, clientY) {
    return this.spaceManager.clientToGraph(
      clientX,
      clientY,
      this.getBoundingClientRect(),
    );
  }

  /**
   * @param {number} viewportX
   * @param {number} viewportY
   * @returns {Position}
   */
  viewportToGraph(viewportX, viewportY) {
    return this.spaceManager.viewportToGraph(viewportX, viewportY);
  }

  /**
   * @param {number} graphX
   * @param {number} graphY
   * @returns {Position}
   */
  graphToViewport(graphX, graphY) {
    return this.spaceManager.graphToViewport(graphX, graphY);
  }

  /**
   * @param {number} graphX
   * @param {number} graphY
   * @returns {Position}
   */
  graphToClient(graphX, graphY) {
    return this.spaceManager.graphToClient(
      graphX,
      graphY,
      this.getBoundingClientRect(),
    );
  }

  fitNodesToViewport() {
    this.spaceManager.fitElements(this.getBoundingClientRect());
    this.updateTransform();
  }

  /**
   * @param {NoFloNode | NoFloIIP} node
   * @returns {string}
   */
  getNodeName(node) {
    return node.getAttribute("name") || "IIP";
  }

  /**
   * @param {Edge} edge
   * @returns {string}
   */
  /**
   * @param {Edge} edge
   * @returns {string}
   */
  getEdgeId(edge) {
    const portA = edge.portA;
    const portB = edge.portB;

    /** @param {HTMLElement} port */
    const findNode = (port) => {
      const p = /** @type {HTMLElement} */ (port);
      const root = p.getRootNode();
      const host = root instanceof ShadowRoot ? root.host : null;
      return host || p.closest("noflo-node") || p.closest("noflo-iip");
    };

    const nodeA = findNode(portA);
    const nodeB = findNode(portB);

    const nameA = nodeA ? nodeA.getAttribute("name") : "unknown";
    const nameB = nodeB ? nodeB.getAttribute("name") : "unknown";
    const portAName = portA.dataset.portName;
    const portBName = portB.dataset.portName;
    const portAIdx = portA.dataset.portIndex || "0";
    const portBIdx = portB.dataset.portIndex || "0";

    return `${nameA}:${portAName}[${portAIdx}]->${nameB}:${portBName}[${portBIdx}]`;
  }

  setupInteractions() {
    this.addEventListener("pointerdown", (e) => {
      this.activePointers.set(e.pointerId, e);

      if (this.activePointers.size === 2) {
        this.startPinchZoom(e);
        return;
      }

      const path = e.composedPath();
      const clickedPort = path.find((el) => {
        const element = /** @type {Element} */ (el);
        return element.classList?.contains("port");
      });
      const clickedNode = path.find((el) => {
        const element = /** @type {Element} */ (el);
        return (
          element.tagName === "NOFLO-NODE" ||
          element.tagName === "NOFLO-IIP" ||
          element.tagName === "NOFLO-EXPORTED-PORT"
        );
      });
      const clickedEdge = path.find((el) => {
        const element = /** @type {Element} */ (el);
        return (
          element.classList?.contains("edge-flow") ||
          element.classList?.contains("edge-hit-area")
        );
      });

      const isModifier = e.ctrlKey || e.shiftKey;
      const isTouch = e.pointerType === "touch";
      const isMultiple = isModifier || (isTouch && this.selectMode);

      if (e.button === 0) {
        if (clickedPort) {
          e.stopPropagation();

          const port = /** @type {HTMLElement} */ (clickedPort);
          const host = port.getRootNode().host;
          if (host && host.tagName === "NOFLO-EXPORTED-PORT") {
            this.handleNodeSelection(e, /** @type {any} */ (host), isMultiple);
            return;
          }

          if (port.dataset.portType === "array") {
            const hasConnection = this.edges?.some(
              (edge) => edge.portA === port || edge.portB === port,
            );
            if (hasConnection) {
              return;
            }
          }

          this.pendingDragPort = port;
          if (this.viewport) {
            this.viewport.setPointerCapture(e.pointerId);
          }
          this.longPressTimer = setTimeout(() => {
            this.pendingDragPort = null;
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.showContextMenu(x, y, {
              clickedPort: /** @type {HTMLElement} */ (port),
            });
          }, 500);
        } else if (clickedNode) {
          e.stopPropagation();
          this.handleNodeSelection(
            e,
            /** @type {NoFloNode | NoFloIIP} */ (clickedNode),
            isMultiple,
          );
        } else if (clickedEdge) {
          e.stopPropagation();
          this.handleEdgeSelection(
            e,
            /** @type {Element} */ (clickedEdge),
            isMultiple,
          );
        } else {
          this.startCanvasPan(e);
          if (!isModifier && !this.selectMode) {
            this.clearSelection();
          }
        }
      }
    });

    window.addEventListener("pointermove", (e) => {
      this.activePointers.set(e.pointerId, e);

      if (this.activePointers.size === 2) {
        this.handlePinchZoom(e);
      } else {
        const dx = e.clientX - this.lastPointerPos.x;
        const dy = e.clientY - this.lastPointerPos.y;

        if (this.isPanning && !this.radialMenu?.isOpen) {
          if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
          }
          this.offset.x += dx;
          this.offset.y += dy;
          this.updateTransform();
          this.panDistance += Math.hypot(dx, dy);
          if (this.viewport) {
            this.viewport.style.cursor = "grabbing";
          }
        } else if (this.pendingDragPort) {
          if (Math.hypot(dx, dy) > 3) {
            if (this.longPressTimer) {
              clearTimeout(this.longPressTimer);
              this.longPressTimer = null;
            }
            this.startWireDrag(e, this.pendingDragPort);
            this.pendingDragPort = null;
          }
        } else if (
          this.draggingNodePointerId === e.pointerId &&
          (this.selectionManager.nodes.size > 0 ||
            this.selectionManager.iips.size > 0) &&
          !this.radialMenu?.isOpen
        ) {
          if (Math.hypot(dx, dy) > 3) {
            if (!this.isDraggingNode) {
              this.isDraggingNode = true;
              if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
              }
              if (this.animationFrameId === null) {
                this._animationLoop();
              }
            }
          }

          if (this.isDraggingNode) {
            /** @type {Array<{node: NoFloNode | NoFloIIP, x: number, y: number}>} */
            const idealMoves = [];
            this.draggingNodesInitialPositions.forEach((initialPos, node) => {
              if (initialPos && this.draggingStartPointerPos) {
                const idealX =
                  initialPos.x +
                  (e.clientX - this.draggingStartPointerPos.x) / this.zoom;
                const idealY =
                  initialPos.y +
                  (e.clientY - this.draggingStartPointerPos.y) / this.zoom;
                idealMoves.push({ node, x: idealX, y: idealY });
              }
            });

            let collision = false;
            for (const move of idealMoves) {
              const size = move.node.size || 80;
              const otherNodes = /** @type {ShadowRoot} */ (
                this.shadowRoot
              ).querySelectorAll("noflo-node, noflo-iip");
              for (const other of otherNodes) {
                const o = /** @type {NoFloNode | NoFloIIP} */ (other);
                if (
                  this.selectionManager.nodes.has(o.getAttribute("name")) ||
                  this.selectionManager.iips.has(o.getAttribute("name"))
                ) {
                  continue;
                }
                const otherPos = o.position;
                const otherSize = o.size || 80;
                if (
                  move.x < otherPos.x + otherSize &&
                  move.x + size > otherPos.x &&
                  move.y < otherPos.y + otherSize &&
                  move.y + size > otherPos.y
                ) {
                  collision = true;
                  break;
                }
              }
              if (collision) break;
            }

            if (!collision) {
              idealMoves.forEach(({ node, x, y }) => {
                this.draggingNodesTargetPositions.set(node, { x, y });
              });

              if (this.isDraggingNodeInCollision) {
                // We were in collision, and now we are not!
                // We want to animate to the new position.
                // So we DO NOT update node.position directly.
                // We ensure animation loop is running
                if (this.animationFrameId === null) {
                  this._animationLoop();
                }
              } else {
                // Normal drag, no collision.
                // We want no animation, so update node.position directly.
                idealMoves.forEach(({ node, x, y }) => {
                  node.position = { x, y };
                  this.nodeVelocities.set(node, { x: 0, y: 0 });
                });
              }
              this.updateEdges();
              this.updateIIPWires();
            } else {
              this.isDraggingNodeInCollision = true;
              if (this.viewport) {
                this.viewport.style.cursor = "no-drop";
              }
            }
          }
        } else if (this.isDraggingWire && !this.radialMenu?.isOpen) {
          if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
          }
          this.updateWireDrag(e);
        } else if (
          !this.isPanning &&
          !this.isDraggingNode &&
          !this.isDraggingWire
        ) {
          if (this.viewport) {
            this.viewport.style.cursor = "grab";
          }
        }
      }

      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("pointerup", (e) => {
      this.activePointers.delete(e.pointerId);

      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      this.pendingDragPort = null;

      if (this.activePointers.size < 2) {
        this.initialPinchDistance = 0;
      }

      if (e.pointerId === this.panningPointerId) {
        if (this.isPanning && this.panDistance < 5 && !this.didPinch) {
          if (!this.selectMode) {
            this.clearSelection();
          }
        }
        this.isPanning = false;
        this.panDistance = 0;
        this.panningPointerId = null;
      }

      if (e.pointerId === this.draggingNodePointerId) {
        const clickedNode = this.clickedNode;
        const isMultiple = e.ctrlKey || e.shiftKey || this.selectMode;

        if (!this.isDraggingNode) {
          this.commitNodeSelection(clickedNode, isMultiple);
        }

        if (this.isDraggingNode) {
          /** @type {Array<{name: string, position: Position}>} */
          const movedNodes = [];
          this.draggingNodesInitialPositions.forEach((initialPos, node) => {
            node.position = this.snapToGrid(node.position.x, node.position.y);
            this.spaceManager.updateNode(
              node.getAttribute("name") || "",
              node.position,
            );
            const type = node.tagName.toLowerCase();
            const name = this.getNodeName(node);
            let direction = null;
            let portName = null;
            if (type === "noflo-exported-port") {
              direction = node.direction;
              portName = node.dataset.portName;
            }
            movedNodes.push({
              name,
              position: node.position,
              type,
              direction,
              portName,
            });
          });
          this.updateEdges();
          this.dispatchEvent(
            new CustomEvent("nodes-moved", {
              detail: { nodes: movedNodes },
              bubbles: true,
              composed: true,
            }),
          );
        }
        this.isDraggingNode = false;
        this.draggingNodePointerId = null;
        this.clickedNode = null;
        this.selectionChangedOnDown = false;

        // Cleanup drag state
        this.draggingStartPointerPos = null;
        this.draggingNodesInitialPositions.clear();
        this.draggingNodesTargetPositions.clear();
        this.nodeVelocities.clear();
        this.isDraggingNodeInCollision = false;
      }
      if (e.pointerId === this.draggingWirePointerId) {
        this.isDraggingWire = false;
        this.draggingWirePointerId = null;
        this._clearPortHighlights();
        if (this.activeWire) {
          this.completeWireDrag(e);
        }
      }

      if (this.activePointers.size === 0) {
        this.didPinch = false;
        this.lastPinchCenter = null;
        this.lastPinchDistance = 0;
      }

      if (
        this.selectionManager.nodes.size === 0 &&
        this.selectionManager.edges.size === 0 &&
        this.selectionManager.iips.size === 0
      ) {
        this.selectMode = false;
      }
    });

    this.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const zoomSpeed = 0.001;
        const delta = -e.deltaY;
        const oldZoom = this.zoom;
        this.zoom *= 1 + delta * zoomSpeed;
        this.zoom = Math.max(0.1, Math.min(5, this.zoom));

        const rect = this.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        this.offset.x -= (mouseX - this.offset.x) * (this.zoom / oldZoom - 1);
        this.offset.y -= (mouseY - this.offset.y) * (this.zoom / oldZoom - 1);

        this.updateTransform();
      },
      { passive: false },
    );

    if (this.viewport) {
      this.viewport.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.handleContextMenu(e);
      });
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (
          this.selectionManager.nodes.size > 0 ||
          this.selectionManager.iips.size > 0
        ) {
          const nodesToRemove = [];
          const allNodes = /** @type {NodeListOf<HTMLElement>} */ (
            this.nodeLayer?.querySelectorAll(
              "noflo-node, noflo-iip, noflo-exported-port",
            ) || []
          );
          allNodes.forEach((n) => {
            if (
              this.selectionManager.nodes.has(n.getAttribute("name")) ||
              this.selectionManager.iips.has(n.getAttribute("name"))
            ) {
              nodesToRemove.push(n);
            }
          });
          if (nodesToRemove.length > 0) {
            this.dispatchEvent(
              new CustomEvent("node-removal-attempt", {
                detail: { nodes: nodesToRemove },
                bubbles: true,
                composed: true,
              }),
            );
          }
        } else if (this.selectionManager.edges.size > 0) {
          this.selectionManager.edges.forEach((edgeId) => {
            const edge = this.edges.find((e) => this.getEdgeId(e) === edgeId);
            if (edge) {
              this.dispatchEvent(
                new CustomEvent("edge-removal-attempt", {
                  detail: { edge },
                  bubbles: true,
                  composed: true,
                }),
              );
            }
          });
        }
      }
    });
  }

  /**
   * @param {PointerEvent} e
   */
  handleContextMenu(e) {
    const path = e.composedPath();
    const clickedPort = /** @type {Element | undefined} */ (
      path.find((/** @type {EventTarget} */ el) => {
        const element = /** @type {Element} */ (el);
        return element.classList?.contains("port");
      })
    );
    const clickedNode = /** @type {Element | undefined} */ (
      path.find((/** @type {EventTarget} */ el) => {
        const element = /** @type {Element} */ (el);
        return (
          element.tagName === "NOFLO-NODE" ||
          element.tagName === "NOFLO-IIP" ||
          element.tagName === "NOFLO-EXPORTED-PORT"
        );
      })
    );
    const clickedEdge = /** @type {Element | undefined} */ (
      path.find((/** @type {EventTarget} */ el) => {
        const element = /** @type {Element} */ (el);
        return (
          element.classList?.contains("edge-flow") ||
          element.classList?.contains("edge-hit-area")
        );
      })
    );

    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.showContextMenu(x, y, {
      clickedPort,
      clickedNode,
      clickedEdge,
    });
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {{clickedPort?: Element, clickedNode?: Element, clickedEdge?: Element}} context
   */
  showContextMenu(x, y, context) {
    const { clickedPort, clickedNode, clickedEdge } = context;
    const items = [];

    if (clickedPort) {
      const port = /** @type {HTMLElement} */ (clickedPort);
      const isInPort = port.classList.contains("port-in");
      const isOutPort = port.classList.contains("port-out");
      const isArrayPort = port.dataset.portType === "array";

      const hasEdge = this.edges?.some(
        (e) => e.portA === port || e.portB === port,
      );
      const hasIIP = this.iipWires?.some((w) => w.port === port);
      const hasConnection = hasEdge || hasIIP;

      if (isInPort) {
        const canAddIIP = !isArrayPort || !hasConnection;
        if (canAddIIP) {
          items.push({
            text: "Add IIP",
            onClick: () => {
              const pos = this.getPortPosition(port);
              let searchX = pos.x - 40;
              const searchY = pos.y;

              // Search for first empty space to the left
              while (searchX > -8000 && !this.hasSpace(searchX, searchY, 40)) {
                searchX -= 40;
              }

              this.addIIP(searchX, searchY, port);
            },
            icon: "circle-plus",
          });
        }
      }

      const canExport =
        (isInPort || isOutPort) && (!isArrayPort || !hasConnection);
      if (canExport) {
        items.push({
          text: "Export",
          onClick: () => {
            this.exportPort(port);
          },
          icon: "share-from-square",
        });
      }

      if (hasConnection) {
        items.push({
          text: "Disconnect all",
          onClick: () => {
            this.disconnectPort(port);
          },
          icon: "link-slash",
        });
      }
    } else if (clickedNode) {
      if (clickedNode.tagName === "NOFLO-EXPORTED-PORT") {
        const ep = /** @type {FlowExportedPort} */ (clickedNode);
        const name = ep.getAttribute("name");

        items.push({
          text: "Rename",
          onClick: () => {
            const newName = window.prompt("Enter new name:", name);
            if (newName && newName !== name) {
              const direction = ep.direction;
              const position = ep.position;
              this.dispatchEvent(
                new CustomEvent("port-renamed", {
                  detail: { oldName: name, newName, direction, position },
                  bubbles: true,
                  composed: true,
                }),
              );
              ep.setAttribute("name", newName);
              ep.dataset.portName = newName;
            }
          },
          icon: "pen-to-square",
        });

        items.push({
          text: "Remove",
          onClick: () => {
            this.removeExportedPort(ep);
          },
          icon: "trash",
        });
      } else {
        const isIIP = clickedNode.tagName === "NOFLO-IIP";
        items.push({
          text: isIIP ? "Edit" : "Open",
          onClick: () => {
            if (isIIP) {
              this.dispatchEvent(
                new CustomEvent("iip-edit-attempt", {
                  detail: { iip: clickedNode },
                  bubbles: true,
                  composed: true,
                }),
              );
            } else {
              this.dispatchEvent(
                new CustomEvent("navigate-down-attempt", {
                  detail: {
                    node: this.getNodeName(
                      /** @type {NoFloNode | NoFloIIP} */ (clickedNode),
                    ),
                  },
                  bubbles: true,
                  composed: true,
                }),
              );
            }
          },
          icon: isIIP ? "pen-to-square" : "folder-open",
        });

        if (isIIP) {
          items.push({
            text: "Delete",
            onClick: () => {
              this.dispatchEvent(
                new CustomEvent("iip-removal-attempt", {
                  detail: { iip: clickedNode },
                  bubbles: true,
                  composed: true,
                }),
              );
            },
            icon: "trash",
          });
          items.push({
            text: "Send now",
            onClick: () => {
              this.dispatchEvent(
                new CustomEvent("iip-send-attempt", {
                  detail: { iip: clickedNode },
                  bubbles: true,
                  composed: true,
                }),
              );
            },
            icon: "paper-plane",
          });
        } else {
          items.push({
            text: "Edit Component",
            onClick: () => {
              this.dispatchEvent(
                new CustomEvent("edit-component-attempt", {
                  detail: { node: clickedNode },
                  bubbles: true,
                  composed: true,
                }),
              );
            },
            icon: "pen-to-square",
          });
          items.push({
            text: "Remove",
            onClick: () => {
              this.dispatchEvent(
                new CustomEvent("node-removal-attempt", {
                  detail: { nodes: [clickedNode] },
                  bubbles: true,
                  composed: true,
                }),
              );
            },
            icon: "trash",
          });
          items.push({
            text: "Make subgraph",
            onClick: () => {
              this.dispatchEvent(
                new CustomEvent("create-subgraph-attempt", {
                  detail: { nodes: [clickedNode] },
                  bubbles: true,
                  composed: true,
                }),
              );
            },
            icon: "folder-plus",
          });
          items.push({
            text: "Move up",
            onClick: () => {
              this.dispatchEvent(
                new CustomEvent("move-nodes-up-attempt", {
                  detail: { nodes: [clickedNode] },
                  bubbles: true,
                  composed: true,
                }),
              );
            },
            icon: "arrow-up-from-bracket",
          });
        }
      }
    } else if (clickedEdge) {
      // ...
      const edge = this.edges.find(
        (edge) =>
          /** @type {Element} */ (edge.hitPath) ===
            /** @type {Element} */ (clickedEdge) ||
          /** @type {Element} */ (edge.visualPath) ===
            /** @type {Element} */ (clickedEdge),
      );
      if (edge) {
        this.dispatchEvent(
          new CustomEvent("edge-menu-open", {
            detail: { edge: this.getEdgeId(edge), x, y },
            bubbles: true,
            composed: true,
          }),
        );
        items.push({
          text: "Remove",
          onClick: () => {
            this.dispatchEvent(
              new CustomEvent("edge-removal-attempt", {
                detail: { edge },
                bubbles: true,
                composed: true,
              }),
            );
          },
          icon: "trash",
        });
      }
    } else {
      const graphPos = this.viewportToGraph(x, y);
      this.dispatchEvent(
        new CustomEvent("canvas-menu-open", {
          detail: { x, y, type: "canvas" },
          bubbles: true,
          composed: true,
        }),
      );
      if (this.hasSpace(graphPos.x, graphPos.y, 80)) {
        items.push({
          text: "Add Node",
          onClick: () => {
            this.addNode(
              `Node_${Date.now().toString().slice(-4)}`,
              graphPos.x - 40,
              graphPos.y - 40,
            );
          },
          icon: "plus",
        });
      }
      items.push({
        text: "Close",
        onClick: () => {
          this.dispatchEvent(
            new CustomEvent("navigate-up-attempt", {
              bubbles: true,
              composed: true,
            }),
          );
        },
        icon: "xmark",
      });
    }

    const centerContent = clickedNode
      ? clickedNode.tagName === "NOFLO-IIP"
        ? (clickedNode.shadowRoot?.querySelector(".iip-value")?.textContent ??
          null)
        : (clickedNode.shadowRoot?.querySelector(".node-content")?.innerHTML ??
          null)
      : null;

    this.radialMenu?.open(x, y, items, centerContent);
  }

  /**
   * @param {PointerEvent} e
   */
  startCanvasPan(e) {
    if (this.viewport) {
      this.viewport.setPointerCapture(e.pointerId);
    }
    this.isPanning = true;
    this.panningPointerId = e.pointerId;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
  }

  /**
   * @param {PointerEvent} _e
   */
  startPinchZoom(_e) {
    this.didPinch = true;
    const pointers = Array.from(this.activePointers.values());
    const p1 = pointers[0];
    const p2 = pointers[1];

    this.lastPinchDistance = this.getDistance(p1, p2);
    this.lastPinchCenter = {
      x: (p1.clientX + p2.clientX) / 2,
      y: (p1.clientY + p2.clientY) / 2,
    };
  }

  /**
   * @param {PointerEvent} _e
   */
  handlePinchZoom(_e) {
    const pointers = Array.from(this.activePointers.values());
    const p1 = pointers[0];
    const p2 = pointers[1];

    const currentDistance = this.getDistance(p1, p2);
    const currentCenter = {
      x: (p1.clientX + p2.clientX) / 2,
      y: (p1.clientY + p2.clientY) / 2,
    };

    if (this.lastPinchDistance === 0) {
      this.lastPinchDistance = currentDistance;
      this.lastPinchCenter = currentCenter;
      return;
    }

    const prevDistance = this.lastPinchDistance;
    const prevCenter = this.lastPinchCenter;

    if (!prevCenter) return;

    const zoomFactor = currentDistance / prevDistance;
    const newZoom = Math.max(0.1, Math.min(5, this.zoom * zoomFactor));
    const actualZoomFactor = newZoom / this.zoom;

    this.offset.x =
      currentCenter.x - (currentCenter.x - this.offset.x) * actualZoomFactor;
    this.offset.y =
      currentCenter.y - (currentCenter.y - this.offset.y) * actualZoomFactor;

    this.zoom = newZoom;

    const dx = currentCenter.x - prevCenter.x;
    const dy = currentCenter.y - prevCenter.y;
    this.offset.x += dx;
    this.offset.y += dy;

    this.updateTransform();

    this.lastPinchCenter = currentCenter;
    this.lastPinchDistance = currentDistance;
  }

  /**
   * @param {PointerEvent} p1
   * @param {PointerEvent} p2
   */
  getDistance(p1, p2) {
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * @param {PointerEvent} e
   * @param {NoFloNode | NoFloIIP | FlowExportedPort} node
   * @param {boolean} isMultiple
   */
  handleNodeSelection(e, node, isMultiple) {
    const n = /** @type {NoFloNode | NoFloIIP | FlowExportedPort} */ (node);
    this.clickedNode = n;
    const id = n.getAttribute("name");
    const type = n.tagName === "NOFLO-IIP" ? "iips" : "nodes";

    if (isMultiple) {
      if (this.selectMode) {
        this.radialMenu?.close();
      }
      const isAlreadySelected =
        this.selectionManager.nodes.has(id) ||
        this.selectionManager.iips.has(id);
      if (!isAlreadySelected) {
        this.selectionManager.select(type, id, true);
        this.selectionChangedOnDown = true;
      } else {
        this.selectionChangedOnDown = false;
      }
    } else {
      const isOnlyOneSelected =
        this.selectionManager[type].size === 1 &&
        this.selectionManager[type].has(id);
      if (isOnlyOneSelected) {
        this.selectionManager.toggle(type, id);
        this.selectionChangedOnDown = false;
      } else {
        this.selectionManager.select(type, id, false);
        this.selectionChangedOnDown = true;
      }
    }

    n.setPointerCapture(e.pointerId);
    this.draggingNodePointerId = e.pointerId;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };

    // Prepare for potential drag
    this.isDraggingNodeInCollision = false;
    this.draggingStartPointerPos = { x: e.clientX, y: e.clientY };
    this.draggingNodesInitialPositions.clear();
    this.draggingNodesTargetPositions.clear();
    this.nodeVelocities.clear();

    const allNodes = /** @type {NodeListOf<HTMLElement>} */ (
      this.nodeLayer?.querySelectorAll(
        "noflo-node, noflo-iip, noflo-exported-port",
      ) || []
    );
    allNodes.forEach((el) => {
      const name = el.getAttribute("name");
      if (
        this.selectionManager.nodes.has(name) ||
        this.selectionManager.iips.has(name)
      ) {
        this.draggingNodesInitialPositions.set(el, { ...el.position });
        this.draggingNodesTargetPositions.set(el, { ...el.position });
      }
    });

    this.longPressTimer = setTimeout(() => {
      this.selectMode = true;
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.showContextMenu(x, y, { clickedNode: n });
    }, 500);
  }

  /**
   * @param {NoFloNode | NoFloIIP | FlowExportedPort | null} node
   * @param {boolean} isMultiple
   */
  commitNodeSelection(node, isMultiple) {
    if (this.selectionChangedOnDown) return;

    const n = /** @type {NoFloNode | NoFloIIP | FlowExportedPort} */ (node);
    if (!n) return;
    const id = n.getAttribute("name");
    const type = n.tagName === "NOFLO-IIP" ? "iips" : "nodes";

    if (isMultiple) {
      if (this.selectionManager[type].has(id)) {
        this.selectionManager.toggle(type, id);
      }
    } else {
      if (
        this.selectionManager[type].has(id) &&
        this.selectionManager[type].size === 1
      ) {
        this.selectionManager.toggle(type, id);
      }
    }
  }

  /**
   * @param {PointerEvent} _e
   * @param {Element} edgeElement
   * @param {boolean} isMultiple
   */
  handleEdgeSelection(_e, edgeElement, isMultiple) {
    const el = /** @type {Element} */ (edgeElement);
    const edge = this.edges.find(
      (edge) => edge.hitPath === el || edge.visualPath === el,
    );
    if (!edge) return;

    const edgeId = this.getEdgeId(edge);

    if (isMultiple) {
      if (this.selectMode) {
        this.radialMenu?.close();
      }
      this.selectionManager.toggle("edges", edgeId);
    } else {
      if (
        this.selectionManager.edges.has(edgeId) &&
        this.selectionManager.edges.size === 1
      ) {
        this.selectionManager.toggle("edges", edgeId);
      } else {
        this.selectionManager.select("edges", edgeId, false);
      }
    }
  }

  /**
   * @param {PointerEvent} _e
   * @param {HTMLElement} _node
   */
  startNodeDrag(_e, _node) {
    // Deprecated
  }

  clearSelection() {
    this.selectionManager.clear();

    if (
      this.selectionManager.nodes.size === 0 &&
      this.selectionManager.edges.size === 0 &&
      this.selectionManager.iips.size === 0
    ) {
      this.selectMode = false;
    }
  }

  clearNodeSelection() {
    this.selectionManager.clearType("nodes");

    if (
      this.selectionManager.nodes.size === 0 &&
      this.selectionManager.edges.size === 0 &&
      this.selectionManager.iips.size === 0
    ) {
      this.selectMode = false;
    }
  }

  clearEdgeSelection() {
    this.selectionManager.clearType("edges");

    if (
      this.selectionManager.nodes.size === 0 &&
      this.selectionManager.edges.size === 0 &&
      this.selectionManager.iips.size === 0
    ) {
      this.selectMode = false;
    }
  }

  /**
   * @param {PointerEvent} e
   * @param {HTMLElement} port
   */
  startWireDrag(e, port) {
    if (this.viewport) {
      this.viewport.setPointerCapture(e.pointerId);
    }
    this.isDraggingWire = true;
    this.draggingWirePointerId = e.pointerId;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
    this.dragPort = port;

    this.activeWire = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    this.activeWire.setAttribute("stroke", "#666");
    this.activeWire.setAttribute("stroke-width", "2");
    this.activeWire.setAttribute("fill", "none");
    this.activeWire.setAttribute("stroke-dasharray", "5,5");
    if (this.edgesGroup) {
      this.edgesGroup.appendChild(this.activeWire);
    }
  }

  /**
   * @param {PointerEvent} e
   */
  updateWireDrag(e) {
    if (!this.activeWire || !this.dragPort) return;

    const portPos = this.getPortPosition(this.dragPort);
    const { x: mouseX, y: mouseY } = this.clientToGraph(e.clientX, e.clientY);

    this.activeWire.setAttribute(
      "d",
      `M ${portPos.x} ${portPos.y} L ${mouseX} ${mouseY}`,
    );

    this._updatePortHighlights(e.clientX, e.clientY);

    const interest = this.getInterestArea(e.clientX, e.clientY);

    if (interest.type === FlowEditor.INTEREST_AREA_TYPES.PORT) {
      this.removeGhostNode();
      if (this.stillnessTimer) {
        clearTimeout(this.stillnessTimer);
        this.stillnessTimer = null;
      }
    } else {
      const isOutPort = this.dragPort.classList.contains("port-out");
      const size = isOutPort ? 80 : 40;
      const shape = isOutPort ? "circle" : "square";
      const snapped = this.snapToGrid(mouseX - size / 2, mouseY - size / 2);

      if (this.ghostNode && this.ghostPos) {
        const dist = Math.hypot(
          mouseX - this.ghostPos.x,
          mouseY - this.ghostPos.y,
        );
        if (dist > 80) {
          this.removeGhostNode();
        } else {
          this.ghostNode.style.left = `${snapped.x}px`;
          this.ghostNode.style.top = `${snapped.y}px`;
          this.ghostNode.style.setProperty("--ghost-size", `${size}px`);
          this.ghostNode.style.setProperty(
            "--ghost-radius",
            shape === "circle" ? "50%" : "8px",
          );
        }
      } else {
        if (this.stillnessTimer) {
          clearTimeout(this.stillnessTimer);
          this.stillnessTimer = null;
        }
        if (this.hasSpace(mouseX, mouseY, size)) {
          this.stillnessTimer = setTimeout(() => {
            this.showGhostNode(snapped.x, snapped.y, size, shape);
          }, 300);
        }
      }
    }

    const interestArea = this.getInterestArea(e.clientX, e.clientY);
    if (
      interestArea.type === FlowEditor.INTEREST_AREA_TYPES.PORT &&
      interestArea.element
    ) {
      const port = interestArea.element;
      const isDragOut = this.dragPort?.classList.contains("port-out");
      const portIsOut = port.classList.contains("port-out");
      if (isDragOut === portIsOut) {
        if (this.viewport) {
          this.viewport.style.cursor = "no-drop";
        }
      } else {
        if (this.viewport) {
          this.viewport.style.cursor = "grabbing";
        }
      }
    } else {
      if (this.viewport) {
        this.viewport.style.cursor = "grabbing";
      }
    }
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   */
  _updatePortHighlights(clientX, clientY) {
    const shadowRoot = /** @type {ShadowRoot} */ (this.shadowRoot);
    const nodes = shadowRoot.querySelectorAll("noflo-node");
    const exportedPorts = shadowRoot.querySelectorAll("noflo-exported-port");
    const isDragOut = this.dragPort?.classList.contains("port-out");
    const highlightThreshold = 100;

    nodes.forEach((node) => {
      const shadowRoot = node.shadowRoot;
      if (!shadowRoot) return;
      const ports = shadowRoot.querySelectorAll(".port");
      ports.forEach((portElement) => {
        const port = /** @type {HTMLElement} */ (portElement);
        const rect = port.getBoundingClientRect();
        const portCenterX = rect.left + rect.width / 2;
        const portCenterY = rect.top + rect.height / 2;
        const dist = Math.hypot(clientX - portCenterX, clientY - portCenterY);

        if (dist < highlightThreshold) {
          const isPortOut = port.classList.contains("port-out");
          let isCompatible = isDragOut !== isPortOut;

          if (isCompatible && port.dataset.portType === "array") {
            const hasConnection = this.edges?.some(
              (edge) => edge.portA === port || edge.portB === port,
            );
            if (hasConnection) {
              isCompatible = false;
            }
          }

          if (isCompatible) {
            port.classList.add("port-compatible");
            port.classList.remove("port-incompatible");
          } else {
            port.classList.add("port-incompatible");
            port.classList.remove("port-compatible");
          }
        } else {
          port.classList.remove("port-compatible", "port-incompatible");
        }
      });
    });

    exportedPorts.forEach((port) => {
      const portEl = port.shadowRoot?.querySelector(".port");
      if (!portEl) return;
      const rect = portEl.getBoundingClientRect();
      const portCenterX = rect.left + rect.width / 2;
      const portCenterY = rect.top + rect.height / 2;
      const dist = Math.hypot(clientX - portCenterX, clientY - portCenterY);

      if (dist < highlightThreshold) {
        const isPortOut = portEl.classList.contains("port-out");
        let isCompatible = isDragOut !== isPortOut;

        if (isCompatible && portEl.dataset.portType === "array") {
          const hasConnection =
            this.edges?.some(
              (edge) => edge.portA === portEl || edge.portB === portEl,
            ) || this.iipWires?.some((w) => w.port === portEl);
          if (hasConnection) {
            isCompatible = false;
          }
        }

        if (isCompatible) {
          portEl.classList.add("port-compatible");
          portEl.classList.remove("port-incompatible");
        } else {
          portEl.classList.add("port-incompatible");
          portEl.classList.remove("port-compatible");
        }
      } else {
        portEl.classList.remove("port-compatible", "port-incompatible");
      }
    });
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} [size=80]
   * @returns {boolean}
   */
  hasSpace(x, y, size = 80) {
    return this.spaceManager.hasSpace(x, y, size);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} [size=80]
   * @param {string} [shape="circle"]
   */
  showGhostNode(x, y, size = 80, shape = "circle") {
    this.ghostPos = { x, y };
    this.ghostNode = document.createElement("div");
    this.ghostNode.className = "ghost-node";
    this.ghostNode.textContent = "new";
    this.ghostNode.style.setProperty("--ghost-size", `${size}px`);
    this.ghostNode.style.setProperty(
      "--ghost-radius",
      shape === "circle" ? "50%" : "8px",
    );
    this.ghostNode.style.left = `${x}px`;
    this.ghostNode.style.top = `${y}px`;
    if (this.nodeLayer && this.ghostNode) {
      this.nodeLayer.appendChild(this.ghostNode);
    }
  }

  removeGhostNode() {
    if (this.ghostNode && this.nodeLayer) {
      this.nodeLayer.removeChild(this.ghostNode);
      this.ghostNode = null;
      this.ghostPos = null;
    }
  }

  _clearPortHighlights() {
    const shadowRoot = /** @type {ShadowRoot} */ (this.shadowRoot);
    const nodes = shadowRoot.querySelectorAll("noflo-node");
    nodes.forEach((node) => {
      const n = /** @type {NoFloNode | NoFloIIP} */ (node);
      const sr = n.shadowRoot;
      if (!sr) return;
      const ports = sr.querySelectorAll(".port");
      ports.forEach((portElement) => {
        const port = /** @type {HTMLElement} */ (portElement);
        port.classList.remove("port-compatible", "port-incompatible");
      });
    });
  }

  /**
   * @param {PointerEvent} e
   */
  completeWireDrag(e) {
    let clickedPort = null;
    let minDist = Infinity;
    const threshold = 20; // px

    const shadowRoot = /** @type {ShadowRoot} */ (this.shadowRoot);
    const nodes = shadowRoot.querySelectorAll("noflo-node");
    nodes.forEach((node) => {
      const n = /** @type {NoFloNode | NoFloIIP} */ (node);
      const sr = n.shadowRoot;
      if (!sr) return;
      const ports = sr.querySelectorAll(".port");
      ports.forEach((portElement) => {
        const port = /** @type {HTMLElement} */ (portElement);
        const rect = port.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist < threshold) {
          minDist = dist;
          clickedPort = port;
        }
      });
    });

    const exportedPorts = shadowRoot.querySelectorAll("noflo-exported-port");
    exportedPorts.forEach((ep) => {
      const port = ep.shadowRoot?.querySelector(".port");
      if (!port) return;
      const rect = port.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist && dist < threshold) {
        minDist = dist;
        clickedPort = port;
      }
    });

    if (clickedPort && this.dragPort && clickedPort !== this.dragPort) {
      const startPort = this.dragPort;
      const endPort = /** @type {HTMLElement} */ (clickedPort);

      const startIsOut = startPort.classList.contains("port-out");
      const endIsOut = endPort.classList.contains("port-out");

      if (startIsOut && !endIsOut) {
        this.dispatchEvent(
          new CustomEvent("wire-connection-attempt", {
            detail: { portA: startPort, portB: endPort },
            bubbles: true,
            composed: true,
          }),
        );
      } else if (!startIsOut && endIsOut) {
        this.dispatchEvent(
          new CustomEvent("wire-connection-attempt", {
            detail: { portA: endPort, portB: startPort },
            bubbles: true,
            composed: true,
          }),
        );
      } else {
        console.warn(
          "Cannot connect ports of the same type (both in or both out)",
        );
      }
    } else if (this.ghostNode && this.ghostPos) {
      const isOutPort = this.dragPort?.classList.contains("port-out");
      const eventName = isOutPort
        ? "node-creation-attempt"
        : "iip-creation-attempt";

      this.dispatchEvent(
        new CustomEvent(eventName, {
          detail: {
            x: this.ghostPos.x,
            y: this.ghostPos.y,
            startPort: this.dragPort,
          },
          bubbles: true,
          composed: true,
        }),
      );
    }

    this.removeGhostNode();
    if (this.stillnessTimer) {
      clearTimeout(this.stillnessTimer);
      this.stillnessTimer = null;
    }
    if (this.activeWire && this.edgesGroup) {
      this.edgesGroup.removeChild(this.activeWire);
      this.activeWire = null;
    }
  }

  /**
   * @param {NoFloNode} node
   */
  removeNode(node) {
    if (!node) return;

    const name = node.getAttribute("name");

    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
    if (name) {
      this.spaceManager.removeNode(name);
    }

    // Remove associated edges
    if (this.edges) {
      const edgesToRemove = this.edges.filter((edge) => {
        const nodeA =
          edge.portA.closest("noflo-node") || edge.portA.closest("noflo-iip");
        const nodeB =
          edge.portB.closest("noflo-node") || edge.portB.closest("noflo-iip");
        return (
          (nodeA && nodeA.getAttribute("name") === name) ||
          (nodeB && nodeB.getAttribute("name") === name)
        );
      });

      edgesToRemove.forEach((edge) => {
        edge.visualPath?.remove();
        edge.hitPath?.remove();
      });

      this.edges = this.edges.filter((edge) => {
        const nodeA =
          edge.portA.closest("noflo-node") || edge.portA.closest("noflo-iip");
        const nodeB =
          edge.portB.closest("noflo-node") || edge.portB.closest("noflo-iip");
        return !(
          (nodeA && nodeA.getAttribute("name") === name) ||
          (nodeB && nodeB.getAttribute("name") === name)
        );
      });
    }
  }

  /**
   * @param {NoFloIIP} iip
   */
  removeIIP(iip) {
    if (!iip) return;

    if (iip.parentNode) {
      iip.parentNode.removeChild(iip);
    }
    this.spaceManager.removeNode(iip.getAttribute("name") || "");

    // Remove associated wires
    if (this.iipWires && this.iipWiresGroup) {
      const wiresToRemove = this.iipWires.filter((w) => w.iip === iip);
      wiresToRemove.forEach((wire) => {
        if (this.iipWiresGroup && wire.hitPath && wire.visualPath) {
          this.iipWiresGroup.removeChild(wire.hitPath);
          this.iipWiresGroup.removeChild(wire.visualPath);
        }
      });
      this.iipWires = this.iipWires.filter((w) => w.iip !== iip);
    }
  }

  /**
   * @param {HTMLElement} port
   */
  /**
   * @param {HTMLElement} port
   */
  /**
   * @param {HTMLElement} port
   */
  /**
   * @param {HTMLElement} port
   */
  disconnectPort(port) {
    // Remove standard edges
    if (this.edges && this.edgesGroup) {
      const edgesToRemove = this.edges.filter(
        (edge) => edge.portA === port || edge.portB === port,
      );
      edgesToRemove.forEach((edge) => {
        this.edgesGroup?.removeChild(edge.hitPath);
        this.edgesGroup?.removeChild(edge.visualPath);
      });
      this.edges = this.edges.filter(
        (edge) => edge.portA !== port && edge.portB !== port,
      );
    }

    // Remove IIP wires
    if (this.iipWires && this.iipWiresGroup) {
      const wiresToRemove = this.iipWires.filter((wire) => wire.port === port);
      wiresToRemove.forEach((wire) => {
        this.iipWiresGroup?.removeChild(wire.hitPath);
        this.iipWiresGroup?.removeChild(wire.visualPath);
      });
      this.iipWires = this.iipWires.filter((wire) => wire.port !== port);
    }
  }

  /**
   * @param {HTMLElement} port
   */
  getPortPosition(port) {
    const rect = port.getBoundingClientRect();
    const componentRect = this.getBoundingClientRect();
    return this.viewportToGraph(
      rect.left + rect.width / 2 - componentRect.left,
      rect.top + rect.height / 2 - componentRect.top,
    );
  }

  /**
   * @param {HTMLElement} portA
   * @param {HTMLElement} portB
   * @param {string} [routeId]
   */
  addEdge(portA, portB, routeId) {
    if (
      !portA.classList.contains("port-out") ||
      !portB.classList.contains("port-in")
    ) {
      console.error("Invalid connection: expected outport -> inport");
      return;
    }

    if (portA.dataset.portType === "array") {
      const existing = this.edges?.filter((e) => e.portA === portA);
      if (existing && existing.length >= 1) {
        alert(`ArrayPort ${portA.dataset.portName} already has a connection.`);
        return;
      }
    }
    if (portB.dataset.portType === "array") {
      const existing = this.edges?.filter((e) => e.portB === portB);
      if (existing && existing.length >= 1) {
        alert(`ArrayPort ${portB.dataset.portName} already has a connection.`);
        return;
      }
    }

    const hitPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    hitPath.classList.add("edge-hit-area");

    const visualPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    visualPath.classList.add("edge-flow");

    this.updatePathData(hitPath, visualPath, portA, portB);

    if (routeId !== undefined) {
      visualPath.style.setProperty("--flow-color", `var(--route-${routeId})`);
    }

    if (this.edgesGroup) {
      this.edgesGroup.appendChild(hitPath);
      this.edgesGroup.appendChild(visualPath);
    }

    this.edges = this.edges || [];
    const edge = { hitPath, visualPath, portA, portB, routeId };
    this.edges.push(edge);
    return edge;
  }

  /**
   * @param {SVGPathElement} hitPath
   * @param {SVGPathElement} visualPath
   * @param {HTMLElement} portA
   * @param {HTMLElement} portB
   */
  updatePathData(hitPath, visualPath, portA, portB) {
    const posA = this.getPortPosition(portA);
    const posB = this.getPortPosition(portB);

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
   * @param {SVGPathElement} hitPath
   * @param {SVGPathElement} visualPath
   * @param {NoFloIIP | FlowExportedPort} iip
   * @param {HTMLElement} port
   */
  updateIIPPathData(hitPath, visualPath, iip, port) {
    const posA = {
      x: iip.position.x + iip.size / 2,
      y: iip.position.y + iip.size / 2,
    };
    const posB = this.getPortPosition(port);

    const dx = Math.abs(posB.x - posA.x) * 0.5;
    const cp1x = posA.x + (posB.x > posA.x ? dx : -dx);
    const cp1y = posA.y;
    const cp2x = posB.x + (posB.x > posA.x ? -dx : dx);
    const cp2y = posB.y;

    const d = `M ${posA.x} ${posA.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${posB.x} ${posB.y}`;
    hitPath.setAttribute("d", d);
    visualPath.setAttribute("d", d);
  }

  updateEdges() {
    if (!this.edges) return;
    this.edges.forEach((edge) => {
      this.updatePathData(
        edge.hitPath,
        edge.visualPath,
        edge.portA,
        edge.portB,
      );
    });
  }

  updateIIPWires() {
    if (!this.iipWires) return;
    this.iipWires.forEach((wire) => {
      this.updateIIPPathData(
        wire.hitPath,
        wire.visualPath,
        wire.iip,
        wire.port,
      );
    });
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {Position}
   */
  snapToGrid(x, y) {
    return this.spaceManager.snapToGrid(x, y);
  }

  /**
   * @param {NoFloNode | NoFloIIP} nodeA
   * @param {string} portAName
   * @param {NoFloNode | NoFloIIP} nodeB
   * @param {string} portBName
   * @param {string} [routeId]
   */
  connectNodes(nodeA, portAName, nodeB, portBName, routeId) {
    const nA = /** @type {NoFloNode | NoFloIIP} */ (nodeA);
    const nB = /** @type {NoFloNode | NoFloIIP} */ (nodeB);
    const portA = nA.shadowRoot?.querySelector(
      `.port[data-port-name="${portAName}"]`,
    );
    const portB = nB.shadowRoot?.querySelector(
      `.port[data-port-name="${portBName}"]`,
    );

    if (portA && portB) {
      this.addEdge(
        /** @type {HTMLElement} */ (portA),
        /** @type {HTMLElement} */ (portB),
        routeId,
      );
    } else {
      console.warn(`Could not connect ${portAName} to ${portBName}`);
    }
  }

  /**
   * @param {string} name
   * @param {number} x
   * @param {number} y
   * @param {number} [inPorts=1]
   * @param {number} [outPorts=1]
   * @param {number} [size=80]
   */
  /**
   * @param {string} nodeId
   * @param {string} component
   * @param {any} metadata
   * @returns {NoFloNode}
   */
  addNode(nodeId, component, metadata) {
    const x = metadata.x || 0;
    const y = metadata.y || 0;
    const size = metadata.size || 80;
    const snapped = this.snapToGrid(x, y);
    const node = /** @type {NoFloNode} */ (
      document.createElement("noflo-node")
    );
    node.id = nodeId;
    node.component = component;
    node.size = size;
    node.setAttribute("name", nodeId);
    node.position = snapped;

    if (this.libraryManager) {
      node.libraryManager = this.libraryManager;
    }

    if (metadata.name || metadata.componentName || metadata.icon) {
      node.setMetadata(metadata);
    }

    this.spaceManager.addElement(nodeId, snapped, size);
    if (this.nodeLayer) {
      this.nodeLayer.appendChild(node);
    }
    return node;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} name
   * @param {'in' | 'out'} direction
   * @param {HTMLElement} [port]
   * @returns {any}
   */
  addExportedPort(x, y, name, direction = "out", port) {
    const size = 20;
    const snapped = this.snapToGrid(x - size / 2, y - size / 2);
    const exportedPort = /** @type {any} */ (
      document.createElement("noflo-exported-port")
    );
    exportedPort.id = name;
    exportedPort.name = name;
    exportedPort.setAttribute("name", name);
    exportedPort.dataset.portName = name;
    exportedPort.dataset.portType = "regular";
    exportedPort.direction = direction;
    exportedPort.position = snapped;
    exportedPort.size = size;
    this.spaceManager.addElement(name, snapped, size);
    if (this.nodeLayer) {
      this.nodeLayer.appendChild(exportedPort);
    }

    if (port) {
      const hitPath = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      hitPath.classList.add("edge-hit-area");

      const visualPath = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      visualPath.classList.add("edge-flow");

      this.updateIIPPathData(hitPath, visualPath, exportedPort, port);

      if (this.iipWiresGroup) {
        this.iipWiresGroup.appendChild(hitPath);
        this.iipWiresGroup.appendChild(visualPath);
      }

      this.iipWires = this.iipWires || [];
      this.iipWires.push({ hitPath, visualPath, iip: exportedPort, port });
    }

    return exportedPort;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {HTMLElement} port
   * @param {string} [value="Value"]
   * @returns {NoFloIIP}
   */
  addIIP(x, y, port, value = "Value") {
    const size = 40;
    let centerX = x;
    let centerY = y;

    if (!x && !y && port && port.classList.contains("port-in")) {
      const node =
        port.getRootNode().host?.tagName === "NOFLO-NODE"
          ? port.getRootNode().host
          : port.closest("noflo-node");
      if (node) {
        const nodePos = node.position;
        const nodeSize = node.size || 80;
        centerX = nodePos.x - size - 20;
        centerY = nodePos.y + nodeSize / 2 - size / 2;
        console.log("DEBUG IIP:", { nodePos, size, centerX, centerY });
      }
    }

    const snapped = this.snapToGrid(centerX - size / 2, centerY - size / 2);
    console.log("DEBUG IIP snapped:", snapped);
    const iip = /** @type {NoFloIIP} */ (document.createElement("noflo-iip"));
    const id = `iip_${Date.now().toString().slice(-4)}_${Math.floor(Math.random() * 1000)}`;
    iip.setAttribute("name", id);
    iip.id = id;
    iip.position = snapped;
    iip.size = size;
    this.spaceManager.addElement(id, snapped, size);
    iip.value = value;
    if (this.nodeLayer) {
      this.nodeLayer.appendChild(iip);
    }

    if (port) {
      // ... (wait, I can't use comments like this in oldText)
      const hitPath = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      hitPath.classList.add("edge-hit-area");

      const visualPath = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      visualPath.classList.add("edge-flow");

      this.updateIIPPathData(hitPath, visualPath, iip, port);

      if (this.iipWiresGroup) {
        this.iipWiresGroup.appendChild(hitPath);
        this.iipWiresGroup.appendChild(visualPath);
      }

      this.iipWires = this.iipWires || [];
      this.iipWires.push({ hitPath, visualPath, iip, port });
    }

    return iip;
  }

  /**
   * @param {HTMLElement} port
   */
  exportPort(port) {
    let node = port.closest("noflo-node") || port.closest("noflo-iip");
    if (!node && port.getRootNode() instanceof ShadowRoot) {
      const host = port.getRootNode().host;
      if (host.tagName === "NOFLO-NODE" || host.tagName === "NOFLO-IIP") {
        node = host;
      }
    }
    if (!node) return;

    const nodeAny = /** @type {any} */ (node);
    const isOutport = port.classList.contains("port-out");
    const portName = port.dataset.portName || "";
    const nodePos = nodeAny.position;
    const nodeSize = nodeAny.size || 80;
    const exportedSize = 40;

    let exportPos;
    if (isOutport) {
      // Right of node
      exportPos = {
        x: nodePos.x + nodeSize,
        y: nodePos.y + nodeSize / 2,
      };
    } else {
      // Left of node
      exportPos = {
        x: nodePos.x - exportedSize,
        y: nodePos.y + nodeSize / 2,
      };
    }

    // Search for available space
    const exportPosFound = this.spaceManager.findEmptySpace(
      exportPos.x,
      exportPos.y,
      exportedSize,
      exportedSize,
    );

    if (!exportPosFound) {
      console.warn("No space available for exported port");
      return;
    }

    const finalExportPos = exportPosFound;

    // Handle name duplication
    let finalName = portName;
    const existingExportedPorts = /** @type {NodeListOf<HTMLElement>} */ (
      this.nodeLayer?.querySelectorAll("noflo-exported-port") || []
    );

    if (
      Array.from(existingExportedPorts).some(
        (ep) => ep.getAttribute("name") === finalName,
      )
    ) {
      let count = 0;
      while (
        Array.from(existingExportedPorts).some(
          (ep) => ep.getAttribute("name") === `${portName}${count}`,
        )
      ) {
        count++;
      }
      finalName = `${portName}${count}`;
    }

    this.addExportedPort(
      finalExportPos.x,
      finalExportPos.y,
      /** @type {string} */ (finalName),
      isOutport ? "out" : "in",
      port,
    );

    this.dispatchEvent(
      new CustomEvent("port-exported", {
        detail: {
          name: finalName,
          direction: isOutport ? "out" : "in",
          position: finalExportPos,
          process: node.getAttribute("name"),
          port: portName,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * @param {HTMLElement} ep
   */
  removeExportedPort(ep) {
    if (!ep) return;

    // Remove IIP wires
    if (this.iipWires && this.iipWiresGroup) {
      const wiresToRemove = this.iipWires.filter(
        (wire) => wire.port === ep || wire.iip === ep,
      );
      wiresToRemove.forEach((wire) => {
        if (this.iipWiresGroup && wire.hitPath && wire.visualPath) {
          this.iipWiresGroup.removeChild(wire.hitPath);
          this.iipWiresGroup.removeChild(wire.visualPath);
        }
      });
      this.iipWires = this.iipWires.filter(
        (wire) => wire.port !== ep && wire.iip !== ep,
      );
    }

    const name = ep.getAttribute("name");
    const direction = ep.direction;

    this.dispatchEvent(
      new CustomEvent("port-removed", {
        detail: { name, direction },
        bubbles: true,
        composed: true,
      }),
    );

    if (ep.parentNode) {
      ep.parentNode.removeChild(ep);
    }
    this.spaceManager.removeNode(name || "");
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{type: string, element: HTMLElement | null}}
   */
  getInterestArea(clientX, clientY) {
    if (this.isDraggingWire) {
      const port = this._getNearestPort(clientX, clientY);
      if (port) {
        return { type: FlowEditor.INTEREST_AREA_TYPES.PORT, element: port };
      }
    }

    if (
      this.isDraggingNode &&
      (this.selectionManager.nodes.size > 0 ||
        this.selectionManager.iips.size > 0)
    ) {
      const node = this._getNearestNode(clientX, clientY);
      if (node) {
        return { type: FlowEditor.INTEREST_AREA_TYPES.NODE, element: node };
      }
    }

    return { type: FlowEditor.INTEREST_AREA_TYPES.NONE, element: null };
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @returns {HTMLElement | null}
   */
  _getNearestPort(clientX, clientY) {
    const shadowRoot = /** @type {ShadowRoot} */ (this.shadowRoot);
    let nearestPort = null;
    let minDist = Infinity;
    const threshold = 20;

    // 1. Check ports in nodes
    const nodes = shadowRoot.querySelectorAll("noflo-node");
    for (const node of nodes) {
      const n = /** @type {NoFloNode | NoFloIIP} */ (node);
      const sr = n.shadowRoot;
      if (!sr) continue;
      const ports = sr.querySelectorAll(".port");
      for (const portElement of ports) {
        const port = /** @type {HTMLElement} */ (portElement);
        const rect = port.getBoundingClientRect();
        const dx = clientX - (rect.left + rect.width / 2);
        const dy = clientY - (rect.top + rect.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist < threshold) {
          minDist = dist;
          nearestPort = port;
        }
      }
    }

    // 2. Check exported ports
    const exportedPorts = shadowRoot.querySelectorAll("noflo-exported-port");
    for (const ep of exportedPorts) {
      const port = ep.shadowRoot?.querySelector(".port");
      if (!port) continue;
      const rect = port.getBoundingClientRect();
      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist && dist < threshold) {
        minDist = dist;
        nearestPort = port;
      }
    }

    return nearestPort;
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @returns {NoFloNode | NoFloIIP | any | null}
   */
  _getNearestNode(clientX, clientY) {
    const shadowRoot = /** @type {ShadowRoot} */ (this.shadowRoot);
    const nodes = shadowRoot.querySelectorAll(
      "noflo-node, noflo-iip, noflo-exported-port",
    );
    for (const node of nodes) {
      const n = /** @type {NoFloNode | NoFloIIP | any} */ (node);
      if (
        this.selectionManager.nodes.has(n.getAttribute("name")) ||
        this.selectionManager.iips.has(n.getAttribute("name"))
      )
        continue;
      const rect = n.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return n;
      }
    }
    return null;
  }
}
