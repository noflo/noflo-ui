/**
 * SelectionPills Web Component
 * Displays the number of selected nodes and edges, and provides a way to clear the selection.
 */

export class SelectionPills extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  static get observedAttributes() {
    return ["nodes-count", "edges-count"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.updatePills();
    }
  }

  updatePills() {
    const nodesCount = parseInt(this.getAttribute("nodes-count") || "0", 10);
    const edgesCount = parseInt(this.getAttribute("edges-count") || "0", 10);
    const container = this.shadowRoot.querySelector(".pills-container");

    if (!container) return;

    container.innerHTML = "";

    if (nodesCount > 0) {
      const pill = this.createPill(`${nodesCount} nodes`, "nodes");
      container.appendChild(pill);
    }

    if (edgesCount > 0) {
      const pill = this.createPill(`${edgesCount} edges`, "edges");
      container.appendChild(pill);
    }
  }

  createPill(text, type) {
    const pill = document.createElement("div");
    pill.className = "selection-pill";
    pill.innerHTML = `<span>${text}</span><span class="clear-btn">x</span>`;
    pill.querySelector(".clear-btn").onclick = () => {
      this.dispatchEvent(new CustomEvent("clear-selection", {
        detail: { type },
        bubbles: true,
        composed: true,
      }));
    };
    return pill;
  }

  render() {
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
          font-family: SourceCodePro, monospace;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: auto;
          border: 1px solid var(--node-border);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: default;
          transition: all 0.2s;
        }
        .selection-pill .clear-btn {
          cursor: pointer;
          width: 16px;
          height: 16px;
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
          background: #ff4444;
          color: white;
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
