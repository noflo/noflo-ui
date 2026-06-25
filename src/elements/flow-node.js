/**
 * FlowNode Web Component
 * A circular representation of a NoFlo node.
 * Follows the architecture defined in editor.md.
 */
export class FlowNode extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._x = 0;
    this._y = 0;
    this.radius = 40;
    this._inPorts = 1;
    this._outPorts = 1;
  }

  set position({ x, y }) {
    this._x = x;
    this._y = y;
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
  }

  get position() {
    return { x: this._x, y: this._y };
  }

  connectedCallback() {
    this.render();
  }

  setPorts(inPorts, outPorts) {
    this._inPorts = inPorts;
    this._outPorts = outPorts;
    
    if (this.portsContainer) {
      this.renderPorts(this._inPorts, this._outPorts);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: absolute;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          transition: transform 0.2s;
        }
        .node-circle {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: white;
          border: 2px solid #333;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: 12px;
          padding: 10px;
          box-sizing: border-box;
          overflow: hidden;
          word-break: break-all;
          pointer-events: none;
          z-index: 1;
          transition: opacity 0.2s;
        }
        
        /* Semantic Zooming: Stage 1 - Hide everything but node circle and edges */
        @container style(--zoom-scale < 0.2) {
          .port, .node-label, .port-label {
            opacity: 0;
            pointer-events: none;
          }
        }

        /* Stage 2 - Show ports */
        @container style(--zoom-scale < 0.4) {
          .node-label, .port-label {
            opacity: 0;
            pointer-events: none;
          }
        }

        /* Stage 3 - Show node labels */
        @container style(--zoom-scale < 0.8) {
          .port-label {
            opacity: 0;
            pointer-events: none;
          }
        }
        :host([selected]) .node-circle {
          border-color: #007bff;
          box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.3);
        }
        .port {
          position: absolute;
          width: 12px;
          height: 12px;
          background-color: #333;
          border: 2px solid white;
          border-radius: 50%;
          z-index: 2;
          cursor: crosshair;
          transition: opacity 0.2s;
        }
        .port-label {
          position: absolute;
          font-size: 10px;
          color: #666;
          white-space: nowrap;
          pointer-events: none;
          z-index: 2;
          transition: opacity 0.2s;
        }
        .port:hover {
          background-color: #007bff;
          transform: scale(1.2);
        }
      </style>
      <div class="node-circle">
        <div class="node-label">
          <slot></slot>
        </div>
      </div>
      <div id="ports-container"></div>
    `;
    this.portsContainer = this.shadowRoot.getElementById('ports-container');
    // Render ports based on stored config or defaults
    this.renderPorts(this._inPorts, this._outPorts);
  }

  renderPorts(inPorts, outPorts) {
    if (!this.portsContainer) return;
    this.portsContainer.innerHTML = '';

    // Ensure we are working with arrays of configurations
    const processPorts = (ports) => {
      if (Array.isArray(ports)) return ports;
      if (typeof ports === 'number') return Array(ports).fill({ type: 'regular' });
      return [];
    };

    const processedIn = processPorts(inPorts);
    const processedOut = processPorts(outPorts);

    // Inports (left side: PI/2 to 3PI/2)
    processedIn.forEach((portCfg, i) => {
      this.createPort(i, processedIn.length, false, portCfg);
    });
    // Outports (right side: -PI/2 to PI/2)
    processedOut.forEach((portCfg, i) => {
      this.createPort(i, processedOut.length, true, portCfg);
    });
  }

  createPort(index, totalPorts, isOutport, cfg) {
    const name = cfg.name || (isOutport ? `out${index}` : `in${index}`);
    const type = cfg.type || 'regular';
    const size = cfg.size || 1;
    
    const pos = this.calculatePortPosition(this.radius, index, totalPorts, isOutport);
    
    if (type === 'regular') {
      this.addPortElement(pos, isOutport, name, 'regular');
    } else if (type === 'array') {
      // Render stacked instances
      for (let i = 0; i < size; i++) {
        const instanceName = `${name}[${i}]`;
        const offset = (i - (size - 1) / 2) * 8; // Vertical stack offset
        const instancePos = { x: pos.x, y: pos.y + offset };
        this.addPortElement(instancePos, isOutport, instanceName, 'array');
      }
    }
  }

  addPortElement(pos, isOutport, name, type) {
    const port = document.createElement('div');
    port.className = `port ${isOutport ? 'port-out' : 'port-in'}`;
    if (type === 'array') {
      port.style.width = '6px';
      port.style.height = '6px';
    }
    
    port.dataset.portName = name;
    port.dataset.portType = type;
    
    // Position is relative to the node's top-left (0,0)
    // Center is at (radius, radius)
    const radiusOffset = type === 'array' ? 3 : 6;
    port.style.left = `${this.radius + pos.x - radiusOffset}px`;
    port.style.top = `${this.radius + pos.y - radiusOffset}px`;
    
    const label = document.createElement('div');
    label.className = 'port-label';
    label.textContent = name;
    
    label.style.left = `${this.radius + pos.x + (isOutport ? 14 : -14)}px`;
    label.style.top = `${this.radius + pos.y}px`;
    label.style.transform = isOutport 
      ? 'translateY(-50%)' 
      : 'translate(-100%, -50%)';
    label.style.textAlign = isOutport ? 'left' : 'right';

    this.portsContainer.appendChild(port);
    this.portsContainer.appendChild(label);
  }

  calculatePortPosition(radius, index, totalPorts, isOutport) {
    const angleRange = Math.PI;
    const offset = isOutport ? -Math.PI / 2 : Math.PI / 2;
    const fraction = totalPorts > 1 ? index / (totalPorts - 1) : 0.5;
    const angle = offset + (fraction * angleRange);

    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
  }
}
