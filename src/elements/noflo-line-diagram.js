/**
 * @file The line-diagram strip (work document #35 update #14): a route
 * rendered as a top-to-bottom transit line, the way the per-line maps
 * mounted on Underground columns read — a straight vertical rail, one
 * station per tick, the line's roundel at the top, the far terminus at
 * the bottom, interchange ticks for the other lines serving a station,
 * and 45° spurs at splits. Pure topology: the structure comes from
 * `buildRouteLines` — no node positions, no spatial math.
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

/** The vertical distance between station rows. */
const ROW = 44;
/** The horizontal offset per spur depth (each branch steps left). */
const SPUR_STEP = 40;
/** The rail's inset from the strip's right edge (spurs grow leftward). */
const RAIL_INSET = 70;
/** The strip's drawn width (the viewBox; the SVG scales to the panel). */
const STRIP_WIDTH = 240;
/** The break gap between a run and its stragglers. */
const BREAK_GAP = 34;

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
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this.render();
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
    const height = this.measure();
    /** @type {string[]} */
    const strips = [];
    let yOffset = ROW / 2 + 20;
    this.lines.forEach((component, index) => {
      if (index > 0) {
        // The break marker: an isolated straggler is not the same run —
        // a gap with two slashes says the line is interrupted
        const gapY = yOffset - ROW / 2;
        strips.push(
          `<line x1="10" y1="${gapY}" x2="26" y2="${gapY}" class="break-stroke"></line>` +
            `<line x1="20" y1="${gapY - 5}" x2="30" y2="${gapY + 5}" class="break-stroke"></line>`,
        );
        yOffset += BREAK_GAP;
      }
      strips.push(this.renderComponent(component, yOffset, index === 0));
      yOffset += this.componentHeight(component);
    });
    const theme = document.body.getAttribute("data-theme") ?? "";
    /** @type {ShadowRoot} */ (this.shadowRoot).innerHTML = `
      <style>
        :host {
          display: block;
          --edge-route: ${routeVar};
        }
        :host([data-theme="tube"]) {
          --diagram-font: sans-serif;
        }
        :host([data-theme="cyberpunk"]) {
          --diagram-font: var(--ui-font-mono, monospace);
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
        }
        .rail {
          stroke: var(--edge-route);
          stroke-width: 5px;
          fill: none;
        }
        .spur {
          stroke: var(--edge-route);
          stroke-width: 3px;
          fill: none;
        }
        .tick {
          fill: var(--ui-bg, white);
          stroke: var(--edge-route);
          stroke-width: 3px;
        }
        .terminus-ring {
          fill: var(--ui-bg, white);
          stroke: var(--edge-route);
          stroke-width: 4px;
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
          stroke: var(--edge-route);
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
      </style>
      ${
        this.lines.length === 0
          ? `<div class="empty">No line selected</div>`
          : `<div class="scroll"><svg viewBox="0 0 ${STRIP_WIDTH} ${height}" preserveAspectRatio="xMidYMin meet">${strips.join("")}</svg></div>`
      }
    `;
  }

  /**
   * The total strip height: the rows every component needs, plus the
   * break gaps between stragglers.
   *
   * @returns {number}
   */
  measure() {
    if (this.lines.length === 0) return 40;
    let total = ROW / 2 + 20;
    this.lines.forEach((component, index) => {
      if (index > 0) total += BREAK_GAP;
      total += this.componentHeight(component);
    });
    return total;
  }

  /**
   * One component's height: its station rows, including the interleaved
   * spur rows, plus the rounding room.
   *
   * @param {import("../library/LineDiagram.js").LineComponent} component
   * @returns {number}
   */
  componentHeight(component) {
    return (this.countRows(component.stations) + 1) * ROW + ROW / 2;
  }

  /**
   * The rows a chain needs: the spine's stations plus each spur's rows
   * interleaved after its split (a spur shares rows with the spine, but
   * a spur longer than the remaining spine extends the strip).
   *
   * @param {import("../library/LineDiagram.js").LineStation[]} stations
   * @returns {number}
   */
  countRows(stations) {
    let rows = stations.length;
    for (const station of stations) {
      for (const spur of station.spurs) {
        // A spur's rows start one below its split point
        rows = Math.max(rows, this.countRows(spur.stations) + 1);
      }
    }
    return rows;
  }

  /**
   * Renders one component: the spine rail top-to-bottom, station ticks
   * with labels, interchange ticks, and the spurs stepping left at 45°.
   *
   * @param {import("../library/LineDiagram.js").LineComponent} component
   * @param {number} yOffset
   * @param {boolean} isMain The main run carries the line's name.
   * @returns {string}
   */
  renderComponent(component, yOffset, isMain) {
    /** @type {string[]} */
    const parts = [];
    /** The drawn coordinates per station id, for join connectors. */
    const drawn = new Map();
    const x0 = STRIP_WIDTH - RAIL_INSET;

    /**
     * Draws a chain down a rail; the spine keeps its own row steps while
     * spurs interleave beside it.
     *
     * @param {import("../library/LineDiagram.js").LineStation[]} stations
     * @param {number} railX
     * @param {number} row
     * @param {number} depth
     * @returns {number} The row after the chain's last station.
     */
    const drawChain = (stations, railX, row, depth) => {
      let current = row;
      stations.forEach((station, index) => {
        const y = yOffset + current * ROW;
        drawn.set(station.id, { x: railX, row: current, y });
        if (index > 0) {
          // The rail connects consecutive stations on the same x
          parts.push(
            `<line x1="${railX}" y1="${y - ROW}" x2="${railX}" y2="${y}" class="rail"></line>`,
          );
        }
        // The station mark: termini ring (the roundel unit), stops dot;
        // joins draw a smaller tick — their connector carries the merge
        if (station.kind === "terminus") {
          parts.push(
            `<circle cx="${railX}" cy="${y}" r="8" class="terminus-ring"></circle>`,
          );
        } else {
          parts.push(
            `<circle cx="${railX}" cy="${y}" r="5" class="tick"></circle>`,
          );
        }
        // The label: spine labels sit right of the rail; spur labels sit
        // left of their rail (right-aligned), so the two never collide
        const label = escapeHtml(this.labelFor(station.id) || station.id);
        if (depth === 0) {
          parts.push(
            `<text x="${railX + 14}" y="${y + 4}" class="label">${label}</text>`,
          );
        } else {
          parts.push(
            `<text x="${railX - 14}" y="${y + 4}" class="label" text-anchor="end">${label}</text>`,
          );
        }
        // The interchange ticks: the other lines serving this station,
        // small color bars left of the tick
        station.interchange.forEach((other, tickIndex) => {
          parts.push(
            `<line x1="${railX - 12}" y1="${y - 6 + tickIndex * 5}" x2="${railX - 6}" y2="${y - 6 + tickIndex * 5}" class="interchange" style="stroke: var(--route-${other})"></line>`,
          );
        });
        // The spurs: each branch steps left at a 45° turnout and
        // interleaves its rows beside the spine
        station.spurs.forEach((spur) => {
          const spurX = railX - SPUR_STEP;
          if (spur.stations.length === 0 && spur.joinsAt) {
            // A bare join: the connector angles from this station into
            // the drawn target
            const target = drawn.get(spur.joinsAt);
            if (target) {
              parts.push(
                `<path d="M ${railX} ${y} L ${railX - SPUR_STEP / 2} ${y + ROW / 2} L ${target.x} ${target.y}" class="connector"></path>`,
              );
            }
            return;
          }
          if (spur.stations.length > 0) {
            const spurY = yOffset + (current + 1) * ROW;
            // The 45° turnout: the branch leaves the spine at a 45
            parts.push(
              `<line x1="${railX}" y1="${y}" x2="${spurX}" y2="${spurY}" class="spur"></line>`,
            );
            drawChain(spur.stations, spurX, current + 1, depth + 1);
          }
        });
        current += 1;
      });
      return current;
    };

    const endRow = drawChain(component.stations, x0, 0, 0);
    // The cyclic closure: a loop's last station connects back to the first
    if (component.cyclic && component.stations.length > 1) {
      const first = drawn.get(component.stations[0].id);
      const lastY = yOffset + (endRow - 1) * ROW;
      if (first) {
        parts.push(
          `<path d="M ${x0} ${lastY} L ${x0 - SPUR_STEP / 2} ${lastY + ROW / 2} L ${x0 - SPUR_STEP / 2} ${first.y - ROW / 2} L ${first.x} ${first.y}" class="connector"></path>`,
        );
      }
    }
    // The line's roundel: the name beside the main run's top terminus
    if (isMain) {
      const name = escapeHtml(this.routeName || "Line");
      parts.push(
        `<text x="${x0 + 14}" y="${yOffset - 14}" class="line-name">${name}</text>`,
      );
    }
    return parts.join("");
  }
}

customElements.define("noflo-line-diagram", FlowLineDiagram);
