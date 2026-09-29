import { Camera } from "../library/Camera.js";
import { EdgeManager } from "../library/EdgeManager.js";
import { SelectionManager } from "../library/SelectionManager.js";
import { SpaceManager } from "../library/SpaceManager.js";
import { FlowHeatmap } from "./noflo-heatmap.js";

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
 *   component?: string | null,
 *   libraryManager?: import("../library/LibraryManager.js").LibraryManager | null,
 *   setPorts: (inPorts: PortConfig[], outPorts: PortConfig[]) => void,
 *   setMetadata: (metadata: Record<string, any>) => void,
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
 * A graph entity is anything placed on the editor canvas: a node, an IIP, or
 * an exported port. These differ in how they are created, but share how they
 * are selected, moved, and occupy space.
 *
 * @typedef {NoFloNode | NoFloIIP | FlowExportedPort} GraphEntity
 */

/**
 * @typedef {HTMLElement & {
 *   isOpen: boolean,
 *   open: (x: number, y: number, items: any[], centerContent: string | null) => void,
 *   close: () => void
 * }} NoFloRadialMenu
 */

/**
 * Duration (in ms) of the spring animation used when a dragged node jumps from
 * a blocked (colliding) position to a legal one. Kept short so the jump feels
 * snappy rather than sluggish.
 */
const SPRING_MS = 180;

/**
 * CSS transition applied to nodes only while the spring jump is running. A
 * lightly overshooting cubic-bezier (a "back-out" curve) gives a springy feel
 * without lingering on the settle. It is removed again as soon as the
 * animation completes (see `_endSpring`).
 */
