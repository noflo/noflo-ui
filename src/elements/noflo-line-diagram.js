/**
 * @file The line-diagram strip (work document #35 update #14): a route
 * rendered as a top-to-bottom transit line, the way the per-line maps
 * mounted on Underground columns read — a straight vertical rail, one
 * station per tick, the line's roundel at the top, the far terminus at
 * the bottom, interchange ticks for the other lines serving a station,
 * and 45° turnouts where branches leave. Pure topology: the structure
 * comes from `buildRouteLines` — no node positions, no spatial math.
 *
 * The layout is sequential: the main run's strip first, then each
 * branch's strip indented right of its turnout, then stragglers after
 * the break — every rail gets the full label width, so long station
 * names ellipsize instead of colliding. The strip is interactive:
 * stations and rail segments select on click.
 */

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
 * Truncates a label with an ellipsis; the full name rides the title.
 *
 * @param {string} value
 * @param {number} max
 * @returns {string}
 */
function fitLabel(value, max) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** The vertical distance between station rows. */
const ROW = 40;
/** The horizontal offset per strip depth (branches indent right). */
const DEPTH_STEP = 30;
/** The main rail's x; labels flow right of it into the full width. */
const RAIL_X = 30;
/** The 45° turnout's diagonal run (dx = dy keeps the grammar). */
const TURNOUT = 18;
/** The gap before a branch's strip, in row units — the turnout's 45°
 * diagonal needs 30px of fall before the branch's first station. */
const BRANCH_GAP = 0.9;
/** The break gap between a run and its stragglers, in row units. */
const BREAK_GAP = 1;

