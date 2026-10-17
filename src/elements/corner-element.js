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

/** Viewport width under which minified chips drop their counts too: the
 * degradation ladder's extreme rung, icon only. */
export const MICRO_VIEWPORT = 360;

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
    color: var(--node-text);
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
    color: var(--node-text);
  }
  .seg.calm { color: var(--ui-age-calm); }
  .seg.activity { color: var(--ui-age-activity); }
  .seg.attention { color: var(--ui-age-attention); }
  .seg.offline { color: var(--ui-age-offline); }
  .seg .label { white-space: nowrap; }
  :host([data-minified]) .seg .label { display: none; }
  /* The chips' degradation ladder: full is icon + label; minified drops
     the words and keeps icon + count (the bare number a segment
     summarizes with); micro — the extreme rung, viewport-driven —
     drops the counts too, icon only */
  .seg .count { display: none; }
  :host([data-minified]) .seg .count:not(:empty) { display: inline; }
  :host([data-micro]) .seg .count { display: none; }
  /* The context label is a title, not a number: it never survives
     minification (the context chip reads as its icon row) */
  :host([data-minified]) .context-label { display: none; }
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
    background: var(--ui-age-attention);
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

/**
 * The side panel containers (work document #63's space manager): one per
 * screen side, spanning the vertical space between that side's corner
 * chips. Open accordions mount here as portals and share the space
 * equally through flexbox. The containers are transparent and inert when
 * empty — the editor underneath owns the full interaction surface.
 *
 * The geometry is measured, not guessed: the chips' heights and widths
 * vary with their content (segments, buttons, labels), so the column's
 * edge insets and width are computed from the live chips on every render
 * and on viewport resizes.
 *
 * @type {Map<string, HTMLElement>}
 */
const panelContainers = new Map();

/** Whether the containers' document-level styles are injected. */
let panelStylesInjected = false;

/** The gutter the corner grammar puts between stacked boxes. */
const PANEL_GUTTER = 6;

/** The fallback edge insets before any chip has been measured: the
 * chips' 44px target height plus the gutter, from the 12px edge inset. */
const PANEL_INSET_FALLBACK = 62;

/** The narrowest usable accordion column: the panels' own min-width
 * (the wires surfaces declare 260px), so a narrow chip cannot clip the
 * content it hosts. */
const PANEL_WIDTH_FLOOR = 260;

/** The corners registered per side+edge key (`"left:top"`), from which
 * the containers' geometry is computed.
 *
 * @type {Map<string, Set<FlowCornerElement>>}
 */
const panelEdgeCorners = new Map();

/** Whether the shared resize listener is attached. */
let panelResizeWired = false;

/**
 * The chip rect for geometry computation, or null when the corner has no
 * laid-out chip (hidden, or a no-layout environment like the unit specs).
 *
 * @param {FlowCornerElement} corner
 * @returns {DOMRect | null}
 */
