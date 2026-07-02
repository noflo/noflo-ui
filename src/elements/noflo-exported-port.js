/**
 * FlowExportedPort Web Component
 * A round pseudonode representing an exported port.
 * Follows the architecture defined in SPEC.md.
 */
export class FlowExportedPort extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._x = 0;
    this._y = 0;
    this._size = 30; // Exported ports might be smaller
    this._name = "";
    this._direction = "out"; // default to out
  }

  set direction(val) {
    this._direction = val;
    this.classList.toggle("port-in", val === "in");
    this.classList.toggle("port-out", val === "out");
  }

  get direction() {
    return this._direction;
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

  get size() {
    return this._size;
  }

  set size(val) {
    this._size = val;
    if (this.shadowRoot) {
      this.style.setProperty("--exported-port-size", `${val}px`);
    }
  }

  set name(val) {
    this._name = val;
    const nameEl = this.shadowRoot?.querySelector(".port-name-label");
    if (nameEl) {
      nameEl.textContent = val;
    }
  }

  get name() {
    return this._name;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: absolute;
          width: var(--exported-port-size, 20px);
          height: calc(var(--exported-port-size, 20px) + 20px);
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: grab;
          user-select: none;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .port-box {
          width: var(--exported-port-size, 20px);
          height: var(--exported-port-size, 20px);
          background-color: var(--node-bg, #ccc);
          border: var(--node-stroke-width, 2px) solid var(--node-border, #333);
          border-radius: 50%;
          position: relative;
          box-shadow: 0 0 10px var(--node-glow, transparent);
          transition: opacity 0.2s;
        }
        .port-name-label {
          font-size: 10px;
          font-family: SourceCodePro, monospace;
          color: var(--node-text, #333);
          text-align: center;
          margin-top: 4px;
          white-space: nowrap;
          opacity: clamp(0, (var(--zoom-scale) - 0.5) * 100, 1);
          pointer-events: none;
        }
        :host([selected]) {
          transform: scale(1.15);
          z-index: 10;
        }
        :host([selected]) .port-box {
          box-shadow: 0 0 15px var(--node-glow), 0 0 30px var(--node-glow);
          border-color: var(--ui-accent);
          border-width: 3px;
        }
      </style>
      <div class="port-box port"></div>
      <div class="port-name-label">${this._name}</div>
    `;
  }
}