export class FlowLineDiagram extends HTMLElement {
  constructor() {
    super();
    /** @type {import("../library/LineDiagram.js").LineComponent[]} */
    this.lines = [];
    /** @type {number | null} */
    this.routeIndex = null;
    /** @type {string} */
    this.routeName = "";
    /** Resolves a station id to its display label. */
    /** @type {(id: string) => string} */
    this.labelFor = (id) => id;
    /** The stations the canvas selection holds — their marks fill with
     * the line's color. */
    /** @type {Set<string>} */
    this.highlightStations = new Set();
    /** The wires the canvas selection holds — their rail segments
     * thicken. */
    /** @type {Set<string>} */
    this.highlightEdges = new Set();
    /** @type {ResizeObserver | null} */
    this._resizeObserver = null;
    /** @type {MutationObserver | null} */
    this._ageObserver = null;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    // The strip fills the accordion's width: re-render when the panel
    // resizes (the column is user-resizable)
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver(() => {
        if (this.lines.length > 0) this.render();
      });
      this._resizeObserver.observe(this);
    }
    // The environment age (guidelines §5) rides the host as the state
    // class the ink rules consume; the body observer keeps it in step
    this._mirrorAge();
    this._ageObserver = new MutationObserver(() => this._mirrorAge());
    if (typeof document !== "undefined" && document.body) {
      this._ageObserver.observe(document.body, { attributes: true });
    }
    this.render();
  }

  /**
   * Mirrors the body's data-age onto the host as the state-<age> class.
   */
  _mirrorAge() {
    const age = document.body?.getAttribute("data-age") ?? "abstract";
    for (const cls of [...this.classList]) {
      if (cls.startsWith("state-")) this.classList.remove(cls);
    }
    this.classList.add(`state-${age}`);
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._ageObserver?.disconnect();
    this._ageObserver = null;
  }

  /**
   * Renders the strips: one per component, stacked; stragglers carry the
   * break marker between them. The line's name rides the main run's
   * roundel only.
   */
  render() {
    const routeVar =
      this.routeIndex === null
        ? "var(--ui-accent)"
        : `var(--route-${this.routeIndex})`;
    const width = Math.max(this.clientWidth || 0, 200);
    const height = this.measure();
    /** @type {string[]} */
    const strips = [];
    let rowOffset = 1;
    this.lines.forEach((component, index) => {
      if (index > 0) {
        // The break marker: an isolated straggler is not the same run —
        // a gap with two slashes says the line is interrupted
        const gapY = rowOffset * ROW - ROW / 2;
        strips.push(
          `<line x1="10" y1="${gapY}" x2="26" y2="${gapY}" class="break-stroke"></line>` +
            `<line x1="20" y1="${gapY - 5}" x2="30" y2="${gapY + 5}" class="break-stroke"></line>`,
        );
        rowOffset += BREAK_GAP;
      }
      strips.push(this.renderComponent(component, rowOffset));
      rowOffset += this.componentRows(component) + BRANCH_GAP;
    });
    const theme = document.body.getAttribute("data-theme") ?? "";
    /** @type {ShadowRoot} */ (this.shadowRoot).innerHTML = `
      <style>
        :host {
          display: block;
          --edge-route: ${routeVar};
          /* The ink the strip draws with: the age rules act here exactly
             as they act on the wires (guidelines §6, §5) — abstract
             mutes the hue toward the canvas bounded at 70%, offline
             collapses a suspended line to grey ink, crashed reads in
             the theme's error red, golden keeps full strength */
          --edge-ink: var(--edge-route);
        }
        :host(.state-abstract) {
          --edge-ink: color-mix(
            in srgb,
            var(--edge-route) 70%,
            var(--ui-bg)
          );
        }
        :host(.state-offline) {
          --edge-ink: var(--ui-age-offline, var(--ui-text-muted, grey));
        }
        :host(.state-crashed) {
          --edge-ink: var(--ui-age-crashed, var(--ui-accent));
        }
        .scroll {
          max-height: 60vh;
          overflow-y: auto;
          overflow-x: hidden;
        }
        svg {
          display: block;
          width: 100%;
          height: ${height}px;
        }
        text {
          font-family: ${theme === "tube" ? "sans-serif" : "var(--ui-font-mono, monospace)"};
          fill: var(--ui-text, white);
          pointer-events: none;
        }
        .rail {
          stroke: var(--edge-ink);
          stroke-width: 5px;
          fill: none;
        }
        .spur {
          stroke: var(--edge-ink);
          stroke-width: 3px;
          fill: none;
        }
        .tick {
          fill: var(--ui-bg, white);
          stroke: var(--edge-ink);
          stroke-width: 3px;
        }
        .terminus-ring {
          fill: var(--ui-bg, white);
          stroke: var(--edge-ink);
          stroke-width: 4px;
        }
        /* The boundary marks, in the canvas's own grammar: the IIP's
           rounded rectangle filled with the line's color, the export's
           socket ring — smaller than a station — hollow like the
           canvas's socket */
        .mark-iip {
          fill: var(--edge-ink);
          stroke: var(--ui-bg, white);
          stroke-width: 1px;
        }
        .mark-export {
          fill: var(--ui-bg, white);
          stroke: var(--edge-ink);
          stroke-width: 3px;
        }
        /* An interchange station reads bigger, its other lines ticking
           beside it */
        .mark-interchange {
          stroke-width: 4px;
        }
        /* The canvas selection answers in the strip: the selected
           station's disc fills with the line's color (the strongest
           emphasis, guidelines §6), the selected rail thickens */
        .hit.selected .tick,
        .hit.selected .terminus-ring,
        .hit.selected .mark-iip,
        .hit.selected .mark-export {
          fill: var(--edge-ink);
        }
        .hit.selected .mark-export {
          fill: var(--ui-bg, white);
          stroke-width: 5px;
        }
        .hit.selected .mark-iip {
          fill: var(--edge-ink);
        }
        .hit.selected .label {
          font-weight: bold;
        }
        .rail.selected {
          stroke-width: 8px;
        }
        .label {
          font-size: 12px;
        }
        .line-name {
          font-size: 13px;
          font-weight: bold;
        }
        .interchange {
          stroke-width: 3px;
        }
        .connector {
          stroke: var(--edge-ink);
          stroke-width: 2px;
          fill: none;
        }
        .break-stroke {
          stroke: var(--ui-text-muted, grey);
          stroke-width: 2px;
        }
        .empty {
          padding: 8px 12px;
          color: var(--ui-text-muted, grey);
          font-family: sans-serif;
          font-size: 12px;
        }
        /* The strip is interactive: stations and rail segments select.
           The hover thickens the mark, the cursor points */
        .hit {
          cursor: pointer;
        }
        .hit:hover .tick,
        .hit:hover .terminus-ring {
          stroke-width: 5px;
        }
        .hit:hover .rail {
          stroke-width: 7px;
        }
        .hit circle {
          transition: stroke-width 0.1s ease;
        }
      </style>
      ${
        this.lines.length === 0
          ? `<div class="empty">No line selected</div>`
          : `<div class="scroll"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMin meet">${strips.join("")}</svg></div>`
      }
    `;
    this.wireEvents();
  }

  /**
   * Wires the click delegation: stations and rail segments select.
   */
  wireEvents() {
    const svg = /** @type {ShadowRoot} */ (this.shadowRoot).querySelector(
      "svg",
    );
    if (!svg) return;
    svg.addEventListener("click", (/** @type {any} */ event) => {
      const stationHit = /** @type {any} */ (
        event.target?.closest?.("[data-station-id]")
      );
      const edgeHit = /** @type {any} */ (
        event.target?.closest?.("[data-edge-id]")
      );
      // The multi-select modifier rides the click: the panel applies the
      // canvas's own semantics (modified clicks toggle, plain clicks
      // select within the type)
      const multi = Boolean(event.shiftKey || event.ctrlKey || event.metaKey);
      if (stationHit) {
        this.dispatchEvent(
          new CustomEvent("station-click", {
            detail: { id: stationHit.getAttribute("data-station-id"), multi },
            bubbles: true,
            composed: true,
          }),
        );
      } else if (edgeHit) {
        this.dispatchEvent(
          new CustomEvent("edge-click", {
            detail: { edgeId: edgeHit.getAttribute("data-edge-id"), multi },
            bubbles: true,
            composed: true,
          }),
        );
      }
    });
  }

  /**
   * The total strip height.
   *
   * @returns {number}
   */
  measure() {
    if (this.lines.length === 0) return 40;
    let rows = 1;
    this.lines.forEach((component, index) => {
      if (index > 0) rows += BREAK_GAP;
      rows += this.componentRows(component) + BRANCH_GAP;
    });
    return rows * ROW;
  }

  /**
   * One component's rows: its spine, plus each branch's strip after its
   * turnout gap, recursively.
   *
   * @param {import("../library/LineDiagram.js").LineComponent} component
   * @returns {number}
   */
  componentRows(component) {
    return this.chainRows(component.stations);
  }

  /**
   * @param {import("../library/LineDiagram.js").LineStation[]} stations
   * @returns {number}
   */
  chainRows(stations) {
    let rows = stations.length;
    for (const station of stations) {
      for (const spur of station.spurs) {
        if (spur.stations.length === 0) continue;
        rows += BRANCH_GAP + this.chainRows(spur.stations);
      }
    }
    return rows;
  }

  /**
   * Renders one component: the spine rail top-to-bottom, then each
   * branch's strip indented right of its turnout, connectors included.
   *
   * @param {import("../library/LineDiagram.js").LineComponent} component
   * @param {number} rowOffset
   * @returns {string}
   */
  renderComponent(component, rowOffset) {
    /** The rails and connectors paint first; the stations paint on top,
     * so a click at a tick hits the station, not the rail's end. */
    /** @type {string[]} */
    const railParts = [];
    /** @type {string[]} */
    const parts = [];
    /** The drawn coordinates per station id, for join connectors. */
    const drawn = new Map();
    const yOf = (/** @type {number} */ row) => rowOffset * ROW + row * ROW;
    const maxLabel = (/** @type {number} */ width) =>
      Math.max(Math.floor((width - 60) / 7), 8);

    /**
     * Draws a chain down its rail; returns the row after the chain.
     *
     * @param {import("../library/LineDiagram.js").LineStation[]} stations
     * @param {number} railX
     * @param {number} startRow
     * @param {number} width
     * @param {number} maxChars
     * @returns {number}
     */
    const drawChain = (stations, railX, startRow, width, maxChars) => {
      stations.forEach((station, index) => {
        const y = yOf(startRow + index);
        drawn.set(station.id, { x: railX, y });
        if (index > 0) {
          // The rail segment to the previous station carries the edge
          // that flows in: clicking it selects the wire
          railParts.push(
            `<line x1="${railX}" y1="${y - ROW}" x2="${railX}" y2="${y}" class="rail${this.highlightEdges.has(station.via ?? "") ? " selected" : ""}" data-edge-id="${escapeHtml(station.via ?? "")}"></line>`,
          );
        }
        // The station mark reads what the station IS, in the canvas's
        // own grammar: an IIP is the packet boundary (the chip's rounded
        // rectangle, filled with the line's color), an exported port the
        // system boundary (its socket ring, smaller than a station — the
        // canvas renders exports at a quarter of a node), an interchange
        // station (other lines touch it) is a larger disc, a plain node
        // a disc, a line's terminus the roundel ring, a join a small
        // tick
        const id = station.id;
        let mark;
        if (id.startsWith("DATA->")) {
          mark = `<rect x="${railX - 6}" y="${y - 4.5}" width="12" height="9" rx="2.5" class="mark-iip"></rect>`;
        } else if (id.startsWith("export:")) {
          mark = `<circle cx="${railX}" cy="${y}" r="4" class="mark-export"></circle>`;
        } else if (station.interchange.length > 0) {
          mark = `<circle cx="${railX}" cy="${y}" r="8" class="tick mark-interchange"></circle>`;
        } else if (station.kind === "terminus") {
          mark = `<circle cx="${railX}" cy="${y}" r="9" class="terminus-ring"></circle>`;
        } else if (station.kind === "join") {
          mark = `<circle cx="${railX}" cy="${y}" r="4" class="tick"></circle>`;
        } else {
          mark = `<circle cx="${railX}" cy="${y}" r="6" class="tick"></circle>`;
        }
        const label = escapeHtml(
          fitLabel(this.labelFor(station.id) || station.id, maxChars),
        );
        const full = escapeHtml(this.labelFor(station.id) || station.id);
        // The hit rect makes the whole tick+label row clickable, not
        // just the painted pixels (pointer-events: all hits the
        // transparent fill)
        const selectedStation = this.highlightStations.has(station.id);
        parts.push(
          `<g class="hit${selectedStation ? " selected" : ""}" data-station-id="${escapeHtml(station.id)}"><title>${full}</title><rect class="hit-row" x="${railX - 14}" y="${y - 14}" width="${Math.min(200, width - railX - 10)}" height="28" fill="transparent" stroke="none" pointer-events="all"></rect>${mark}<text x="${railX + 16}" y="${y + 4}" class="label">${label}</text></g>`,
        );
        // The interchange ticks: the other lines serving this station,
        // small color bars left of the tick
        station.interchange.forEach((other, tickIndex) => {
          railParts.push(
            `<line x1="${railX - 12}" y1="${y - 6 + tickIndex * 5}" x2="${railX - 6}" y2="${y - 6 + tickIndex * 5}" class="interchange" style="stroke: var(--route-${other})"></line>`,
          );
        });
      });
      return startRow + stations.length;
    };

    /**
     * Draws the spurs hanging off a chain's stations, each as its own
     * indented strip after the parent's rows.
     *
     * @param {import("../library/LineDiagram.js").LineStation[]} stations
     * @param {number} depth
     * @param {number} nextRow
     * @param {number} width
     * @returns {number}
     */
    const drawSpurs = (stations, depth, nextRow, width) => {
      let row = nextRow;
      for (const station of stations) {
        for (const spur of station.spurs) {
          const from = drawn.get(station.id);
          if (spur.stations.length === 0 && spur.joinsAt) {
            // A bare join: an elbow from the split station into the
            // drawn target — 45°, horizontal, vertical, 45°: the
            // grammar's turns only
            const target = drawn.get(spur.joinsAt);
            if (from && target) {
              const dir = target.y > from.y ? 1 : -1;
              railParts.push(
                `<path d="M ${from.x} ${from.y} L ${from.x + TURNOUT} ${from.y + TURNOUT * dir} L ${target.x + TURNOUT} ${from.y + TURNOUT * dir} L ${target.x + TURNOUT} ${target.y - TURNOUT * dir} L ${target.x} ${target.y}" class="connector"></path>`,
              );
            }
            continue;
          }
          if (spur.stations.length === 0) continue;
          const spurRail = RAIL_X + DEPTH_STEP * (depth + 1);
          const startRow = row + BRANCH_GAP;
          // The 45° turnout from the split station into the branch rail,
          // then vertical down to the branch's first station; the
          // turnout carries the branch's incoming edge for selection
          if (from) {
            const firstY = yOf(startRow);
            const drop = spurRail - from.x;
            railParts.push(
              `<path d="M ${from.x} ${from.y} L ${spurRail} ${from.y + drop} L ${spurRail} ${firstY}" class="spur" data-edge-id="${escapeHtml(spur.stations[0].via ?? "")}"></path>`,
            );
          }
          row = drawChain(
            spur.stations,
            spurRail,
            startRow,
            width,
            maxLabel(width) - 4,
          );
          row = drawSpurs(spur.stations, depth + 1, row + BRANCH_GAP, width);
        }
      }
      return row;
    };

    const width = Math.max(this.clientWidth || 0, 200);
    const chars = maxLabel(width);
    const endRow = drawChain(component.stations, RAIL_X, 0, width, chars);
    drawSpurs(component.stations, 0, endRow, width);
    // The cyclic closure: a loop's last station connects back to the
    // first, elbowing on the rail's left
    if (component.cyclic && component.stations.length > 1) {
      const first = drawn.get(component.stations[0].id);
      const last = drawn.get(
        component.stations[component.stations.length - 1].id,
      );
      if (first && last) {
        railParts.push(
          `<path d="M ${first.x} ${last.y} L ${first.x - TURNOUT} ${last.y + TURNOUT} L ${first.x - TURNOUT} ${first.y - TURNOUT} L ${first.x} ${first.y}" class="connector"></path>`,
        );
      }
    }
    return railParts.join("") + parts.join("");
  }
}

customElements.define("noflo-line-diagram", FlowLineDiagram);
