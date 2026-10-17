/**
 * @file The lines corner (work document #35 update #14, left side): the
 * per-line maps' home — the column-mounted line diagrams of the
 * Underground. Selecting a routed edge opens that line's diagram;
 * selecting a station lists the lines serving it (one renders directly,
 * several render as the line list). Read-only presentation; renaming a
 * route rides the existing route-name flow.
 *
 * The corner follows #28's grammar via the shared base: Hidden when no
 * line is in play, Normal (the segmented chip), Expanded (the diagram).
 */

import icons from "../../vendor/fontawesome-icons.js";
import { buildRouteLines } from "../library/LineDiagram.js";
import { routeName } from "../library/routes.js";
import { FlowCornerElement } from "./corner-element.js";
import "./noflo-line-diagram.js";

/**
 * A Font Awesome glyph.
 *
 * @param {string} name
 * @returns {string} Markup for the icon.
 */
function icon(name) {
  return `<i class="fa" aria-hidden="true">${/** @type {any} */ (icons())[name] ?? ""}</i>`;
}

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

export class FlowLinesCorner extends FlowCornerElement {
  constructor() {
    super();
    /** The graph data provider: returns the wired connections as
     * `{ edges, labelFor, routeTable }`, re-read fresh on every render.
     *
     * @type {null | (() => { edges: Array<{ source: string, target: string, route: number | null | undefined }>, labelFor: (id: string) => string, routeTable?: Record<string, { name?: string }> } | null)}
     */
    this.provider = null;
    /** The editor element: rename attempts re-emit onto it so the
     * existing route-naming flow handles the modal. */
    /** @type {HTMLElement | null} */
    this.editor = null;
    /** @type {number | null} */
    this._route = null;
    /** @type {string | null} */
    this._station = null;
    /** The line the station-list mode shows when picked. */
    /** @type {number | null} */
    this._picked = null;
    this.expandable = true;
    this.chipTitle = "Lines on this graph";
    this.panelSide = "left";
    this._visible = false;
  }

  /**
   * Wires the graph data provider (the app's projection accessor).
   *
   * @param {null | (() => { edges: Array<{ source: string, target: string, route: number | null | undefined }>, labelFor: (id: string) => string, routeTable?: Record<string, { name?: string }> } | null)} provider
   */
  setProvider(provider) {
    this.provider = provider;
  }

  /**
   * The selection answer: a routed edge selects its line, a station
   * lists its lines. Nulls clear the panel. The corner discloses on
   * selection and hides on clear.
   *
   * @param {{ route: number | null, station: string | null }} selection
   */
  setSelection(selection) {
    this._route = typeof selection.route === "number" ? selection.route : null;
    this._station = selection.station ?? null;
    this._picked = null;
    const visible = this._route !== null || this._station !== null;
    this.expanded = visible;
    this.setVisible(visible);
  }

  /**
   * The station-list mode's pick: show that line's diagram.
   *
   * @param {number} route
   */
  pickLine(route) {
    this._picked = route;
    this._route = route;
    this.render();
  }

  /**
   * The line data for a route, computed fresh from the provider.
   *
   * @param {number} route
   * @returns {{ lines: ReturnType<typeof buildRouteLines>, name: string, labelFor: (id: string) => string } | null}
   */
  lineData(route) {
    if (!this.provider) return null;
    const data = this.provider();
    if (!data) return null;
    return {
      lines: buildRouteLines(data.edges, route),
      name: routeName(route, data.routeTable),
      labelFor: data.labelFor,
    };
  }

  /**
   * The routes serving a station, named from the graph's route table.
   *
   * @param {string} station
   * @returns {Array<{ route: number, name: string }>}
   */
  stationLines(station) {
    if (!this.provider) return [];
    const data = this.provider();
    if (!data) return [];
    /** @type {Set<number>} */
    const routes = new Set();
    for (const edge of data.edges) {
      if (edge.source !== station && edge.target !== station) continue;
      if (typeof edge.route !== "number") continue;
      routes.add(edge.route);
    }
    return [...routes]
      .sort((a, b) => a - b)
      .map((route) => ({ route, name: routeName(route, data.routeTable) }));
  }

