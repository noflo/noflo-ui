/**
 * @file Sync/presence panel (work document #28, bottom-right corner): the
 * mesh collaboration state's permanent home beside the canvas. Pure view:
 * state in via setters fed from the Engine's existing messages
 * (`mesh-status`, `mesh-peers`, `mesh-requests`, `mesh-bootstrap`,
 * `mesh-dacar`), intents out via events. Shadow DOM, per SPEC "Light DOM vs
 * Shadow DOM".
 *
 * Collapsed, the chip is a segmented status strip in the airline-prompt
 * grammar (work document #28 update #2): icon + value pairs, each segment
 * carrying its own Ages state color, empty states dropping out. Expanded,
 * the peers list, join requests with inline decisions, invite generation,
 * and the join form accordion open — the live-state sections that used to
 * live in the mesh settings modal.
 *
 * The corner element states come from the shared corner base (Hidden,
 * Normal, Minified, Expanded); this element starts Hidden — the mesh
 * unused means no corner UI.
 */

import icons from "../../vendor/fontawesome-icons.js";
import { FlowCornerElement } from "./CornerElement.js";

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

/**
 * Plain-language text for a bootstrap decline reason (work document #25
 * §4.3).
 *
 * @param {string | undefined} reason
 * @returns {string}
 */
function declineReasonText(reason) {
  switch (reason) {
    case "host_rejected":
      return "the host declined your request";
    case "host_lacks_authority":
      return "the host cannot grant access (it does not hold the project’s Trust Anchor)";
    case "invalid_token":
      return "the invite is invalid or expired";
    case "invalid_authorization":
      return "the handoff failed verification";
    default:
      return reason ?? "unknown reason";
  }
}

/**
 * Truncates a hex identity hash for compact display.
 *
 * @param {string} hash
 * @returns {string}
 */
function shortHash(hash) {
  return hash.length > 12 ? `${hash.slice(0, 4)}…${hash.slice(-4)}` : hash;
}

/**
 * Icons for narrated operations, chosen for what the operation is rather
 * than a generic wait: local work is a machine, loading is a store,
 * connecting is a plug. Unmapped operations fall back to the hourglass.
 *
 * @param {string} operation
 * @param {string} stage
 * @returns {string}
 */
function narrationIcon(operation, stage) {
  if (operation === "mesh.connect" && stage === "discovery") return "laptop";
  if (operation === "mesh.connect") return "plug";
  if (operation === "identity.generate") return "key";
  if (operation === "persistence.load") return "database";
  if (operation === "project.bind") return "link";
  if (operation === "mesh.announce") return "bullhorn";
  return "hourglass-half";
}

export class FlowSyncPanel extends FlowCornerElement {
  constructor() {
    super();
    // The mesh unused means no corner UI (work document #28's disclosure
    // rules): the panel starts Hidden until app.js feeds it mesh state
    this._visible = false;
    this.chipTitle = "Mesh sync status";
    /** @type {{ connected?: boolean, synced?: boolean, peers?: number } | null} */
    this._syncStatus = null;
    /** @type {string[]} */
    this._peers = [];
    /** @type {Array<{ identityHash: string, destinationHash: string | null, firstSeen: number, source?: string }>} */
    this._joinRequests = [];
    /** @type {{ stage: string, reason?: string, project?: any, error?: string } | null} */
    this._joinProgress = null;
    /** @type {{ projectId?: string, anchor?: { hash: string, owner: boolean }, grants?: Array<any>, wallet?: Array<any> } | null} */
    this._dacarState = null;
    this._inviteUri = "";
    this._meshError = "";
    this._identityHash = "";
    /** @type {{ phrase: string, operation: string, stage: string, failed?: boolean } | null} */
    this._narration = null;
    this._pendingIntents = 0;
    this._readOnly = false;
    this._visible = false;
    this.expanded = false;
    /** Join requests already surfaced to the user: they decide expansion. */
    /** @type {Set<string>} */
    this._seenRequests = new Set();
  }

  connectedCallback() {
    this.render();
  }

  /**
   * @param {{ connected?: boolean, synced?: boolean, peers?: number } | null} status
   */
  setSyncStatus(status) {
    this._syncStatus = status;
    this.render();
  }

