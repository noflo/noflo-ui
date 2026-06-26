/**
 * FlowEditor Web Component
 * A zoomable canvas for editing NoFlo graphs.
 * Follows the architecture defined in editor.md.
 */
export class FlowEditor extends HTMLElement {
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
  }

  connectedCallback() {
    this._syncWithBody();
    this.render();
    this.setupInteractions();

    // Observe changes on body
    this._bodyObserver = new MutationObserver(() => this._syncWithBody());
    this._bodyObserver.observe(document.body, { attributes: true });
  }

  disconnectedCallback() {
    if (this._bodyObserver) {
      this._bodyObserver.disconnect();
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
          --zoom-scale: 1.0;
          background-color: var(--ui-bg);

          /* Base Variables (Cyberpunk Dark) */
          --ui-bg: rgb(20, 27, 35);
          --heatmap-color: rgb(138, 106, 50);
          --dot-color: #444;
          --node-stroke-width: 2px;
          --edge-width: 4px;
          --node-ring-inset: 4px;

          --node-bg: #111;
          --node-border: #444;
          --node-glow: transparent;
          --node-text: #aaa;
          --node-subtext: #666;
          --node-icon: rgb(0, 229, 255);

          --flow-color: #333;
          --flow-dash: none;
          --edge-color: #333;

          /* Cyberpunk Hues for sub-flows */
          --hue-1: 180deg; /* Cyan */
          --hue-2: 280deg; /* Purple */
          --color-1: hsl(var(--hue-1), 100%, 50%);
          --color-2: hsl(var(--hue-2), 100%, 50%);
        }

        /* TUBE THEME OVERRIDES */
        :host([data-theme="tube"]) {
          --ui-bg: white;
          --heatmap-color: rgb(126, 126, 126);
          --dot-color: #ccc;
          --font-family: 'Helvetica Neue', Arial, sans-serif;
          --node-bg: white;
          --node-border: #777;
          --node-glow: transparent;
          --node-text: #333;
          --node-icon: #777;
          --edge-width: 8px;
          --node-stroke-width: 8px;
          --node-ring-inset: 0px;

          /* Authentic Tube Colors */
          --color-piccadilly: #003688; /* Flow 1: Blue */
          --color-central:    #E32017; /* Flow 2: Red */
          --color-circle:     #FFD300; /* Flow 3: Yellow */
          --color-district:   #00782A; /* Flow 4: Green */
        }

        /* CYBERPUNK AGES */
        :host([data-theme="cyberpunk"].state-abstract),
        :host([data-theme="cyberpunk"]) flow-node.state-abstract {
          --node-bg: rgb(58, 63, 72);
          --node-border: rgb(20, 27, 35);
          --node-icon: rgb(0, 229, 255);
          --node-glow: transparent;
          --flow-color: rgb(58, 63, 72);
          --flow-dash: 0;
          --node-ring-inset: 4px;
        }
        :host([data-theme="cyberpunk"].state-golden),
        :host([data-theme="cyberpunk"]) flow-node.state-golden {
          --node-bg: rgb(62, 82, 93);
          --node-border: rgb(0, 229, 255);
          --node-icon: rgb(0, 229, 255);
          --node-glow: rgba(176, 235, 236, 0.4);
          --flow-color: rgb(0, 229, 255);
          --flow-dash: 0;
          --node-ring-inset: 4px;
        }
        :host([data-theme="cyberpunk"].state-golden) {
          --ui-bg: rgb(31, 41, 49);
        }
        :host([data-theme="cyberpunk"].state-offline),
        :host([data-theme="cyberpunk"]) flow-node.state-offline {
          --node-bg: rgb(62, 76, 82);
          --node-border: rgb(101, 114, 125);
          --node-icon: rgb(101, 114, 125);
          --node-glow: transparent;
          --flow-color: rgb(101, 114, 125);
          --flow-dash: 5,5;
          --node-ring-inset: 4px;
        }
        :host([data-theme="cyberpunk"].state-crashed),
        :host([data-theme="cyberpunk"]) flow-node.state-crashed {
          --node-border: rgb(226, 150, 133);
          --node-bg: rgb(77, 60, 59);
          --node-icon: rgb(226, 150, 133);
          --node-glow: rgb(226, 150, 133);
          --flow-color: rgb(226, 150, 133);
          --flow-dash: 5,5;
          --node-ring-inset: 4px;
        }

        /* TUBE AGES */
        :host([data-theme="tube"].state-abstract),
        :host([data-theme="tube"]) flow-node.state-abstract {
          --node-bg: white;
          --node-border: #777;
          --node-icon: black;
          --flow-color: #777;
          --flow-dash: 0;
        }
        :host([data-theme="tube"].state-golden),
        :host([data-theme="tube"]) flow-node.state-golden {
          --node-bg: white;
          --node-border: black;
          --node-icon: black;
          --flow-color: black;
          --flow-dash: 0;
        }
        :host([data-theme="tube"].state-offline),
        :host([data-theme="tube"]) flow-node.state-offline {
          --node-bg: white;
          --node-border: #777;
          --node-icon: #777;
          --flow-color: #777;
          --flow-dash: 5,5;
        }
        :host([data-theme="tube"].state-crashed),
        :host([data-theme="tube"]) flow-node.state-crashed {
          --node-bg: white;
          --node-border: rgb(227, 32, 23);
          --node-icon: black;
          --flow-color: #777;
          --flow-dash: 5,5;
        }

        #viewport {
          width: 100%;
          height: 100%;
          position: relative;
          cursor: grab;
          transform-origin: 0 0;
        }
        #viewport:active {
          cursor: grabbing;
        }
        #svg-layer, #heatmap-canvas {
          position: absolute;
          top: -8000px;
          left: -8000px;
          width: 16000px;
          height: 16000px;
          pointer-events: none;
        }
        #svg-layer {
          z-index: 1;
          overflow: visible;
        }
        #node-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
        }
        #heatmap-canvas {
          z-index: 0;
          image-rendering: pixelated;
        }
        .grid-pattern {
          fill: url(#grid);
        }
        .ghost-node {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px dashed #aaa;
          background-color: rgba(255, 255, 255, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #aaa;
          pointer-events: none;
          z-index: 3;
          box-sizing: border-box;
        }
        .edge-flow {
          fill: none;
          stroke: var(--flow-color, var(--edge-color));
          stroke-width: calc(var(--edge-width, 4px) - 2px);
          stroke-dasharray: var(--flow-dash);
        }
      </style>
      <div id="viewport">
        <canvas id="heatmap-canvas"></canvas>
        <svg id="svg-layer">
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
          <g id="edges-group" transform="translate(8000, 8000)"></g>
        </svg>
        <div id="node-layer"></div>
      </div>
    `;
    this.viewport = this.shadowRoot.getElementById("viewport");
    this.heatmapCanvas = this.shadowRoot.getElementById("heatmap-canvas");
    this.svgLayer = this.shadowRoot.getElementById("svg-layer");
    this.edgesGroup = this.shadowRoot.getElementById("edges-group");
    this.nodeLayer = this.shadowRoot.getElementById("node-layer");

    // Using a smaller canvas and scaling it up for performance
    this.heatmapCanvas.width = 800;
    this.heatmapCanvas.height = 800;

    this.startHeatmapLoop();
    this.updateTransform();
  }

  startHeatmapLoop() {
    const gridSize = 40;
    const ctx = this.heatmapCanvas.getContext("2d");

    setInterval(() => {
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
    this.viewport.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.zoom})`;
    this.style.setProperty("--zoom-scale", this.zoom);
  }

  fitNodesToViewport() {
    const nodes = this.shadowRoot.querySelectorAll("flow-node");
    if (nodes.length === 0) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    nodes.forEach((node) => {
      const pos = node.position;
      const size = 80;
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

  setupInteractions() {
    this.addEventListener("pointerdown", (e) => {
      this.activePointers.set(e.pointerId, e);

      if (this.activePointers.size === 2) {
        this.startPinchZoom(e);
        return;
      }

      const path = e.composedPath();
      const clickedPort = path.find((el) => el.classList?.contains("port"));
      const clickedNode = path.find((el) => el.tagName === "FLOW-NODE");

      if (clickedPort) {
        e.stopPropagation();
        this.startWireDrag(e, clickedPort);
      } else if (clickedNode) {
        e.stopPropagation();
        this.startNodeDrag(e, clickedNode);
      } else {
        this.startCanvasPan(e);
      }
    });

    window.addEventListener("pointermove", (e) => {
      this.activePointers.set(e.pointerId, e);

      if (this.activePointers.size === 2) {
        this.handlePinchZoom(e);
      } else {
        const dx = e.clientX - this.lastPointerPos.x;
        const dy = e.clientY - this.lastPointerPos.y;

        if (this.isPanning) {
          this.offset.x += dx;
          this.offset.y += dy;
          this.updateTransform();
          this.panDistance += Math.hypot(dx, dy);
        } else if (this.isDraggingNode && this.selectedNodes.size > 0) {
          this.selectedNodes.forEach((node) => {
            const pos = node.position;
            node.position = {
              x: pos.x + dx / this.zoom,
              y: pos.y + dy / this.zoom,
            };
          });
          this.updateEdges();
        } else if (this.isDraggingWire) {
          this.updateWireDrag(e);
        }
      }

      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("pointerup", (e) => {
      this.activePointers.delete(e.pointerId);

      if (this.activePointers.size < 2) {
        this.initialPinchDistance = 0;
      }

      if (e.pointerId === this.panningPointerId) {
        if (this.isPanning && this.panDistance < 5 && !this.didPinch) {
          this.clearSelection();
        }
        this.isPanning = false;
        this.panDistance = 0;
        this.panningPointerId = null;
      }

      if (e.pointerId === this.draggingNodePointerId) {
        this.selectedNodes.forEach((node) => {
          node.position = this.snapToGrid(node.position.x, node.position.y);
        });
        this.updateEdges();
        this.isDraggingNode = false;
        this.draggingNodePointerId = null;
      }

      if (e.pointerId === this.draggingWirePointerId) {
        this.isDraggingWire = false;
        this.draggingWirePointerId = null;
        if (this.activeWire) {
          this.completeWireDrag(e);
        }
      }

      if (this.activePointers.size === 0) {
        this.didPinch = false;
        this.lastPinchCenter = null;
        this.lastPinchDistance = 0;
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

  startNodeDrag(e, node) {
    if (!e.shiftKey) {
      this.clearSelection();
    }

    this.selectedNodes.add(node);
    node.setAttribute("selected", "");

    node.setPointerCapture(e.pointerId);
    this.isDraggingNode = true;
    this.draggingNodePointerId = e.pointerId;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
  }

  clearSelection() {
    this.selectedNodes.forEach((node) => {
      node.removeAttribute("selected");
    });
    this.selectedNodes.clear();
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
    const rect = this.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - this.offset.x) / this.zoom;
    const mouseY = (e.clientY - rect.top - this.offset.y) / this.zoom;

    this.activeWire.setAttribute(
      "d",
      `M ${portPos.x} ${portPos.y} L ${mouseX} ${mouseY}`,
    );

    // Ghost node logic for new node creation
    const dist = Math.hypot(
      e.clientX - this.lastPointerPos.x,
      e.clientY - this.lastPointerPos.y,
    );

    if (this.isOverPort(e.clientX, e.clientY) || dist > 2) {
      this.removeGhostNode();
      if (this.stillnessTimer) {
        clearTimeout(this.stillnessTimer);
        this.stillnessTimer = null;
      }
    } else if (
      !this.ghostNode &&
      !this.stillnessTimer &&
      this.hasSpaceForNode(mouseX, mouseY)
    ) {
      this.stillnessTimer = setTimeout(() => {
        const snapped = this.snapToGrid(mouseX - 40, mouseY - 40);
        this.showGhostNode(snapped.x, snapped.y);
      }, 200);
    }
  }

  hasSpaceForNode(x, y) {
    const snapped = this.snapToGrid(x - 40, y - 40);
    const nodes = this.shadowRoot.querySelectorAll("flow-node");

    for (const node of nodes) {
      const pos = node.position;
      // No overlap if max(|dx|, |dy|) >= 80
      if (
        Math.max(Math.abs(snapped.x - pos.x), Math.abs(snapped.y - pos.y)) < 80
      ) {
        return false;
      }
    }
    return true;
  }

  showGhostNode(x, y) {
    this.ghostNode = document.createElement("div");
    this.ghostNode.className = "ghost-node";
    this.ghostNode.textContent = "new";
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

  isOverPort(clientX, clientY) {
    const nodes = this.shadowRoot.querySelectorAll("flow-node");
    for (const node of nodes) {
      const ports = node.shadowRoot.querySelectorAll(".port");
      for (const port of ports) {
        const rect = port.getBoundingClientRect();
        const dx = clientX - (rect.left + rect.width / 2);
        const dy = clientY - (rect.top + rect.height / 2);
        if (Math.sqrt(dx * dx + dy * dy) < 20) return true;
      }
    }
    return false;
  }

  completeWireDrag(e) {
    let clickedPort = null;
    let minDist = Infinity;
    const threshold = 20; // px

    // Search all nodes for the closest port
    const nodes = this.shadowRoot.querySelectorAll("flow-node");
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
        this.addEdge(startPort, endPort);
      } else if (!startIsOut && endIsOut) {
        this.addEdge(endPort, startPort);
      } else {
        console.warn(
          "Cannot connect ports of the same type (both in or both out)",
        );
      }
    } else if (this.ghostNode) {
      // Create new node at ghost node position
      const rect = this.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - this.offset.x) / this.zoom;
      const mouseY = (e.clientY - rect.top - this.offset.y) / this.zoom;
      const snapped = this.snapToGrid(mouseX - 40, mouseY - 40);

      const newNode = this.addNode("New Node", snapped.x, snapped.y);
      const isOut = this.dragPort.classList.contains("port-out");

      // Connect to the first available port of opposite type
      const targetPort = newNode.shadowRoot.querySelector(
        `.port${isOut ? "-in" : "-out"}`,
      );
      if (targetPort) {
        if (isOut) {
          this.addEdge(this.dragPort, targetPort);
        } else {
          this.addEdge(targetPort, this.dragPort);
        }
      }
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
    const viewportRect = this.viewport.getBoundingClientRect();
    return {
      x: (rect.left + rect.width / 2 - viewportRect.left) / this.zoom,
      y: (rect.top + rect.height / 2 - viewportRect.top) / this.zoom,
    };
  }

  addEdge(portA, portB) {
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

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("edge-flow");

    this.updatePathData(path, portA, portB);
    this.edgesGroup.appendChild(path);

    this.edges = this.edges || [];
    this.edges.push({ path, portA, portB });
  }

  updatePathData(path, portA, portB) {
    const posA = this.getPortPosition(portA);
    const posB = this.getPortPosition(portB);

    // Improved cubic bezier for a smoother \"swoosh\"
    const dx = Math.abs(posB.x - posA.x) * 0.5;
    const cp1x = posA.x + (posB.x > posA.x ? dx : -dx);
    const cp1y = posA.y;
    const cp2x = posB.x + (posB.x > posA.x ? -dx : dx);
    const cp2y = posB.y;

    path.setAttribute(
      "d",
      `M ${posA.x} ${posA.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${posB.x} ${posB.y}`,
    );
  }

  updateEdges() {
    if (!this.edges) return;
    this.edges.forEach((edge) => {
      this.updatePathData(edge.path, edge.portA, edge.portB);
    });
  }

  snapToGrid(x, y) {
    const H = 40;
    return {
      x: Math.round(x / H) * H,
      y: Math.round(y / H) * H,
    };
  }

  connectNodes(nodeA, portAName, nodeB, portBName) {
    const portA = nodeA.shadowRoot.querySelector(
      `.port[data-port-name="${portAName}"]`,
    );
    const portB = nodeB.shadowRoot.querySelector(
      `.port[data-port-name="${portBName}"]`,
    );

    if (portA && portB) {
      this.addEdge(portA, portB);
    } else {
      console.warn(`Could not connect ${portAName} to ${portBName}`);
    }
  }

  addNode(name, x, y, inPorts = 1, outPorts = 1) {
    const snapped = this.snapToGrid(x, y);
    const node = document.createElement("flow-node");
    node.textContent = name;
    node.position = snapped;
    node.setPorts(inPorts, outPorts);
    this.nodeLayer.appendChild(node);
    return node;
  }
}