function chipRect(corner) {
  const chip = corner.shadowRoot?.querySelector(".chip");
  if (!chip) return null;
  const rect = chip.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

/**
 * Recomputes one side container's geometry from its registered corners:
 * the edge insets place the column a gutter beyond the outermost chips'
 * edges, and the width matches the widest chip on the side — the
 * accordions share the corner boxes' width. Values already written are
 * left alone, so frequent re-renders don't force layout.
 *
 * @param {"left" | "right"} side
 */
function applyPanelGeometry(side) {
  const container = panelContainer(side);
  for (const edge of /** @type {const} */ (["top", "bottom"])) {
    let inset = PANEL_INSET_FALLBACK;
    const corners = panelEdgeCorners.get(`${side}:${edge}`);
    if (corners) {
      for (const corner of corners) {
        const rect = chipRect(corner);
        if (!rect) continue;
        inset =
          edge === "top"
            ? Math.max(inset, rect.bottom + PANEL_GUTTER)
            : Math.max(inset, window.innerHeight - rect.top + PANEL_GUTTER);
      }
    }
    const value = `${Math.round(inset)}px`;
    if (container.style[edge] !== value) container.style[edge] = value;
  }
  let width = 0;
  for (const edge of /** @type {const} */ (["top", "bottom"])) {
    const corners = panelEdgeCorners.get(`${side}:${edge}`);
    if (!corners) continue;
    for (const corner of corners) {
      const rect = chipRect(corner);
      if (!rect) continue;
      width = Math.max(width, rect.width);
    }
  }
  const widthValue =
    width > 0 ? `${Math.round(Math.max(width, PANEL_WIDTH_FLOOR))}px` : "";
  if (container.style.width !== widthValue) container.style.width = widthValue;
}

/**
 * Registers a corner's chip with its side container's geometry: the
 * chip's position decides which edge it governs (the midpoint above the
 * viewport's middle is a top edge, below a bottom edge), and the side's
 * geometry is recomputed. Also wires the shared resize listener once.
 *
 * @param {FlowCornerElement} corner
 */
function syncPanelGeometry(corner) {
  const rect = chipRect(corner);
  if (!rect) return;
  const side = /** @type {"left" | "right"} */ (corner.panelSide);
  const edge =
    rect.top + rect.height / 2 < window.innerHeight / 2 ? "top" : "bottom";
  const key = `${side}:${edge}`;
  if (corner._panelEdgeKey && corner._panelEdgeKey !== key) {
    panelEdgeCorners.get(corner._panelEdgeKey)?.delete(corner);
  }
  corner._panelEdgeKey = key;
  let corners = panelEdgeCorners.get(key);
  if (!corners) {
    corners = new Set();
    panelEdgeCorners.set(key, corners);
  }
  corners.add(corner);
  applyPanelGeometry(side);
  if (!panelResizeWired) {
    panelResizeWired = true;
    window.addEventListener("resize", () => {
      const sides = new Set(
        [...panelEdgeCorners.keys()].map((k) => k.split(":")[0]),
      );
      for (const sideKey of sides) {
        applyPanelGeometry(/** @type {"left" | "right"} */ (sideKey));
      }
    });
  }
}

/**
 * The side container for a panel, created on first use.
 *
 * @param {"left" | "right"} side
 * @returns {HTMLElement}
 */
function panelContainer(side) {
  if (!panelStylesInjected) {
    panelStylesInjected = true;
    const style = document.createElement("style");
    style.textContent = `
      .corner-panels-left, .corner-panels-right {
        position: fixed;
        display: flex;
        flex-direction: column;
        gap: 6px;
        /* The measured width lands as an inline style; this fallback
           holds until the first chip has been measured */
        width: min(360px, calc(100vw - 24px));
        pointer-events: none;
        z-index: 880;
      }
      /* The edge insets are measured from the live chips (inline
         styles); these fallbacks hold until then: the chips' 44px
         target height plus the gutter, from the 12px edge inset */
      .corner-panels-left { left: 12px; top: 62px; bottom: 62px; }
      .corner-panels-right { right: 12px; top: 62px; bottom: 62px; }
      /* The portals share the span equally weighted by their accordion
       * count (set inline per corner), so every open accordion on the
       * side gets the same share of the space — the bottom one's edge
       * sits flush above the bottom corners */
      .corner-panels-left > .corner-panel-portal,
      .corner-panels-right > .corner-panel-portal {
        min-height: 0;
        pointer-events: auto;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
    `;
    document.head.appendChild(style);
  }
  const existing = panelContainers.get(side);
  if (existing?.isConnected) {
    return /** @type {HTMLElement} */ (existing);
  }
  const container = document.createElement("div");
  container.className = `corner-panels-${side}`;
  container.dataset.side = side;
  document.body.appendChild(container);
  panelContainers.set(side, container);
  return /** @type {HTMLElement} */ (container);
}

export class FlowCornerElement extends HTMLElement {
  /** The side this corner's panels mount into (work document #63's
   * space manager). Set by subclasses to "left" or "right".
   *
   * @type {any}
   */
  panelSide = "left";
  /** The panel portal in the side container.
   *
   * @type {any}
   */
  _panelPortal = null;

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
    /** Auto-Micro: the viewport is at or under the micro breakpoint —
     * the degradation ladder's icon-only rung, meaningful while minified. */
    this._micro = false;
    this.expanded = false;
    /** Chips without accordion content never enter the Expanded state. */
    this.expandable = true;
    /** Tooltip on the collapsed chip. */
    this.chipTitle = "";
    /** The side this corner's panels mount into (work document #63's
     * space manager): left or right, matching the corner's position.
     *
     * @type {"left" | "right"}
     */
    this.panelSide = "left";
    /**
     * The panel portal in the side container.
     *
     * @type {HTMLElement | null}
     */
    this._panelPortal = null;
    /** The side+edge key this corner's chip is registered under for the
     * containers' measured geometry.
     *
     * @type {string | null}
     */
    this._panelEdgeKey = null;
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
    if (this._panelEdgeKey) {
      const side = this._panelEdgeKey.split(":")[0];
      panelEdgeCorners.get(this._panelEdgeKey)?.delete(this);
      this._panelEdgeKey = null;
      applyPanelGeometry(/** @type {"left" | "right"} */ (side));
    }
    this._unmountPanelPortal();
  }

  /**
   * Reads the current viewport into the auto-Minified flag.
   */
  _trackViewport() {
    const width = typeof window.innerWidth === "number" ? window.innerWidth : 0;
    this._compact = width > 0 && width <= COMPACT_VIEWPORT;
    this._micro = width > 0 && width <= MICRO_VIEWPORT;
  }

  /**
   * @param {Event} _event
   */
  _resizeHandler = (_event) => {
    const wasCompact = this._compact;
    const wasMicro = this._micro;
    this._trackViewport();
    if (this._compact === wasCompact && this._micro === wasMicro) return;
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
    const minified = this._effectiveMinified;
    this.toggleAttribute("data-minified", minified);
    // The ladder's extreme rung: icon only. Viewport-driven, and only
    // meaningful while the chip is minified — an explicit un-minify
    // keeps the counts
    this.toggleAttribute("data-micro", minified && this._micro === true);
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
      this._unmountPanelPortal();
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
   * The independent segment-toggled accordions (work document #63): the
   * surfaces a corner exposes beside its primary panel, each toggled by
   * its own chip segment — the Yjs telemetry stream, the edit history,
   * any accordion the corner promotes. Rendered in the corner's stack;
   * empty unless the corner opts in.
   *
   * @returns {string}
   */
  segmentHtml() {
    return "";
  }

  /**
   * The segment-as-toggle hook: a chip child with a data-segment-toggle
   * marker toggles its own accordion. Empty until the corner opts in.
   *
   * @param {string} _id The toggled segment's marker.
   */
  toggleSegment(_id) {}

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
    // The chip: the corner's own shadow. The panels render into the side
    // container's portal (work document #63's space manager)
    shadow.innerHTML = `
      <style>${this.styles()}${cornerStyles()}</style>
      <div class="chip" data-action="toggle"${
        this.expandable ? ' role="button" tabindex="0"' : ""
      } title="${this.chipTitle}">
        ${this.chipHtml()}
      </div>
    `;
    const chip = shadow.querySelector("[data-action='toggle']");
    // The segment-as-toggle grammar (work document #63): a chip child
    // carrying a data-segment-toggle marker owns its click — it toggles
    // its own accordion through the corner's hook, not the chip's
    // expand state. The handlers attach regardless of expandable:
    // segments are independent of the expand affordance
    const segmentTarget = (/** @type {Event} */ event) => {
      const path = event?.composedPath?.() ?? [];
      const inPath = path.find((/** @type {any} */ el) =>
        el?.getAttribute?.("data-segment-toggle"),
      );
      if (inPath) return inPath;
      // Synthetic dispatches may carry an empty composed path; the
      // target's closest marker is the same answer for real input
      return (
        /** @type {any} */ (event?.target)?.closest?.(
          "[data-segment-toggle]",
        ) ?? null
      );
    };
    const toggle = (/** @type {Event} */ event) => {
      if (segmentTarget(event)) return;
      if (!this.expandable) return;
      this.expanded = !this.expanded;
      this.render();
    };
    chip?.addEventListener("click", (/** @type {any} */ event) => {
      const segment = segmentTarget(event);
      if (segment) {
        this.toggleSegment(segment.getAttribute("data-segment-toggle"));
        return;
      }
      toggle(event);
    });
    // Keyboard equivalence for the pointer-only toggle: Enter and Space
    // activate a role="button" element — the segment's own marker when
    // the focus is on it, the chip's expand state otherwise
    chip?.addEventListener("keydown", (/** @type {Event} */ event) => {
      const key = /** @type {KeyboardEvent} */ (event).key;
      if (key !== "Enter" && key !== " ") return;
      event.preventDefault();
      const segment = segmentTarget(event);
      if (segment) {
        this.toggleSegment(segment.getAttribute("data-segment-toggle"));
        return;
      }
      toggle(event);
    });
    this._updatePanelPortal();
    this.wireEvents();
    // The measured geometry: the chip's live box decides where the side
    // container's edges sit and how wide the column runs
    syncPanelGeometry(this);
  }

  /**
   * Updates the panel portal: mounts it into the side container when the
   * corner has open accordions, renders the panel content into it,
   * unmounts it when the panels close. The portal carries a shadow root
   * styled with the corner's own styles — the :host positioning rules
   * are neutralized (the portal lives in the side container, not the
   * corner).
   */
  _updatePanelPortal() {
    const html = `${this.segmentHtml()}${this.expandedHtml()}`;
    if (!html.trim()) {
      this._panelPortal?.remove();
      this._panelPortal = null;
      return;
    }
    if (!this._panelPortal) {
      this._panelPortal = document.createElement("div");
      this._panelPortal.className = "corner-panel-portal";
      this._panelPortal.dataset.corner = this.chipTitle || "corner";
      this._panelPortal.attachShadow({ mode: "open" });
      panelContainer(this.panelSide).appendChild(this._panelPortal);
    }
    this._panelPortal.hidden = false;
    this._panelPortal.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex !important;
          flex-direction: column !important;
          gap: 6px !important;
          position: static !important;
          inset: auto !important;
          z-index: auto !important;
          max-width: none !important;
          max-height: none !important;
          overflow: visible !important;
        }
        /* The corner's open accordions stretch to fill the portal: each
           is a flex column that scrolls its own overflow, so the side's
           accordion column uses the whole span between the corner chips
           and the bottom accordion's edge is bottom-aligned */
        :host > :not(style) {
          flex: 1 1 0;
          min-height: 0;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        /* The wires slot grows with its panel, so the telemetry log
           fills the accordion instead of floating at its top */
        :host > .panel > .telemetry-slot {
          flex: 1 1 auto;
          min-height: 0;
        }
      </style>
      <style>${this.styles()}${cornerStyles()}</style>
      ${html}
    `;
    // Equal shares across the whole side, not per portal: the portal's
    // flex-grow is its accordion count, so a corner with two open
    // accordions takes twice the space of one with a single accordion
    // and every accordion on the side ends up the same height
    const accordions = [...this._panelPortal.shadowRoot.children].filter(
      (/** @type {Element} */ node) => node.tagName !== "STYLE",
    );
    this._panelPortal.style.flex = `${accordions.length} 1 0`;
  }

  /**
   * Unmounts the panel portal (the corner hid or has no panels).
   */
  _unmountPanelPortal() {
    this._panelPortal?.remove();
    this._panelPortal = null;
  }

  /**
   * The shadow root the panel content renders into: the portal's shadow
   * when the panels are in the side container. Tests query this for
   * panel content instead of the corner's own shadow.
   *
   * @returns {ShadowRoot | null}
   */
  get panelShadow() {
    if (!this._panelPortal) {
      this._panelPortal = document.createElement("div");
      this._panelPortal.className = "corner-panel-portal";
      this._panelPortal.attachShadow({ mode: "open" });
      this._panelPortal.hidden = true;
      panelContainer(this.panelSide).appendChild(this._panelPortal);
    }
    return this._panelPortal.shadowRoot;
  }

  /**
   * The roots the event wiring runs against: the corner's own shadow and
   * the panel portal's shadow when mounted.
   *
   * @returns {ShadowRoot[]}
   */
  _eventRoots() {
    return /** @type {ShadowRoot[]} */ (
      [this.shadowRoot, this._panelPortal?.shadowRoot].filter(Boolean)
    );
  }
}