  /**
   * Sets the current operation narration (work document #34): the chip's
   * stage segment shows the micro-phrase while an operation runs; a failed
   * operation reads as attention. Null clears it.
   *
   * @param {{ phrase: string, operation: string, stage: string, failed?: boolean } | null} narration
   */
  setNarration(narration) {
    this._narration = narration ?? null;
    this.render();
  }

  /**
   * @param {string[]} peers Peer identity hashes.
   */
  setPeers(peers) {
    this._peers = Array.isArray(peers) ? peers : [];
    this.render();
  }

  /**
   * @param {Array<{ identityHash: string, destinationHash: string | null, firstSeen: number, source?: string }> | null} joinRequests
   */
  setJoinRequests(joinRequests) {
    this._joinRequests = joinRequests ?? [];
    // A join request is major: the corner expands to surface the decision
    const fresh = this._joinRequests.some(
      (request) => !this._seenRequests.has(request.identityHash),
    );
    if (fresh && !this.expanded && this._joinRequests.length > 0) {
      this.expanded = true;
    }
    for (const request of this._joinRequests) {
      this._seenRequests.add(request.identityHash);
    }
    this.render();
  }

  /**
   * @param {{ stage: string, reason?: string, project?: any, error?: string } | null} progress
   */
  setJoinProgress(progress) {
    this._joinProgress = progress;
    this.render();
  }

  /**
   * @param {{ projectId?: string, anchor?: { hash: string, owner: boolean }, grants?: Array<any>, wallet?: Array<any> } | null} state
   */
  setDacarState(state) {
    this._dacarState = state;
    this.render();
  }

  /**
   * @param {string} uri
   */
  setInvite(uri) {
    this._inviteUri = uri ?? "";
    this.render();
  }

  /**
   * @param {string} meshError
   */
  setMeshError(meshError) {
    this._meshError = meshError ?? "";
    this.render();
  }

  /**
   * @param {string} identityHash
   */
  setIdentityHash(identityHash) {
    this._identityHash = identityHash ?? "";
    this.render();
  }

  /**
   * @param {number} count The canvas's pending (dashed) entities.
   */
  setPendingIntents(count) {
    this._pendingIntents = Number(count) || 0;
    this.render();
  }

  /**
   * Observer tabs render their read-only role: no actions, status only.
   *
   * @param {boolean} readOnly
   */
  setReadOnly(readOnly) {
    this._readOnly = readOnly === true;
    this.render();
  }

  /**
   * The chip's segments in the airline grammar: icon + value, each with its
   * own Ages state class, empty states dropped. The sync segment doubles as
   * the operation segment: while a boot or join stage runs, it narrates the
   * stage instead of the steady state (work document #34's future home).
   *
   * @returns {string}
   */
  chipHtml() {
    /** @type {string[]} */
    const segments = [];
    const status = this._syncStatus ?? {};
    const joining =
      this._joinProgress !== null &&
      !["granted", "declined", "failed"].includes(this._joinProgress.stage);
    if (this._meshError) {
      segments.push(
        `<span class="seg attention" title="${escapeHtml(this._meshError)}">${icon("triangle-exclamation")}<span class="label">mesh error</span></span>`,
      );
    } else if (joining) {
      segments.push(
        `<span class="seg activity">${icon("hourglass-half")}<span class="label">joining…</span></span>`,
      );
    } else if (this._narration) {
      // Operation narration (work document #34): the phrase while the
      // operation runs, with an icon that reflects the operation's nature
      // rather than a generic wait; a failure reads as attention
      segments.push(
        this._narration.failed
          ? `<span class="seg attention" title="${escapeHtml(this._narration.phrase)}">${icon("triangle-exclamation")}<span class="label">${escapeHtml(this._narration.phrase)}</span></span>`
          : `<span class="seg">${icon(narrationIcon(this._narration.operation, this._narration.stage))}<span class="label">${escapeHtml(this._narration.phrase)}</span></span>`,
      );
    } else if (status.connected === true) {
      // Offline-first (work document #28): having no peers online is the
      // normal state of local work, not a stall — read as neutral "working
      // locally", and synced returns once peers are actually connected
      const peerCount = this._peers.length || status.peers || 0;
      if (peerCount === 0) {
        segments.push(
          `<span class="seg">${icon("laptop")}<span class="label">working locally</span></span>`,
        );
      } else if (status.synced === true) {
        segments.push(
          `<span class="seg calm">${icon("circle-check")}<span class="label">up to date</span></span>`,
        );
      } else {
        segments.push(
          `<span class="seg">${icon("arrows-rotate")}<span class="label">syncing</span></span>`,
        );
      }
      if (peerCount > 0) {
        segments.push(
          `<span class="seg">${icon("user-group")}<span class="label">${peerCount} peer${peerCount === 1 ? "" : "s"}</span></span>`,
        );
      }
    } else {
      segments.push(
        `<span class="seg offline">${icon("plug")}<span class="label">offline</span></span>`,
      );
    }
    if (this._joinRequests.length > 0) {
      segments.push(
        `<span class="seg attention throb">${icon("user-plus")}<span class="label">${this._joinRequests.length} request${this._joinRequests.length === 1 ? "" : "s"}</span></span>`,
      );
    }
    if (this._pendingIntents > 0) {
      segments.push(
        `<span class="seg activity">${icon("pen")}<span class="label">${this._pendingIntents} pending</span></span>`,
      );
    }
    const owner = this._dacarState?.anchor?.owner === true;
    if (this._dacarState?.anchor?.hash) {
      segments.push(
        owner
          ? `<span class="seg calm" title="This device holds the project's Trust Anchor private key">${icon("crown")}<span class="label">Owner</span></span>`
          : `<span class="seg" title="This device holds only the public anchor: grants are minted on the owner's device">${icon("id-badge")}<span class="label">Participant</span></span>`,
      );
    }
    return segments.join("");
  }

