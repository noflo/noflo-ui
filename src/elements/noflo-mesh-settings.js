/**
 * @file Mesh configuration settings (work document #21): a Glass-side view
 * over the Engine-owned mesh configuration and the CRDT-resident Dacar
 * grants. Shadow DOM, per SPEC "Light DOM vs Shadow DOM" (reserved strictly
 * for encapsulated forms/modals outside the graph canvas) — the JSON Schema
 * forms inside are Light DOM `noflo-json-form` elements mounted into a
 * slotted container, since Jedison needs real DOM to render into.
 *
 * The element is a pure view: it receives the current state via
 * `open(config, identityHash, interfaceSchemas, ...)` plus live updates
 * (`setInvite`, `setSyncStatus`, `setJoinProgress`, `setDacarState`) and
 * reports intent through events (`mesh-configure`, `mesh-grant`,
 * `mesh-revoke`, `mesh-close`). The Dacar state — Trust Anchor, per-grant
 * verification status, and the local wallet — comes from the Engine's
 * `mesh-dacar` report, so the UI shows what the Dacar Engine actually
 * verified, not merely what the grants map claims. Interface forms are
 * generated from the interface types' own JSON Schemas supplied by
 * @reticulum/core.
 */
/** Cached jedison form styles (fetched once, injected into the shadow root). */
/** @type {string | null} */
let formStylesCache = null;

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
 * @returns {Promise<string>}
 */
async function loadFormStyles() {
  if (formStylesCache === null) {
    try {
      formStylesCache = await fetch("./src/styles/json-form.css").then((r) =>
        r.text(),
      );
    } catch {
      formStylesCache = "";
    }
  }
  return /** @type {string} */ (formStylesCache);
}

