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

  setPorts(inCount, outCount, inLabels = [], outLabels = []) {
    this.renderPorts(inCount, outCount, inLabels, outLabels);
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
    // Default ports if not set
    this.renderPorts(1, 1);
  }

  renderPorts(inCount, outCount, inLabels = [], outLabels = []) {
    if (!this.portsContainer) return;
    this.portsContainer.innerHTML = '';

    // Inports (left side: PI/2 to 3PI/2)
    for (let i = 0; i < inCount; i++) {
      this.createPort(i, inCount, false, inLabels[i] || `in${i}`);
    }
    // Outports (right side: -PI/2 to PI/2)
    for (let i = 0; i < outCount; i++) {
      this.createPort(i, outCount, true, outLabels[i] || `out${i}`);
    }
  }

  createPort(index, totalPorts, isOutport, labelText) {
    const port = document.createElement('div');
    port.className = `port ${isOutport ? 'port-out' : 'port-in'}`;
    
    const pos = this.calculatePortPosition(this.radius, index, totalPorts, isOutport);
    
    // Position is relative to the node's top-left (0,0)
    // Center is at (radius, radius)
    port.style.left = `${this.radius + pos.x - 6}px`;
    port.style.top = `${this.radius + pos.y - 6}px`;
    
    const label = document.createElement('div');
    label.className = 'port-label';
    label.textContent = labelText;
    
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
