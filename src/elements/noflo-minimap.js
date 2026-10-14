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
    /** @type {any} */
    this._layout = null;
    /** Whether a pointer drag is navigating. */
    this._navigating = false;
    /** The active viewport-grab: the grab point and the viewport center. */
    this._grab =
      /** @type {{ pointer: { x: number, y: number }, center: { x: number, y: number } } | null} */ (
        null
      );
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

  /**
   * Updates only the viewport rectangle (guidelines §14: granular updates):
   * the dots and wires are unchanged by camera motion. Falls back to a
   * full render when the rect appears or disappears.
   *
   * @param {{ x: number, y: number, w: number, h: number } | null} viewport
   */
  setViewport(viewport) {
    this._viewport = viewport;
    const layout = this._layout;
    if (!layout || layout.scale === 0) return;
    const svg = /** @type {any} */ (this.shadowRoot)?.querySelector("svg");
    if (!svg) return;
    const projected = viewport
      ? {
          x: viewport.x * layout.scale + layout.origin.x,
          y: viewport.y * layout.scale + layout.origin.y,
          w: viewport.w * layout.scale,
          h: viewport.h * layout.scale,
        }
      : null;
    const rect = svg.querySelector(".viewport");
    if (!projected) {
      rect?.remove();
      return;
    }
    if (!rect) {
      // The rect appeared: a full render is the honest path
      this.render();
      return;
    }
    rect.setAttribute("x", projected.x.toFixed(1));
    rect.setAttribute("y", projected.y.toFixed(1));
    rect.setAttribute("width", projected.w.toFixed(1));
    rect.setAttribute("height", projected.h.toFixed(1));
  }

  render() {
    const layout = this.layout();
    this._layout = layout;
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
    // The minimap lives inside the editor's #viewport: its pointer events
    // MUST NOT reach the canvas pan gesture — a bubbled pointerdown would
    // start a canvas pan alongside the minimap grab, and the competing
    // capture steals the pointerup, wedging the grab open. Isolate here.
    const isolate = (/** @type {Event} */ e) => e.stopPropagation();
    svg.addEventListener("pointerdown", (/** @type {PointerEvent} */ e) => {
      isolate(e);
      this._navigating = true;
      svg.setPointerCapture(e.pointerId);
      const graph = this._graphAtPointer(e);
      // Grabbing the viewport indicator drags it relatively: the camera
      // follows the pointer delta instead of jumping to the pointer —
      // the standard minimap grab (work document #5)
      const vp = this._viewport;
      const grabbed =
        vp !== null &&
        graph.x >= vp.x &&
        graph.x <= vp.x + vp.w &&
        graph.y >= vp.y &&
        graph.y <= vp.y + vp.h;
      this._grab = grabbed
        ? {
            pointer: graph,
            center: { x: vp.x + vp.w / 2, y: vp.y + vp.h / 2 },
          }
        : null;
      if (!grabbed) this._navigate(e);
    });
    svg.addEventListener("pointermove", (/** @type {PointerEvent} */ e) => {
      isolate(e);
      if (!this._navigating) return;
      // Safety: a pointerup we never saw (a stolen capture elsewhere)
      // must not wedge the grab — a released button ends the drag
      if (e.buttons === 0) {
        this._endDrag();
        return;
      }
      if (this._grab) {
        const graph = this._graphAtPointer(e);
        emit(this, "minimap-navigate", {
          x: this._grab.center.x + (graph.x - this._grab.pointer.x),
          y: this._grab.center.y + (graph.y - this._grab.pointer.y),
        });
        return;
      }
      this._navigate(e);
    });
    const end = (/** @type {Event} */ e) => {
      isolate(e);
      this._endDrag();
    };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
    svg.addEventListener("lostpointercapture", () => this._endDrag());
  }

  /** Ends any active drag: the grab and the navigation state clear. */
  _endDrag() {
    this._navigating = false;
    this._grab = null;
  }

  /**
   * The graph coordinates under a pointer event, via the current layout.
   *
   * @param {PointerEvent} e
   * @returns {{ x: number, y: number }}
   */
  _graphAtPointer(e) {
    const rect = this.getBoundingClientRect();
    const layout = this.layout();
    return minimapPointToGraph(
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
      layout,
    );
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
    const graph = minimapPointToGraph(point, layout);
    emit(this, "minimap-navigate", { x: graph.x, y: graph.y });
  }
}

customElements.define("noflo-minimap", FlowMinimap);
