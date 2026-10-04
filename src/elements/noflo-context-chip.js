/**
 * @file Context chip (work document #28, top-left corner): the Context
 * corner's first sliver — what am I editing, plus the tab's engine role and
 * the entry into configuration. It replaces the former full-width top bar:
 * everything it carried has a corner home now (the mesh state lives in the
 * bottom-right sync panel).
 *
 * Pure view: state in via setters, intent out via the `open-settings`
 * event. Shadow DOM, per SPEC "Light DOM vs Shadow DOM".
 */
import icons from "../../vendor/fontawesome-icons.js";

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

export class FlowContextChip extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._label = "";
    /** @type {{ leader: boolean, leaderId?: string } | null} */
    this._role = null;
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
   * Sets the tab's engine role: the leader runs the engine; follower tabs
   * are read-only mirrors of the leader's replica.
   *
   * @param {{ leader: boolean, leaderId?: string }} role
   */
  setRole(role) {
    this._role = role ?? null;
    this.render();
  }

  render() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    const role = this._role;
    shadow.innerHTML = `
      <style>
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
          color: var(--node-text, #aaa);
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: var(--ui-radius, 6px);
          font-family: SourceCodePro, monospace;
          font-size: 12px;
          backdrop-filter: blur(8px);
          max-width: min(60vw, 420px);
        }
        .fa {
          font-family: "Font Awesome 7 Free";
          font-weight: 900;
          font-style: normal;
        }
        .label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .role {
          display: inline-flex;
          gap: 4px;
          align-items: center;
          white-space: nowrap;
          color: var(--node-subtext, #666);
          font-size: 11px;
        }
        .role.observer { color: var(--ui-age-attention, #d9534f); }
        button {
          background: transparent;
          color: inherit;
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: 4px;
          padding: 2px 7px;
          font-size: 12px;
          cursor: pointer;
        }
        /* Phone and compact layouts: at most one line */
        @media (max-width: 480px) {
          .role { display: none; }
        }
      </style>
      <span class="label">${escapeHtml(this._label)}</span>
      ${
        role
          ? role.leader
            ? `<span class="role" title="This tab runs the Engine">${icon("bolt")}<span class="label-text">Leader</span></span>`
            : `<span class="role observer" title="Read-only: the leader tab (${escapeHtml(role.leaderId ?? "?")}) runs the Engine">${icon("eye")}<span class="label-text">Observer</span></span>`
          : ""
      }
      <button data-action="settings" title="Mesh and device settings">${icon("gear")}</button>
    `;
    shadow
      .querySelector("[data-action='settings']")
      ?.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("open-settings", { bubbles: true, composed: true }),
        );
      });
  }
}

customElements.define("noflo-context-chip", FlowContextChip);
