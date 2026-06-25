/**
 * FlowEditor Web Component
 * A zoomable canvas for editing NoFlo graphs.
 * Follows the architecture defined in editor.md.
 */
export class FlowEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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
  }

  connectedCallback() {
    this.render();
    this.setupInteractions();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background-color: #f8f9fa;
          position: relative;
          touch-action: none;
          --zoom-scale: 1.0;
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
        #svg-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 10000px;
          height: 10000px;
          pointer-events: none;
          z-index: 1;
        }
        #node-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 10000px;
          height: 10000px;
          z-index: 2;
        }
        .grid-pattern {
          fill: url(#grid);
        }
      </style>
      <div id="viewport">
        <svg id="svg-layer">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ddd" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" class="grid-pattern" />
          <g id="edges-group"></g>
        </svg>
        <div id="node-layer"></div>
      </div>
    `;
    this.viewport = this.shadowRoot.getElementById('viewport');
    this.svgLayer = this.shadowRoot.getElementById('svg-layer');
    this.edgesGroup = this.shadowRoot.getElementById('edges-group');
    this.nodeLayer = this.shadowRoot.getElementById('node-layer');
    this.updateTransform();
  }

  updateTransform() {
    this.viewport.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.zoom})`;
    this.style.setProperty('--zoom-scale', this.zoom);
  }

  setupInteractions() {
    this.addEventListener('pointerdown', (e) => {
      this.activePointers.set(e.pointerId, e);
      
      if (this.activePointers.size === 2) {
        this.startPinchZoom(e);
        return;
      }

      const path = e.composedPath();
      const clickedPort = path.find(el => el.classList && el.classList.contains('port'));
      const clickedNode = path.find(el => el.tagName === 'FLOW-NODE');

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

    window.addEventListener('pointermove', (e) => {
      this.activePointers.set(e.pointerId, e);

      if (this.activePointers.size === 2) {
        this.handlePinchZoom(e);
        return;
      }

      const dx = e.clientX - this.lastPointerPos.x;
      const dy = e.clientY - this.lastPointerPos.y;

      if (this.isPanning) {
        this.offset.x += dx;
        this.offset.y += dy;
        this.updateTransform();
      } else if (this.isDraggingNode && this.selectedNodes.size > 0) {
        this.selectedNodes.forEach(node => {
          const pos = node.position;
          node.position = {
            x: pos.x + dx / this.zoom,
            y: pos.y + dy / this.zoom
          };
        });
        this.updateEdges();
      } else if (this.isDraggingWire) {
        this.updateWireDrag(e);
      }

      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointerup', (e) => {
      this.activePointers.delete(e.pointerId);
      
      if (this.activePointers.size < 2) {
        this.initialPinchDistance = 0;
      }

      this.isPanning = false;
      this.isDraggingNode = false;
      this.isDraggingWire = false;
      if (this.activeWire) {
        this.completeWireDrag(e);
      }
    });

    this.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      const delta = -e.deltaY;
      const oldZoom = this.zoom;
      this.zoom *= (1 + delta * zoomSpeed);
      this.zoom = Math.max(0.1, Math.min(5, this.zoom));

      // Zoom toward pointer
      const rect = this.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.offset.x -= (mouseX - this.offset.x) * (this.zoom / oldZoom - 1);
      this.offset.y -= (mouseY - this.offset.y) * (this.zoom / oldZoom - 1);

      this.updateTransform();
    }, { passive: false });
  }

  startCanvasPan(e) {
    this.viewport.setPointerCapture(e.pointerId);
    this.isPanning = true;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
  }

  startPinchZoom() {
    const pointers = Array.from(this.activePointers.values());
    const p1 = pointers[0];
    const p2 = pointers[1];
    
    this.initialPinchDistance = this.getDistance(p1, p2);
    this.initialZoom = this.zoom;
    this.initialOffset = { ...this.offset };
  }

  handlePinchZoom() {
    const pointers = Array.from(this.activePointers.values());
    const p1 = pointers[0];
    const p2 = pointers[1];
    
    const currentDistance = this.getDistance(p1, p2);
    if (this.initialPinchDistance === 0) return;

    const ratio = currentDistance / this.initialPinchDistance;
    const newZoom = Math.max(0.1, Math.min(5, this.initialZoom * ratio));
    
    // Center of pinch
    const centerX = (p1.clientX + p2.clientX) / 2;
    const centerY = (p1.clientY + p2.clientY) / 2;

    // Zoom towards center
    const zoomFactor = newZoom / this.initialZoom;
    this.offset.x = this.initialOffset.x - (centerX - this.initialOffset.x) * (zoomFactor - 1);
    this.offset.y = this.initialOffset.y - (centerY - this.initialOffset.y) * (zoomFactor - 1);
    
    this.zoom = newZoom;
    this.updateTransform();
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
    node.setAttribute('selected', '');
    
    node.setPointerCapture(e.pointerId);
    this.isDraggingNode = true;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
  }

  clearSelection() {
    this.selectedNodes.forEach(node => node.removeAttribute('selected'));
    this.selectedNodes.clear();
  }

  startWireDrag(e, port) {
    this.isDraggingWire = true;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
    this.dragPort = port;

    // Create temporary wire
    this.activeWire = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.activeWire.setAttribute('stroke', '#666');
    this.activeWire.setAttribute('stroke-width', '2');
    this.activeWire.setAttribute('fill', 'none');
    this.activeWire.setAttribute('stroke-dasharray', '5,5');
    this.edgesGroup.appendChild(this.activeWire);
  }

  updateWireDrag(e) {
    if (!this.activeWire || !this.dragPort) return;

    const portPos = this.getPortPosition(this.dragPort);
    const rect = this.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - this.offset.x) / this.zoom;
    const mouseY = (e.clientY - rect.top - this.offset.y) / this.zoom;

    this.activeWire.setAttribute('d', `M ${portPos.x} ${portPos.y} L ${mouseX} ${mouseY}`);
  }

  completeWireDrag(e) {
    const target = e.target;
    const clickedPort = target.closest('.port');
    
    if (clickedPort && clickedPort !== this.dragPort) {
      this.addEdge(this.dragPort, clickedPort);
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
      x: (rect.left - viewportRect.left) / this.zoom,
      y: (rect.top - viewportRect.top) / this.zoom
    };
  }

  addEdge(portA, portB) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke', '#333');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    
    const posA = this.getPortPosition(portA);
    const posB = this.getPortPosition(portB);
    
    // Simple cubic bezier for the wire
    const cp1x = posA.x + (posB.x - posA.x) / 2;
    const cp1y = posA.y;
    const cp2x = posA.x + (posB.x - posA.x) / 2;
    const cp2y = posB.y;
    
    path.setAttribute('d', `M ${posA.x} ${posA.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${posB.x} ${posB.y}`);
    this.edgesGroup.appendChild(path);
    
    // Store the edge for updates
    this.edges = this.edges || [];
    this.edges.push({ path, portA, portB });
  }

  updateEdges() {
    if (!this.edges) return;
    this.edges.forEach(edge => {
      const posA = this.getPortPosition(edge.portA);
      const posB = this.getPortPosition(edge.portB);
      const cp1x = posA.x + (posB.x - posA.x) / 2;
      const cp1y = posA.y;
      const cp2x = posA.x + (posB.x - posA.x) / 2;
      const cp2y = posB.y;
      edge.path.setAttribute('d', `M ${posA.x} ${posA.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${posB.x} ${posB.y}`);
    });
  }

  addNode(name, x, y, inPorts = 1, outPorts = 1) {
    const node = document.createElement('flow-node');
    node.textContent = name;
    node.position = { x, y };
    node.setPorts(inPorts, outPorts);
    this.nodeLayer.appendChild(node);
    return node;
  }
}
