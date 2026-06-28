/**
 * FlowEditor Web Component
 * A zoomable canvas for editing NoFlo graphs.
 * Follows the architecture defined in SPEC.md and work document #1.
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
    this.zoom = 1.0;
    this.offset = { x: 0, y: 0 };
    this.isPanning = false;
    this.isDraggingNode = false;
    this.isDraggingWire = false;
    this.lastPointerPos = { x: 0, y: 0 };
    this.selectedNode = null;
    this.activePointers = new Map();
    this.initialPinchDistance = 0;
    this.initialZoom = 1.0;
    this.initialOffset = { x: 0, y: 0 };
    this.selectedNodes = new Set();
    this.selectedEdges = new Set();
    this.selectMode = false;
    this.ghostNode = null;
    this.stillnessTimer = null;
    this.panDistance = 0;
    this.didPinch = false;
    this.lastPinchCenter = null;
    this.lastPinchDistance = 0;
    this.activityMap = new Map();
    this.panningPointerId = null;
    this.draggingNodePointerId = null;
    this.draggingWirePointerId = null;
    this.wasClickOnSelectedNode = false;
    this.clickedNode = null;
    this.heatmapInterval = null;
    this.radialMenu = null;
    this.longPressTimer = null;
    this.selectionChangedOnDown = false;
  }

  connectedCallback() {
    this._syncWithBody();
    this.render();
    this.setupInteractions();

    this.radialMenu = document.createElement("noflo-radial-menu");
    this.shadowRoot.appendChild(this.radialMenu);

    // Observe changes on body
    this._bodyObserver = new MutationObserver(() => this._syncWithBody());
    this._bodyObserver.observe(document.body, { attributes: true });
  }

  disconnectedCallback() {
    if (this._bodyObserver) {
      this._bodyObserver.disconnect();
    }
    if (this.heatmapInterval) {
      clearInterval(this.heatmapInterval);
    }
  }

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

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
          touch-action: none;
          user-select: none;
          --zoom-scale: 1.0;
          background-color: var(--ui-bg);
        }

        /* TUBE THEME OVERRIDES - Removed since moved to main.css */

        /* CYBERPUNK AGES - Removed since moved to main.css */

        /* TUBE AGES - Removed since moved to main.css */

        #viewport {
          width: 100%;
          height: 100%;
          position: relative;
          cursor: grab;
          overflow: hidden;
          user-select: none;
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
        #svg-layer, #grid-layer, #heatmap-canvas {
          position: absolute;
          top: -8000px;
          left: -8000px;
          width: 16000px;
          height: 16000px;
          pointer-events: none;
        }
        #svg-layer {
          z-index: 3;
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
          z-index: 2;
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
          border-radius: 50%;
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
          <div id="node-layer"></div>
          <svg id="svg-layer">
            <g id="edges-group" transform="translate(8000, 8000)"></g>
          </svg>
        </div>
      </div>
    `;
    this.viewport = this.shadowRoot.getElementById("viewport");
    this.transformLayer = this.shadowRoot.getElementById("transform-layer");
    this.heatmapCanvas = this.shadowRoot.getElementById("heatmap-canvas");
    this.gridLayer = this.shadowRoot.getElementById("grid-layer");
    this.svgLayer = this.shadowRoot.getElementById("svg-layer");
    this.edgesGroup = this.shadowRoot.getElementById("edges-group");
    this.nodeLayer = this.shadowRoot.getElementById("node-layer");

    // Using a smaller canvas and scaling it up for performance
    this.heatmapCanvas.width = 800;
    this.heatmapCanvas.height = 800;
    this.heatmapCanvas.height = 800;

    this.startHeatmapLoop();
    this.updateTransform();
  }

  startHeatmapLoop() {
    const gridSize = 40;
    const ctx = this.heatmapCanvas.getContext("2d");

    this.heatmapInterval = setInterval(() => {
      if (!ctx) return;
      ctx.clearRect(0, 0, this.heatmapCanvas.width, this.heatmapCanvas.height);

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
        // Scale coordinates down to fit the smaller canvas
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

  recordActivity(worldX, worldY) {
    const gridSize = 40;
    const col = Math.floor(worldX / gridSize);
    const row = Math.floor(worldY / gridSize);
    const key = `${col},${row}`;

    const currentHeat = this.activityMap.get(key) || 0;
    this.activityMap.set(key, Math.min(currentHeat + 0.25, 1.0));
  }

  updateTransform() {
    this.transformLayer.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.zoom})`;
    this.style.setProperty("--zoom-scale", this.zoom);
  }

  clientToGraph(clientX, clientY) {
    const rect = this.getBoundingClientRect();
    return this.viewportToGraph(clientX - rect.left, clientY - rect.top);
  }

  viewportToGraph(viewportX, viewportY) {
    return {
      x: (viewportX - this.offset.x) / this.zoom,
      y: (viewportY - this.offset.y) / this.zoom,
    };
  }

  graphToViewport(graphX, graphY) {
    return {
      x: graphX * this.zoom + this.offset.x,
      y: graphY * this.zoom + this.offset.y,
    };
  }

  graphToClient(graphX, graphY) {
    const rect = this.getBoundingClientRect();
    const viewportPos = this.graphToViewport(graphX, graphY);
    return {
      x: viewportPos.x + rect.left,
      y: viewportPos.y + rect.top,
    };
  }

  fitNodesToViewport() {
    const nodes = this.shadowRoot.querySelectorAll("noflo-node");
    if (nodes.length === 0) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    nodes.forEach((node) => {
      const pos = node.position;
      const size = node.size;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + size);
      maxY = Math.max(maxY, pos.y + size);
    });

    const padding = 100;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    const rect = this.getBoundingClientRect();
    const viewportWidth = rect.width;
    const viewportHeight = rect.height;

    const zoomX = viewportWidth / contentWidth;
    const zoomY = viewportHeight / contentHeight;
    this.zoom = Math.min(zoomX, zoomY, 1.0);

    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    this.offset.x = viewportWidth / 2 - contentCenterX * this.zoom;
    this.offset.y = viewportHeight / 2 - contentCenterY * this.zoom;

    this.updateTransform();
  }

  getNodeName(node) {
    return node.getAttribute("name");
  }

  getEdgeId(edge) {
    const portA = edge.portA;
    const portB = edge.portB;
    const nodeA = portA.closest("noflo-node");
    const nodeB = portB.closest("noflo-node");

    const nameA = nodeA ? nodeA.getAttribute("name") : "unknown";
    const nameB = nodeB ? nodeB.getAttribute("name") : "unknown";
    const portAName = portA.dataset.portName;
    const portBName = portB.dataset.portName;
    const portAIdx = portA.dataset.portIndex || "0";
    const portBIdx = portB.dataset.portIndex || "0";

    return `${nameA}:${portAName}[${portAIdx}]->${nameB}:${portBName}[${portBIdx}]`;
  }

  emitSelectionChanged() {
    this.dispatchEvent(
      new CustomEvent("selection-changed", {
        detail: {
          nodes: Array.from(this.selectedNodes).map((n) => this.getNodeName(n)),
          edges: Array.from(this.selectedEdges).map((e) => this.getEdgeId(e)),
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  setupInteractions() {
    this.addEventListener("pointerdown", (e) => {
      this.activePointers.set(e.pointerId, e);

      if (this.activePointers.size === 2) {
        this.startPinchZoom(e);
        return;
      }

      const path = e.composedPath();
      const clickedPort = path.find((el) => el.classList?.contains("port"));
      const clickedNode = path.find((el) => el.tagName === "NOFLO-NODE");
      const clickedEdge = path.find(
        (el) =>
          el.classList?.contains("edge-flow") ||
          el.classList?.contains("edge-hit-area"),
      );

      const isModifier = e.ctrlKey || e.shiftKey;
      const isTouch = e.pointerType === "touch";
      const isMultiple = isModifier || (isTouch && this.selectMode);

      if (clickedPort && e.button === 0) {
        e.stopPropagation();

        // ArrayPort restriction: ignore drag if already connected
        if (clickedPort.dataset.portType === "array") {
          const hasConnection = this.edges?.some(
            (edge) => edge.portA === clickedPort || edge.portB === clickedPort,
          );
          if (hasConnection) {
            return;
          }
        }

        this.startWireDrag(e, clickedPort);
      } else if (clickedNode) {
        e.stopPropagation();
        this.handleNodeSelection(e, clickedNode, isMultiple);
      } else if (clickedEdge) {
        e.stopPropagation();
        this.handleEdgeSelection(e, clickedEdge, isMultiple);
      } else {
        this.startCanvasPan(e);
        if (!isModifier && !this.selectMode) {
          this.clearSelection();
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

        if (this.isPanning && !this.radialMenu.isOpen) {
          if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
          }
          this.offset.x += dx;
          this.offset.y += dy;
          this.updateTransform();
          this.panDistance += Math.hypot(dx, dy);
          this.viewport.style.cursor = "grabbing";
        } else if (
          this.draggingNodePointerId === e.pointerId &&
          this.selectedNodes.size > 0 &&
          !this.radialMenu.isOpen
        ) {
          if (Math.hypot(dx, dy) > 3) {
            this.isDraggingNode = true;
            if (this.longPressTimer) {
              clearTimeout(this.longPressTimer);
              this.longPressTimer = null;
            }
          }

          if (this.isDraggingNode) {
            const proposedMoves = [];
            let collision = false;

            this.selectedNodes.forEach((node) => {
              const pos = node.position;
              const newX = pos.x + dx / this.zoom;
              const newY = pos.y + dy / this.zoom;

              // Check collision against nodes NOT in the selection
              const otherNodes = this.shadowRoot.querySelectorAll("noflo-node");
              for (const other of otherNodes) {
                if (this.selectedNodes.has(other)) continue;
                const otherPos = other.position;
                if (
                  Math.max(Math.abs(newX - otherPos.x), Math.abs(newY - otherPos.y)) < other.size
                ) {
                  collision = true;
                  break;
                }
              }
              if (!collision) {
                proposedMoves.push({ node, x: newX, y: newY });
              }
            });

            if (!collision) {
              proposedMoves.forEach(({ node, x, y }) => {
                node.position = { x, y };
              });
              this.updateEdges();
            } else {
              this.viewport.style.cursor = "no-drop";
            }
          }
        } else if (this.isDraggingWire && !this.radialMenu.isOpen) {
          if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
          }
          this.updateWireDrag(e);
        } else if (!this.isPanning && !this.isDraggingNode && !this.isDraggingWire) {
          // Hover state
          const interest = this.getInterestArea(e.clientX, e.clientY);
          if (interest.type !== FlowEditor.INTEREST_AREA_TYPES.NONE) {
            this.viewport.style.cursor = "grab";
          } else {
            this.viewport.style.cursor = "grab"; // default is grab anyway, but for consistency
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
          const movedNodes = [];
          this.selectedNodes.forEach((node) => {
            node.position = this.snapToGrid(node.position.x, node.position.y);
            movedNodes.push({
              name: this.getNodeName(node),
              position: node.position,
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

      // If selection becomes empty, exit select mode
      if (this.selectedNodes.size === 0 && this.selectedEdges.size === 0) {
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

        // Zoom toward pointer
        const rect = this.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        this.offset.x -= (mouseX - this.offset.x) * (this.zoom / oldZoom - 1);
        this.offset.y -= (mouseY - this.offset.y) * (this.zoom / oldZoom - 1);

        this.updateTransform();
      },
      { passive: false },
    );

    this.viewport.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.handleContextMenu(e);
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (this.selectedNodes.size > 0) {
          this.dispatchEvent(
            new CustomEvent("node-removal-attempt", {
              detail: { nodes: Array.from(this.selectedNodes) },
              bubbles: true,
              composed: true,
            }),
          );
        } else if (this.selectedEdges.size > 0) {
          // For edges, we might need to handle it differently since removal
          // usually takes a single edge or a specific set.
          // But if multiple are selected, we should probably remove all of them.
          this.selectedEdges.forEach((edge) => {
            this.dispatchEvent(
              new CustomEvent("edge-removal-attempt", {
                detail: { edge },
                bubbles: true,
                composed: true,
              }),
            );
          });
        }
      }
    });
  }

  handleContextMenu(e) {
    const path = e.composedPath();
    const clickedPort = path.find((el) => el.classList?.contains("port"));
    const clickedNode = path.find((el) => el.tagName === "NOFLO-NODE");
    const clickedEdge = path.find(
      (el) =>
        el.classList?.contains("edge-flow") ||
        el.classList?.contains("edge-hit-area"),
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

  showContextMenu(x, y, context) {
    // biome-ignore lint/correctness/noUnusedVariables: We will add port menus soon enough
    const { clickedPort, clickedNode, clickedEdge } = context;

    const items = [];

    if (clickedNode) {
      this.dispatchEvent(
        new CustomEvent("node-menu-open", {
          detail: { node: this.getNodeName(clickedNode), x, y },
          bubbles: true,
          composed: true,
        }),
      );
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
        text: "Open",
        onClick: () => {
          this.dispatchEvent(
            new CustomEvent("navigate-down-attempt", {
              detail: { node: this.getNodeName(clickedNode) },
              bubbles: true,
              composed: true,
            }),
          );
        },
        icon: "folder-open",
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
    } else if (clickedEdge) {
      const edge = this.edges.find(
        (edge) =>
          edge.hitPath === clickedEdge || edge.visualPath === clickedEdge,
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
      this.dispatchEvent(
        new CustomEvent("canvas-menu-open", {
          detail: { x, y, type: "canvas" },
          bubbles: true,
          composed: true,
        }),
      );
      items.push({
        text: "Add Node",
        onClick: () => {
          const graphPos = this.viewportToGraph(x, y);
          this.addNode(`Node_${Date.now().toString().slice(-4)}`, graphPos.x, graphPos.y);
        },
        icon: "plus",
      });
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

    this.radialMenu.open(
      x,
      y,
      items,
      clickedNode
        ? clickedNode.shadowRoot.querySelector(".node-content").innerHTML
        : null,
    );
  }

  startCanvasPan(e) {
    this.viewport.setPointerCapture(e.pointerId);
    this.isPanning = true;
    this.panningPointerId = e.pointerId;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
  }

  startPinchZoom() {
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

  handlePinchZoom() {
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

    const zoomFactor = currentDistance / prevDistance;
    const newZoom = Math.max(0.1, Math.min(5, this.zoom * zoomFactor));
    const actualZoomFactor = newZoom / this.zoom;

    // 1. Zoom around the current center
    this.offset.x =
      currentCenter.x - (currentCenter.x - this.offset.x) * actualZoomFactor;
    this.offset.y =
      currentCenter.y - (currentCenter.y - this.offset.y) * actualZoomFactor;

    this.zoom = newZoom;

    // 2. Pan by the movement of the center
    const dx = currentCenter.x - prevCenter.x;
    const dy = currentCenter.y - prevCenter.y;
    this.offset.x += dx;
    this.offset.y += dy;

    this.updateTransform();

    this.lastPinchCenter = currentCenter;
    this.lastPinchDistance = currentDistance;
  }

  getDistance(p1, p2) {
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  handleNodeSelection(e, node, isMultiple) {
    this.clickedNode = node;

    if (isMultiple) {
      if (this.selectMode) {
        this.radialMenu.close();
      }
      if (!this.selectedNodes.has(node)) {
        this.selectedNodes.add(node);
        node.setAttribute("selected", "");
        this.selectionChangedOnDown = true;
      } else {
        this.selectionChangedOnDown = false;
      }
    } else {
      if (this.selectedNodes.has(node) && this.selectedNodes.size === 1) {
        this.selectionChangedOnDown = false;
      } else {
        this.clearNodeSelection(false);
        this.selectedNodes.add(node);
        node.setAttribute("selected", "");
        this.selectionChangedOnDown = true;
      }
    }

    node.setPointerCapture(e.pointerId);
    this.draggingNodePointerId = e.pointerId;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };

    this.emitSelectionChanged();

    // Long press for select mode
    this.longPressTimer = setTimeout(() => {
      this.selectMode = true;
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.showContextMenu(x, y, { clickedNode: node });
    }, 500);
  }

  commitNodeSelection(node, isMultiple) {
    if (this.selectionChangedOnDown) return;

    if (isMultiple) {
      if (this.selectedNodes.has(node)) {
        this.selectedNodes.delete(node);
        node.removeAttribute("selected");
      }
    } else {
      if (this.selectedNodes.has(node) && this.selectedNodes.size === 1) {
        this.selectedNodes.delete(node);
        node.removeAttribute("selected");
      }
    }

    this.emitSelectionChanged();
  }

  handleEdgeSelection(e, edgeElement, isMultiple) {
    const edge = this.edges.find(
      (edge) => edge.hitPath === edgeElement || edge.visualPath === edgeElement,
    );
    if (!edge) return;

    if (isMultiple) {
      if (this.selectMode) {
        this.radialMenu.close();
      }
      if (this.selectedEdges.has(edge)) {
        this.selectedEdges.delete(edge);
        edge.visualPath.removeAttribute("selected");
      } else {
        this.selectedEdges.add(edge);
        edge.visualPath.setAttribute("selected", "");
      }
    } else {
      if (this.selectedEdges.has(edge) && this.selectedEdges.size === 1) {
        this.selectedEdges.delete(edge);
        edge.visualPath.removeAttribute("selected");
      } else {
        this.clearEdgeSelection(false);
        this.selectedEdges.add(edge);
        edge.visualPath.setAttribute("selected", "");
      }
    }

    this.emitSelectionChanged();
  }

  startNodeDrag(e, node) {
    // This method is now deprecated in favor of handleNodeSelection
  }

  clearSelection(emit = true) {
    this.selectedNodes.forEach((node) => {
      node.removeAttribute("selected");
    });
    this.selectedNodes.clear();

    this.clearEdgeSelection(false);

    if (this.selectedNodes.size === 0 && this.selectedEdges.size === 0) {
      this.selectMode = false;
    }

    if (emit) {
      this.emitSelectionChanged();
    }
  }

  clearNodeSelection(emit = true) {
    this.selectedNodes.forEach((node) => {
      node.removeAttribute("selected");
    });
    this.selectedNodes.clear();

    if (this.selectedNodes.size === 0 && this.selectedEdges.size === 0) {
      this.selectMode = false;
    }

    if (emit) {
      this.emitSelectionChanged();
    }
  }

  clearEdgeSelection(emit = true) {
    this.selectedEdges.forEach((edge) => {
      edge.visualPath.removeAttribute("selected");
    });
    this.selectedEdges.clear();

    if (this.selectedNodes.size === 0 && this.selectedEdges.size === 0) {
      this.selectMode = false;
    }

    if (emit) {
      this.emitSelectionChanged();
    }
  }

  startWireDrag(e, port) {
    this.viewport.setPointerCapture(e.pointerId);
    this.isDraggingWire = true;
    this.draggingWirePointerId = e.pointerId;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
    this.dragPort = port;

    // Create temporary wire
    this.activeWire = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    this.activeWire.setAttribute("stroke", "#666");
    this.activeWire.setAttribute("stroke-width", "2");
    this.activeWire.setAttribute("fill", "none");
    this.activeWire.setAttribute("stroke-dasharray", "5,5");
    this.edgesGroup.appendChild(this.activeWire);
  }

  updateWireDrag(e) {
    if (!this.activeWire || !this.dragPort) return;

    const portPos = this.getPortPosition(this.dragPort);
    const { x: mouseX, y: mouseY } = this.clientToGraph(e.clientX, e.clientY);

    this.activeWire.setAttribute(
      "d",
      `M ${portPos.x} ${portPos.y} L ${mouseX} ${mouseY}`,
    );

    this._updatePortHighlights(e.clientX, e.clientY);

    // Ghost node logic for new node creation
    const _dist = Math.hypot(
      e.clientX - this.lastPointerPos.x,
      e.clientY - this.lastPointerPos.y,
    );

    const interest = this.getInterestArea(e.clientX, e.clientY);

    if (interest.type === FlowEditor.INTEREST_AREA_TYPES.PORT) {
      this.removeGhostNode();
      if (this.stillnessTimer) {
        clearTimeout(this.stillnessTimer);
        this.stillnessTimer = null;
      }
    } else {
      const size = 80;
      const snapped = this.snapToGrid(mouseX - size / 2, mouseY - size / 2);

      if (this.ghostNode) {
        this.ghostNode.style.left = `${snapped.x}px`;
        this.ghostNode.style.top = `${snapped.y}px`;
      } else if (
        !this.stillnessTimer &&
        this.hasSpaceForNode(mouseX, mouseY, size)
      ) {
        this.stillnessTimer = setTimeout(() => {
          this.showGhostNode(snapped.x, snapped.y, size);
        }, 200);
      }
    }

    // Cursor state for wire dragging
    const interestArea = this.getInterestArea(e.clientX, e.clientY);
    if (interestArea.type === FlowEditor.INTEREST_AREA_TYPES.PORT) {
      const port = interestArea.element;
      const isDragOut = this.dragPort.classList.contains("port-out");
      const portIsOut = port.classList.contains("port-out");
      if (isDragOut === portIsOut) {
        this.viewport.style.cursor = "no-drop";
      } else {
        this.viewport.style.cursor = "grabbing";
      }
    } else {
      this.viewport.style.cursor = "grabbing";
    }
  }

  _updatePortHighlights(clientX, clientY) {
    const nodes = this.shadowRoot.querySelectorAll("noflo-node");
    const isDragOut = this.dragPort.classList.contains("port-out");
    const highlightThreshold = 100;

    nodes.forEach((node) => {
      const ports = node.shadowRoot.querySelectorAll(".port");
      ports.forEach((port) => {
        const rect = port.getBoundingClientRect();
        const portCenterX = rect.left + rect.width / 2;
        const portCenterY = rect.top + rect.height / 2;
        const dist = Math.hypot(clientX - portCenterX, clientY - portCenterY);

        if (dist < highlightThreshold) {
          const isPortOut = port.classList.contains("port-out");
          let isCompatible = isDragOut !== isPortOut;

          // ArrayPort restriction: only one connection allowed
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
  }

  hasSpaceForNode(x, y, size = 80) {
    const snapped = this.snapToGrid(x - size / 2, y - size / 2);
    const nodes = this.shadowRoot.querySelectorAll("noflo-node");

    for (const node of nodes) {
      const pos = node.position;
      // No overlap if max(|dx|, |dy|) >= max(node.size, size)
      if (
        Math.max(Math.abs(snapped.x - pos.x), Math.abs(snapped.y - pos.y)) <
          Math.max(node.size, size)
      ) {
        return false;
      }
    }
    return true;
  }

  showGhostNode(x, y, size = 80) {
    this.ghostNode = document.createElement("div");
    this.ghostNode.className = "ghost-node";
    this.ghostNode.textContent = "new";
    this.ghostNode.style.setProperty("--ghost-size", `${size}px`);
    this.ghostNode.style.left = `${x}px`;
    this.ghostNode.style.top = `${y}px`;
    this.nodeLayer.appendChild(this.ghostNode);
  }

  removeGhostNode() {
    if (this.ghostNode) {
      this.nodeLayer.removeChild(this.ghostNode);
      this.ghostNode = null;
    }
  }

  _clearPortHighlights() {
    const nodes = this.shadowRoot.querySelectorAll("noflo-node");
    nodes.forEach((node) => {
      const ports = node.shadowRoot.querySelectorAll(".port");
      ports.forEach((port) => {
        port.classList.remove("port-compatible", "port-incompatible");
      });
    });
  }

  completeWireDrag(e) {
    let clickedPort = null;
    let minDist = Infinity;
    const threshold = 20; // px

    // Search all nodes for the closest port
    const nodes = this.shadowRoot.querySelectorAll("noflo-node");
    nodes.forEach((node) => {
      const ports = node.shadowRoot.querySelectorAll(".port");
      ports.forEach((port) => {
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

    if (clickedPort && clickedPort !== this.dragPort) {
      const startPort = this.dragPort;
      const endPort = clickedPort;

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
      // Create new node at ghost node position
      const { x: mouseX, y: mouseY } = this.clientToGraph(e.clientX, e.clientY);
      const size = 80;
      const snapped = this.snapToGrid(mouseX - size / 2, mouseY - size / 2);

      this.dispatchEvent(
        new CustomEvent("node-creation-attempt", {
          detail: { x: snapped.x, y: snapped.y, startPort: this.dragPort },
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
    if (this.activeWire) {
      this.edgesGroup.removeChild(this.activeWire);
      this.activeWire = null;
    }
  }

  getPortPosition(port) {
    const rect = port.getBoundingClientRect();
    const componentRect = this.getBoundingClientRect();
    return this.viewportToGraph(
      rect.left + rect.width / 2 - componentRect.left,
      rect.top + rect.height / 2 - componentRect.top,
    );
  }

  addEdge(portA, portB, routeId) {
    // portA must be outport, portB must be inport
    if (
      !portA.classList.contains("port-out") ||
      !portB.classList.contains("port-in")
    ) {
      console.error("Invalid connection: expected outport -> inport");
      return;
    }

    // Enforcement: ArrayPorts allow only one connection
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

    this.edgesGroup.appendChild(hitPath);
    this.edgesGroup.appendChild(visualPath);

    this.edges = this.edges || [];
    this.edges.push({ hitPath, visualPath, portA, portB, routeId });
  }

  updatePathData(hitPath, visualPath, portA, portB) {
    const posA = this.getPortPosition(portA);
    const posB = this.getPortPosition(portB);

    // Improved cubic bezier for a smoother \"swoosh\"
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

  snapToGrid(x, y) {
    const H = 40;
    return {
      x: Math.round(x / H) * H,
      y: Math.round(y / H) * H,
    };
  }

  connectNodes(nodeA, portAName, nodeB, portBName, routeId) {
    const portA = nodeA.shadowRoot.querySelector(
      `.port[data-port-name="${portAName}"]`,
    );
    const portB = nodeB.shadowRoot.querySelector(
      `.port[data-port-name="${portBName}"]`,
    );

    if (portA && portB) {
      this.addEdge(portA, portB, routeId);
    } else {
      console.warn(`Could not connect ${portAName} to ${portBName}`);
    }
  }

  addNode(name, x, y, inPorts = 1, outPorts = 1, size = 80) {
    const snapped = this.snapToGrid(x, y);
    const node = document.createElement("noflo-node");
    node.setAttribute("name", name);
    node.setAttribute("size", size);
    node.textContent = name;
    node.position = snapped;
    node.setPorts(inPorts, outPorts);
    this.nodeLayer.appendChild(node);
    return node;
  }

  getInterestArea(clientX, clientY) {
    const rect = this.viewport.getBoundingClientRect();

    // 2. Check Dynamic Areas
    // We check these in order of priority.
    // If dragging a wire, ports are the most important.
    if (this.isDraggingWire) {
      const port = this._getNearestPort(clientX, clientY);
      if (port) {
        return { type: FlowEditor.INTEREST_AREA_TYPES.PORT, element: port };
      }
    }

    // If dragging nodes, other nodes are the most important.
    if (this.isDraggingNode && this.selectedNodes.size > 0) {
      const node = this._getNearestNode(clientX, clientY);
      if (node) {
        return { type: FlowEditor.INTEREST_AREA_TYPES.NODE, element: node };
      }
    }

    return { type: FlowEditor.INTEREST_AREA_TYPES.NONE, element: null };
  }

  _getNearestPort(clientX, clientY) {
    const nodes = this.shadowRoot.querySelectorAll("noflo-node");
    let nearestPort = null;
    let minDist = Infinity;
    const threshold = 20; // px

    for (const node of nodes) {
      const ports = node.shadowRoot.querySelectorAll(".port");
      for (const port of ports) {
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
    return nearestPort;
  }

  _getNearestNode(clientX, clientY) {
    const nodes = this.shadowRoot.querySelectorAll("noflo-node");
    for (const node of nodes) {
      if (this.selectedNodes.has(node)) continue;
      const rect = node.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return node;
      }
    }
    return null;
  }
}
