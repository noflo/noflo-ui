/**
 * @file Context chip (work document #28, top-left corner): the Context
 * corner's first sliver — what am I editing, plus the tab's engine role,
 * the up navigation, and the entry into configuration. It replaces the
 * former full-width top bar: everything it carried has a corner home now
 * (the mesh state lives in the bottom-right sync panel).
 *
 * Pure view: state in via setters, intents out via events. Shadow DOM, per
 * SPEC "Light DOM vs Shadow DOM". Corner states come from the shared
 * corner base; the chip carries the project explorer (work document #63):
 * the navigation tree as a segment-toggled accordion, next to the up and
 * settings buttons.
 */

import icons from "../../vendor/fontawesome-icons.js";
import { emit } from "../events.js";
import { FlowCornerElement } from "./corner-element.js";

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
    /** Workdoc screen state (work document #9): the chip's label is the
     * document's title and up navigates back to the graph. */
    this._docId = null;
    /** The project explorer (work document #63): the navigation tree as a
     * segment-toggled accordion. */
    this._explorerOpen = false;
    this._projectName = "";
    /** @type {Set<string>} */
    this._openSections = new Set();
    /** @type {Array<any>} */
    this._sections = [];
    this._active = /** @type {{ kind: string, id: string } | null} */ (null);
  }

  /**
   * Refreshes in place with the project's navigable contents (work
   * document #63).
   *
   * @param {Object} options
   * @param {string} options.projectName
   * @param {Array<{ name: string, parent: string }>} options.graphs
   * @param {string[]} options.components
   * @param {string[]} options.schemas
   * @param {string[]} options.specs
   * @param {Array<{ id: string, title: string }>} options.workDocs
   */
  setContents({ projectName, graphs, components, schemas, specs, workDocs }) {
    this._projectName = projectName ?? "";
    /** @type {Array<any>} */
    const sections = [];
    const roots = (graphs ?? []).filter((graph) => !graph.parent);
    const childrenOf = (/** @type {string} */ id) =>
      (graphs ?? []).filter((graph) => graph.parent === id);
    /** @type {(id: string, depth: number) => any[]} */
    const graphRows = (id, depth) =>
      childrenOf(id).map((graph) => ({
        name: graph.name,
        id: graph.name,
        kind: "graph",
        subgraph: depth > 0,
        graphs: graphRows(graph.name, depth + 1),
      }));
    sections.push({
      id: "graphs",
      label: "Graphs",
      icon: "diagram-project",
      entries: roots.map((graph) => ({
        name: graph.name,
        id: graph.name,
        kind: "graph",
        graphs: graphRows(graph.name, 1),
      })),
    });
    sections.push({
      id: "components",
      label: "Components",
      icon: "cube",
      entries: (components ?? []).map((name) => ({
        name,
        id: name,
        kind: "component",
      })),
    });
    sections.push({
      id: "schemas",
      label: "Schemas",
      icon: "code",
      entries: (schemas ?? []).map((name) => ({
        name,
        id: name,
        kind: "schema",
      })),
    });
    sections.push({
      id: "specs",
      label: "Specs",
      icon: "flask",
      entries: (specs ?? []).map((name) => ({ name, id: name, kind: "spec" })),
    });
    sections.push({
      id: "workdocs",
      label: "Work documents",
      icon: "file-lines",
      entries: (workDocs ?? []).map((doc) => ({
        name: doc.title,
        id: doc.id,
        kind: "doc",
      })),
    });
    this._sections = sections;
    this.render();
  }

  /**
   * Marks the active screen: the tree highlights where the user is.
   *
   * @param {{ kind: string, id: string } | null} active
   */
  setActive(active) {
    this._active = active;
    this.render();
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
  /**
   * Sets the workdoc screen state (work document #62): while a document
   * is active the chip's label carries its title and up navigates back.
   *
   * @param {string | null} docId
   * @param {string} title
   */
  setWorkDoc(docId, title) {
    this._docId = docId;
    if (docId) {
      this.setLabel(title);
      this.setUp("__workdoc__");
    }
  }

  /** Clears the workdoc screen state. */
  clearWorkDoc() {
    this._docId = null;
    /** The project explorer (work document #63): the navigation tree as a
     * segment-toggled accordion. */
    this._explorerOpen = false;
    this._projectName = "";
    /** @type {Set<string>} */
    this._openSections = new Set();
    /** @type {Array<any>} */
    this._sections = [];
    this._active = /** @type {{ kind: string, id: string } | null} */ (null);
  }

  /**
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
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          /* Top corners grow downward (work document #28): the chip stays
             in the top strip, panels hang below it */
          gap: 6px;
          max-width: min(420px, calc(100vw - 24px));
          max-height: calc(100vh - 120px);
          /* Corner constraint (work document #28): the chip stays inside
             its corner and never reaches the screen's center, where the
             selection pills live. The chrome (background, border, radius,
             padding) comes from the shared corner base's .chip — the host
             carries positioning only, so the corner renders one box */
          cursor: default;
          font-family: SourceCodePro, monospace;
          font-size: 12px;
        }
        /* Top corners grow downward (work document #28): the chip keeps
           the top strip and panels hang below it */
        .chip { order: -1; }
        .chip {
          cursor: default;
          max-width: 100%;
        }
        .context-label {
          flex: 0 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .explorer {
          min-width: 260px;
          padding: 6px;
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: 6px;
          background: var(--ui-bg, rgb(20, 27, 35));
          max-height: calc(100vh - 160px);
          overflow-y: auto;
        }
        .section { margin: 2px 0; }
        .section-head {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 6px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--ui-accent, #4aa3df);
          cursor: pointer;
          min-height: var(--ui-target, 44px);
          box-sizing: border-box;
        }
        .section-head .count {
          color: color-mix(in srgb, currentColor 55%, transparent);
        }
        .section-head .chevron {
          margin-left: auto;
          color: color-mix(in srgb, currentColor 55%, transparent);
        }
        .section .rows { display: none; }
        .section.open .rows { display: block; }
        .tree-entry.nested { margin-left: 16px; }
        .tree-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 6px;
          font-size: 12px;
          min-height: var(--ui-target, 44px);
          box-sizing: border-box;
          cursor: pointer;
        }
        .tree-row:hover, .tree-row:focus-visible {
          background: color-mix(in srgb, var(--ui-accent, #4aa3df) 12%, transparent);
        }
        .tree-entry.active .tree-row {
          background: color-mix(in srgb, var(--ui-accent, #4aa3df) 20%, transparent);
        }
        .tree-row.inert {
          color: color-mix(in srgb, currentColor 55%, transparent);
          cursor: default;
        }
        .tree-row .grow {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .empty {
          font-size: 10px;
          color: color-mix(in srgb, currentColor 55%, transparent);
          padding: 2px 6px 6px 24px;
        }
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
      ${this._up ? `<button class="secondary" data-action="up" title="${this._docId ? "Back to the graph" : `Back to ${escapeHtml(this._up)}`}">${icon("arrow-up")}</button>` : ""}
      <span class="context-label">${escapeHtml(this._label)}</span>
      <button class="secondary ${this._explorerOpen ? "active" : ""}" data-segment-toggle="explorer" title="Project contents">${icon("folder-tree")}</button>
      <button class="secondary" data-action="settings" title="Mesh and device settings">${icon("gear")}</button>
    `;
  }

  /**
   * The explorer panel (work document #63): the navigation tree, hanging
   * below the chip strip.
   *
   * @returns {string}
   */
  segmentHtml() {
    if (!this._explorerOpen) return "";
    const sections = this._sections
      .map((section) => {
        const open = this._openSections.has(section.id);
        const rows = (section.entries ?? [])
          .map((/** @type {any} */ entry) => this.entryHtml(entry))
          .join("");
        return `
        <div class="section${open ? " open" : ""}">
          <div class="section-head" data-section="${escapeHtml(section.id)}" role="button" tabindex="0">
            ${icon(section.icon)}<span>${escapeHtml(section.label)}</span>
            <span class="count">${(section.entries ?? []).length}</span>
            <span class="chevron">${open ? "▾" : "▸"}</span>
          </div>
          <div class="rows">${rows || '<div class="empty">none</div>'}</div>
        </div>`;
      })
      .join("");
    return `
      <div class="explorer">
        ${sections}
      </div>
    `;
  }

  /**
   * One tree entry, with subgraph nesting rendered as indented children.
   * Specs render inert until their runner lands (#16).
   *
   * @param {any} entry
   * @returns {string}
   */
  entryHtml(entry) {
    const active =
      this._active &&
      this._active.kind === entry.kind &&
      this._active.id === entry.id;
    const nested = (entry.graphs ?? [])
      .map((/** @type {any} */ child) => this.entryHtml(child))
      .join("");
    const row =
      entry.kind === "spec"
        ? `<span class="tree-row inert">${icon("flask")}<span class="grow">${escapeHtml(entry.name)}</span></span>`
        : `<span class="tree-row" data-navigate="${escapeHtml(entry.kind)}" data-navigate-id="${escapeHtml(entry.id)}" role="button" tabindex="0">${icon("diagram-project")}<span class="grow">${escapeHtml(entry.name)}</span></span>`;
    return `
      <div class="tree-entry${entry.subgraph ? " nested" : ""}${active ? " active" : ""}">
        ${row}
        ${nested}
      </div>`;
  }

  /**
   * The segment-as-toggle hook (work document #63): opens and closes the
   * navigation tree.
   *
   * @param {string} id
   */
  toggleSegment(id) {
    if (id !== "explorer") return;
    this._explorerOpen = !this._explorerOpen;
    this.render();
  }

  wireEvents() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    for (const head of shadow.querySelectorAll("[data-section]")) {
      head.addEventListener("click", (/** @type {any} */ event) => {
        event.stopPropagation();
        const id = String(head.getAttribute("data-section") ?? "");
        if (this._openSections.has(id)) {
          this._openSections.delete(id);
        } else {
          this._openSections.add(id);
        }
        this.render();
      });
      head.addEventListener("keydown", (/** @type {any} */ event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        const id = String(head.getAttribute("data-section") ?? "");
        if (this._openSections.has(id)) {
          this._openSections.delete(id);
        } else {
          this._openSections.add(id);
        }
        this.render();
      });
    }
    // Tree entries navigate: the panel collapses after navigation (the
    // dismissal contract)
    for (const row of shadow.querySelectorAll("[data-navigate]")) {
      const navigate = (/** @type {any} */ event) => {
        event.stopPropagation();
        emit(this, "explorer-navigate", {
          kind: String(row.getAttribute("data-navigate") ?? ""),
          id: String(row.getAttribute("data-navigate-id") ?? ""),
        });
        this._explorerOpen = false;
        this.render();
      };
      row.addEventListener("click", navigate);
      row.addEventListener("keydown", (/** @type {any} */ event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        navigate(event);
      });
    }
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
        if (this._docId) {
          emit(this, "workdoc-close", { docId: this._docId });
          return;
        }
        emit(this, "navigate-up", undefined);
      });
  }
}

customElements.define("noflo-context-chip", FlowContextChip);
