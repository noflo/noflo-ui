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

  setPorts(inCount, outCount) {
    this.renderPorts(inCount, outCount);
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
        
        /* Semantic Zooming: hide text when zoomed out */
        @container style(--zoom-scale < 0.5) {
          .node-label {
            opacity: 0;
            pointer-events: none;
          }
        }

        /* Hide ports when zoomed out very far */
        @container style(--zoom-scale < 0.2) {
          .port {
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
    // Default ports if not set
    this.renderPorts(1, 1);
  }

  renderPorts(inCount, outCount) {
    if (!this.portsContainer) return;
    this.portsContainer.innerHTML = '';

    // Inports (left side: PI/2 to 3PI/2)
    for (let i = 0; i < inCount; i++) {
      this.createPort(i, inCount, false);
    }
    // Outports (right side: -PI/2 to PI/2)
    for (let i = 0; i < outCount; i++) {
      this.createPort(i, outCount, true);
    }
  }

  createPort(index, totalPorts, isOutport) {
    const port = document.createElement('div');
    port.className = `port ${isOutport ? 'port-out' : 'port-in'}`;
    
    const pos = this.calculatePortPosition(this.radius, index, totalPorts, isOutport);
    
    // Position is relative to the node's top-left (0,0)
    // Center is at (radius, radius)
    port.style.left = `${this.radius + pos.x - 6}px`;
    port.style.top = `${this.radius + pos.y - 6}px`;
    
    this.portsContainer.appendChild(port);
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