const SPRING_TRANSITION = `left ${SPRING_MS}ms cubic-bezier(0.34, 1.35, 0.64, 1), top ${SPRING_MS}ms cubic-bezier(0.34, 1.35, 0.64, 1)`;

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
    /** @type {SpaceManager} */
    this.spaceManager = new SpaceManager(1.0, { x: 0, y: 0 });
    /** @type {Camera | null} */
    this.camera = null;
    /** @type {SelectionManager} */
    this.selectionManager = new SelectionManager();
    /** @type {import("../library/LibraryManager.js").LibraryManager | null} */
    this.libraryManager = null;
    /** @type {EdgeManager | null} */
    this.edgeManager = null;
    /** @type {boolean} */
    this.isDraggingNode = false;
    /** @type {boolean} */
    this.isDraggingWire = false;
    /** @type {Position} */
    this.lastPointerPos = { x: 0, y: 0 };
    /** @type {boolean} */
    this.selectMode = false;
    /** @type {HTMLElement | null} */
    this.ghostNode = null;
    /** @type {number | null} */
    this.stillnessTimer = null;
    /** @type {Map<GraphEntity, Position>} */
    this.draggingNodesInitialPositions = new Map();
    /** @type {Position | null} */
    this.draggingStartPointerPos = null;
    /** @type {boolean} */
    this.isSpringing = false;
    /** @type {number | null} */
    this.springRefreshFrame = null;
    /** @type {number} */
    this.springEndTime = 0;
    /** @type {GraphEntity[]} */
    this.springingNodes = [];
    /** @type {boolean} */
    this.isDraggingNodeInCollision = false;
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
    /** @type {FlowHeatmap | null} */
    this.heatmap = null;
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

    const shadowRoot = /** @type {ShadowRoot} */ (this.shadowRoot);
    const pills = shadowRoot.querySelector("noflo-selection-pills");
    if (pills) {
      /** @type {any} */ (pills).selectionManager = this.selectionManager;
      pills.addEventListener("clear-selection", (e) => {
        this.selectionManager.clearType(
          /** @type {CustomEvent} */ (e).detail.type,
        );
      });
    }

    this.selectionManager.addEventListener("selection-changed", (e) => {
      this._applySelection(/** @type {CustomEvent} */ (e).detail);
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
    window.removeEventListener("resize", this._resizeHandler);
  }

  _resizeHandler = () => {
    this.camera?.maintainCenterOnResize();
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
      const name = node.getAttribute("name") ?? "";
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
      const name = iip.getAttribute("name") ?? "";
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
        #svg-layer, #iip-wire-layer, #grid-layer {
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
          <noflo-heatmap></noflo-heatmap>
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
    this.heatmap = /** @type {FlowHeatmap | null} */ (
      /** @type {ShadowRoot} */ (this.shadowRoot).querySelector("noflo-heatmap")
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

    this.camera = new Camera({
      transformLayer: /** @type {HTMLElement} */ (this.transformLayer),
      host: this,
      spaceManager: this.spaceManager,
      getRect: () => this.getBoundingClientRect(),
    });

    this.edgeManager = new EdgeManager({
      edgesGroup: /** @type {SVGElement} */ (this.edgesGroup),
      iipWiresGroup: /** @type {SVGElement} */ (this.iipWiresGroup),
      getPortPosition: (port) => this.getPortPosition(port),
    });

    this.updateTransform();
  }

  /**
   * Record activity at a graph-space coordinate.
   * @param {number} worldX
   * @param {number} worldY
   */
  recordActivity(worldX, worldY) {
    this.heatmap?.recordActivity(worldX, worldY);
  }

  /** @returns {import("../library/EdgeManager.js").Edge[]} */
  get edges() {
    return this.edgeManager ? this.edgeManager.edges : [];
  }

  /** @returns {import("../library/EdgeManager.js").IIPWire[]} */
  get iipWires() {
    return this.edgeManager ? this.edgeManager.iipWires : [];
  }

  updateTransform() {
    this.camera?.apply();
  }

  /**
   * Whether the user has requested reduced motion. When true the spring jump
   * is skipped and nodes move instantly, per SPEC.md ("Disabling UI animations",
   * defaulting to the `prefers-reduced-motion` media query).
   *
   * @returns {boolean}
   */
  _prefersReducedMotion() {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /**
   * Starts a one-shot spring CSS animation that moves the given nodes to their
   * target positions. Used when a dragged node was blocked by a collision and
   * the pointer has since moved to a legal spot: instead of teleporting there
   * instantly, the node springs to its new position. The CSS transition is
   * removed again as soon as the animation completes (see `_endSpring`), so
   * subsequent pointer movement follows the pointer instantly.
   *
   * While the spring plays the nodes are frozen: pointer movement is ignored
   * so the animation can run uninterrupted to its target.
   *
   * @param {Array<{node: GraphEntity, x: number, y: number}>} moves
   */
  _startSpringJump(moves) {
    if (moves.length === 0) return;

    if (this._prefersReducedMotion()) {
      // No animation: jump straight to the target and keep following instantly.
      for (const { node, x, y } of moves) {
        node.position = { x, y };
      }
      this.updateEdges();
      this.updateIIPWires();
      return;
    }

    this.isSpringing = true;
    this.springingNodes = moves.map((move) => move.node);
    for (const { node, x, y } of moves) {
      // Apply the transition before changing the position so the browser
      // animates from the current (stuck) position to the new target.
      node.style.transition = SPRING_TRANSITION;
      node.position = { x, y };
      this.spaceManager.updateEntity(node.getAttribute("name") ?? "", {
        x,
        y,
      });
    }
    this.springEndTime = performance.now() + SPRING_MS;
    this._springRefreshLoop();
  }

  /**
   * Animation-frame loop that keeps edges and IIP wires attached to nodes while
   * they are mid-spring. Because of the CSS transition the nodes' visual
   * position lags behind their logical `position`, so we re-read the live port
   * positions every frame. Ends the spring (removing the transition) once the
   * configured duration has elapsed.
   */
  _springRefreshLoop() {
    this.updateEdges();
    this.updateIIPWires();
    if (performance.now() < this.springEndTime) {
      this.springRefreshFrame = window.requestAnimationFrame(() =>
        this._springRefreshLoop(),
      );
    } else {
      this._endSpring();
    }
  }

  /**
   * Ends the spring animation, removing the CSS transition from the dragged
   * nodes so that further pointer movement follows the pointer instantly again.
   * Safe to call when no spring is currently running.
   */
  _endSpring() {
    this.isSpringing = false;
    if (this.springRefreshFrame !== null) {
      window.cancelAnimationFrame(this.springRefreshFrame);
      this.springRefreshFrame = null;
    }
    for (const node of this.springingNodes) {
      node.style.transition = "";
    }
    this.springingNodes = [];
    this.springEndTime = 0;
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

  fitEntitiesToViewport() {
    this.camera?.fit();
  }

  /**
   * @param {GraphEntity} node
   * @returns {string}
   */
  getNodeName(node) {
    return node.getAttribute("name") || "IIP";
  }

  /**
   * @param {import("../library/EdgeManager.js").Edge} edge
   * @returns {string}
   */
  getEdgeId(edge) {
    return /** @type {EdgeManager} */ (this.edgeManager).getEdgeId(edge);
  }

  setupInteractions() {
    const camera = /** @type {Camera} */ (this.camera);
    this.addEventListener("pointerdown", (e) => {
      camera.trackPointer(e);

      if (camera.isPinching()) {
        camera.beginPinch();
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
          const host = /** @type {any} */ (port.getRootNode()).host;
          if (host && host.tagName === "NOFLO-EXPORTED-PORT") {
            this.handleNodeSelection(e, /** @type {any} */ (host), isMultiple);
            return;
          }

          if (port.dataset.portType === "array") {
            const hasConnection = this.edges.some(
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
            /** @type {GraphEntity} */ (clickedNode),
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
      camera.trackPointer(e);

      if (camera.isPinching()) {
        camera.updatePinch();
      } else {
        const dx = e.clientX - this.lastPointerPos.x;
        const dy = e.clientY - this.lastPointerPos.y;

        if (camera.isPanning && !this.radialMenu?.isOpen) {
          if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
          }
          camera.panBy(dx, dy);
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
            }
          }

          if (this.isDraggingNode) {
            /** @type {Array<{node: GraphEntity, x: number, y: number}>} */
            const idealMoves = [];
            this.draggingNodesInitialPositions.forEach((initialPos, node) => {
              if (initialPos && this.draggingStartPointerPos) {
                const idealX =
                  initialPos.x +
                  (e.clientX - this.draggingStartPointerPos.x) / camera.zoom;
                const idealY =
                  initialPos.y +
                  (e.clientY - this.draggingStartPointerPos.y) / camera.zoom;
                idealMoves.push({ node, x: idealX, y: idealY });
              }
            });

            let collision = false;
            for (const move of idealMoves) {
              const size = move.node.size;
              const otherNodes = /** @type {ShadowRoot} */ (
                this.shadowRoot
              ).querySelectorAll("noflo-node, noflo-iip");
              for (const other of otherNodes) {
                const o = /** @type {NoFloNode | NoFloIIP} */ (other);
                if (
                  this.selectionManager.nodes.has(
                    o.getAttribute("name") ?? "",
                  ) ||
                  this.selectionManager.iips.has(o.getAttribute("name") ?? "")
                ) {
                  continue;
                }
                const otherPos = o.position;
                const otherSize = o.size;
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
              if (this.isSpringing) {
                // A spring jump is playing; the nodes are frozen mid-jump so
                // we intentionally ignore pointer movement until it settles.
              } else if (this.isDraggingNodeInCollision) {
                // Pointer moved from an illegal spot to a legal one. Instead
                // of teleporting, spring the nodes to their new positions with
                // a one-shot CSS animation.
                this.isDraggingNodeInCollision = false;
                this._startSpringJump(idealMoves);
                if (this.viewport) {
                  this.viewport.style.cursor = "";
                }
              } else {
                // Normal drag, no collision and no spring: follow the pointer
                // instantly without any animation.
                idealMoves.forEach(({ node, x, y }) => {
                  node.position = { x, y };
                  this.spaceManager.updateEntity(
                    node.getAttribute("name") ?? "",
                    { x, y },
                  );
                });
                this.updateEdges();
                this.updateIIPWires();
              }
            } else {
              this.isDraggingNodeInCollision = true;
              if (this.isSpringing) {
                // Pointer re-entered an illegal area mid-spring; cancel the
                // spring so the node sticks where it is instead of continuing
                // into the collision.
                this._endSpring();
              }
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
          !camera.isPanning &&
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
      camera.releasePointer(e.pointerId);

      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      this.pendingDragPort = null;

      if (camera.isPanningPointer(e.pointerId)) {
        if (camera.endPan(e.pointerId) && !this.selectMode) {
          this.clearSelection();
        }
      }

      if (e.pointerId === this.draggingNodePointerId) {
        const clickedNode = this.clickedNode;
        const isMultiple = e.ctrlKey || e.shiftKey || this.selectMode;

        if (!this.isDraggingNode) {
          this.commitNodeSelection(clickedNode, isMultiple);
        }

        if (this.isDraggingNode) {
          // Stop any in-flight spring so the snap-to-grid below is instant.
          this._endSpring();
          /** @type {Array<{name: string, position: Position, type: string, direction: any, portName: string | null}>} */
          const movedNodes = [];
          this.draggingNodesInitialPositions.forEach((initialPos, node) => {
            node.position = this.snapToGrid(node.position.x, node.position.y);
            this.spaceManager.updateEntity(
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

      if (camera.allPointersReleased()) {
        camera.resetPinchGesture();
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
        camera.wheelZoom(e);
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
          const nodesToRemove = /** @type {HTMLElement[]} */ ([]);
          const allNodes = /** @type {NodeListOf<HTMLElement>} */ (
            this.nodeLayer?.querySelectorAll(
              "noflo-node, noflo-iip, noflo-exported-port",
            ) || []
          );
          allNodes.forEach((n) => {
            if (
              this.selectionManager.nodes.has(n.getAttribute("name") ?? "") ||
              this.selectionManager.iips.has(n.getAttribute("name") ?? "")
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

      const hasEdge = this.edges.some(
        (e) => e.portA === port || e.portB === port,
      );
      const hasIIP = this.iipWires.some((w) => w.port === port);
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
                      /** @type {GraphEntity} */ (clickedNode),
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
            this.dispatchEvent(
              new CustomEvent("node-creation-attempt", {
                detail: {
                  x: graphPos.x - 40,
                  y: graphPos.y - 40,
                  startPort: null,
                },
                bubbles: true,
                composed: true,
              }),
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
    this.viewport?.setPointerCapture(e.pointerId);
    this.camera?.startPan(e.pointerId);
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
  }

  /**
   * @param {PointerEvent} e
   * @param {GraphEntity} node
   * @param {boolean} isMultiple
   */
  handleNodeSelection(e, node, isMultiple) {
    const n = /** @type {GraphEntity} */ (node);
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
    this._endSpring();
    this.draggingStartPointerPos = { x: e.clientX, y: e.clientY };
    this.draggingNodesInitialPositions.clear();

    const allNodes = /** @type {NodeListOf<HTMLElement>} */ (
      this.nodeLayer?.querySelectorAll(
        "noflo-node, noflo-iip, noflo-exported-port",
      ) || []
    );
    allNodes.forEach((element) => {
      const el = /** @type {GraphEntity} */ (element);
      const name = el.getAttribute("name");
      if (
        this.selectionManager.nodes.has(name) ||
        this.selectionManager.iips.has(name)
      ) {
        this.draggingNodesInitialPositions.set(el, { ...el.position });
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
   * @param {GraphEntity | null} node
   * @param {boolean} isMultiple
   */
  commitNodeSelection(node, isMultiple) {
    if (this.selectionChangedOnDown) return;

    const n = /** @type {GraphEntity} */ (node);
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
    if (!edge) {
      return;
    }
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
            const hasConnection = this.edges.some(
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
      const portEl = /** @type {HTMLElement | null | undefined} */ (
        port.shadowRoot?.querySelector(".port")
      );
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
            this.edges.some(
              (edge) => edge.portA === portEl || edge.portB === portEl,
            ) || this.iipWires.some((w) => w.port === portEl);
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
    } else if (this.ghostNode) {
      const isOutPort = this.dragPort?.classList.contains("port-out");
      const eventName = isOutPort
        ? "node-creation-attempt"
        : "iip-creation-attempt";

      // Prefer the position where the ghost node is actually displayed.
      // Fall back to computing it from the current pointer position so the
      // method is self-contained (e.g. when ghostPos was not populated).
      let pos = this.ghostPos;
      if (!pos) {
        const size = isOutPort ? 80 : 40;
        const { x: mouseX, y: mouseY } = this.clientToGraph(
          e.clientX,
          e.clientY,
        );
        pos = this.snapToGrid(mouseX - size / 2, mouseY - size / 2);
      }

      this.dispatchEvent(
        new CustomEvent(eventName, {
          detail: {
            x: pos.x,
            y: pos.y,
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
      this.spaceManager.removeEntity(name);
    }

    this.edgeManager?.removeEdgesForNode(node);
  }

  /**
   * @param {NoFloIIP} iip
   */
  removeIIP(iip) {
    if (!iip) return;

    if (iip.parentNode) {
      iip.parentNode.removeChild(iip);
    }
    this.spaceManager.removeEntity(iip.getAttribute("name") || "");

    this.edgeManager?.removeIIPWiresForIIP(iip);
  }

  /**
   * @param {HTMLElement} port
   */
  disconnectPort(port) {
    this.edgeManager?.disconnectPort(port);
  }

  /**
   * @param {import("../library/EdgeManager.js").Edge} edge
   */
  removeEdge(edge) {
    this.edgeManager?.removeEdge(edge);
  }

  /**
   * @param {import("../library/EdgeManager.js").Edge} edge
   * @returns {{ fromNode: string, fromPort: string, fromIndex: number | undefined, toNode: string, toPort: string, toIndex: number | undefined } | undefined}
   */
  getEdgeDescriptor(edge) {
    return this.edgeManager?.getEdgeDescriptor(edge);
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
   * @returns {import("../library/EdgeManager.js").Edge | undefined}
   */
  addEdge(portA, portB, routeId) {
    return this.edgeManager?.addEdge(portA, portB, routeId);
  }

  updateEdges() {
    this.edgeManager?.updateEdges();
  }

  updateIIPWires() {
    this.edgeManager?.updateIIPWires();
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
   * @param {number | undefined} [portAIndex]
   * @param {number | undefined} [portBIndex]
   * @returns {import("../library/EdgeManager.js").Edge | undefined}
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
    return this.edgeManager?.connectNodes(
      /** @type {HTMLElement} */ (nodeA),
      portAName,
      /** @type {HTMLElement} */ (nodeB),
      portBName,
      routeId,
      portAIndex,
      portBIndex,
    );
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

    this.spaceManager.addEntity(nodeId, snapped, size);
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
    this.spaceManager.addEntity(name, snapped, size);
    if (this.nodeLayer) {
      this.nodeLayer.appendChild(exportedPort);
    }

    if (port) {
      this.edgeManager?.connectIIP(
        /** @type {HTMLElement} */ (exportedPort),
        port,
      );
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
        /** @type {any} */ (port.getRootNode()).host?.tagName === "NOFLO-NODE"
          ? /** @type {any} */ (port.getRootNode()).host
          : port.closest("noflo-node");
      if (node) {
        const nodePos = node.position;
        const nodeSize = node.size || 80;
        centerX = nodePos.x - size - 20;
        centerY = nodePos.y + nodeSize / 2 - size / 2;
      }
    }

    const snapped = this.snapToGrid(centerX - size / 2, centerY - size / 2);
    const iip = /** @type {NoFloIIP} */ (document.createElement("noflo-iip"));
    const id = `iip_${Date.now().toString().slice(-4)}_${Math.floor(Math.random() * 1000)}`;
    iip.setAttribute("name", id);
    iip.id = id;
    iip.position = snapped;
    iip.size = size;
    this.spaceManager.addEntity(id, snapped, size);
    iip.value = value;
    if (this.nodeLayer) {
      this.nodeLayer.appendChild(iip);
    }

    if (port) {
      this.edgeManager?.connectIIP(/** @type {HTMLElement} */ (iip), port);
    }

    return iip;
  }

  /**
   * @param {HTMLElement} port
   */
  exportPort(port) {
    let node = port.closest("noflo-node") || port.closest("noflo-iip");
    if (!node && port.getRootNode() instanceof ShadowRoot) {
      const host = /** @type {any} */ (port.getRootNode()).host;
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

    this.edgeManager?.removeIIPWiresForExportedPort(
      /** @type {HTMLElement} */ (ep),
    );

    const name = ep.getAttribute("name");
    const direction = /** @type {any} */ (ep).direction;

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
    this.spaceManager.removeEntity(name || "");
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
      const node = this._getNearestEntity(clientX, clientY);
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
    /** @type {HTMLElement | null} */
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
          nearestPort = /** @type {HTMLElement} */ (port);
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
        nearestPort = /** @type {HTMLElement} */ (port);
      }
    }

    return nearestPort;
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @returns {GraphEntity | null}
   */
  _getNearestEntity(clientX, clientY) {
    const shadowRoot = /** @type {ShadowRoot} */ (this.shadowRoot);
    const nodes = shadowRoot.querySelectorAll(
      "noflo-node, noflo-iip, noflo-exported-port",
    );
    for (const node of nodes) {
      const n = /** @type {GraphEntity} */ (node);
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
