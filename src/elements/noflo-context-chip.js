/**
 * @file Context chip (work document #28, top-left corner): the Context
 * corner's first sliver — what am I editing, plus the tab's engine role,
 * the up navigation, and the entry into configuration. It replaces the
 * former full-width top bar: everything it carried has a corner home now
 * (the mesh state lives in the bottom-right sync panel).
 *
 * Pure view: state in via setters, intents out via the `open-settings` and
 * `navigate-up` events. Shadow DOM, per SPEC "Light DOM vs Shadow DOM".
 * Corner states come from the shared corner base; the chip carries no
 * accordion content yet (the test summary rides in with WD #16), so it
 * never expands.
 */

import icons from "../../vendor/fontawesome-icons.js";
import { emit } from "../events.js";
import { FlowCornerElement } from "./CornerElement.js";

/**
 * Escapes a value for interpolation into the shadow template.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * A Font Awesome glyph. The webfont is document-level (main.css), so it
 * applies inside shadow trees too.
 *
 * @param {string} name
 * @returns {string} Markup for the icon.
 */
function icon(name) {
  return `<i class="fa" aria-hidden="true">${/** @type {any} */ (icons())[name] ?? ""}</i>`;
}

export class FlowContextChip extends FlowCornerElement {
  constructor() {
    super();
    this.expandable = false;
    this.chipTitle = "What you are editing";
    this._label = "";
    /** The graph one level up; empty at root graphs, where the up button
     * hides (the graph→Home hop lands with the Home graph, WD #32). */
    this._up = "";
  }

  connectedCallback() {
    this.render();
  }

  /**
   * Sets the context line: what the user is editing (project and graph).
   *
   * @param {string} label
   */
  setLabel(label) {
    const next = label ?? "";
    if (next === this._label) return;
    this._label = next;
    this.render();
  }

  /**
   * Sets the up-navigation target: shown when the current graph has a
   * parent (the up button navigates one level up, WD #28's app-level
   * navigation); hidden at root graphs.
   *
   * @param {string} parentGraphId
   */
  setUp(parentGraphId) {
    const next = parentGraphId ?? "";
    if (next === this._up) return;
    this._up = next;
    this.render();
  }

  /**
   * @returns {string}
   */
  styles() {
    return `
        :host {
          position: fixed;
          top: 10px;
          left: 10px;
          z-index: 900;
          display: inline-flex;
          gap: 10px;
          align-items: center;
          padding: 6px 10px;
          background: var(--ui-bg, rgb(20, 27, 35));
          color: var(--node-text);
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: var(--ui-radius, 6px);
          font-family: SourceCodePro, monospace;
          font-size: 12px;
          backdrop-filter: blur(8px);
          /* Corner constraint (work document #28): the chip stays inside
             its corner and never reaches the screen's center, where the
             selection pills live */
          max-width: min(calc(33vw - 16px), 420px);
          cursor: default;
        }
        .context-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .chip { cursor: default; }
    `;
  }

  /**
   * The Context corner's chip: the up button, the editing context, the
   * engine role, and the entry into configuration.
   *
   * @returns {string}
   */
  chipHtml() {
    return `
      ${this._up ? `<button class="secondary" data-action="up" title="Back to ${escapeHtml(this._up)}">${icon("arrow-up")}</button>` : ""}
      <span class="context-label">${escapeHtml(this._label)}</span>
      <button class="secondary" data-action="settings" title="Mesh and device settings">${icon("gear")}</button>
    `;
  }

  wireEvents() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    shadow
      .querySelector("[data-action='settings']")
      ?.addEventListener("click", (/** @type {any} */ event) => {
        event.stopPropagation();
        emit(this, "open-settings", undefined);
      });
    shadow
      .querySelector("[data-action='up']")
      ?.addEventListener("click", (/** @type {any} */ event) => {
        event.stopPropagation();
        emit(this, "navigate-up", undefined);
      });
  }
}

customElements.define("noflo-context-chip", FlowContextChip);
