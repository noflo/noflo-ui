/**
 * @file The wires log (work document #63): the terminal grammar's
 * read-only rendering — the pseudo-console rules of VISUAL_GUIDELINES §12
 * (monospace three-column grid: timestamp muted, message main,
 * right-aligned bracketed status in semantic color) as a circular buffer
 * with a hard DOM maximum enforced in JS, painted at display refresh rate
 * under burst load.
 *
 * The element is a wires-layer surface: it renders the unvarnished output
 * the telemetry bus fans out, never a processed summary, and it takes no
 * input — the user is viewing engine output, not editing state through it.
 */

const MAX_LINES = 200;

/**
 * Formats a wall-clock timestamp as the muted HH:MM:SS column.
 *
 * @param {number} time
 * @returns {string}
 */
function clockTime(time) {
  const date = new Date(time);
  const pad = (/** @type {number} */ n) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export class FlowTelemetryLog extends HTMLElement {
  constructor() {
    super();
    /** The rendered buffer: capped, oldest entries dropped. */
    /** @type {import("../glass/telemetryBus.js").TelemetryEntry[]} */
    this._lines = [];
    /** Entries waiting for the next paint. */
    /** @type {import("../glass/telemetryBus.js").TelemetryEntry[]} */
    this._pending = [];
    /** @type {number | ReturnType<typeof setTimeout> | null} */
    this._raf = 0;
    this.attachShadow({ mode: "open" });
    this.render();
  }

  /**
   * Replaces the buffer (subscription-on-open hydration) and paints at
   * once.
   *
   * @param {import("../glass/telemetryBus.js").TelemetryEntry[]} entries
   */
  setHistory(entries) {
    this._lines = (entries ?? []).slice(-MAX_LINES);
    this._pending = [];
    this.render();
  }

  /**
   * Buffers one entry and schedules a paint. Bursts coalesce: the DOM
   * paints once per display frame, not once per entry.
   *
   * @param {import("../glass/telemetryBus.js").TelemetryEntry} entry
   */
  push(entry) {
    this._pending.push(entry);
    if (!this._raf) {
      // rAF is the display-refresh contract; the timeout fallback keeps
      // the coalescing semantics in non-browser runs
      const schedule =
        typeof requestAnimationFrame === "function"
          ? requestAnimationFrame
          : (/** @type {() => void} */ cb) => setTimeout(cb, 16);
      this._raf = schedule(() => {
        this._raf = 0;
        this._lines.push(...this._pending);
        this._pending = [];
        if (this._lines.length > MAX_LINES) {
          this._lines = this._lines.slice(-MAX_LINES);
        }
        this.render();
      });
    }
  }

  render() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    const lines = this._lines
      .map(
        (entry) => `<div class="line">
          <span class="time">${clockTime(entry.time)}</span>
          <span class="msg">${escapeHtml(entry.message)}</span>
          <span class="status ${entry.tone ?? ""}">[ ${escapeHtml(
            (entry.status ?? "OK").toUpperCase(),
          )} ]</span>
        </div>`,
      )
      .join("");
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          /* The wires accordion's space (work document #63's space
           * manager): the log fills the height its slot gives it, so
           * the terminal surface uses the accordion's whole share */
          height: 100%;
          min-height: 0;
          font-family: SourceCodePro, monospace;
          color: var(--node-text);
        }
        .log {
          height: 100%;
          overflow-y: auto;
          font-size: 10px;
          line-height: 1.5;
        }
        .line {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 8px;
          align-items: baseline;
        }
        .time {
          color: color-mix(in srgb, currentColor 55%, transparent);
          white-space: nowrap;
        }
        .msg {
          overflow-wrap: anywhere;
        }
        .status {
          white-space: nowrap;
          text-align: right;
          color: color-mix(in srgb, currentColor 70%, transparent);
        }
        .status.ok { color: var(--ui-age-calm); }
        .status.fail { color: var(--ui-age-attention); }
        .empty {
          font-size: 10px;
          color: color-mix(in srgb, currentColor 55%, transparent);
        }
      </style>
      <div class="log">${
        lines || '<div class="empty">no traffic recorded yet</div>'
      }</div>
    `;
    // The live tail: the newest entry stays in view unless the reader
    // scrolled up to inspect history
    const log = shadow.querySelector(".log");
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  }
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

customElements.define("flow-telemetry-log", FlowTelemetryLog);