  /**
   * The expanded accordions: peers with Dacar verification, join requests
   * with inline decisions, invite generation and copy, the join form, and
   * the last error in plain language.
   *
   * @returns {string}
   */
  expandedHtml() {
    if (!this.expanded) return "";
    const grantStatus = new Map();
    for (const grant of this._dacarState?.grants ?? []) {
      grantStatus.set(grant.peerHash, grant.status);
    }
    const peers = this._peers
      .map((hash) => {
        const self = hash === this._identityHash;
        const status = grantStatus.get(hash);
        const badge = status
          ? `<span class="badge ${escapeHtml(status)}">${escapeHtml(status)}</span>`
          : "";
        return `<div class="list-item"><span class="grow hash-text">${escapeHtml(hash)}${self ? " <strong>(this device)</strong>" : ""}</span>${badge}</div>`;
      })
      .join("");
    const requests = this._joinRequests
      .map((/** @type {any} */ request) => {
        // Approving mints a Dacar grant: only the Trust Anchor's device can
        // act on a request; participants see it as information
        const owner = this._dacarState?.anchor?.owner === true;
        const actions =
          this._readOnly || !owner
            ? `<div class="hint">Only the project's Trust Anchor can approve access.</div>`
            : `<button data-approve="${escapeHtml(request.identityHash)}">Approve</button>
        <button class="danger" data-decline="${escapeHtml(request.identityHash)}">Decline</button>`;
        return `
      <div class="list-item">
        <span class="grow hash-text">${escapeHtml(request.identityHash)}</span>
        ${actions}
      </div>`;
      })
      .join("");
    return `
      <div class="panel">
        <div class="panel-head">
          <span>Sync</span>
          <button class="secondary" data-action="collapse" title="Collapse">▾</button>
        </div>
        ${
          peers
            ? `<details open><summary>Peers</summary>${peers}</details>`
            : `<details open><summary>Peers</summary><div class="hint">No peers connected.</div></details>`
        }
        ${this._joinRequests.length > 0 ? `<details open><summary>Join requests</summary>${requests}</details>` : ""}
        ${
          this._readOnly
            ? ""
            : `<details open><summary>Invite</summary>
          ${
            this._inviteUri
              ? `<div class="row"><span class="grow hash-text" id="panel-invite">${escapeHtml(this._inviteUri)}</span><button class="secondary" data-action="copy-invite">${icon("copy")} Copy</button></div>`
              : `<button data-action="create-invite">Generate invite</button>`
          }
          <div class="hint">Send this invite to a collaborator. The token expires in 24 hours.</div>
        </details>
        <details><summary>Join a project</summary>
          <div class="row">
            <input id="join-invite" placeholder="Paste an invite (noflo://join/...)">
            <button data-action="join">Join</button>
          </div>
          <div class="hint">Joining materializes the invited project here. Only possible while the local project is empty.</div>
        </details>`
        }
        ${
          this._joinProgress
            ? `<details ${["granted", "declined", "failed"].includes(this._joinProgress.stage) ? "open" : ""}><summary>Last join</summary>${this.joinProgressLineHtml()}</details>`
            : ""
        }
        ${
          this._meshError
            ? `<details open><summary>Mesh error</summary><div class="status-line danger" id="panel-mesh-error">${escapeHtml(this._meshError)}</div><div class="hint">This browser cannot run mesh sync. Editing works locally and persists to this device.</div></details>`
            : ""
        }
        <button class="secondary" data-action="settings">Configure…</button>
      </div>
    `;
  }

