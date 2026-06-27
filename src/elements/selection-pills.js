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
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 5px 12px;
          border-radius: 20px;
          font-family: sans-serif;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: auto;
          border: 1px solid #444;
          box-shadow: 0 2px 5px rgba(0,0,0,0.5);
          cursor: default;
        }
        .selection-pill .clear-btn {
          cursor: pointer;
          font-weight: bold;
          color: #aaa;
          transition: color 0.2s;
        }
        .selection-pill .clear-btn:hover {
          color: white;
        }
      </style>
      <div class="pills-container"></div>
    `;
    this.updatePills();
  }
}
