import { emit, on } from "../events.js";
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
 *   routeId?: number,
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
    /** Whether the Unpack action is available (set by the embedding app). */
    this.unpackEnabled = false;
    /** Whether nodes can move up into a parent graph: only subgraphs have
     * one (set by the embedding app). */
    this.moveUpEnabled = false;
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
    /** @type {ReturnType<typeof setTimeout> | null} */
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
    /** Set by the Glass when a runtime network is connected: gates
     * runtime-only affordances such as the IIP "Send now". */
    this.runtimeConnected = false;
    /** @type {Array<{ id: string, name: string, nodes: string[] }>} */
    this.groups = [];
    /** @type {number | null} */
    /** @type { ReturnType<typeof setTimeout> | null } */
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
    /** Remote peer drag ghosts, keyed by peer id (work document #21). */
    this.peerGhosts = new Map();

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
      on(pills, "clear-selection", (e) => {
        this.selectionManager.clearType(
          /** @type {CustomEvent} */ (e).detail.type,
        );
      });
    }

    on(this.selectionManager, "selection-changed", (e) => {
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
    this._zoomObserver?.disconnect();
    this._zoomObserver = null;
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

    // Mirror the remaining body state the shadow styles consume: the
    // static-rendering hook (guidelines §11) and the last pointer type
    // (guidelines §1, §13 — branch on the active pointer, not the device)
    for (const attribute of ["data-animations", "data-input"]) {
      const value = document.body.getAttribute(attribute);
      if (value === null) {
        this.removeAttribute(attribute);
      } else {
        this.setAttribute(attribute, value);
      }
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
   * @param {{nodes: string[], iips: string[], edges: string[], ports: string[]}} selection
   * @private
   */
  _applySelection({ nodes, iips, edges, ports }) {
    // 1. Update nodes and exported ports — each by its own selection type
    const allNodes = /** @type {NodeListOf<HTMLElement>} */ (
      this.nodeLayer?.querySelectorAll("noflo-node, noflo-exported-port") || []
    );
    allNodes.forEach((node) => {
      const name = node.getAttribute("name") ?? "";
      const selected =
        node.tagName === "NOFLO-EXPORTED-PORT"
          ? ports.includes(name)
          : nodes.includes(name);
      if (selected) {
        node.setAttribute("selected", "");
        if (node.tagName !== "NOFLO-EXPORTED-PORT") {
          this.applyPortRouteColors(node);
        }
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

    // 3. Update edges. Selecting an edge with a route lights the whole
    // line: every edge sharing that route plus the nodes they connect
    // (work document #35)
    const routeLines = new Set();
    for (const edge of this.edges) {
      if (edges.includes(this.getEdgeId(edge)) && edge.routeId !== undefined) {
        routeLines.add(edge.routeId);
      }
    }
    // IIP and exported-port wires join their routes: the wire's own id is
    // selected when the IIP itself is (work document #35)
    for (const wire of this.iipWires ?? []) {
      const wireId = wire.iip.id || wire.iip.getAttribute("name") || "";
      if (
        wire.routeId !== undefined &&
        (edges.includes(wireId) || iips.includes(wireId))
      ) {
        routeLines.add(wire.routeId);
      }
    }
    const lineNodes = new Set();
    this.edges.forEach((edge) => {
      const edgeId = this.getEdgeId(edge);
      const onLine = edge.routeId !== undefined && routeLines.has(edge.routeId);
      if (edges.includes(edgeId)) {
        edge.visualPath.setAttribute("selected", "");
      } else {
        edge.visualPath.removeAttribute("selected");
      }
      edge.visualPath.classList.toggle("route-highlight", onLine);
      if (onLine) {
        const hostA = /** @type {ShadowRoot} */ (edge.portA.getRootNode()).host;
        const hostB = /** @type {ShadowRoot} */ (edge.portB.getRootNode()).host;
        if (hostA) lineNodes.add(this.getNodeName(hostA));
        if (hostB) lineNodes.add(this.getNodeName(hostB));
      }
    });
    for (const wire of this.iipWires ?? []) {
      const onLine = wire.routeId !== undefined && routeLines.has(wire.routeId);
      wire.visualPath.classList.toggle("route-highlight", onLine);
      if (onLine) {
        const host = /** @type {ShadowRoot} */ (wire.port.getRootNode()).host;
        if (host) lineNodes.add(this.getNodeName(host));
      }
    }
    for (const node of this.nodeLayer?.querySelectorAll("noflo-node") ?? []) {
      node.classList.toggle(
        "route-highlight",
        lineNodes.has(node.getAttribute("name")),
      );
    }
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
        #groups-layer {
          position: absolute;
          top: 0;
          left: 0;
          overflow: visible;
        }
        .group-region {
          fill: var(--group-fill, transparent);
          stroke: var(--group-border, var(--node-border));
          stroke-width: 2;
          stroke-dasharray: 8 4;
          rx: 12;
          ry: 12;
          pointer-events: auto;
          cursor: context-menu;
        }
        .group-label {
          fill: var(--node-subtext);
          font-family: SourceCodePro, monospace;
          font-size: 14px;
          pointer-events: none;
          user-select: none;
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
          /* The layer itself must not intercept clicks: it spans the whole
             viewport and would block every edge underneath. Only the graph
             entities are interactive. */
          pointer-events: none;
        }
        #peer-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 4;
          pointer-events: none;
        }
        .peer-ghost {
          position: absolute;
          width: var(--node-size, 80px);
          height: var(--node-size, 80px);
          border-radius: var(--ghost-radius, 50%);
          border: 2px dashed var(--ui-accent);
          background: color-mix(in srgb, var(--ui-accent) 12%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: var(--node-text);
          max-width: 120px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          animation: ghost-appear 150ms ease-out;
        }
        #node-layer > noflo-node,
        #node-layer > noflo-iip,
        #node-layer > noflo-exported-port {
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
        /* Appearing things animate in with springs; a shimmer marks new
           things (possibly remote additions) for a while (work document #5
           update #16). Disable via prefers-reduced-motion or the
           data-animations="off" setting hook. */
        @keyframes node-spring-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.15);
            opacity: 1;
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes node-shimmer {
          0%,
          100% {
            box-shadow: 0 0 0 0 var(--ui-accent, rgb(0, 229, 255));
          }
          50% {
            box-shadow: 0 0 18px 4px var(--ui-accent, rgb(0, 229, 255));
          }
        }
        noflo-node.node-appear {
          animation: node-spring-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        noflo-node.node-shimmer .node-circle {
          animation: node-shimmer 1.2s ease-in-out 3;
        }
        @media (prefers-reduced-motion: reduce) {
          noflo-node.node-appear,
          noflo-node.node-shimmer .node-circle,
          .ghost-node,
          .peer-ghost {
            animation: none;
          }
        }
        :host([data-animations="off"]) noflo-node.node-appear,
        :host([data-animations="off"]) noflo-node.node-shimmer .node-circle,
        :host([data-animations="off"]) .ghost-node,
        :host([data-animations="off"]) .peer-ghost {
          animation: none;
        }
        .edge-flow {
          fill: none;
          stroke: var(--edge-color);
          stroke-width: calc(var(--edge-width, 4px) - 2px);
          stroke-dasharray: var(--edge-dash);
          pointer-events: none;
        }
        .edge-flow[selected] {
          stroke: var(--ui-accent);
          stroke-width: calc(var(--edge-width, 4px) + 2px);
          stroke-dasharray: none;
        }
        /* Route highlighting (work document #35): selecting an edge on a
           route lights the whole line */
        .edge-flow.route-highlight {
          stroke-width: calc(var(--edge-width, 4px) + 2px);
          filter: drop-shadow(0 0 6px var(--edge-color));
        }
        /* Pending state (work document #21): optimistic edges until the
           replica confirms the CRDT merge */
        .edge-flow.edge-pending {
          stroke-dasharray: 6 4;
          opacity: 0.6;
        }
        .edge-flow.edge-pending-remove {
          stroke-dasharray: 6 4;
          opacity: 0.35;
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
          <svg id="groups-layer">
            <g id="groups-group" transform="translate(8000, 8000)"></g>
          </svg>
          <svg id="iip-wire-layer">
            <g id="iip-wires-group" transform="translate(8000, 8000)"></g>
          </svg>
          <div id="node-layer"></div>
          <div id="peer-layer"></div>
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
    this.peerLayer = /** @type {ShadowRoot} */ (this.shadowRoot).querySelector(
      "#peer-layer",
    );

    this.camera = new Camera({
      transformLayer: /** @type {HTMLElement} */ (this.transformLayer),
      host: this,
      spaceManager: this.spaceManager,
      getRect: () => this.getBoundingClientRect(),
    });

    // High zoom levels reveal port datatypes (work document #5 update
    // #16): the camera publishes its zoom through the host's --zoom-scale
    // style, so observing the attribute keeps the nodes' detailed class in
    // step without a camera callback
    this._zoomObserver = new MutationObserver(() => {
      const zoom = Number(
        getComputedStyle(this).getPropertyValue("--zoom-scale") || 1,
      );
      const detailed = zoom >= 2;
      for (const node of this.nodeLayer?.children ?? []) {
        node.classList.toggle("detailed", detailed);
      }
    });
    this._zoomObserver.observe(this, { attributeFilter: ["style"] });

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
   * @param {GraphEntity | string} node
   * @returns {string}
   */
  /**
   * Optimistically previews an edge's route (work document #35): the route
   * change rides the intent pipeline, but the cycling should feel live —
   * the edge's color and the line highlight update immediately, and the
   * next render catches up from the replica.
   *
   * @param {string} edgeId
   * @param {number | null} route
   */
  previewEdgeRoute(edgeId, route) {
    const edge = this.edges.find(
      (candidate) => this.getEdgeId(candidate) === edgeId,
    );
    if (!edge) {
      // IIP and exported-port wires key by their element's id
      const wire = this.iipWires?.find(
        (candidate) =>
          candidate.iip.id === edgeId ||
          candidate.iip.getAttribute("name") === edgeId,
      );
      if (!wire) return;
      wire.routeId = route ?? undefined;
      if (route !== null && route !== undefined) {
        wire.visualPath.style.setProperty(
          "--edge-color",
          `var(--route-${route})`,
        );
      } else {
        wire.visualPath.style.removeProperty("--edge-color");
      }
      // Exported ports wear their wire's route color on the ring
      // (guidelines §9); IIP chips keep their own visual
      if (/** @type {any} */ (wire.iip).tagName === "NOFLO-EXPORTED-PORT") {
        if (route !== null && route !== undefined) {
          /** @type {any} */ (wire.iip).style.setProperty(
            "--port-route-color",
            `var(--route-${route})`,
          );
        } else {
          /** @type {any} */ (wire.iip).style.removeProperty(
            "--port-route-color",
          );
        }
      }
      this._applySelection(this.selectionManager.getSnapshot());
      return;
    }
    edge.routeId = route ?? undefined;
    if (route !== null && route !== undefined) {
      edge.visualPath.style.setProperty(
        "--edge-color",
        `var(--route-${route})`,
      );
    } else {
      edge.visualPath.style.removeProperty("--edge-color");
    }
    this._applySelection(this.selectionManager.getSnapshot());
  }

  /**
   * Derives a graph endpoint ({node, port, index}) from a port element
   * (work document #5 update #15: the edge menu's splice carries the
   * edge's endpoints so the Glass can rewire around the spliced node).
   *
   * @param {Element} port
   * @returns {{ node: string, port: string, index?: number }}
   */
  endpointFromPort(port) {
    const root = /** @type {ShadowRoot} */ (port.getRootNode());
    const host = /** @type {HTMLElement} */ (root.host);
    const index = /** @type {HTMLElement} */ (port).dataset.portIndex;
    return {
      node: this.getNodeName(host),
      port: /** @type {HTMLElement} */ (port).dataset.portName ?? "",
      ...(index !== undefined ? { index: Number.parseInt(index, 10) } : {}),
    };
  }

  /**
   * @param {Element | string} node
   * @returns {string}
   */
  getNodeName(node) {
    if (typeof node === "string") return node;
    return node.getAttribute("name") || "IIP";
  }

  /**
   * Applies the Glass's pending-entity state (work document #21, SPEC
   * "High-Latency Mesh UX"): optimistic changes render dashed/faded until
   * the read replica confirms the CRDT merge. Maps are keyed by node name,
   * IIP element id, and deterministic edge id respectively; values are
   * "add" | "move" | "remove".
   *
   * @param {{
   *   nodes?: Map<string, string>,
   *   iips?: Map<string, string>,
   *   edges?: Map<string, string>,
   * }} [state]
   */
  applyPendingState(state = {}) {
    const nodes = state.nodes ?? new Map();
    const iips = state.iips ?? new Map();
    const edges = state.edges ?? new Map();

    for (const node of this.nodeLayer?.querySelectorAll("noflo-node") ?? []) {
      const pendingState = nodes.get(node.getAttribute("name") ?? "");
      if (pendingState) {
        node.setAttribute("pending", pendingState);
      } else {
        node.removeAttribute("pending");
      }
    }
    for (const iip of this.nodeLayer?.querySelectorAll("noflo-iip") ?? []) {
      const pendingState = iips.get(iip.id ?? "");
      if (pendingState) {
        iip.setAttribute("pending", pendingState);
      } else {
        iip.removeAttribute("pending");
      }
    }
    for (const edge of this.edges) {
      const pendingState = edges.get(this.getEdgeId(edge));
      edge.visualPath.classList.toggle(
        "edge-pending",
        pendingState === "add" || pendingState === "move",
      );
      edge.visualPath.classList.toggle(
        "edge-pending-remove",
        pendingState === "remove",
      );
    }
  }

  /**
   * Renders remote peer drag ghosts (work document #21 awareness). States
   * carry `{ peerId, nodeId, x, y }` in the graph the peers are editing; a
   * null `dragging` drops that peer's ghost. The Glass filters states to the
   * graph it is rendering before calling this.
   *
   * @param {Array<{ peerId: string, dragging?: { graphId: string, nodeId: string, x: number, y: number } | null }> | null} states
   */
  setPeerGhosts(states) {
    if (!this.peerLayer) return;
    for (const state of states ?? []) {
      const { peerId, dragging } = state;
      if (!peerId) continue;
      if (!dragging) {
        const stale = this.peerGhosts.get(peerId);
        if (stale) {
          stale.remove();
          this.peerGhosts.delete(peerId);
        }
        continue;
      }
      let ghost = this.peerGhosts.get(peerId);
      if (!ghost) {
        ghost = document.createElement("div");
        ghost.className = "peer-ghost";
        ghost.textContent = `${dragging.nodeId} (${peerId.slice(-4)})`;
        this.peerLayer.appendChild(ghost);
        this.peerGhosts.set(peerId, ghost);
      }
      const placed = /** @type {HTMLElement} */ (ghost);
      placed.style.left = `${dragging.x}px`;
      placed.style.top = `${dragging.y}px`;
    }
  }

  /**
   * A node can be opened into a graph only when its component is a subgraph.
   *
   * @param {Element} node
   * @returns {boolean}
   */
  isSubgraphNode(node) {
    if (!this.libraryManager) return false;
    const component =
      this.libraryManager.getComponent(/** @type {any} */ (node).component) ??
      null;
    return component?.type === "subgraph";
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
    this.addEventListener("dblclick", (e) => {
      const path = e.composedPath();
      const clickedNode = path.find((el) => {
        const element = /** @type {Element} */ (el);
        return element.tagName === "NOFLO-NODE";
      });
      // Only subgraph components have a graph to open
      if (
        clickedNode &&
        this.isSubgraphNode(/** @type {Element} */ (clickedNode))
      ) {
        emit(this, "navigate-down-attempt", {
          node: this.getNodeName(/** @type {GraphEntity} */ (clickedNode)),
        });
      }
    });
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
            // An array slot holds one attachment: edge, IIP, or export
            // (exports ride the IIP-wire machinery) — occupied slots
            // cannot start another wire
            const hasConnection =
              this.edges.some(
                (edge) => edge.portA === port || edge.portB === port,
              ) || this.iipWires.some((w) => w.port === port);
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
            this.selectionManager.iips.size > 0 ||
            this.selectionManager.ports.size > 0) &&
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
                  this.selectionManager.iips.has(
                    o.getAttribute("name") ?? "",
                  ) ||
                  this.selectionManager.ports.has(o.getAttribute("name") ?? "")
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
              // Ephemeral drag telemetry for mesh peers (work document #21):
              // the engine throttles this to ~250ms
              emit(this, "nodes-dragging", {
                nodes: idealMoves.map(({ node, x, y }) => ({
                  node: this.getNodeName(node),
                  x,
                  y,
                })),
              });
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
          // Drag ended: mesh peers drop their ghost states immediately
          emit(this, "nodes-drag-end", {
            nodes: [...this.draggingNodesInitialPositions.keys()].map((node) =>
              this.getNodeName(node),
            ),
          });
          /** @type {import("../events.js").MovedNode[]} */
          const movedNodes = [];
          this.draggingNodesInitialPositions.forEach((_initialPos, node) => {
            node.position = this.snapToGrid(node.position.x, node.position.y);
            this.spaceManager.updateEntity(
              node.getAttribute("name") || "",
              node.position,
            );
            const type = node.tagName.toLowerCase();
            // The IIP's stable identity is its CRDT edge id (the element
            // id); the name attribute is an editor-generated label (work
            // document #5 follow-up)
            const name =
              type === "noflo-iip" ? node.id : this.getNodeName(node);
            let direction = null;
            let portName = null;
            if (type === "noflo-exported-port") {
              direction = node.direction;
              portName = node.dataset.portName;
            }
            movedNodes.push({
              name,
              id: node.id,
              position: node.position,
              type,
              direction,
              portName,
            });
          });
          this.updateEdges();
          // Nodes, IIPs, and exported ports each emit their own move event
          // so the routing is unambiguous (work document #5 follow-up)
          for (const moved of movedNodes) {
            if (moved.type === "noflo-iip") {
              emit(this, "iip-moved", {
                iipId: moved.id,
                x: moved.position.x,
                y: moved.position.y,
              });
            } else if (moved.type === "noflo-exported-port") {
              emit(this, "export-moved", {
                name: moved.name,
                direction: moved.direction,
                x: moved.position.x,
                y: moved.position.y,
              });
            }
          }
          emit(this, "nodes-moved", {
            nodes: movedNodes.filter((n) => n.type === "noflo-node"),
          });
          this.emitGroupMembershipChanges(movedNodes);
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
        this.selectionManager.iips.size === 0 &&
        this.selectionManager.ports.size === 0
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
          this.selectionManager.iips.size > 0 ||
          this.selectionManager.ports.size > 0
        ) {
          const nodesToRemove = /** @type {HTMLElement[]} */ ([]);
          const allNodes = /** @type {NodeListOf<HTMLElement>} */ (
            this.nodeLayer?.querySelectorAll(
              "noflo-node, noflo-iip, noflo-exported-port",
            ) || []
          );
          allNodes.forEach((n) => {
            const name = n.getAttribute("name") ?? "";
            const type = this.selectionTypeFor(n);
            if (this.selectionManager[type].has(name)) {
              // Exported ports remove through their own path (the export
              // direction picks the graph port to remove)
              if (type === "ports") {
                this.removeExportedPort(/** @type {any} */ (n));
              } else {
                nodesToRemove.push(n);
              }
            }
          });
          if (nodesToRemove.length > 0) {
            emit(this, "node-removal-attempt", { nodes: nodesToRemove });
          }
        } else if (this.selectionManager.edges.size > 0) {
          this.selectionManager.edges.forEach((edgeId) => {
            const edge = this.edges.find((e) => this.getEdgeId(e) === edgeId);
            if (edge) {
              emit(this, "edge-removal-attempt", { edge });
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
        // Ports living inside an exported port belong to that exported port's
        // context menu, not the port menu
        return (
          element.classList?.contains("port") &&
          /** @type {any} */ (element.getRootNode()).host?.tagName !==
            "NOFLO-EXPORTED-PORT"
        );
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
    const clickedGroup = /** @type {Element | undefined} */ (
      path.find((/** @type {EventTarget} */ el) => {
        const element = /** @type {Element} */ (el);
        return element.classList?.contains("group-region");
      })
    );

    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.showContextMenu(x, y, {
      clickedPort,
      clickedNode,
      clickedEdge,
      clickedGroup,
    });
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {{clickedPort?: Element, clickedNode?: Element, clickedEdge?: Element, clickedGroup?: Element}} context
   */
  showContextMenu(x, y, context) {
    const { clickedPort, clickedNode, clickedEdge, clickedGroup } = context;
    const items = [];

    if (clickedGroup) {
      const groupId = clickedGroup.getAttribute("data-group-id") ?? "";
      const group = this.groups.find((entry) => entry.id === groupId);
      items.push({
        text: "Ungroup",
        onClick: () => {
          emit(this, "remove-group-attempt", { groupId });
        },
        icon: "object-ungroup",
      });
      return this.radialMenu?.open(x, y, items, group?.name || "Group");
    }

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

              // The Glass has no write authority: request the IIP via the
              // same event the wire-drop ghost flow uses
              emit(this, "iip-creation-attempt", {
                x: searchX,
                y: searchY,
                startPort: port,
              });
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
            // The rename moves to the Glass: the shell asks for the new
            // name in a modal input (work document #5 follow-up)
            emit(this, "export-rename-attempt", {
              name,
              direction: /** @type {any} */ (ep).direction,
            });
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
        // Export wires carry routes like any other wire (work document #35)
        const exportRoute =
          typeof (/** @type {any} */ (ep).routeId) === "number"
            ? /** @type {any} */ (ep).routeId
            : null;
        items.push({
          text: `Route: ${exportRoute ?? "none"}`,
          keepOpen: true,
          onClick: () => {
            const next =
              exportRoute === null
                ? 0
                : exportRoute >= 9
                  ? null
                  : exportRoute + 1;
            emit(this, "set-port-route", {
              name,
              direction:
                /** @type {any} */ (ep).direction === "out"
                  ? "outports"
                  : "inports",
              route: next,
            });
          },
          icon: "palette",
        });
      } else {
        const isIIP = clickedNode.tagName === "NOFLO-IIP";
        if (isIIP) {
          items.push({
            text: "Edit",
            onClick: () => {
              const wire = this.iipWires?.find((w) => w.iip === clickedNode);
              emit(this, "iip-edit-attempt", {
                iip: clickedNode,
                dataType: wire?.port?.dataset?.portDataType || "all",
              });
            },
            icon: "pen-to-square",
          });
        }

        // No separate "Open" for subgraphs: "Edit Component" opens the
        // component's own editor, which the Glass branches by kind — the
        // graph editor for subgraphs (guidelines §10's one primary edit)
        if (isIIP) {
          items.push({
            text: "Delete",
            onClick: () => {
              emit(this, "iip-removal-attempt", { iip: clickedNode });
            },
            icon: "trash",
          });
          if (this.runtimeConnected) {
            // Sending an IIP needs a running network: without one the item
            // stays hidden (work document #5 follow-up)
            items.push({
              text: "Send now",
              onClick: () => {
                emit(this, "iip-send-attempt", { iip: clickedNode });
              },
              icon: "paper-plane",
            });
          }
          // IIPs are edges under the hood (the DATA-> key): the route
          // cycler colors them like any other edge (work document #35)
          const currentRoute =
            typeof (/** @type {any} */ (clickedNode).routeId) === "number"
              ? /** @type {any} */ (clickedNode).routeId
              : null;
          items.push({
            text: `Route: ${currentRoute ?? "none"}`,
            keepOpen: true,
            onClick: () => {
              const next =
                currentRoute === null
                  ? 0
                  : currentRoute >= 9
                    ? null
                    : currentRoute + 1;
              emit(this, "set-edge-route", {
                edgeId: clickedNode.id,
                route: next,
              });
            },
            icon: "palette",
          });
        } else {
          items.push({
            text: "Edit Component",
            onClick: () => {
              emit(this, "edit-component-attempt", { node: clickedNode });
            },
            icon: "pen-to-square",
          });
          items.push({
            text: "Remove",
            onClick: () => {
              emit(this, "node-removal-attempt", { nodes: [clickedNode] });
            },
            icon: "trash",
          });
          if (!this.isSubgraphNode(/** @type {Element} */ (clickedNode))) {
            items.push({
              text: "Make subgraph",
              onClick: () => {
                // When the clicked node is part of the current selection,
                // the whole selection becomes the subgraph
                const name = this.getNodeName(
                  /** @type {GraphEntity} */ (clickedNode),
                );
                const selected = [...this.selectionManager.nodes];
                const nodeIds = selected.includes(name) ? selected : [name];
                emit(this, "create-subgraph-attempt", { nodes: nodeIds });
              },
              icon: "folder-plus",
            });
            items.push({
              text: "Group",
              onClick: () => {
                // Grouping works on the selection; a single clicked node
                // groups itself, drag more nodes into the group later
                const name = this.getNodeName(
                  /** @type {GraphEntity} */ (clickedNode),
                );
                const selected = [...this.selectionManager.nodes];
                const nodeIds = selected.includes(name) ? selected : [name];
                emit(this, "create-group-attempt", { nodes: nodeIds });
              },
              icon: "object-group",
            });
          }
          // Move up needs a parent graph to move into: the root project
          // graph is the top of the hierarchy, so the item drops out there
          if (this.moveUpEnabled) {
            items.push({
              text: "Move up",
              onClick: () => {
                // When the clicked node is part of the current selection, the
                // whole selection moves up
                const name = this.getNodeName(
                  /** @type {GraphEntity} */ (clickedNode),
                );
                const selected = [...this.selectionManager.nodes];
                const nodes = selected.includes(name) ? selected : [name];
                emit(this, "move-nodes-up-attempt", { nodes });
              },
              icon: "arrow-up-from-bracket",
            });
          }
          if (
            this.isSubgraphNode(/** @type {Element} */ (clickedNode)) &&
            this.unpackEnabled
          ) {
            items.push({
              text: "Unpack",
              onClick: () => {
                emit(this, "unpack-subgraph-attempt", {
                  node: this.getNodeName(
                    /** @type {GraphEntity} */ (clickedNode),
                  ),
                });
              },
              icon: "box-open",
            });
          }
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
      const wire = !edge
        ? this.iipWires?.find(
            (candidate) =>
              candidate.hitPath === clickedEdge ||
              candidate.visualPath === clickedEdge,
          )
        : undefined;
      if (edge) {
        emit(this, "edge-menu-open", { edge: this.getEdgeId(edge), x, y });
        const edgeId = this.getEdgeId(edge);
        // Splice: adding a node into the edge (work document #5 update
        // #15) — offered when there is space for a node at the menu
        const edgeGraphPos = this.viewportToGraph(x, y);
        if (this.hasSpace(edgeGraphPos.x, edgeGraphPos.y, 80)) {
          const edgeObject = this.edges.find(
            (candidate) => this.getEdgeId(candidate) === edgeId,
          );
          if (edgeObject) {
            const currentRoute =
              typeof edgeObject.routeId === "number"
                ? edgeObject.routeId
                : null;
            // The cycler applies to the whole edge selection when the
            // clicked edge is part of it (the same rule as Make subgraph
            // and Group)
            const selectedEdges = [...this.selectionManager.edges];
            const targetIds = selectedEdges.includes(edgeId)
              ? selectedEdges
              : [edgeId];
            items.unshift({
              text: `Route: ${currentRoute ?? "none"}`,
              keepOpen: true,
              onClick: () => {
                const next =
                  currentRoute === null
                    ? 0
                    : currentRoute >= 9
                      ? null
                      : currentRoute + 1;
                for (const targetId of targetIds) {
                  emit(this, "set-edge-route", {
                    edgeId: targetId,
                    route: next,
                  });
                }
              },
              icon: "palette",
            });
            items.unshift({
              text: "Add Node",
              onClick: () => {
                emit(this, "splice-node-attempt", {
                  edgeId,
                  src: this.endpointFromPort(edgeObject.portA),
                  tgt: this.endpointFromPort(edgeObject.portB),
                  x: edgeGraphPos.x - 40,
                  y: edgeGraphPos.y - 40,
                });
              },
              icon: "circle-plus",
            });
          }
        }
        items.push({
          text: "Remove",
          onClick: () => {
            emit(this, "edge-removal-attempt", { edge });
          },
          icon: "trash",
        });
      } else if (wire) {
        // IIP and exported-port wires carry routes like any other edge
        // (work document #35): the cycler colors the wire
        const isIIPWire = wire.iip.tagName === "NOFLO-IIP";
        const currentRoute =
          typeof wire.routeId === "number" ? wire.routeId : null;
        items.push({
          text: `Route: ${currentRoute ?? "none"}`,
          keepOpen: true,
          onClick: () => {
            const next =
              currentRoute === null
                ? 0
                : currentRoute >= 9
                  ? null
                  : currentRoute + 1;
            if (isIIPWire) {
              // The IIP's CRDT edge id is its element id
              emit(this, "set-edge-route", {
                edgeId: wire.iip.id,
                route: next,
              });
            } else {
              emit(this, "set-port-route", {
                name: wire.iip.getAttribute("name") ?? "",
                direction:
                  /** @type {any} */ (wire.iip).direction === "out"
                    ? "outports"
                    : "inports",
                route: next,
              });
            }
          },
          icon: "palette",
        });
      }
    } else {
      const graphPos = this.viewportToGraph(x, y);
      emit(this, "canvas-menu-open", { x, y, type: "canvas" });
      if (this.hasSpace(graphPos.x, graphPos.y, 80)) {
        items.push({
          text: "Add Node",
          onClick: () => {
            emit(this, "node-creation-attempt", {
              x: graphPos.x - 40,
              y: graphPos.y - 40,
              startPort: null,
            });
          },
          icon: "plus",
        });
      }
      items.push({
        text: "Close",
        onClick: () => {
          emit(this, "navigate-up-attempt", undefined);
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
   * The selection category an entity belongs to: exported ports are their
   * own selection type ("ports"), not nodes — the selection pills label
   * them separately and the drag set treats them by their own kind.
   *
   * @param {GraphEntity | Element} element
   * @returns {"nodes" | "iips" | "ports"}
   */
  selectionTypeFor(element) {
    if (element.tagName === "NOFLO-IIP") return "iips";
    if (element.tagName === "NOFLO-EXPORTED-PORT") return "ports";
    return "nodes";
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
    const type = this.selectionTypeFor(n);

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
      // A pointerdown on the only-selected node keeps it selected so a
      // drag can move it (work document #5): the plain-click collapse is
      // committed on pointerup, in commitNodeSelection — toggling here
      // would collapse the node and empty the drag set before the move
      // begins
      const isOnlyOneSelected =
        this.selectionManager[type].size === 1 &&
        this.selectionManager[type].has(id);
      if (!isOnlyOneSelected) {
        this.selectionManager.select(type, id, false);
      }
      this.selectionChangedOnDown = !isOnlyOneSelected;
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
      const type = this.selectionTypeFor(el);
      if (this.selectionManager[type].has(name)) {
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
    const type = this.selectionTypeFor(n);

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
    this.activeWire.setAttribute("stroke", "var(--node-subtext)");
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
            // An array slot holds one attachment: edge, IIP, or export
            const hasConnection =
              this.edges.some(
                (edge) => edge.portA === port || edge.portB === port,
              ) || this.iipWires.some((w) => w.port === port);
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
        emit(this, "wire-connection-attempt", {
          portA: startPort,
          portB: endPort,
        });
      } else if (!startIsOut && endIsOut) {
        emit(this, "wire-connection-attempt", {
          portA: endPort,
          portB: startPort,
        });
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

      emit(this, eventName, {
        x: pos.x,
        y: pos.y,
        startPort: this.dragPort,
      });
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
   * Recomputes which addressable slots are attached, from the rendered
   * wires: edges, IIPs, and exports all occupy their port's slot (work
   * document #5). The nodes grow their instance fans so at least one end
   * slot stays free. Called after each render pass wires the graph.
   *
   * @returns {void}
   */
  syncArrayPortUsage() {
    /** @type {Map<any, { in: Record<string, number[]>, out: Record<string, number[]> }>} */
    const usage = new Map();
    /**
     * @param {Element} portEl
     * @returns {void}
     */
    const record = (portEl) => {
      const index = portEl.getAttribute("data-port-index");
      if (index === null) return;
      const host = /** @type {any} */ (portEl.getRootNode())?.host;
      if (!host || host.tagName !== "NOFLO-NODE") return;
      const direction = portEl.classList.contains("port-out") ? "out" : "in";
      // Array instances identify by base name plus the slot index
      const baseName = portEl.getAttribute("data-port-name") ?? "";
      let perNode = usage.get(host);
      if (!perNode) {
        perNode = { in: {}, out: {} };
        usage.set(host, perNode);
      }
      const slots =
        perNode[direction][baseName] ?? (perNode[direction][baseName] = []);
      const slotIndex = Number.parseInt(index, 10);
      if (!slots.includes(slotIndex)) {
        slots.push(slotIndex);
        slots.sort((a, b) => a - b);
      }
    };
    for (const edge of this.edges) {
      record(edge.portA);
      record(edge.portB);
    }
    for (const wire of this.iipWires) {
      record(wire.port);
    }
    for (const [node, perNode] of usage) {
      node.setPortUsage({
        in: Object.fromEntries(
          Object.entries(perNode.in).map(([name, slots]) => [name, [...slots]]),
        ),
        out: Object.fromEntries(
          Object.entries(perNode.out).map(([name, slots]) => [
            name,
            [...slots],
          ]),
        ),
      });
    }
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
    // Exported ports are host elements whose connection point is the dot
    // inside their shadow: the host rect also contains the name label
    // below the dot, so its center is not the dot's center. The drag and
    // hit-test paths resolve to the inner .port element the same way.
    const dot =
      /** @type {HTMLElement | null} */ (
        /** @type {any} */ (port).shadowRoot?.querySelector(".port")
      ) ?? port;
    const rect = dot.getBoundingClientRect();
    const componentRect = this.getBoundingClientRect();
    return this.viewportToGraph(
      rect.left + rect.width / 2 - componentRect.left,
      rect.top + rect.height / 2 - componentRect.top,
    );
  }

  /**
   * @param {HTMLElement} portA
   * @param {HTMLElement} portB
   * @param {number} [routeId]
   * @returns {import("../library/EdgeManager.js").Edge | undefined}
   */
  addEdge(portA, portB, routeId) {
    return this.edgeManager?.addEdge(portA, portB, routeId);
  }

  /**
   * Colors a selected node's expanded port pills by the route of the wire
   * connected to each port (work document #5 update #16, per the original
   * design): the pill carries the route color of the first wire touching
   * that port. Regular edges and IIP/exported-port wires both count — an
   * IIP or an exported port connecting a port colors its pill too.
   *
   * @param {Element} node
   */
  applyPortRouteColors(node) {
    const shadow = /** @type {any} */ (node).shadowRoot;
    if (!shadow) return;
    for (const port of shadow.querySelectorAll(".port")) {
      const indexSuffix =
        port.dataset.portIndex !== undefined
          ? `[data-port-index="${port.dataset.portIndex}"]`
          : "";
      const label = shadow.querySelector(
        `.port-label[data-port-name="${port.dataset.portName}"]${indexSuffix}`,
      );
      if (!label) continue;
      const wire =
        this.edges.find(
          (/** @type {any} */ candidate) =>
            candidate.portA === port || candidate.portB === port,
        ) ??
        this.iipWires.find((/** @type {any} */ wire) => wire.port === port);
      const route = wire?.routeId;
      label.style.setProperty(
        "--port-route-color",
        route !== undefined && route !== null ? `var(--route-${route})` : "",
      );
    }
  }

  /**
   * Animates freshly appeared nodes (work document #5 update #16): nodes
   * that were not on the canvas during the previous render — locally
   * created or arrived over mesh sync — spring in from a zero-size circle
   * and shimmer for a while. The app tracks newness across renders (the
   * editor element is rebuilt per render); this only applies the classes.
   *
   * @param {string[]} nodeIds
   */
  animateNewNodes(nodeIds) {
    for (const id of nodeIds) {
      const node = this.nodeLayer?.querySelector(`[name="${id}"]`);
      if (!node) continue;
      node.classList.add("node-appear", "node-shimmer");
      node.addEventListener(
        "animationend",
        () => {
          node.classList.remove("node-shimmer");
        },
        { once: true },
      );
    }
  }

  /**
   * Sets the graph's groups (work document #5 update #16): the projected
   * view's groups, rendered as bordered regions behind the nodes. Zone
   * styling follows WD #35; this is the structural rendering.
   *
   * @param {Array<{ id: string, name: string, nodes: string[] }>} groups
   */
  setGroups(groups) {
    this.groups = Array.isArray(groups) ? groups : [];
    this.renderGroups();
  }

  /**
   * Computes a group's bounding region in graph coordinates: the member
   * nodes' bounding box plus the group padding. The padding must exceed
   * half a node plus half a grid cell (80/2 + 80/2 = 80), or dropping a
   * node into the adjacent grid cell would fall outside the region.
   *
   * @param {{ id: string, name: string, nodes: string[] }} group
   * @returns {{ x: number, y: number, width: number, height: number } | null}
   */
  groupBounds(group) {
    const size = 80;
    const padding = 48;
    const positions = group.nodes
      .map((id) => this.nodeLayer?.querySelector(`[name="${id}"]`))
      .filter((/** @type {any} */ node) => node?.position);
    if (positions.length === 0) return null;
    const minX = Math.min(
      ...positions.map((/** @type {any} */ node) => node.position.x),
    );
    const minY = Math.min(
      ...positions.map((/** @type {any} */ node) => node.position.y),
    );
    const maxX = Math.max(
      ...positions.map((/** @type {any} */ node) => node.position.x + size),
    );
    const maxY = Math.max(
      ...positions.map((/** @type {any} */ node) => node.position.y + size),
    );
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }

  /**
   * Emits the group-membership changes a drag produced: nodes dropped
   * inside a group's area join it, dropped outside leave it (work document
   * #5 update #16).
   *
   * @param {Array<{ name: string, position: { x: number, y: number } }>} movedNodes
   */
  emitGroupMembershipChanges(movedNodes) {
    if (this.groups.length === 0 || movedNodes.length === 0) return;
    const size = 80;
    /** @type {Array<{ groupId: string, add: string[], remove: string[] }>} */
    const memberships = [];
    for (const group of this.groups) {
      const bounds = this.groupBounds(group);
      if (!bounds) continue;
      /** @type {string[]} */
      const add = [];
      /** @type {string[]} */
      const remove = [];
      for (const moved of movedNodes) {
        const centerX = moved.position.x + size / 2;
        const centerY = moved.position.y + size / 2;
        const inside =
          centerX >= bounds.x &&
          centerX <= bounds.x + bounds.width &&
          centerY >= bounds.y &&
          centerY <= bounds.y + bounds.height;
        const isMember = group.nodes.includes(moved.name);
        if (inside && !isMember) add.push(moved.name);
        if (!inside && isMember) remove.push(moved.name);
      }
      if (add.length > 0 || remove.length > 0) {
        memberships.push({ groupId: group.id, add, remove });
      }
    }
    if (memberships.length > 0) {
      emit(this, "update-group-attempt", { memberships });
    }
  }

  /**
   * Renders the group regions: a padded bounding box around each group's
   * member nodes, labeled with the group's name. Zone styling follows WD
   * #35; this is the structural rendering.
   */
  renderGroups() {
    const layer = /** @type {ShadowRoot} */ (this.shadowRoot).querySelector(
      "#groups-group",
    );
    if (!layer) return;
    layer.innerHTML = "";
    for (const group of this.groups) {
      const bounds = this.groupBounds(group);
      if (!bounds) continue;
      const x = bounds.x + 8000;
      const y = bounds.y + 8000;
      const region = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      region.setAttribute("class", "group-region");
      region.setAttribute("x", String(x));
      region.setAttribute("y", String(y));
      region.setAttribute("width", String(bounds.width));
      region.setAttribute("height", String(bounds.height));
      region.setAttribute("data-group-id", group.id);
      layer.appendChild(region);
      const label = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      label.setAttribute("class", "group-label");
      label.setAttribute("x", String(x + 10));
      label.setAttribute("y", String(y + 20));
      label.textContent = group.name || "Group";
      layer.appendChild(label);
    }
  }

  updateEdges() {
    this.edgeManager?.updateEdges();
    this.renderGroups();
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
   * @param {number} [routeId]
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
   * @param {number} [route] The route index coloring the export wire.
   * @returns {any}
   */
  addExportedPort(x, y, name, direction = "out", port, route) {
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
      /** @type {any} */ (exportedPort).routeId = route;
      // The port's ring wears the route color (guidelines §9); accent
      // fallback when unroute
      if (route !== undefined && route !== null) {
        exportedPort.style.setProperty(
          "--port-route-color",
          `var(--route-${route})`,
        );
      }
      this.edgeManager?.connectIIP(
        /** @type {HTMLElement} */ (exportedPort),
        port,
        route,
      );
    }

    return exportedPort;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {HTMLElement} port
   * @param {string} [value="Value"]
   * @param {number} [route] The route index coloring the IIP wire.
   * @returns {NoFloIIP}
   */
  addIIP(x, y, port, value = "Value", route) {
    const size = 40;
    let centerX = x;
    let centerY = y;

    if (!x && !y && port?.classList.contains("port-in")) {
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
      iip.routeId = route;
      this.edgeManager?.connectIIP(
        /** @type {HTMLElement} */ (iip),
        port,
        route,
      );
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

    emit(this, "port-exported", {
      name: finalName,
      direction: isOutport ? "out" : "in",
      position: finalExportPos,
      process: node.getAttribute("name"),
      port: portName,
      // Addressable exports pin the array slot they were exported from
      // (the canonical port-ref model)
      index:
        port.dataset.portIndex !== undefined
          ? Number.parseInt(port.dataset.portIndex, 10)
          : undefined,
    });
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

    emit(this, "port-removed", { name, direction });

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
        this.selectionManager.iips.size > 0 ||
        this.selectionManager.ports.size > 0)
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
      const type = this.selectionTypeFor(n);
      if (this.selectionManager[type].has(n.getAttribute("name") ?? ""))
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

customElements.define("noflo-editor", FlowEditor);