  /**
   * Plain-language line for the joiner state machine's last stage.
   *
   * @returns {string}
   */
  joinProgressLineHtml() {
    const progress =
      /** @type {{ stage: string, reason?: string, project?: any, error?: string }} */
      (this._joinProgress ?? {});
    switch (progress.stage) {
      case "requesting_path":
      case "linking":
      case "knocking":
      case "connecting":
        return `<div class="status-line">Joining — contacting the host…</div>`;
      case "wait_response":
        return `<div class="status-line">Waiting for the host's decision…</div>`;
      case "handoff":
        return `<div class="status-line">Approved — “${escapeHtml(
          String(progress.project?.name ?? "project"),
        )}” joined. Its content arrives once the host's grant verifies.</div>`;
      case "granted":
        return `<div class="status-line success">Joined “${escapeHtml(
          String(progress.project?.name ?? "project"),
        )}”.</div>`;
      case "declined":
        return `<div class="status-line danger">Join declined: ${escapeHtml(declineReasonText(progress.reason))}</div>`;
      case "failed":
        return `<div class="status-line danger">Join failed: ${escapeHtml(progress.error ?? "unknown reason")}</div>`;
      default:
        return `<div class="status-line">${escapeHtml(progress.stage ?? "")}</div>`;
    }
  }

  styles() {
    return `
        :host {
          position: fixed;
          bottom: 12px;
          right: 12px;
          z-index: 900;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          max-width: min(360px, calc(100vw - 24px));
          font-family: SourceCodePro, monospace;
          color: var(--node-text, #aaa);
        }
        .badge {
          padding: 1px 6px;
          border-radius: 3px;
          font-size: 10px;
        }
        .badge.verified { background: color-mix(in srgb, var(--ui-age-calm) 25%, transparent); color: var(--ui-age-calm); }
        .badge.refused { background: color-mix(in srgb, var(--ui-age-attention) 25%, transparent); color: var(--ui-age-attention); }
        .badge.pending { background: color-mix(in srgb, var(--ui-age-activity) 25%, transparent); color: var(--ui-age-activity); }
        .badge.revoked { background: color-mix(in srgb, var(--ui-age-attention) 25%, transparent); color: var(--ui-age-attention); }
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
    shadow
      .querySelector("[data-action='create-invite']")
      ?.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("sync-invite", { bubbles: true, composed: true }),
        );
      });
    shadow
      .querySelector("[data-action='copy-invite']")
      ?.addEventListener("click", () => {
        navigator.clipboard?.writeText(this._inviteUri).catch(() => {});
      });
    shadow
      .querySelector("[data-action='join']")
      ?.addEventListener("click", () => {
        const input = shadow.querySelector("#join-invite");
        const invite = String(/** @type {any} */ (input)?.value ?? "").trim();
        if (!invite) return;
        this.dispatchEvent(
          new CustomEvent("sync-join", {
            detail: { invite },
            bubbles: true,
            composed: true,
          }),
        );
      });
    for (const button of shadow.querySelectorAll("[data-approve]")) {
      button.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("sync-approve", {
            detail: { identityHash: button.getAttribute("data-approve") },
            bubbles: true,
            composed: true,
          }),
        );
      });
    }
    for (const button of shadow.querySelectorAll("[data-decline]")) {
      button.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("sync-decline", {
            detail: { identityHash: button.getAttribute("data-decline") },
            bubbles: true,
            composed: true,
          }),
        );
      });
    }
    shadow
      .querySelector("[data-action='settings']")
      ?.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("sync-settings", { bubbles: true, composed: true }),
        );
      });
  }
}

customElements.define("noflo-sync-panel", FlowSyncPanel);
