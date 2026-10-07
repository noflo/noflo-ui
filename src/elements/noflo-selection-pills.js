/**
 * SelectionPills Web Component
 * Displays the number of selected nodes and edges, and provides a way to clear the selection.
 */
import { emit, on } from "../events.js";

export class SelectionPills extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {import("../library/SelectionManager.js").SelectionManager | null} */
    this._selectionManager = null;
  }

  connectedCallback() {
    this.render();
  }

  /**
   * @param {import("../library/SelectionManager.js").SelectionManager} val
   */
  set selectionManager(val) {
    this._selectionManager = val;
    on(this._selectionManager, "selection-changed", () => {
      this.updatePills();
    });
  }

  /**
   * @returns {import("../library/SelectionManager.js").SelectionManager | null}
   */
  get selectionManager() {
    return this._selectionManager;
  }

  updatePills() {
    const nodesCount = this._selectionManager?.nodes.size || 0;
    const iipsCount = this._selectionManager?.iips.size || 0;
    const edgesCount = this._selectionManager?.edges.size || 0;
    const container = this.shadowRoot?.querySelector(".pills-container");

    if (!container) return;

    container.innerHTML = "";

    if (nodesCount > 0) {
      const pill = this.createPill(`${nodesCount} nodes`, "nodes");
      container.appendChild(pill);
    }

    if (iipsCount > 0) {
      const pill = this.createPill(`${iipsCount} IIPs`, "iips");
      container.appendChild(pill);
    }

    if (edgesCount > 0) {
      const pill = this.createPill(`${edgesCount} edges`, "edges");
      container.appendChild(pill);
    }
  }

  /**
   * @param {string} text
   * @param {string} type
   * @returns {HTMLElement}
   */
  createPill(text, type) {
    const pill = document.createElement("div");
    pill.className = "selection-pill";
    // The clear affordance is a real button so keyboard and touch paths
    // both activate it (guidelines §13); the label names what it clears
    pill.innerHTML = `<span>${text}</span><button type="button" class="clear-btn" aria-label="Clear ${text}">x</button>`;
    const clearBtn = /** @type {HTMLElement} */ (
      pill.querySelector(".clear-btn")
    );
    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        emit(this, "clear-selection", { type });
      });
    }
    return pill;
  }

  render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          pointer-events: none;
        }
        .pills-container {
          display: flex;
          gap: 10px;
        }
        .selection-pill {
          background: var(--node-bg);
          color: var(--node-text);
          padding: 4px 12px;
          border-radius: var(--ui-radius);
          font-family: inherit;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: auto;
          border: 1px solid var(--node-border);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: default;
          transition: all 0.2s;
          box-sizing: border-box;
          min-height: var(--ui-target, 44px);
        }
        .selection-pill .clear-btn {
          cursor: pointer;
          appearance: none;
          border: none;
          padding: 0;
          font: inherit;
          flex: none;
          width: var(--ui-target, 44px);
          height: var(--ui-target, 44px);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--node-border);
          font-size: 10px;
          transition: background 0.2s;
          color: var(--node-text);
        }
        .selection-pill .clear-btn:hover {
          background: var(--ui-age-attention, #ff4444);
          color: white;
        }
        .selection-pill .clear-btn:focus-visible {
          background: var(--ui-age-attention, #ff4444);
          color: white;
          outline: 2px solid var(--ui-focus, rgb(68, 138, 255));
          outline-offset: 2px;
        }
        [data-theme="tube"] .selection-pill {
          border: 2px solid black;
          border-radius: 0;
          font-family: sans-serif;
        }
      </style>
      <div class="pills-container"></div>
    `;
    this.updatePills();
  }
}

customElements.define("noflo-selection-pills", SelectionPills);