  /**
   * @returns {string}
   */
  styles() {
    return `
    .dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .dot.neutral {
      background: var(--ui-text-muted, grey);
    }
    .panel-head {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .head-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rename {
      background: none;
      border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
      color: var(--node-text, inherit);
      border-radius: var(--ui-radius, 6px);
      padding: 3px 8px;
      font-size: 11px;
      cursor: pointer;
      min-height: var(--ui-target, 44px);
      box-sizing: border-box;
    }
    .rename:focus-visible {
      outline: 2px solid var(--ui-focus, rgb(68, 138, 255));
      outline-offset: 2px;
    }
    .line-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .list-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
      border-radius: var(--ui-radius, 6px);
      cursor: pointer;
      color: var(--node-text, inherit);
    }
    .list-item:hover {
      border-color: var(--ui-accent, rgb(0, 229, 255));
    }
    .list-item .grow {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .diagram-host {
      margin-top: 6px;
    }
    `;
  }

  /**
   * @returns {string}
   */
  chipHtml() {
    const route = this._picked ?? this._route;
    if (route !== null) {
      const data = this.lineData(route);
      const name = data ? data.name : "Line";
      return `<span class="seg" style="color: var(--route-${route})">${icon("route")}<span class="label">${escapeHtml(name)}</span></span>`;
    }
    if (this._station) {
      return `<span class="seg">${icon("location-dot")}<span class="label">${escapeHtml(this._station)}</span></span>`;
    }
    return `<span class="seg">${icon("route")}<span class="label">Lines</span></span>`;
  }

  /**
   * The expanded accordion: the line's strip diagram, or the station's
   * line list — with the rename affordance on both.
   *
   * @returns {string}
   */
  expandedHtml() {
    const route = this._picked ?? this._route;
    if (route !== null) {
      const data = this.lineData(route);
      if (!data) return "";
      return `
        <div class="panel">
          <div class="panel-head">
            <span class="dot" style="background: var(--route-${route})"></span>
            <span class="head-label">${escapeHtml(data.name)}</span>
            <button class="rename" data-rename="${route}" title="Name route">${icon("pen")}</button>
          </div>
          <div class="diagram-host"></div>
        </div>
      `;
    }
    if (this._station) {
      const lines = this.stationLines(this._station);
      if (lines.length === 0) return "";
      if (lines.length === 1) {
        // One line through the station renders directly
        this._route = lines[0].route;
        return this.expandedHtml();
      }
      const rows = lines
        .map(
          (line) => `
          <div class="list-item" data-pick="${line.route}">
            <span class="dot" style="background: var(--route-${line.route})"></span>
            <span class="grow">${escapeHtml(line.name)}</span>
            <button class="rename" data-rename="${line.route}" title="Name route">${icon("pen")}</button>
          </div>`,
        )
        .join("");
      return `
        <div class="panel">
          <div class="panel-head"><span class="head-label">${escapeHtml(this._station)}</span></div>
          <div class="line-list">${rows}</div>
        </div>
      `;
    }
    return "";
  }

  /**
   * Wires the diagram host and the affordances after each render. The
   * panel renders into the side container's portal, so the roots to
   * query are the corner's and the portal's (the base's answer).
   */
  wireEvents() {
    const route = this._picked ?? this._route;
    if (route !== null) {
      for (const root of this._eventRoots()) {
        const host = root.querySelector(".diagram-host");
        if (!host) continue;
        host.innerHTML = "";
        const data = this.lineData(route);
        if (data) {
          const diagram = /** @type {any} */ (
            document.createElement("noflo-line-diagram")
          );
          diagram.routeIndex = route;
          diagram.routeName = data.name;
          diagram.labelFor = data.labelFor;
          diagram.lines = data.lines;
          host.appendChild(diagram);
        }
      }
    }
    for (const root of this._eventRoots()) {
      for (const button of root.querySelectorAll("[data-rename]")) {
        button.addEventListener("click", (/** @type {any} */ event) => {
          event.stopPropagation();
          const target = Number(
            event.currentTarget.getAttribute("data-rename"),
          );
          if (this.editor) {
            this.editor.dispatchEvent(
              new CustomEvent("route-name-attempt", {
                detail: { route: target },
                bubbles: true,
                composed: true,
              }),
            );
          }
        });
      }
      for (const row of root.querySelectorAll("[data-pick]")) {
        row.addEventListener("click", (/** @type {any} */ event) => {
          const target = event.currentTarget.getAttribute("data-pick");
          this.pickLine(Number(target));
        });
      }
    }
  }
}

customElements.define("noflo-lines-corner", FlowLinesCorner);
