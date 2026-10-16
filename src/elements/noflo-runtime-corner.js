/**
 * @file Runtime corner (work documents #59, #15, #28, top-right): the FBP
 * runtime population's home — discovery, connection state, and the
 * advertised capability mask. A runtime is just another mesh counterpart
 * with a protocol version; this corner is the functional layer over that
 * state (the wires twin — the FBP protocol stream accordion — is #63's
 * milestone M3 and will pair here).
 *
 * The corner follows #28's grammar via the shared base: Hidden while the
 * mesh is unused, Normal (the segmented chip), Minified (compact
 * viewports), Expanded (the runtime rows).
 */

import icons from "../../vendor/fontawesome-icons.js";
import { emit } from "../events.js";
import { cornerStyles, FlowCornerElement } from "./corner-element.js";

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
 * @returns {string} Markup for the icon.
 */
function icon(name) {
  return `<i class="fa" aria-hidden="true">${/** @type {any} */ (icons())[name] ?? ""}</i>`;
}

/**
 * Truncates a hex destination hash for compact display.
 *
 * @param {string} hash
 * @returns {string}
 */
function shortHash(hash) {
  return hash.length > 12 ? `${hash.slice(0, 4)}…${hash.slice(-4)}` : hash;
}

export class FlowRuntimeCorner extends FlowCornerElement {
  constructor() {
    super();
    /** @type {Array<{ destinationHash: string, nodeName: string, protocolVersion: number, lastSeen: number }>} */
    this._runtimes = [];
    /** Per-runtime connection state, keyed by hex destination hash. */
    /** @type {Map<string, { state: string, nodeName: string | null, capabilityMask?: number, capabilities?: string[], protocolVersion?: number, error?: string }>} */
    this._runtimeConnections = new Map();
    /** Whether the previous render was expanded: the transition asks the
     * Engine for a fresh discovery (work document #59). */
    this._wasExpanded = false;
    this.chipTitle = "FBP runtimes on the mesh";
  }

  /**
   * Refreshes in place with the runtime population and per-runtime
   * connection state (work document #59).
   *
   * @param {Array<{ destinationHash: string, nodeName: string, protocolVersion: number, lastSeen: number }> | null} runtimes
   * @param {Map<string, { state: string, nodeName: string | null, capabilityMask?: number, capabilities?: string[], protocolVersion?: number, error?: string }> | null} [connections]
   */
  setRuntimes(runtimes, connections = null) {
    this._runtimes = Array.isArray(runtimes) ? runtimes : [];
    this._runtimeConnections =
      connections instanceof Map ? connections : /** @type {any} */ (new Map());
    this.render();
  }

  /**
   * The collapsed chip: the population count as the summary, the color
   * the state — calm when a runtime is connected, attention when a
   * connection errored, neutral for discovery-only.
   *
   * @returns {string}
   */
  chipHtml() {
    const states = [...this._runtimeConnections.values()].map(
      (/** @type {any} */ connection) => connection.state,
    );
    const connected = states.filter((state) => state === "connected").length;
    const cls = states.includes("error")
      ? "attention"
      : connected > 0
        ? "calm"
        : "";
    return `<span class="seg ${cls}" title="FBP runtimes discovered on the mesh">${icon("satellite-dish")}<span class="label">${this._runtimes.length} runtime${this._runtimes.length === 1 ? "" : "s"}${connected > 0 ? ` · ${connected} connected` : ""}</span></span>`;
  }

  /**
   * The expanded runtime rows: the status word carries the semantic
   * (connected calm, disconnected the offline age, errors attention with
   * the reason beside the row it describes); the advertised capability
   * mask renders as the wire's relation names — the feature-detection
   * surface, not a "NoFlo runtime" label.
   *
   * @returns {string}
   */
  expandedHtml() {
    const rows = this._runtimes
      .map((/** @type {any} */ runtime) => {
        const connection = this._runtimeConnections.get(
          runtime.destinationHash,
        );
        const state = connection?.state ?? "discovered";
        const badge =
          state === "connected"
            ? `<span class="badge verified">connected</span>`
            : state === "error"
              ? `<span class="badge refused">error</span>`
              : state === "disconnected"
                ? `<span class="badge offline">offline</span>`
                : `<span class="badge">discovered</span>`;
        const capabilities =
          connection?.capabilities && connection.capabilities.length > 0
            ? `<div class="hint">capabilities: ${escapeHtml(connection.capabilities.join(", "))}</div>`
            : "";
        const action =
          state === "connected"
            ? `<button class="secondary" data-runtime-disconnect="${escapeHtml(runtime.destinationHash)}">Disconnect</button>`
            : `<button data-runtime-connect="${escapeHtml(runtime.destinationHash)}">Connect</button>`;
        const errorLine =
          state === "error"
            ? `<div class="status-line danger">${escapeHtml(connection?.error ?? "connection failed")}</div>`
            : "";
        return `
      <div class="runtime">
        <div class="list-item">
          <span class="grow"><span>${escapeHtml(runtime.nodeName || "unnamed runtime")}</span> <span class="hash-text">${escapeHtml(shortHash(runtime.destinationHash))}</span></span>
          ${badge}${action}
        </div>
        ${capabilities}${errorLine}
      </div>`;
      })
      .join("");
    return `
      <div class="panel">
        <div class="panel-head">
          <span>Runtimes</span>
          <button class="secondary" data-action="collapse" title="Collapse">▾</button>
        </div>
        <div class="hint">A runtime announces itself on the mesh when it starts. Connect to deploy and observe flows.</div>
        ${rows || '<div class="hint">No runtimes discovered on the mesh yet.</div>'}
      </div>
    `;
  }

  styles() {
    return `
        :host {
          position: fixed;
          top: 12px;
          right: 12px;
          z-index: 900;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          max-width: min(360px, calc(100vw - 24px));
          font-family: SourceCodePro, monospace;
          color: var(--node-text);
        }
        .runtime { margin: 2px 0; }
        .runtime .badge { margin-left: 4px; }
        .runtime button { flex-shrink: 0; }
        .badge.offline { background: color-mix(in srgb, var(--ui-age-offline) 25%, transparent); color: var(--ui-age-offline); }
    `;
  }

  wireEvents() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    // Expansion asks the Engine for a fresh runtime discovery (work
    // document #59): a quiet mesh still shows its cached population, and
    // the request rides the expansion transition, not every render
    if (this.expanded && !this._wasExpanded) {
      emit(this, "runtime-refresh", undefined);
    }
    this._wasExpanded = this.expanded;
    for (const button of shadow.querySelectorAll("[data-runtime-connect]")) {
      button.addEventListener("click", () => {
        emit(this, "runtime-connect", {
          destinationHash: String(
            button.getAttribute("data-runtime-connect") ?? "",
          ),
        });
      });
    }
    for (const button of shadow.querySelectorAll("[data-runtime-disconnect]")) {
      button.addEventListener("click", () => {
        emit(this, "runtime-disconnect", {
          destinationHash: String(
            button.getAttribute("data-runtime-disconnect") ?? "",
          ),
        });
      });
    }
  }
}

customElements.define("noflo-runtime-corner", FlowRuntimeCorner);
