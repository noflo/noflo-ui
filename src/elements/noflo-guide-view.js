/**
 * @file The guide reader (work document #66): the bundled flavor docs'
 * full-screen read-only surface — the authoring and deployment guides a
 * flavor carries, rendered from the app's own registry. Guides are
 * app-level state (bundled Markdown, not project CRDT content), so the
 * view opens without any mirror dependency and works on a fresh install.
 *
 * The route is `#/p/<project>/guide/<docId>` (work document #62's screen
 * model): the app routes doc selections through the router, so a guide is
 * deep-linkable and the dismissal contract returns to the graph.
 */

import { emit } from "../events.js";
import { markdownToHtml } from "../library/markdown.js";

/** @param {unknown} value @returns {string} */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const CATEGORY_LABELS = /** @type {const} */ ({
  authoring: "Authoring",
  deployment: "Deployment",
});

export class FlowGuideView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {any} The flavor descriptor whose docs render. */
    this._flavor = null;
    /** @type {string} The open doc's id. */
    this._docId = "";
  }

  connectedCallback() {
    this.render();
  }

  /**
   * Opens the view for one flavor doc.
   *
   * @param {Object} options
   * @param {any} options.flavor The flavor descriptor (its `docs` array is
   *   the index; `shortname` labels the header).
   * @param {string} [options.docId] The doc to open; defaults to the
   *   flavor's first doc.
   */
  open({ flavor, docId = "" }) {
    this._flavor = flavor;
    const docs = /** @type {any[]} */ (flavor?.docs ?? []);
    const known = docs.some((doc) => doc.id === docId);
    this._docId = known ? docId : (docs[0]?.id ?? "");
    this.removeAttribute("hidden");
    this.render();
  }

  /** Closes the view. */
  close() {
    this.setAttribute("hidden", "");
    this._flavor = null;
    this._docId = "";
  }

  /**
   * Renders one nav entry: the doc's button, active state marked.
   *
   * @param {any} doc
   * @returns {string}
   */
  navEntryHtml(doc) {
    const active = doc.id === this._docId;
    return `<button class="doc-link${active ? " active" : ""}" data-doc="${escapeHtml(doc.id)}" title="${escapeHtml(doc.title)}">${escapeHtml(doc.title)}</button>`;
  }

  render() {
    const docs = /** @type {any[]} */ (this._flavor?.docs ?? []);
    const doc = docs.find((entry) => entry.id === this._docId) ?? null;
    const categories = [...new Set(docs.map((entry) => entry.category))];
    const nav = categories
      .map((category) => {
        const entries = docs.filter((entry) => entry.category === category);
        const label =
          /** @type {any} */ (CATEGORY_LABELS)[category] ?? category;
        return `<div class="nav-group"><div class="nav-label">${escapeHtml(label)}</div>${entries
          .map((entry) => this.navEntryHtml(entry))
          .join("")}</div>`;
      })
      .join("");
    const body = doc ? markdownToHtml(doc.markdown) : "<p>No guides.</p>";
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          flex-direction: column;
          background: var(--ui-bg, rgb(20, 27, 35));
          color: var(--node-text);
          font-family: SourceCodePro, monospace;
          overflow: auto;
        }
        :host([hidden]) { display: none; }
        .column {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 56px 24px 64px;
          max-width: min(760px, calc(100vw - 48px));
          margin: 0 auto;
          width: 100%;
          gap: 10px;
        }
        .head {
          display: flex;
          align-items: baseline;
          gap: 10px;
          font-size: 15px;
        }
        .head .name { font-weight: bold; }
        .head .flavor {
          font-size: 11px;
          color: color-mix(in srgb, currentColor 60%, transparent);
        }
        .head .grow { flex: 1; }
        .nav {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 18px;
          padding: 8px 0;
          border-top: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-bottom: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
        }
        .nav-group { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
        .nav-label {
          font-size: 10px;
          text-transform: uppercase;
          color: color-mix(in srgb, currentColor 55%, transparent);
        }
        .doc-link {
          background: transparent;
          color: inherit;
          border: 1px solid transparent;
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 12px;
          font-family: inherit;
          min-height: var(--ui-target, 44px);
          cursor: pointer;
        }
        .doc-link.active {
          color: var(--ui-accent, #4aa3df);
          border-color: var(--ui-accent, #4aa3df);
        }
        .article {
          flex: 1;
          font-size: 13px;
          line-height: 1.55;
        }
        .article h1, .article h2, .article h3, .article h4 {
          font-size: 14px;
          margin: 18px 0 8px;
        }
        .article h1:first-child { margin-top: 0; }
        .article p { margin: 8px 0; }
        .article ul, .article ol { margin: 8px 0; padding-left: 22px; }
        .article li { margin: 3px 0; }
        .article pre {
          background: color-mix(in srgb, var(--node-text, #fff) 6%, transparent);
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: 6px;
          padding: 10px;
          overflow-x: auto;
          font-size: 12px;
          line-height: 1.45;
        }
        .article code {
          font-family: inherit;
          background: color-mix(in srgb, var(--node-text, #fff) 8%, transparent);
          border-radius: 3px;
          padding: 1px 4px;
        }
        .article pre code { background: transparent; padding: 0; }
        .article a { color: var(--ui-data, #7bc4e0); }
        .actions {
          display: flex;
          gap: 8px;
        }
        button.action {
          background: transparent;
          color: var(--ui-accent, #4aa3df);
          border: 1px solid var(--ui-accent, #4aa3df);
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 12px;
          font-family: inherit;
          text-transform: uppercase;
          min-height: var(--ui-target, 44px);
        }
        button.action.secondary {
          color: inherit;
          border-color: var(--ui-border, #333);
        }
      </style>
      <div class="column">
        <div class="head">
          <span class="name">Guides</span>
          <span class="flavor">${escapeHtml(this._flavor?.shortname ?? "")}</span>
          <span class="grow"></span>
        </div>
        <div class="nav">${nav}</div>
        <div class="article">${body}</div>
        <div class="actions">
          <button class="action secondary" data-action="close">Close</button>
        </div>
      </div>
    `;
    for (const link of shadow.querySelectorAll("[data-doc]")) {
      link.addEventListener("click", () => {
        const docId = String(link.getAttribute("data-doc") ?? "");
        if (docId === this._docId) return;
        emit(this, "guide-open", { docId });
      });
    }
    shadow
      .querySelector("[data-action='close']")
      ?.addEventListener("click", () => {
        emit(this, "guide-close", undefined);
      });
  }
}

customElements.define("noflo-guide-view", FlowGuideView);
