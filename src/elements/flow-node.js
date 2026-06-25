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
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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
        :host([selected]) {
          transform: scale(1.15);
          z-index: 10;
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
    
    const angleRange = Math.PI * 0.5;
    const centerAngle = isOutport ? 0 : Math.PI;
    const fraction = totalPorts > 1 ? index / (totalPorts - 1) : 0.5;
    const baseAngle = centerAngle + (fraction - 0.5) * angleRange;
    
    if (type === 'regular') {
      const pos = {
        x: this.radius * Math.cos(baseAngle),
        y: this.radius * Math.sin(baseAngle)
      };
      this.addPortElement(pos, isOutport, name, 'regular');
    } else if (type === 'array') {
      // Use an angular step that makes 12px circles almost touch
      // Chord length approx 13px -> angle approx 0.32 radians
      const angularStep = 0.32; 
      const direction = isOutport ? 1 : -1;

      for (let i = 0; i < size; i++) {
        const instanceName = `${name}[${i}]`;
        const angle = baseAngle + direction * (i - (size - 1) / 2) * angularStep;
        const instancePos = { 
          x: this.radius * Math.cos(angle), 
          y: this.radius * Math.sin(angle) 
        };
        this.addPortElement(instancePos, isOutport, instanceName, 'array');
      }
    }
  }

  addPortElement(pos, isOutport, name, type) {
    const port = document.createElement('div');
    port.className = `port ${isOutport ? 'port-out' : 'port-in'}`;
    
    port.dataset.portName = name;
    port.dataset.portType = type;
    
    // All ports are now 12px (radius 6px)
    port.style.left = `${this.radius + pos.x - 6}px`;
    port.style.top = `${this.radius + pos.y - 6}px`;
    
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
    const angleRange = Math.PI * 0.5; // Use 50% of the semicircle for a more compact cluster
    const centerAngle = isOutport ? 0 : Math.PI;
    const fraction = totalPorts > 1 ? index / (totalPorts - 1) : 0.5;
    const angle = centerAngle + (fraction - 0.5) * angleRange;

    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
  }
}
