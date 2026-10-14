/**
 * @file Minimap (work document #5): the canvas overview — tiny node dots
 * and node-to-node lines (guidelines §12), muted except the viewport
 * rectangle; tap or drag navigates. The geometry comes from the shared
 * pure layout (src/library/minimap.js), which the expanded-node subgraph
 * depiction will reuse.
 *
 * Shadow DOM; the host is positioned by the owner (the editor docks it
 * bottom-left, away from the occupied corners). Both themes resolve via
 * the `--ui-*` variables.
 */

import { emit } from "../events.js";
import { minimapLayout, minimapPointToGraph } from "../library/minimap.js";

export class FlowMinimap extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {any} */
    this._view = { processes: {}, connections: [] };
    /** @type {any} */
    this._viewport = null;
    /** Whether a pointer drag is navigating. */
    this._navigating = false;
  }

  connectedCallback() {
    this.render();
  }

  /**
   * Refreshes in place with a new graph view and camera viewport.
   *
   * @param {any} view The projected graph view (`projectGraph`).
   * @param {{ x: number, y: number, w: number, h: number } | null} viewport
   *   The visible viewport in graph coordinates.
   */
  update(view, viewport) {
    this._view = view ?? { processes: {}, connections: [] };
    this._viewport = viewport ?? null;
    this.render();
  }

  /**
   * @returns {import("../library/minimap.js").MinimapLayout}
   */
  layout() {
    const box = this.getBoundingClientRect();
    const size = {
      width: box.width || 160,
      height: box.height || 110,
    };
    return minimapLayout({
      view: this._view,
      viewport: this._viewport,
      size,
    });
  }

  render() {
    const layout = this.layout();
    const dots = layout.nodes
      .map(
        (node) =>
          `<circle class="dot" data-node="${node.id}" cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="3"></circle>`,
      )
      .join("");
    const lines = layout.edges
      .map(
        (edge) =>
          `<line class="wire" x1="${edge.x1.toFixed(1)}" y1="${edge.y1.toFixed(1)}" x2="${edge.x2.toFixed(1)}" y2="${edge.y2.toFixed(1)}"></line>`,
      )
      .join("");
    const viewport = layout.viewport
      ? `<rect class="viewport" x="${layout.viewport.x.toFixed(1)}" y="${layout.viewport.y.toFixed(1)}" width="${layout.viewport.w.toFixed(1)}" height="${layout.viewport.h.toFixed(1)}"></rect>`
      : "";
    /** @type {any} */ (this.shadowRoot).innerHTML = `
      <style>
        :host {
          display: block;
          border-radius: var(--ui-radius, 6px);
          background: var(--ui-bg, rgb(20, 27, 35));
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          overflow: hidden;
          touch-action: none;
        }
        svg { display: block; width: 100%; height: 100%; }
        .dot { fill: var(--ui-muted, rgb(120, 130, 140)); }
        .wire { stroke: var(--ui-muted, rgb(120, 130, 140)); stroke-width: 1; opacity: 0.7; }
        /* The one accented element: the viewport (guidelines §12) */
        .viewport {
          fill: color-mix(in srgb, var(--ui-accent, rgb(90, 200, 250)) 15%, transparent);
          stroke: var(--ui-accent, rgb(90, 200, 250));
          stroke-width: 1;
        }
      </style>
      <svg viewBox="0 0 ${this._boxWidth()} ${this._boxHeight()}">
        ${lines}
        ${dots}
        ${viewport}
      </svg>
    `;
    if (!this._navigating) {
      this._wirePointer();
    }
  }

  /** @returns {number} */
  _boxWidth() {
    const box = this.getBoundingClientRect();
    return box.width || 160;
  }

  /** @returns {number} */
  _boxHeight() {
    const box = this.getBoundingClientRect();
    return box.height || 110;
  }

  _wirePointer() {
    const svg = /** @type {any} */ (this.shadowRoot)?.querySelector("svg");
    if (!svg) return;
    svg.addEventListener("pointerdown", (/** @type {PointerEvent} */ e) => {
      this._navigating = true;
      svg.setPointerCapture(e.pointerId);
      this._navigate(e);
    });
    svg.addEventListener("pointermove", (/** @type {PointerEvent} */ e) => {
      if (this._navigating) this._navigate(e);
    });
    svg.addEventListener("pointerup", () => {
      this._navigating = false;
    });
    svg.addEventListener("pointerleave", () => {
      this._navigating = false;
    });
  }

  /**
   * Emits the graph coordinates under the pointer: the owner centers the
   * camera there.
   *
   * @param {PointerEvent} e
   */
  _navigate(e) {
    const rect = this.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const layout = this.layout();
    const graph = minimapPointToGraph(
      point,
      layout,
      { width: rect.width || 160, height: rect.height || 110 },
      this._view,
    );
    emit(this, "minimap-navigate", { x: graph.x, y: graph.y });
  }
}

customElements.define("noflo-minimap", FlowMinimap);
