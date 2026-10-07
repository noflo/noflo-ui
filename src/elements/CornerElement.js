/**
 * @file Corner element base (work document #28): the four corner states and
 * the shared chip/panel grammar every corner renders in.
 *
 * Every corner element has a fixed set of states:
 *
 * - **Hidden**: not shown at all — the user isn't confused by features they
 *   don't need (yet). The shadow is emptied and the element carries the
 *   `hidden` attribute.
 * - **Normal**: the collapsed chip, a segmented status strip in the
 *   airline-prompt grammar (icon + value pairs, each segment carrying its
 *   own Ages state color, empty states dropping out).
 * - **Minified**: just icons and counts — the segments' labels drop. Set
 *   explicitly with `setMinified`, or reached automatically: the corner
 *   watches the viewport with a `resize` listener and minifies itself
 *   whenever the window is at or under the compact breakpoint, restoring
 *   when it grows — no reload involved. The visual side stays in the CSS
 *   media query, built from the same constant.
 * - **Expanded**: one or more accordions open above the chip. Chips without
 *   accordion content (`expandable = false`) never enter this state.
 *
 * Subclasses implement `chipHtml()` (and `expandedHtml()` when expandable)
 * plus `styles()` for the corner's positioning; the base owns the state
 * machine, the toggle behavior, and the shared visual grammar.
 */

import { mirrorBodyState } from "./body-state.js";

/** Viewport width under which corners auto-minify. Both the shared compact
 * media query and the resize-driven state machine read this, so the CSS and
 * the JS agree by construction. */
export const COMPACT_VIEWPORT = 480;

/**
 * The shared corner grammar: the segmented chip strip, the Ages state
 * colors, the attention throb, and the expanded panel with its accordions.
 * `:host` positioning stays per-corner in `styles()`.
 *
 * @returns {string}
 */
export function cornerStyles() {
  return `
  .fa {
    font-family: "Font Awesome 7 Free";
    font-weight: 900;
    font-style: normal;
  }
  .chip {
    display: inline-flex;
    gap: 10px;
    align-items: center;
    padding: 6px 10px;
    background: var(--ui-bg, rgb(20, 27, 35));
    color: var(--node-text, #aaa);
    border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
    border-radius: var(--ui-radius, 6px);
    cursor: pointer;
    font-size: 12px;
    user-select: none;
    backdrop-filter: blur(8px);
    box-sizing: border-box;
    min-height: var(--ui-target, 44px);
  }
  .chip:focus-visible {
    border-color: var(--ui-accent, rgb(0, 229, 255));
    outline: 2px solid var(--ui-focus, rgb(68, 138, 255));
    outline-offset: 2px;
  }
  .seg {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    color: var(--node-text, #aaa);
  }
  .seg.calm { color: var(--ui-age-calm); }
  .seg.activity { color: var(--ui-age-activity); }
  .seg.attention { color: var(--ui-age-attention); }
  .seg.offline { color: var(--ui-age-offline); }
  .seg .label { white-space: nowrap; }
  :host([data-minified]) .seg .label { display: none; }
  .throb { animation: throb 1.2s ease-in-out infinite; }
  /* Motion gates (guidelines §11): the throb stops for reduced-motion
     users and behind the data-animations="off" hook, mirrored from body
     onto the host (shadow styles cannot select light-DOM ancestors) */
  @media (prefers-reduced-motion: reduce) {
    .throb { animation: none; }
  }
  :host([data-animations="off"]) .throb { animation: none; }
  @keyframes throb {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
  }
  .panel {
    width: min(360px, calc(100vw - 24px));
    background: var(--ui-bg, rgb(20, 27, 35));
    border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
    border-radius: var(--ui-radius, 6px);
    padding: 10px 12px;
    font-size: 12px;
    backdrop-filter: blur(8px);
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: bold;
    margin-bottom: 6px;
  }
  details {
    border-top: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
    padding: 4px 0;
  }
  summary {
    cursor: pointer;
    color: var(--ui-accent, rgb(0, 229, 255));
    font-weight: bold;
    padding: 2px 0;
  }
  button {
    background: var(--ui-accent, rgb(0, 229, 255));
    color: var(--ui-bg, rgb(20, 27, 35));
    border: none;
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 11px;
    cursor: pointer;
    box-sizing: border-box;
    min-height: var(--ui-target, 44px);
    min-width: var(--ui-target, 44px);
  }
  button:focus-visible {
    outline: 2px solid var(--ui-focus, rgb(68, 138, 255));
    outline-offset: 2px;
  }
  button.secondary {
    background: transparent;
    color: inherit;
    border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
  }
  button.danger {
    background: var(--ui-age-attention, #d9534f);
    color: var(--ui-bg);
  }
  input {
    background: transparent;
    color: inherit;
    border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
    border-radius: 4px;
    padding: 3px 6px;
    font-size: 12px;
    flex: 1;
    min-width: 0;
    min-height: var(--ui-target, 44px);
    box-sizing: border-box;
  }
  input:focus-visible {
    border-color: var(--ui-accent, rgb(0, 229, 255));
    outline: 2px solid var(--ui-focus, rgb(68, 138, 255));
    outline-offset: 2px;
  }
  summary:focus-visible {
    outline: 2px solid var(--ui-focus, rgb(68, 138, 255));
    outline-offset: 2px;
  }
  .row { display: flex; gap: 6px; align-items: center; margin: 4px 0; }
  .list-item {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 3px 0;
    font-size: 11px;
  }
  .list-item .grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .hash-text {
    font-family: SourceCodePro, monospace;
    word-break: break-all;
  }
  .status-line {
    font-size: 11px;
    padding: 4px 6px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--ui-accent) 8%, transparent);
  }
  .status-line.danger { color: var(--ui-age-attention); }
  .status-line.success { color: var(--ui-age-calm); }
  .hint {
    font-size: 10px;
    color: color-mix(in srgb, currentColor 60%, transparent);
    margin-top: 3px;
  }
  /* Phone and compact layouts: at most one line of icons. The breakpoint
   * is the shared COMPACT_VIEWPORT constant, interpolated here — the same
   * constant the resize-driven auto-minify reads. */
  @media (max-width: ${COMPACT_VIEWPORT}px) {
    .seg .label { display: none; }
    .panel { width: calc(100vw - 24px); }
  }
  `;
}

