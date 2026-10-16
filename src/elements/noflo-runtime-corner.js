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
    /** Per-runtime process listings (node id → entry). */
    /** @type {Map<string, Record<string, { component: string, type: string, state: number | string }>>} */
    this._processes = new Map();
    /** Per-runtime run state. */
    /** @type {Map<string, { state: string, error?: string }>} */
    this._runs = new Map();
    /** Per-runtime deploy state (the latest echo per runtime). */
    /** @type {Map<string, { graphId: string, state: string, ops?: number, skipped?: number, error?: string }>} */
    this._deploys = new Map();
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
   * Refreshes in place with the execution state (work document #59
   * Phase A): process listings, run state, and deploy progress per
   * runtime.
   *
   * @param {Map<string, Record<string, { component: string, type: string, state: number | string }>> | null} processes
   * @param {Map<string, { state: string, error?: string }>} runs
   * @param {Map<string, { graphId: string, state: string, ops?: number, skipped?: number, error?: string }>} deploys
   */
  setRuntimeActivity(processes, runs, deploys) {
    this._processes =
      processes instanceof Map ? processes : /** @type {any} */ (new Map());
    this._runs = runs instanceof Map ? runs : /** @type {any} */ (new Map());
    this._deploys =
      deploys instanceof Map ? deploys : /** @type {any} */ (new Map());
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
    // The base renders expandedHtml() unconditionally: the guard is the
    // expansion state (the project corner's note)
    if (!this.expanded) return "";
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
        // Deploy + observe (work document #59 Phase A): a connected
        // runtime gains the run affordances — deploy the active graph,
        // start/stop the network, the process count and run state as the
        // observability line. The capability gate: no `lifecycle.ctrl`
        // means no run affordance (the mask's feature detection)
        const known = connection?.capabilities ?? [];
        const canRun =
          known.includes("all") || known.includes("lifecycle.ctrl");
        const runState = this._runs.get(runtime.destinationHash);
        const processes = this._processes.get(runtime.destinationHash) ?? {};
        const processCount = Object.keys(processes).length;
        const deploy = this._deploys.get(runtime.destinationHash);
        const runWord =
          runState && runState.state !== "error"
            ? `<span class="badge pending">${escapeHtml(runState.state)}</span>`
            : runState
              ? `<span class="badge refused">run error</span>`
              : "";
        const observeLine =
          state === "connected"
            ? `<div class="hint">${processCount} process${processCount === 1 ? "" : "es"}${runState && runState.state !== "error" ? ` · ${escapeHtml(runState.state)}` : ""}</div>`
            : "";
        const runActions =
          state === "connected" && canRun
            ? `<button data-runtime-deploy="${escapeHtml(runtime.destinationHash)}" title="Deploy the active graph onto this runtime">Deploy</button>${
                runState?.state === "running"
                  ? `<button class="secondary" data-runtime-run="${escapeHtml(runtime.destinationHash)}" data-run-action="stop">Stop</button>`
                  : `<button data-runtime-run="${escapeHtml(runtime.destinationHash)}" data-run-action="start">Run</button>`
              }`
            : "";
        const deployLine = deploy
          ? deploy.state === "deploying"
            ? `<div class="hint">Deploying…</div>`
            : deploy.state === "deployed"
              ? `<div class="hint">Deployed — ${deploy.ops ?? 0} op${(deploy.ops ?? 0) === 1 ? "" : "s"} sent${deploy.skipped ? `, ${deploy.skipped} already present` : ""}.</div>`
              : `<div class="status-line danger">Deploy failed: ${escapeHtml(deploy.error ?? "unknown reason")}</div>`
          : "";
        const errorLine =
          state === "error"
            ? `<div class="status-line danger">${escapeHtml(connection?.error ?? "connection failed")}</div>`
            : "";
        return `
      <div class="runtime">
        <div class="list-item">
          <span class="grow"><span>${escapeHtml(runtime.nodeName || "unnamed runtime")}</span> <span class="hash-text">${escapeHtml(shortHash(runtime.destinationHash))}</span></span>
          ${badge}${runWord}${action}
        </div>
        ${capabilities}${runActions}${observeLine}${deployLine}${errorLine}
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
        /* Top corners stack the chip above their accordions (work document
           #28's corner rule: bottom corners grow upward, top corners grow
           downward) — the base's DOM order is panel-first for the bottom
           corners, so the chip re-orders here */
        .chip { order: -1; }
        .runtime { margin: 2px 0; }
        .runtime .badge { margin-left: 4px; }
        .runtime button { flex-shrink: 0; }
        .badge.offline { background: color-mix(in srgb, var(--ui-age-offline) 25%, transparent); color: var(--ui-age-offline); }
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
    for (const button of shadow.querySelectorAll("[data-runtime-deploy]")) {
      button.addEventListener("click", () => {
        emit(this, "runtime-deploy", {
          destinationHash: String(
            button.getAttribute("data-runtime-deploy") ?? "",
          ),
        });
      });
    }
    for (const button of shadow.querySelectorAll("[data-runtime-run]")) {
      button.addEventListener("click", () => {
        emit(this, "runtime-run", {
          destinationHash: String(
            button.getAttribute("data-runtime-run") ?? "",
          ),
          action:
            button.getAttribute("data-run-action") === "stop"
              ? "stop"
              : "start",
        });
      });
    }
  }
}

customElements.define("noflo-runtime-corner", FlowRuntimeCorner);
