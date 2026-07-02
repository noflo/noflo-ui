/**
 * FlowIIP Web Component
 * A squarish pseudonode representing an Initial Information Packet.
 * Follows the architecture defined in SPEC.md and work document #10.
 */
export class FlowIIP extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._x = 0;
    this._y = 0;
    this._size = 40; // Default to 40x40
    this._value = "";
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
      this.style.setProperty("--iip-size", `${val}px`);
    }
  }

  set value(val) {
    this._value = val;
    const valEl = this.shadowRoot?.querySelector(".iip-value");
    if (valEl) {
      valEl.textContent = String(val);
    }
  }

  get value() {
    return this._value;
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
          width: var(--iip-size, 40px);
          height: var(--iip-size, 40px);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          user-select: none;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .iip-box {
          width: 100%;
          height: 100%;
          background-color: var(--node-bg, #ccc);
          border: var(--node-stroke-width, 2px) solid var(--node-border, #333);
          border-radius: 8px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 0 10px var(--node-glow, transparent);
          transition: opacity 0.2s;
        }
        .iip-value {
          font-size: 12px;
          font-family: SourceCodePro, monospace;
          color: var(--node-text, #333);
          text-align: center;
          padding: 4px;
          word-break: break-all;
          opacity: clamp(0, (var(--zoom-scale) - 0.6) * 100, 1);
          pointer-events: none;
        }
        :host([selected]) {
          transform: scale(1.15);
          z-index: 10;
        }
        :host([selected]) .iip-box {
          box-shadow: 0 0 15px var(--node-glow), 0 0 30px var(--node-glow);
          border-color: var(--ui-accent);
          border-width: 3px;
        }
      </style>
      <div class="iip-box">
        <div class="iip-value">${this._value}</div>
      </div>
    `;
  }
}
