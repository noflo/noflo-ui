/**
 * @file Mesh configuration settings (work document #21): a Glass-side view
 * over the Engine-owned mesh configuration and the CRDT-resident Dacar
 * grants. Shadow DOM, per SPEC "Light DOM vs Shadow DOM" (reserved strictly
 * for encapsulated forms/modals outside the graph canvas) — the JSON Schema
 * forms inside are Light DOM `noflo-json-form` elements mounted into a
 * slotted container, since Jedison needs real DOM to render into.
 *
 * The element is a pure view: it receives the current state via
 * `open(config, grants, identityHash, interfaceSchemas)` and reports intent
 * through events (`mesh-configure`, `mesh-grant`, `mesh-revoke`,
 * `mesh-close`). Interface forms are generated from the interface types' own
 * JSON Schemas supplied by @reticulum/core.
 */
export class FlowMeshSettings extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._open = false;
    this._config = null;
    /** @type {Array<{ id: string, peerHash: string, role: string, issued: number, revoked: number | null }>} */
    this._grants = [];
    this._identityHash = "";
    /** JSON Schemas per interface type, from the Engine's mesh-config. */
    /** @type {{ [type: string]: any }} */
    (this)._interfaceSchemas = {};
  }

  connectedCallback() {
    if (this._open) this.render();
  }

  /**
   * Opens the dialog with the current state.
   *
   * @param {any} config Engine mesh configuration (null for observer tabs;
   *   the form then renders read-only).
   * @param {Array<{ id: string, peerHash: string, role: string, issued: number, revoked: number | null }>} grants
   * @param {string} identityHash Hex identity hash for display.
   * @param {{ [type: string]: any }} interfaceSchemas JSON Schemas per
   *   interface type.
   */
  open(config, grants, identityHash, interfaceSchemas = {}) {
    this._config = config;
    this._grants = grants ?? [];
    this._identityHash = identityHash ?? "";
    this._interfaceSchemas = interfaceSchemas ?? {};
    this._open = true;
    this.render();
  }

  close() {
    this._open = false;
    this.render();
    this.dispatchEvent(new CustomEvent("mesh-close", { bubbles: true }));
  }

  /**
   * Refreshes in place (e.g. grants changed in the mirror while open).
   *
   * @param {Array<{ id: string, peerHash: string, role: string, issued: number, revoked: number | null }>} grants
   */
  setGrants(grants) {
    this._grants = grants ?? [];
    if (this._open) this.render();
  }

  render() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    if (!this._open) {
      shadow.innerHTML = "";
      return;
    }
    const config = this._config;
    const editable = Boolean(config);
    const interfaces = config?.interfaces ?? [];
    shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          inset: 0;
          z-index: 1001;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: system-ui, sans-serif;
          color: var(--ui-fg, #eee);
        }
        .dialog {
          background: var(--ui-bg, #14171c);
          border: 1px solid var(--ui-border, #333);
          border-radius: 8px;
          width: min(560px, 92vw);
          max-height: 86vh;
          overflow-y: auto;
          padding: 16px 20px;
        }
        h2 { margin: 0 0 12px; font-size: 16px; }
        h3 { margin: 16px 0 6px; font-size: 13px; color: var(--ui-accent, #4aa3df); }
        label { display: block; font-size: 12px; margin: 8px 0 2px; }
        input, select {
          background: var(--ui-bg, #14171c);
          color: var(--ui-fg, #eee);
          border: 1px solid var(--ui-border, #333);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 13px;
          width: 100%;
          box-sizing: border-box;
        }
        .row { display: flex; gap: 8px; align-items: center; }
        .row input, .row select { flex: 1; }
        button {
          background: var(--ui-accent, #4aa3df);
          color: #000;
          border: none;
          border-radius: 4px;
          padding: 4px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        button.secondary {
          background: transparent;
          color: var(--ui-fg, #eee);
          border: 1px solid var(--ui-border, #333);
        }
        button.danger { background: var(--ui-danger, #d9534f); color: #fff; }
        .hash {
          font-family: monospace;
          font-size: 12px;
          word-break: break-all;
          background: rgba(255, 255, 255, 0.04);
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
        .hint { font-size: 11px; color: #888; margin-top: 4px; }
        noflo-json-form { display: block; margin: 8px 0; color: var(--ui-fg, #eee); }
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
            : `<h3>Identity</h3><div class="hint">No identity yet — enabling sync generates one.</div>`
        }
        <h3>Sync</h3>
        <div class="row">
          <label style="margin: 0"><input type="checkbox" id="mesh-enabled" ${config?.enabled ? "checked" : ""} ${editable ? "" : "disabled"}> Enabled</label>
        </div>
        <label for="mesh-room">Room</label>
        <input id="mesh-room" value="${config?.room ?? ""}" ${editable ? "" : "disabled"}>
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
        ${editable ? `<button class="secondary" data-action="add-interface" style="margin-top: 8px">Add interface</button>` : `<div class="hint">Observer tab: configuration is Engine-owned and editable only in the leader tab.</div>`}
        <h3>Access grants (Dacar)</h3>
        <div id="grant-list">
          ${this._grants
            .map(
              (/** @type {any} */ grant) => `
          <div class="list-item">
            <span class="grow">${grant.peerHash} <em>${grant.role}</em>${grant.revoked ? ' <span class="revoked">revoked</span>' : ""}</span>
            ${grant.revoked ? "" : `<button class="danger" data-grant-revoke="${grant.id}">Revoke</button>`}
          </div>`,
            )
            .join("")}
        </div>
        <div class="row" style="margin-top: 8px">
          <input id="new-grant-peer" placeholder="peer identity hash">
          <select id="new-grant-role">
            <option value="observer">Observer</option>
            <option value="operator">Operator</option>
            <option value="developer">Developer</option>
          </select>
          <button data-action="add-grant">Grant</button>
        </div>
        <div class="hint">Grants are project data: they sync to every peer, and revocation tombstones propagate deterministically.</div>
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
    return `${detail} (${iface.type})`;
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
    const room = /** @type {HTMLInputElement | null} */ (
      shadow.querySelector("#mesh-room")
    );
    room?.addEventListener("change", () => {
      this._config = { ...(this._config ?? {}), room: room.value.trim() };
      this.dispatchEvent(
        new CustomEvent("mesh-configure", {
          detail: { config: this._config },
          bubbles: true,
        }),
      );
    });

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
