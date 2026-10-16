/**
 * @file The project explorer (work document #63's re-homed navigation
 * tree, planned into the Context corner's family per #28's review): a
 * navigable tree of the project's graphs and subgraphs, components,
 * schemas, specs, and work documents, expanding from the Context chip
 * alongside the future test summary (WD #16) and wires tenants.
 *
 * Functional-layer content in the corner system's two-layer grammar: the
 * chip's summary role stays "what am I editing"; the tree is how you jump
 * elsewhere. Every entry navigates through the router's kind-addressed
 * screens (work document #62); the corner collapses after navigation per
 * the dismissal contract. Sections start collapsed: the tree is a
 * navigation affordance, not a dashboard.
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
 * A Font Awesome glyph.
 *
 * @param {string} name
 * @returns {string}
 */
function icon(name) {
  return `<i class="fa" aria-hidden="true">${/** @type {any} */ (icons())[name] ?? ""}</i>`;
}

/**
 * A section of the tree.
 *
 * @typedef {Object} ExplorerSection
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {Array<{ name: string, kind: string, subgraph?: boolean }>} entries
 */

export class FlowProjectExplorer extends FlowCornerElement {
  constructor() {
    super();
    this.expandable = true;
    this.chipTitle = "Project contents";
    /** The project's name, the tree's root label. */
    this._projectName = "";
    /** Sections start collapsed: navigation, not a dashboard. */
    /** @type {Set<string>} */
    this._openSections = new Set();
    /** @type {ExplorerSection[]} */
    this._sections = [];
    this._visible = false;
    /** The screen currently active, highlighted in the tree. */
    this._active = /** @type {{ kind: string, id: string } | null} */ (null);
  }

  /**
   * Refreshes in place with the project's navigable contents.
   *
   * @param {Object} options
   * @param {string} options.projectName
   * @param {Array<{ name: string, parent: string }>} options.graphs Graphs
   *   with their parent graph ids (root graphs parent to the empty string).
   * @param {string[]} options.components
   * @param {string[]} options.schemas
   * @param {string[]} options.specs
   * @param {Array<{ id: string, title: string }>} options.workDocs
   */
  setContents({ projectName, graphs, components, schemas, specs, workDocs }) {
    this._projectName = projectName ?? "";
    /** @type {ExplorerSection[]} */
    const sections = [];
    // Graphs render as the parent/child hierarchy the navigation stack
    // already walks: root graphs first, their subgraphs nested under them
    const roots = (graphs ?? []).filter((graph) => !graph.parent);
    const childrenOf = (/** @type {string} */ id) =>
      (graphs ?? []).filter((graph) => graph.parent === id);
    /** @type {(id: string, depth: number) => any[]} */
    const graphRows = (id, depth) =>
      childrenOf(id).map((graph) => ({
        name: graph.name,
        kind: "graph",
        subgraph: depth > 0,
        graphs: graphRows(graph.name, depth + 1),
      }));
    sections.push({
      id: "graphs",
      label: "Graphs",
      icon: "diagram-project",
      // Subgraph nesting renders through the entry renderer; the top
      // level carries the roots
      entries: roots.map((graph) => ({
        name: graph.name,
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
        kind: "component",
      })),
    });
    sections.push({
      id: "schemas",
      label: "Schemas",
      icon: "code",
      entries: (schemas ?? []).map((name) => ({ name, kind: "schema" })),
    });
    sections.push({
      id: "specs",
      label: "Specs",
      icon: "flask",
      entries: (specs ?? []).map((name) => ({ name, kind: "spec" })),
    });
    sections.push({
      id: "workdocs",
      label: "Work documents",
      icon: "file-lines",
      entries: (workDocs ?? []).map((doc) => ({
        name: doc.title,
        kind: "doc",
      })),
    });
    this._sections = sections;
    this.setVisible(true);
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

  /** @returns {string} */
  chipHtml() {
    return `<span class="context-label">${escapeHtml(
      this._projectName || "Project",
    )}</span><span class="seg" title="Project contents">${icon("folder-tree")}</span>`;
  }

  /**
   * The expanded tree: one section per entity family, each section a
   * collapsible group whose entries navigate.
   *
   * @returns {string}
   */
  expandedHtml() {
    if (!this.expanded) return "";
    const sections = this._sections
      .map((section) => {
        const open = this._openSections.has(section.id);
        const rows = (section.entries ?? [])
          .map((entry) => this.entryHtml(entry, section.id))
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
      <div class="panel">
        <div class="panel-head">
          <span>${escapeHtml(this._projectName || "Project")}</span>
          <button class="secondary" data-action="collapse" title="Collapse">▾</button>
        </div>
        ${sections}
      </div>
    `;
  }

  /**
   * One tree entry, with subgraph nesting rendered as indented children.
   *
   * @param {any} entry
   * @param {string} sectionId
   * @returns {string}
   */
  entryHtml(entry, sectionId) {
    const active =
      this._active &&
      this._active.kind === entry.kind &&
      this._active.id === entry.name;
    const nested = (entry.graphs ?? [])
      .map((/** @type {any} */ child) => this.entryHtml(child, sectionId))
      .join("");
    return `
      <div class="tree-entry${entry.subgraph ? " nested" : ""}${active ? " active" : ""}">
        <span class="tree-row" data-navigate="${escapeHtml(entry.kind)}" data-name="${escapeHtml(entry.name)}" role="button" tabindex="0">
          ${icon(entry.kind === "graph" && entry.subgraph ? "sitemap" : "diagram-project")}
          <span class="grow">${escapeHtml(entry.name)}</span>
        </span>
        ${nested}
      </div>`;
  }

  styles() {
    return `
        :host {
          position: fixed;
          top: 12px;
          left: 12px;
          z-index: 890;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          max-width: min(320px, calc(100vw - 24px));
          max-height: calc(100vh - 120px);
          font-family: SourceCodePro, monospace;
          color: var(--node-text);
        }
        .panel { max-height: calc(100vh - 140px); overflow-y: auto; }
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
          width: 100%;
        }
        .tree-row:hover, .tree-row:focus-visible {
          background: color-mix(in srgb, var(--ui-accent, #4aa3df) 12%, transparent);
        }
        .tree-entry.active .tree-row {
          background: color-mix(in srgb, var(--ui-accent, #4aa3df) 20%, transparent);
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

  wireEvents() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    shadow
      .querySelector("[data-action='collapse']")
      ?.addEventListener("click", (/** @type {any} */ event) => {
        event.stopPropagation();
        this.expanded = false;
        this.render();
      });
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
    // Tree entries navigate: the corner collapses after navigation (the
    // dismissal contract, work document #62)
    for (const row of shadow.querySelectorAll("[data-navigate]")) {
      const navigate = (/** @type {any} */ event) => {
        event.stopPropagation();
        emit(this, "explorer-navigate", {
          kind: String(row.getAttribute("data-navigate") ?? ""),
          id: String(row.getAttribute("data-name") ?? ""),
        });
        this.expanded = false;
        this.render();
      };
      row.addEventListener("click", navigate);
      row.addEventListener("keydown", (/** @type {any} */ event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        navigate(event);
      });
    }
  }
}

customElements.define("noflo-project-explorer", FlowProjectExplorer);