/**
 * @typedef {"hidden" | "normal" | "minified" | "expanded"} CornerState
 */

export class FlowCornerElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** Corners default to visible; a corner that starts life hidden
     * (disclosure rules) sets this to false in its constructor. */
    this._visible = true;
    /** Explicit Minified setting: `null` follows the viewport (auto),
     * `true`/`false` overrides the auto behavior. */
    this._minified = null;
    /** Auto-Minified: the viewport is at or under the compact breakpoint,
     * tracked by the resize listener. */
    this._compact = false;
    this.expanded = false;
    /** Chips without accordion content never enter the Expanded state. */
    this.expandable = true;
    /** Tooltip on the collapsed chip. */
    this.chipTitle = "";
  }

  connectedCallback() {
    // Watch the viewport: corners auto-minify on compact viewports and
    // restore when it grows, no reload involved. The CSS media query is
    // dynamic on its own; this side keeps the corner's *state* in step.
    this._trackViewport();
    window.addEventListener("resize", this._resizeHandler);
    mirrorBodyState(this, ["data-animations"]);
    this._applyMinified();
    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this._resizeHandler);
  }

  /**
   * Reads the current viewport into the auto-Minified flag.
   */
  _trackViewport() {
    const width = typeof window.innerWidth === "number" ? window.innerWidth : 0;
    this._compact = width > 0 && width <= COMPACT_VIEWPORT;
  }

  /**
   * @param {Event} _event
   */
  _resizeHandler = (_event) => {
    const wasCompact = this._compact;
    this._trackViewport();
    if (this._compact === wasCompact) return;
    this._applyMinified();
  };

  /**
   * The effective Minified state: an explicit setting wins, otherwise the
   * viewport decides.
   *
   * @returns {boolean}
   */
  get _effectiveMinified() {
    return this._minified ?? this._compact;
  }

  _applyMinified() {
    this.toggleAttribute("data-minified", this._effectiveMinified);
  }

  /**
   * Shows or hides the whole corner element (Hidden state).
   *
   * @param {boolean} visible
   */
  setVisible(visible) {
    this._visible = visible === true;
    if (this._visible) {
      this.removeAttribute("hidden");
    } else {
      this.setAttribute("hidden", "");
      this.expanded = false;
    }
    this.render();
  }

  /**
   * Minifies the corner: the segments' labels drop, icons and counts only.
   * An explicit setting overrides the resize-driven auto-minify; passing
   * null returns the corner to following the viewport.
   *
   * @param {boolean | null} minified
   */
  setMinified(minified) {
    this._minified = typeof minified === "boolean" ? minified : null;
    this._applyMinified();
    this.render();
  }

  /**
   * The corner's current state in the fixed state set.
   *
   * @returns {CornerState}
   */
  get cornerState() {
    if (!this._visible) return "hidden";
    if (this.expandable && this.expanded) return "expanded";
    if (this._effectiveMinified) return "minified";
    return "normal";
  }

  /**
   * Per-corner styles: `:host` positioning and any element-specific rules,
   * rendered before the shared grammar.
   *
   * @returns {string}
   */
  styles() {
    return "";
  }

  /**
   * The collapsed chip's segments, in the airline grammar.
   *
   * @returns {string}
   */
  chipHtml() {
    throw new Error("A corner renders a chip: implement chipHtml()");
  }

  /**
   * The expanded accordions, rendered above the chip.
   *
   * @returns {string}
   */
  expandedHtml() {
    return "";
  }

  /**
   * Hook for wiring events inside the expanded panel after each render.
   */
  wireEvents() {}

  render() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    if (!this._visible) {
      shadow.innerHTML = "";
      return;
    }
    // Re-mirror the body state on every render: the settings toggle may
    // have flipped data-animations since the last one
    mirrorBodyState(this, ["data-animations"]);
    shadow.innerHTML = `
      <style>${this.styles()}${cornerStyles()}</style>
      ${this.expandedHtml()}
      <div class="chip" data-action="toggle"${
        this.expandable ? ' role="button" tabindex="0"' : ""
      } title="${this.chipTitle}">
        ${this.chipHtml()}
      </div>
    `;
    if (this.expandable) {
      const chip = shadow.querySelector("[data-action='toggle']");
      const toggle = () => {
        this.expanded = !this.expanded;
        this.render();
      };
      chip?.addEventListener("click", toggle);
      // Keyboard equivalence for the pointer-only toggle: Enter and Space
      // activate a role="button" element
      chip?.addEventListener("keydown", (/** @type {Event} */ event) => {
        const key = /** @type {KeyboardEvent} */ (event).key;
        if (key !== "Enter" && key !== " ") return;
        event.preventDefault();
        toggle();
      });
    }
    this.wireEvents();
  }
}
