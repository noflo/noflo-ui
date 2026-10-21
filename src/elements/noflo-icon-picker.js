/**
 * @file The icon picker (work document #61): a dedicated element for
 * choosing an avatar icon — a searchable grid of FontAwesome glyphs plus
 * an emoji fallback, since the LXMF appearance field carries a plain
 * string whose cross-client rendering differs (Sideband reads a Material
 * Design name; noflo-ui renders FontAwesome names and emoji characters
 * directly).
 *
 * Emits `icon-change` with `{ icon }` when a glyph is picked or an emoji
 * submitted. Integrations: the appearance editor in the Collaborators
 * panel and the Jedison FontAwesome editor (work document #57's schema
 * format) mount this element.
 *
 * The glyph rendering declares the Font Awesome family per shadow root —
 * the @font-face lives at the document level (main.css), so shadow trees
 * can use the family but must carry their own `.fa` rule.
 */

import icons from "../../vendor/fontawesome-icons.js";

/** @type {Record<string, string> | null} */
let iconMapCache = null;

/**
 * The FontAwesome icon map (name → codepoint), cached — the vendor module
 * rebuilds the map per call.
 *
 * @returns {Record<string, string>}
 */
function iconMap() {
  if (!iconMapCache) {
    iconMapCache = /** @type {Record<string, string>} */ (
      /** @type {any} */ (icons)()
    );
  }
  return iconMapCache;
}

export class NofloIconPicker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** The picked icon value: an FontAwesome name or an emoji string. */
    this._value = "";
    /** @type {string} The filter text. */
    this._filter = "";
  }

  /**
   * The picked icon value.
   */
  get value() {
    return this._value;
  }

  set value(value) {
    this._value = String(value ?? "");
    this.render();
  }

  connectedCallback() {
    if (!this.shadowRoot?.innerHTML) this.render();
  }

  render() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    const names = Object.keys(iconMap()).filter((name) =>
      name.toLowerCase().includes(this._filter.toLowerCase()),
    );
    const glyphs = names
      .map(
        (name) =>
          `<button class="glyph${name === this._value ? " picked" : ""}" data-icon="${escapeHtml(name)}" title="${escapeHtml(name)}"><i class="fa" aria-hidden="true">${iconMap()[name]}</i></button>`,
      )
      .join("");
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: SourceCodePro, monospace;
          font-size: 10px;
          color: var(--ui-muted, #889);
        }
        .fa {
          font-family: "Font Awesome 7 Free";
          font-weight: 900;
          font-style: normal;
        }
        .picker {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .picker input {
          background: transparent;
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          color: inherit;
          border-radius: 4px;
          padding: 3px 6px;
          font-family: inherit;
          font-size: 10px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, 30px);
          gap: 2px;
          max-height: 132px;
          overflow-y: auto;
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: 4px;
          padding: 4px;
        }
        .glyph {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          color: inherit;
          cursor: pointer;
        }
        .glyph:hover {
          border-color: var(--ui-accent, rgb(90, 200, 250));
        }
        .glyph.picked {
          border-color: var(--ui-accent, rgb(90, 200, 250));
          color: var(--ui-accent, rgb(90, 200, 250));
        }
        .emoji {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .emoji input {
          flex: 1;
          font-size: 14px;
          text-align: center;
          background: transparent;
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          color: inherit;
          border-radius: 4px;
          padding: 2px 4px;
        }
      </style>
      <div class="picker">
        <input class="filter" placeholder="Filter icons…" value="${escapeHtml(this._filter)}">
        <div class="grid">${glyphs || '<div class="empty">no icons match</div>'}</div>
        <div class="emoji">
          <span>or emoji</span>
          <input class="emoji-input" placeholder="🙂" value="${escapeHtml(
            iconMap()[this._value] ? "" : this._value,
          )}">
        </div>
      </div>
    `;
    this._wire();
  }

  /** Wires the filter, the glyph clicks, and the emoji submission. */
  _wire() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    const filter = /** @type {HTMLInputElement | null} */ (
      shadow.querySelector(".filter")
    );
    filter?.addEventListener("input", () => {
      this._filter = filter.value;
      // Re-render the grid only: the filter keeps its own focus
      const grid = shadow.querySelector(".grid");
      if (grid) {
        const names = Object.keys(iconMap()).filter((name) =>
          name.toLowerCase().includes(this._filter.toLowerCase()),
        );
        grid.innerHTML =
          names
            .map(
              (name) =>
                `<button class="glyph${name === this._value ? " picked" : ""}" data-icon="${escapeHtml(name)}" title="${escapeHtml(name)}"><i class="fa" aria-hidden="true">${iconMap()[name]}</i></button>`,
            )
            .join("") || '<div class="empty">no icons match</div>';
        this._wireGlyphs();
      }
    });
    this._wireGlyphs();
    const emojiInput = /** @type {HTMLInputElement | null} */ (
      shadow.querySelector(".emoji-input")
    );
    emojiInput?.addEventListener("keydown", (/** @type {any} */ e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const emoji = emojiInput.value.trim();
      if (!emoji) return;
      this._value = emoji;
      this.dispatchEvent(
        new CustomEvent("icon-change", {
          detail: { icon: emoji },
          bubbles: true,
          composed: true,
        }),
      );
    });
  }

  /** Wires the glyph grid's pick clicks. */
  _wireGlyphs() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    for (const glyph of shadow.querySelectorAll(".glyph")) {
      glyph.addEventListener("click", () => {
        const icon = glyph.getAttribute("data-icon") ?? "";
        this._value = icon;
        for (const other of shadow.querySelectorAll(".glyph.picked")) {
          other.classList.remove("picked");
        }
        glyph.classList.add("picked");
        this.dispatchEvent(
          new CustomEvent("icon-change", {
            detail: { icon },
            bubbles: true,
            composed: true,
          }),
        );
      });
    }
  }
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

customElements.define("noflo-icon-picker", NofloIconPicker);
