/**
 * FlowNode Web Component
 * A circular representation of a NoFlo node.
 * Follows the architecture defined in SPEC.md and work document #1.
 */
import icons from "../../vendor/fa-icon-map.js";

export class FlowNode extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._x = 0;
    this._y = 0;
    this._size = 80;
    this._inPorts = 1;
    this._outPorts = 1;
  }

  get size() {
    return this._size;
  }

  set size(val) {
    this._size = val;
    if (this.shadowRoot) {
      this.style.setProperty("--node-size", `${val}px`);
    }
  }

  get radius() {
    return this._size / 2;
  }

  set position({ x, y }) {
    this._x = x;
    this._y = y;
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
  }

  setMetadata({ name, componentName, icon }) {
    if (name) this.textContent = name;
    if (componentName) {
      const compEl = this.shadowRoot.querySelector(".node-component");
      if (compEl) compEl.textContent = componentName;
    }
    if (icon) {
      const iconEl = this.shadowRoot.querySelector(".node-content");
      if (iconEl) {
        if (icon.startsWith("data:image") || icon.startsWith("http")) {
          iconEl.innerHTML = `<img src="${icon}" class="node-icon-img">`;
        } else if (icon.indexOf("fa-") === 0) {
          const iconName = icon.substr(3);
          iconEl.innerHTML = `<i class="node-icon-fa">${icons()[iconName]}</i>`;
        } else {
          iconEl.textContent = icon; // Assume it's an emoji or font-awesome icon
        }
      }
    }
  }

  get position() {
    return { x: this._x, y: this._y };
  }

  connectedCallback() {
    const sizeAttr = this.getAttribute("size");
    if (sizeAttr) {
      this.size = parseInt(sizeAttr);
    }
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
          width: var(--node-size, 80px);
          height: calc(var(--node-size, 80px) + 30px);
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: grab;
          user-select: none;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          --node-size: 80px;
        }
        .node-circle {
          width: var(--node-size, 80px);
          height: var(--node-size, 80px);
          border-radius: 50%;
          background-color: var(--node-bg, #ccc);
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 1;
          transition: opacity 0.2s;
          position: relative;
          box-shadow: 0 0 10px var(--node-glow, transparent);
        }
        .node-circle::after {
          content: '';
          position: absolute;
          top: var(--node-ring-inset, 4px);
          left: var(--node-ring-inset, 4px);
          right: var(--node-ring-inset, 4px);
          bottom: var(--node-ring-inset, 4px);
          border-radius: 50%;
          border: var(--node-stroke-width, 2px) solid var(--node-border, #333);
          pointer-events: none;
          z-index: 1;
        }
        .node-content {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: calc(var(--node-size, 80px) * 0.3);
          text-align: center;
          color: var(--node-icon, inherit);
        }
        .node-info {
          text-align: center;
          margin-top: 4px;
          pointer-events: none;
          z-index: 1;
        }
        .node-name {
          font-size: 12px;
          font-weight: bold;
          color: var(--node-text, #333);
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: var(--node-size, 80px);
        }
        .node-component {
          font-size: 10px;
          color: var(--node-subtext, #666);
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: var(--node-size, 80px);
        }
        .node-icon-fa {
          font-family: 'Font Awesome 7 Free';
          font-style: normal;
        }

        /* Semantic Zooming: Use clamp() to create a binary switch based on --zoom-scale */
        .node-component, .port-label {
          opacity: clamp(0, (var(--zoom-scale) - 0.6) * 100, 1);
          pointer-events: none;
        }

        .node-name {
          opacity: clamp(0, (var(--zoom-scale) - 0.5) * 100, 1);
          pointer-events: none;
        }

        .port {
          opacity: clamp(0, (var(--zoom-scale) - 0.2) * 100, 1);
        }

        .node-content i {
          font-size: calc(var(--node-size, 80px) * 0.4);
        }

        :host([selected]) {
          transform: scale(1.15);
          z-index: 10;
        }
        :host([selected]) .node-circle {
          box-shadow: 0 0 15px var(--node-glow), 0 0 30px var(--node-glow);
        }
        :host([selected]) .node-circle::after {
          border-color: var(--node-border);
          border-width: 3px;
        }
        .port {
          position: absolute;
          width: 12px;
          height: 12px;
          background-color: var(--node-border, #333);
          border: 2px solid var(--node-bg, #fff);
          border-radius: 50%;
          z-index: 2;
          cursor: grab;
          transition: opacity 0.2s, transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s;
        }
        .port-label {
          position: absolute;
          font-size: 10px;
          color: var(--node-text, #666);
          white-space: nowrap;
          pointer-events: none;
          z-index: 2;
          transition: opacity 0.2s;
        }
        .port:hover {
          background-color: #007bff;
          transform: scale(1.2);
        }
        .port-compatible {
          background-color: var(--ui-accent, #007bff) !important;
          transform: scale(1.8) !important;
          box-shadow: 0 0 10px var(--ui-accent, #007bff);
          z-index: 10;
        }
        .port-incompatible {
          transform: scale(0.5) !important;
          opacity: 0.4 !important;
        }
        .node-icon-img {
          width: calc(var(--node-size, 80px) * 0.5);
          height: calc(var(--node-size, 80px) * 0.5);
          object-fit: contain;
        }
      </style>
      <div class="node-circle">
        <div class="node-content"></div>
      </div>
      <div class="node-info">
        <span class="node-name">
          <slot></slot>
        </span>
        <span class="node-component"></span>
      </div>
      <div id="ports-container" style="position: absolute; top: 0; left: 0; width: var(--node-size, 80px); height: var(--node-size, 80px);"></div>
    `;
    this.portsContainer = this.shadowRoot.getElementById("ports-container");
    // Render ports based on stored config or defaults
    this.renderPorts(this._inPorts, this._outPorts);
  }

  renderPorts(inPorts, outPorts) {
    if (!this.portsContainer) return;
    this.portsContainer.innerHTML = "";

    // Ensure we are working with arrays of configurations
    const processPorts = (ports) => {
      if (Array.isArray(ports)) return ports;
      if (typeof ports === "number")
        return Array(ports).fill({ type: "regular" });
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
    const type = cfg.type || "regular";
    const size = cfg.size || 1;

    const angleRange = Math.PI * 0.5;
    const centerAngle = isOutport ? 0 : Math.PI;
    const fraction = totalPorts > 1 ? index / (totalPorts - 1) : 0.5;
    const baseAngle = centerAngle + (fraction - 0.5) * angleRange;

    if (type === "regular") {
      const pos = {
        x: this.radius * Math.cos(baseAngle),
        y: this.radius * Math.sin(baseAngle),
      };
      this.addPortElement(pos, isOutport, name, "regular");
    } else if (type === "array") {
      // Use an angular step that makes 12px circles almost touch
      // Chord length approx 13px -> angle approx 0.32 radians
      const angularStep = 0.32;
      const direction = isOutport ? 1 : -1;

      for (let i = 0; i < size; i++) {
        const instanceName = `${name}[${i}]`;
        const angle =
          baseAngle + direction * (i - (size - 1) / 2) * angularStep;
        const instancePos = {
          x: this.radius * Math.cos(angle),
          y: this.radius * Math.sin(angle),
        };
        this.addPortElement(instancePos, isOutport, instanceName, "array");
      }
    }
  }

  addPortElement(pos, isOutport, name, type) {
    const port = document.createElement("div");
    port.className = `port ${isOutport ? "port-out" : "port-in"}`;

    port.dataset.portName = name;
    port.dataset.portType = type;

    // All ports are now 12px (radius 6px)
    port.style.left = `${this.radius + pos.x - 6}px`;
    port.style.top = `${this.radius + pos.y - 6}px`;

    const label = document.createElement("div");
    label.className = "port-label";
    label.textContent = name;

    label.style.left = `${this.radius + pos.x + (isOutport ? 14 : -14)}px`;
    label.style.top = `${this.radius + pos.y}px`;
    label.style.transform = isOutport
      ? "translateY(-50%)"
      : "translate(-100%, -50%)";
    label.style.textAlign = isOutport ? "left" : "right";

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
      y: radius * Math.sin(angle),
    };
  }
}