export class FlowMeshSettings extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._open = false;
    this._config = null;
    /** Dacar state reported by the Engine (`mesh-dacar` messages). */
    this._dacarState = /** @type {any} */ (null);
    this._identityHash = "";
    /** JSON Schemas per interface type, from the Engine's mesh-config. */
    this._interfaceSchemas = /** @type {{ [type: string]: any }} */ ({});
    /** Generated invite URI (`noflo://join/...`), shown with a copy button. */
    this._inviteUri = "";
    /** @type {Array<{ identityHash: string, destinationHash: string | null, firstSeen: number, source?: string }>} */
    this._joinRequests = [];
    /** @type {string | null} */
    this._formStyles = null;
    /** @type {string} */
    this._meshError = "";
    /** Live sync status from the Engine (`mesh-status` telemetry). */
    /** @type {{ connected?: boolean, synced?: boolean, peers?: number } | null} */
    this._syncStatus = null;
    /** Joiner state-machine progress (`mesh-bootstrap` messages). */
    /** @type {{ stage: string, reason?: string, project?: any, error?: string } | null} */
    this._joinProgress = null;
  }

  connectedCallback() {
    if (this._open) this.render();
  }

  /**
   * Opens the dialog with the current state.
   *
   * @param {any} config Engine mesh configuration (null for observer tabs;
   *   the form then renders read-only).
   * @param {string} identityHash Hex identity hash for display.
   * @param {{ [type: string]: any }} interfaceSchemas JSON Schemas per
   *   interface type.
   * @param {Array<{ identityHash: string, destinationHash: string | null, firstSeen: number, source?: string }>} joinRequests
   *   Peers awaiting an access decision.
   * @param {string} meshError Engine mesh error (e.g. WebCrypto without
   *   Ed25519): when set, mesh sync cannot run on this browser.
   */
  open(
    config,
    identityHash,
    interfaceSchemas = {},
    joinRequests = [],
    meshError = "",
  ) {
    this._config = config;
    this._identityHash = identityHash ?? "";
    this._interfaceSchemas = interfaceSchemas ?? {};
    this._joinRequests = joinRequests ?? [];
    this._meshError = meshError;
    this._open = true;
    // The dialog element may sit hidden in the page shell; visibility is
    // controlled here so open/close always agree with the rendered state
    this.removeAttribute("hidden");
    this.render();
    // The jedison form styles live in a light-DOM stylesheet for editors;
    // fetch them once and re-render with them injected — but only when they
    // actually arrived (a hanging or failed fetch must not disturb the
    // rendered dialog state)
    loadFormStyles().then((styles) => {
      if (this._open && styles && styles !== this._renderedFormStyles) {
        this._formStyles = styles;
        this.render();
      }
    });
  }

  close() {
    this._open = false;
    this.setAttribute("hidden", "");
    this.render();
    this.dispatchEvent(new CustomEvent("mesh-close", { bubbles: true }));
  }

  /**
   * Refreshes in place with a new Engine Dacar report (`mesh-dacar`): the
   * Trust Anchor, per-grant verification status, and the local wallet.
   *
   * @param {{ projectId?: string, anchor?: { hash: string, owner: boolean }, grants?: Array<any>, wallet?: Array<any> } | null} state
   */
  setDacarState(state) {
    this._dacarState = state;
    if (this._open) this.render();
  }

  /**
   * Refreshes the join-request list while open.
   *
   * @param {Array<{ identityHash: string, destinationHash: string | null, firstSeen: number }>} joinRequests
   */
  /**
   * Updates the reported mesh error while open.
   *
   * @param {string} meshError
   */
  setMeshError(meshError) {
    this._meshError = meshError ?? "";
    if (this._open) this.render();
  }

  /**
   * Shows a generated invite URI (work document #25): the Glass sets this
   * when the Engine answers a `MESH createInvite` with `mesh-invite`.
   *
   * @param {string} uri
   */
  setInvite(uri) {
    this._inviteUri = uri ?? "";
    if (this._open) this.render();
  }

  /**
   * @param {Array<{ identityHash: string, destinationHash: string | null, firstSeen: number, source?: string }> | null} joinRequests
   */
  setJoinRequests(joinRequests) {
    this._joinRequests = joinRequests ?? [];
    if (this._open) this.render();
  }

  /**
   * Updates the live sync status line (connected, peers, synced).
   *
   * @param {{ connected?: boolean, synced?: boolean, peers?: number } | null} status
   */
  setSyncStatus(status) {
    this._syncStatus = status;
    if (this._open) this.render();
  }

  /**
   * Updates the join progress line (joiner state machine stages).
   *
   * @param {{ stage: string, reason?: string, project?: any, error?: string } | null} progress
   */
  setJoinProgress(progress) {
    this._joinProgress = progress;
    if (this._open) this.render();
  }

  /**
   * Human-readable join progress line, empty while no join has run.
   *
   * @returns {string}
   */
  joinProgressHtml() {
    const progress = this._joinProgress;
    if (!progress?.stage) return "";
    const stage = progress.stage;
    if (stage === "approved") {
      const name = progress.project?.name ?? "the project";
      return `<div class="status-line success" id="join-progress">Approved — “${escapeHtml(
        String(name),
      )}” joined. Its content appears here once mesh sync delivers it.</div>`;
    }
    if (stage === "declined") {
      return `<div class="status-line danger" id="join-progress">Join declined: ${escapeHtml(
        declineReasonText(progress.reason),
      )}</div>`;
    }
    if (stage === "failed") {
      return `<div class="status-line danger" id="join-progress">Join failed: ${escapeHtml(
        String(progress.error ?? "unknown error"),
      )}</div>`;
    }
    const stageText = {
      requesting_path: "Resolving the host’s path…",
      linking: "Establishing a link to the host…",
      knocking: "Knocking on the host’s door…",
      wait_response: "Waiting for the host’s decision…",
    }[stage];
    if (!stageText) return "";
    return `<div class="status-line" id="join-progress">${stageText}</div>`;
  }

  /**
   * Live sync status line, empty until the Engine reports connectivity.
   *
   * @returns {string}
   */
  syncStatusHtml() {
    const status = this._syncStatus;
    if (!status || status.connected === undefined) return "";
    const peers =
      typeof status.peers === "number" && status.peers > 0
        ? `, ${status.peers} peer${status.peers === 1 ? "" : "s"}`
        : "";
    const synced = status.synced ? ", synced" : "";
    return `<div class="hint" id="mesh-sync-status">Sync: ${
      status.connected ? "connected" : "disconnected"
    }${peers}${synced}</div>`;
  }

  /**
   * The project's Trust Anchor panel: who anchors the project and whether
   * this device holds the anchor's private key (Owner) or only its public
   * key (Participant).
   *
   * @returns {string}
   */
  trustAnchorHtml() {
    const anchor = this._dacarState?.anchor;
    if (!anchor?.hash) {
      return `<div class="hint">No Trust Anchor yet — it is assigned when mesh sync starts for this project.</div>`;
    }
    const role = anchor.owner
      ? "This device holds the project's Trust Anchor private key: it can mint and revoke grants for this project."
      : "This device holds only the public anchor (Participant): grants are minted on the Trust Anchor's device.";
    return `<div class="hash" id="trust-anchor-hash">${escapeHtml(
      anchor.hash,
    )}</div><div class="hint" id="trust-anchor-role">${role}</div>`;
  }

  /**
   * The grants list with Dacar verification badges: what the Engine
   * actually verified, not merely what the grants map claims.
   *
   * @returns {string}
   */
  grantsListHtml() {
    const grants = this._dacarState?.grants ?? [];
    if (grants.length === 0) {
      return `<div class="hint">No grants yet. Peers receive grants through invites or access requests.</div>`;
    }
    const badges = {
      verified: "verified",
      refused: "refused",
      pending: "pending verification",
      unsigned: "unsigned",
    };
    const owner = this._dacarState?.anchor?.owner === true;
    return grants
      .map((/** @type {any} */ grant) => {
        const badge =
          grant.revoked !== null
            ? `<span class="revoked">revoked</span>`
            : `<span class="badge ${escapeHtml(grant.status)}">${
                /** @type {Record<string, string>} */ (badges)[grant.status] ??
                escapeHtml(grant.status)
              }</span>`;
        const revoke =
          owner && grant.revoked === null
            ? `<button class="danger" data-grant-revoke="${escapeHtml(grant.id)}">Revoke</button>`
            : "";
        return `<div class="list-item">
            <span class="grow">${escapeHtml(grant.peerHash)} <em>${escapeHtml(
              grant.role,
            )}</em></span>
            ${badge}
            ${revoke}
          </div>`;
      })
      .join("");
  }

  /**
   * The grant-minting form, enabled only for the Trust Anchor's device —
   * a grant issued elsewhere could never be countersigned.
   *
   * @returns {string}
   */
  grantFormHtml() {
    const owner = this._dacarState?.anchor?.owner === true;
    const disabled = owner ? "" : "disabled";
    return `<div class="row" style="margin-top: 8px">
          <input id="new-grant-peer" placeholder="peer identity hash" ${disabled}>
          <select id="new-grant-role" ${disabled}>
            <option value="observer">Observer</option>
            <option value="operator">Operator</option>
            <option value="developer">Developer</option>
          </select>
          <button data-action="add-grant" ${disabled}>Grant</button>
        </div>
        <div class="hint">${
          owner
            ? "Grants are Dacar-signed by this project's Trust Anchor and sync to every peer, which verifies them against the anchor before granting access."
            : "Only the project's Trust Anchor can mint grants. Grant from the Trust Anchor's device (shown above)."
        }</div>`;
  }

  /**
   * The local wallet (§5.2): the grants this device holds, with their
   * unblinded scopes.
   *
   * @returns {string}
   */
  walletHtml() {
    const wallet = this._dacarState?.wallet ?? [];
    if (wallet.length === 0) {
      return `<div class="hint">No grants held yet — grants received through an invite, or minted here, appear here.</div>`;
    }
    return wallet
      .map((/** @type {any} */ record) => {
        const expires =
          record.expires == null
            ? "never expires"
            : `expires ${new Date(record.expires).toISOString()}`;
        return `<div class="list-item">
            <span class="grow">${escapeHtml(
              record.resource,
            )} <em>${escapeHtml((record.permissions ?? []).join(", "))}</em></span>
            <span class="hint">by ${escapeHtml(record.issuer)}, ${expires}</span>
          </div>`;
      })
      .join("");
  }

  render() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    if (!this._open) {
      shadow.innerHTML = "";
      return;
    }
    const config = this._config;
    const editable = Boolean(config);
    const formStyles = this._formStyles ?? "";
    this._renderedFormStyles = formStyles;
    const interfaces = config?.interfaces ?? [];
    shadow.innerHTML = `
      <style>
        ${formStyles}
        :host {
          position: fixed;
          inset: 0;
          z-index: 1001;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
          color: inherit;
        }
        .dialog {
          background: var(--ui-bg);
          border: 1px solid var(--ui-border, #333);
          border-radius: 8px;
          width: min(560px, 92vw);
          max-height: 86vh;
          overflow-y: auto;
          padding: 16px 20px;
        }
        h2 { margin: 0 0 12px; font-size: 16px; }
        h3 { margin: 16px 0 6px; font-size: 13px; color: var(--ui-accent); }
        label { display: block; font-size: 12px; margin: 8px 0 2px; }
        input, select {
          background: var(--ui-bg);
          color: inherit;
          border: 1px solid var(--ui-border, #333);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 13px;
          width: 100%;
          box-sizing: border-box;
        }
        /* Checkboxes must keep their intrinsic size: the width: 100% rule
           collapses them to zero width on WebKit */
        input[type="checkbox"] {
          width: 14px;
          height: 14px;
          min-width: 14px;
          padding: 0;
          margin: 0;
          flex: none;
          accent-color: var(--ui-accent);
          cursor: pointer;
        }
        .row {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: nowrap;
        }
        .row label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          margin: 0;
        }
        .row input, .row select { flex: 1; }
        button {
          background: var(--ui-accent);
          color: var(--ui-bg);
          border: none;
          border-radius: 4px;
          padding: 4px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        button.secondary {
          background: transparent;
          color: inherit;
          border: 1px solid var(--ui-border, #333);
        }
        button.danger { background: var(--ui-danger, #d9534f); color: var(--ui-bg); }
        .hash {
          font-family: SourceCodePro, monospace;
          font-size: 12px;
          word-break: break-all;
          background: color-mix(in srgb, var(--ui-accent) 8%, transparent);
          padding: 6px 8px;
          border-radius: 4px;
        }
        .list-item {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 4px 0;
          border-bottom: 1px solid var(--ui-border, #222);
          font-size: 12px;
        }
        .list-item .grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .revoked { color: var(--ui-danger, #d9534f); }
        .status-line {
          font-size: 12px;
          margin-top: 6px;
          padding: 6px 8px;
          border-radius: 4px;
          background: color-mix(in srgb, var(--ui-accent) 8%, transparent);
        }
        .status-line.danger { color: var(--ui-danger, #d9534f); }
        .status-line.success { color: var(--ui-success, #5cb85c); }
        .hint {
          font-size: 11px;
          color: color-mix(in srgb, currentColor 60%, transparent);
          margin-top: 4px;
        }
        noflo-json-form { display: block; margin: 8px 0; color: inherit; }
        .iface-form-host { border: 1px solid var(--ui-border, #333); border-radius: 6px; padding: 8px; margin-top: 8px; }
      </style>
      <div class="dialog">
        <div class="row">
          <h2 style="flex: 1">Mesh settings</h2>
          <button class="secondary" data-action="close">Close</button>
        </div>
        ${
          this._identityHash
            ? `<h3>Identity</h3><div class="hash" id="identity-hash">${this._identityHash}</div>
        <div class="hint">Share this hash so node admins can grant this peer access.</div>`
            : `<h3>Identity</h3><div class="hint">${config?.enabled ? "The engine generates the identity when sync starts." : "No identity yet — enabling sync generates one."}</div>`
        }
        <h3>Sync</h3>
        ${
          this._meshError
            ? `<div class="alert alert-danger" id="mesh-error">${this._meshError}</div>
        <div class="hint">This browser cannot run mesh sync. Editing works locally and persists to this device.</div>`
            : ""
        }
        <div class="row">
          <label style="margin: 0"><input type="checkbox" id="mesh-enabled" ${config?.enabled ? "checked" : ""} ${editable && !this._meshError ? "" : "disabled"}> Enabled</label>
        </div>
        ${this.syncStatusHtml()}
        <h3>Invite</h3>
        ${
          this._inviteUri
            ? `<div class="row">
          <div class="hash grow" id="mesh-invite">${this._inviteUri}</div>
          <button class="secondary" data-action="copy-invite">Copy</button>
        </div>
        <div class="hint">Send this invite to a collaborator, then have them paste it under "Join a project". The token expires in 24 hours.</div>`
            : `<div class="row">
          <button data-action="create-invite" ${editable && !this._meshError ? "" : "disabled"}>Generate invite</button>
        </div>
        <div class="hint">Generates a noflo:// join link for this project. The invited device joins by pasting it under "Join a project"; you approve the joining device when it knocks.</div>`
        }
        <h3>Join a project</h3>
        <div class="row">
          <input id="join-room" placeholder="Paste an invite (noflo://join/...)">
          <button data-action="join">Join</button>
        </div>
        ${this.joinProgressHtml()}
        <div class="hint">Joining materializes the invited project as a new project in this device's storage. Only possible while the local project is empty.</div>
        <h3>WebRTC transport upgrade</h3>
        <div class="hint">WebSocket interfaces bootstrap the mesh; peers then upgrade to direct WebRTC data channels for collaboration traffic.</div>
        <div class="row" style="margin-top: 6px">
          <label style="margin: 0"><input type="checkbox" id="webrtc-enabled" ${config?.webrtc?.enabled ? "checked" : ""} ${editable ? "" : "disabled"}> Enabled</label>
          <label style="margin: 0"><input type="checkbox" id="webrtc-autoconnect" ${config?.webrtc?.autoConnect !== false ? "checked" : ""} ${editable ? "" : "disabled"}> Auto-connect to peers</label>
        </div>
        <h3>Interfaces</h3>
        <div id="interface-list">
          ${interfaces
            .map(
              (/** @type {any} */ iface, /** @type {number} */ index) => `
          <div class="list-item">
            <input type="checkbox" data-iface-enable="${index}" ${iface.enabled ? "checked" : ""} ${editable ? "" : "disabled"}>
            <span class="grow">${this.describeInterface(iface)}</span>
            <button class="secondary" data-iface-edit="${index}" ${editable ? "" : "disabled"}>Edit</button>
            <button class="danger" data-iface-remove="${index}" ${editable ? "" : "disabled"}>Remove</button>
          </div>`,
            )
            .join("")}
        </div>
        <div id="interface-form-host" class="iface-form-host" hidden></div>
        ${editable ? (Object.keys(this._interfaceSchemas).length > 0 ? `<button class="secondary" data-action="add-interface" style="margin-top: 8px">Add interface</button>` : `<div class="hint">Interface schemas are loading&hellip;</div>`) : `<div class="hint">Observer tab: configuration is Engine-owned and editable only in the leader tab.</div>`}
        <h3>Join requests</h3>
        <div id="join-request-list">
          ${(this._joinRequests ?? [])
            .map(
              (/** @type {any} */ request) => `
          <div class="list-item">
            <span class="grow">${request.identityHash}</span>
            <button data-join-approve="${request.identityHash}">Approve</button>
            <button class="danger" data-join-deny="${request.identityHash}">Deny</button>
          </div>`,
            )
            .join("")}
        </div>
        ${(this._joinRequests ?? []).length === 0 ? `<div class="hint">No pending access requests. Peers that know the room but hold no grant appear here.</div>` : ""}
        ${this.trustAnchorHtml()}
        <h3>Access grants (Dacar)</h3>
        <div id="grant-list">
          ${this.grantsListHtml()}
        </div>
        ${this.grantFormHtml()}
        <h3>This device's grants (wallet)</h3>
        ${this.walletHtml()}
      </div>
    `;
    this.wireEvents(editable);
  }

  /**
   * Human-readable one-line description of an interface.
   *
   * @param {any} iface
   * @returns {string}
   */
  describeInterface(iface) {
    const options = iface.options ?? {};
    const detail =
      iface.type === "websocket"
        ? (options.url ?? "")
        : `${options.host ?? ""}:${options.port ?? ""}`;
    return detail ? `${detail} (${iface.type})` : `${iface.type} (${iface.id})`;
  }

  /**
   * Mounts a JSON Schema form for an interface into the shared form host.
   * The schema comes from the interface type itself (@reticulum/core
   * `getConfigurationSchema()`), delivered by the Engine.
   *
   * @param {string} type Interface type key into _interfaceSchemas
   * @param {any} options Existing options to prefill, or null for a new one
   * @param {(data: any) => void} onValid Called with the form data on Save
   */
  openInterfaceForm(type, options, onValid) {
    const host = /** @type {HTMLElement | null} */ (
      /** @type {ShadowRoot} */ (this.shadowRoot).querySelector(
        "#interface-form-host",
      )
    );
    if (!host) return;
    const schema = /** @type {any} */ (this._interfaceSchemas)[type] ?? null;
    if (!schema) {
      host.textContent = `No configuration schema available for ${type}`;
      host.hidden = false;
      return;
    }
    host.hidden = false;
    host.innerHTML = "";
    const form = /** @type {any} */ (document.createElement("noflo-json-form"));
    form.schema = schema;
    form.data = options ?? {};
    host.appendChild(form);
    /** @type {any} */
    let latest = options ?? {};
    /** @type {boolean} */
    let valid = false;
    form.addEventListener("form-change", (/** @type {any} */ e) => {
      latest = e.detail?.data ?? {};
      valid = e.detail?.isValid === true;
    });
    const actions = document.createElement("div");
    actions.className = "row";
    actions.innerHTML = `
      <button data-form-action="save">Save</button>
      <button class="secondary" data-form-action="cancel">Cancel</button>
    `;
    actions
      .querySelector('[data-form-action="save"]')
      ?.addEventListener("click", () => {
        if (!valid) return;
        host.hidden = true;
        host.innerHTML = "";
        onValid(latest);
      });
    actions
      .querySelector('[data-form-action="cancel"]')
      ?.addEventListener("click", () => {
        host.hidden = true;
        host.innerHTML = "";
      });
    host.appendChild(actions);
  }

  /**
   * @param {boolean} editable
   */
  wireEvents(editable) {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    shadow
      .querySelector('[data-action="close"]')
      ?.addEventListener("click", () => this.close());
    shadow
      .querySelector('[data-action="copy-invite"]')
      ?.addEventListener("click", () => {
        const invite = /** @type {HTMLElement} */ (
          shadow.querySelector("#mesh-invite")
        ).textContent?.trim();
        if (invite) navigator.clipboard?.writeText(invite).catch(() => {});
      });
    shadow
      .querySelector('[data-action="create-invite"]')
      ?.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("mesh-create-invite", { bubbles: true }),
        );
      });
    shadow
      .querySelector('[data-action="join"]')
      ?.addEventListener("click", () => {
        const input = /** @type {HTMLInputElement} */ (
          shadow.querySelector("#join-room")
        );
        const invite = input.value.trim();
        if (!invite) return;
        input.value = "";
        this.dispatchEvent(
          new CustomEvent("mesh-join", {
            detail: { invite },
            bubbles: true,
          }),
        );
      });

    const enabled = /** @type {HTMLInputElement | null} */ (
      shadow.querySelector("#mesh-enabled")
    );
    enabled?.addEventListener("change", () => {
      this._config = { ...(this._config ?? {}), enabled: enabled.checked };
      this.dispatchEvent(
        new CustomEvent("mesh-configure", {
          detail: { config: this._config },
          bubbles: true,
        }),
      );
    });
    for (const [id, field] of [
      ["webrtc-enabled", "enabled"],
      ["webrtc-autoconnect", "autoConnect"],
    ]) {
      const checkbox = /** @type {HTMLInputElement | null} */ (
        shadow.querySelector(`#${id}`)
      );
      checkbox?.addEventListener("change", () => {
        const webrtc = {
          ...(this._config?.webrtc ?? {
            enabled: false,
            autoConnect: true,
            rtcConfig: {},
          }),
          [field]: checkbox.checked,
        };
        this._config = { ...(this._config ?? {}), webrtc };
        this.dispatchEvent(
          new CustomEvent("mesh-configure", {
            detail: { config: this._config },
            bubbles: true,
          }),
        );
      });
    }

    shadow
      .querySelector('[data-action="add-interface"]')
      ?.addEventListener("click", () => {
        const type =
          Object.keys(/** @type {any} */ (this._interfaceSchemas))[0] ??
          "websocket";
        this.openInterfaceForm(type, null, (options) => {
          const iface = {
            id: `iface-${Math.random().toString(36).slice(2, 10)}`,
            type,
            options,
            enabled: true,
          };
          this._config = {
            ...(this._config ?? {}),
            interfaces: [...(this._config?.interfaces ?? []), iface],
          };
          this.dispatchEvent(
            new CustomEvent("mesh-configure", {
              detail: { config: this._config },
              bubbles: true,
            }),
          );
          this.render();
        });
      });
    for (const button of /** @type {NodeListOf<HTMLButtonElement>} */ (
      shadow.querySelectorAll("[data-iface-remove]")
    )) {
      button.addEventListener("click", () => {
        const index = Number(button.getAttribute("data-iface-remove"));
        const interfaces = [...(this._config?.interfaces ?? [])];
        interfaces.splice(index, 1);
        this._config = { ...(this._config ?? {}), interfaces };
        this.dispatchEvent(
          new CustomEvent("mesh-configure", {
            detail: { config: this._config },
            bubbles: true,
          }),
        );
        this.render();
      });
    }
    for (const checkbox of /** @type {NodeListOf<HTMLInputElement>} */ (
      shadow.querySelectorAll("[data-iface-enable]")
    )) {
      checkbox.addEventListener("change", () => {
        const index = Number(checkbox.getAttribute("data-iface-enable"));
        const interfaces = (this._config?.interfaces ?? []).map(
          (/** @type {any} */ iface, /** @type {number} */ i) =>
            i === index ? { ...iface, enabled: checkbox.checked } : iface,
        );
        this._config = { ...(this._config ?? {}), interfaces };
        this.dispatchEvent(
          new CustomEvent("mesh-configure", {
            detail: { config: this._config },
            bubbles: true,
          }),
        );
      });
    }
    for (const button of /** @type {NodeListOf<HTMLButtonElement>} */ (
      shadow.querySelectorAll("[data-iface-edit]")
    )) {
      button.addEventListener("click", () => {
        const index = Number(button.getAttribute("data-iface-edit"));
        const iface = this._config?.interfaces?.[index];
        if (!iface) return;
        this.openInterfaceForm(iface.type, iface.options, (options) => {
          const interfaces = (this._config?.interfaces ?? []).map(
            (/** @type {any} */ entry, /** @type {number} */ i) =>
              i === index ? { ...entry, options } : entry,
          );
          this._config = { ...(this._config ?? {}), interfaces };
          this.dispatchEvent(
            new CustomEvent("mesh-configure", {
              detail: { config: this._config },
              bubbles: true,
            }),
          );
          this.render();
        });
      });
    }

    shadow
      .querySelector('[data-action="add-grant"]')
      ?.addEventListener("click", () => {
        const peerHash = /** @type {HTMLInputElement} */ (
          shadow.querySelector("#new-grant-peer")
        ).value.trim();
        const role = /** @type {HTMLSelectElement} */ (
          shadow.querySelector("#new-grant-role")
        ).value;
        if (!peerHash) return;
        this.dispatchEvent(
          new CustomEvent("mesh-grant", {
            detail: { peerHash, role },
            bubbles: true,
          }),
        );
        /** @type {HTMLInputElement} */ (
          shadow.querySelector("#new-grant-peer")
        ).value = "";
      });
    for (const button of /** @type {NodeListOf<HTMLButtonElement>} */ (
      shadow.querySelectorAll("[data-join-approve]")
    )) {
      button.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("mesh-approve", {
            detail: { identityHash: button.getAttribute("data-join-approve") },
            bubbles: true,
          }),
        );
      });
    }
    for (const button of /** @type {NodeListOf<HTMLButtonElement>} */ (
      shadow.querySelectorAll("[data-join-deny]")
    )) {
      button.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("mesh-deny", {
            detail: { identityHash: button.getAttribute("data-join-deny") },
            bubbles: true,
          }),
        );
      });
    }
    for (const button of /** @type {NodeListOf<HTMLButtonElement>} */ (
      shadow.querySelectorAll("[data-grant-revoke]")
    )) {
      button.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("mesh-revoke", {
            detail: { id: button.getAttribute("data-grant-revoke") },
            bubbles: true,
          }),
        );
      });
    }
  }
}
