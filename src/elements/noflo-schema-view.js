/**
 * @file The schema editor view (work document #57 update #1): the
 * project schema's top-level editing surface — a focused full-screen
 * editor for one `ns/name` schema. Static facts (the identifier, the
 * provenance, the content digest) read-only; the JSON buffer as the
 * dynamic field, edited collaboratively through the component code
 * editor's binding; validation against the 2020-12 meta-schema with
 * visible errors beside the editor — invalid state is never blank,
 * never silently saved.
 *
 * The edit model per #57 update #1: live Yjs deltas stream to
 * collaborators (the draft), and the explicit Save is the whole-save
 * round that re-derives the digest and publishes the schema.
 */

import { emit } from "../events.js";

export class NofloSchemaView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._name = "";
    this._provenance = "authored";
    this._origin = null;
    this._digest = "";
    /** @type {any} */
    this._ytext = null;
    /** @type {any} */
    this._cm = null;
    /** @type {any} */
    this._view = null;
    /** @type {any} */
    this._conf = null;
    /** @type {((update: Uint8Array, origin: any) => void) | null} */
    this._docUpdate = null;
  }

  connectedCallback() {
    this.render();
  }

  /**
   * Opens the view for one project schema.
   *
   * @param {Object} options
   * @param {string} options.name The `ns/name` identifier.
   * @param {string} options.provenance
   * @param {string | null} [options.origin]
   * @param {string} [options.digest]
   * @param {any} options.ytext The mirror's body `Y.Text`.
   * @param {any} options.cm The CodeMirror surface.
   * @param {boolean} [options.readOnly]
   */
  open({
    name,
    provenance,
    origin = null,
    digest = "",
    ytext,
    cm,
    readOnly = false,
  }) {
    this._name = name;
    this._provenance = provenance;
    this._origin = origin;
    this._digest = digest;
    this._ytext = ytext;
    this._cm = cm;
    this._readOnly = readOnly;
    this.removeAttribute("hidden");
    this.render();
    this._bindEditor();
  }

  /** Closes the view and tears the editor down. */
  close() {
    this.setAttribute("hidden", "");
    this._teardownEditor();
    this._ytext = null;
    this._cm = null;
  }

  /**
   * Refreshes in place: the record changed under the open view (the
   * echo's job is exactly this notification; the mirror is the truth).
   */
  refresh() {
    if (this.hidden || !this._ytext) return;
    this._digest = "";
    this.renderHead();
    this.validate();
  }

  /**
   * Binds the collaborative editor to the mirror's `Y.Text` (the
   * component code editor's binding, per the documented pitfalls). The
   * schema body is JSON — plain text editing, no syntax grammar until the
   * editor bundle carries one.
   */
  _bindEditor() {
    if (this._view || !this._cm || !this._ytext) return;
    const host = /** @type {any} */ (this.shadowRoot).querySelector(".body");
    if (!host) return;
    const plugins = this._cm.yCollab(this._ytext);
    this._view = new this._cm.EditorView({
      doc: this._ytext.toString(),
      extensions: [
        ...this._cm.codeEditorTheme(this._cm),
        this._cm.basicSetup,
        ...plugins,
      ],
      parent: host,
    });
    this._conf = this._view.state?.facet?.(this._cm.ySyncFacet) ?? null;
    this._docUpdate = (
      /** @type {Uint8Array} */ update,
      /** @type {any} */ origin,
    ) => {
      if (!this._conf || origin !== this._conf) return;
      // The live delta: the draft streams to collaborators; the explicit
      // Save is the whole-save round
      emit(this, "schema-body-update", { name: this._name, update });
      this.validate();
    };
    this._ytext.doc.on("update", this._docUpdate);
  }

  /** Unbinds the collaborative editor. */
  _teardownEditor() {
    if (this._ytext?.doc && this._docUpdate) {
      this._ytext.doc.off("update", this._docUpdate);
    }
    this._docUpdate = null;
    if (this._view) {
      this._view.destroy();
      this._view = null;
    }
  }

  /** The current body text. */
  get body() {
    return this._ytext?.toString() ?? "";
  }

  /**
   * Validates the body: parseable JSON, then the 2020-12 meta-schema
   * (Tier B — the vendored Ajv). The digest derives from the body.
   */
  async validate() {
    const status = /** @type {any} */ (
      this.shadowRoot?.querySelector("#schema-status")
    );
    const saveButton = /** @type {any} */ (
      this.shadowRoot?.querySelector("[data-action='save']")
    );
    const digestView = /** @type {any} */ (
      this.shadowRoot?.querySelector("#schema-digest")
    );
    const { digestSchema } = await import("../../vendor/fbp-protocol.js");
    const { tierBValidate } = await import("../library/forms/tierB.js");
    const text = this.body;
    if (!status || !saveButton) return;
    /** @type {string[]} */
    let errors = [];
    /** @type {any} */
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      errors = [err instanceof Error ? err.message : "invalid JSON"];
    }
    if (errors.length === 0) {
      const metaError = tierBValidate(parsed, {
        $ref: "https://json-schema.org/draft/2020-12/schema",
      });
      errors = (metaError ?? []).map((e) => `${e.path || "#"} ${e.message}`);
    }
    if (errors.length === 0 && this._provenance === "authored") {
      try {
        this._digest = await digestSchema(parsed);
      } catch {
        // Digest computation failure: the save stays available, the
        // digest display stays stale
      }
    }
    digestView.textContent = this._digest
      ? `${this._digest.slice(0, 16)}…`
      : "";
    const writable = this._provenance === "authored";
    saveButton.disabled = !writable || errors.length > 0;
    status.textContent = !writable
      ? `${this._provenance}${this._origin ? ` · ${this._origin}` : ""} — read-only until copied`
      : errors.length > 0
        ? errors.join(" · ")
        : "";
  }

  renderHead() {
    const head = /** @type {any} */ (
      this.shadowRoot?.querySelector("#schema-head")
    );
    if (head) {
      head.textContent = this._name;
    }
  }

  render() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          flex-direction: column;
          background: var(--ui-bg, rgb(20, 27, 35));
          color: var(--node-text);
          font-family: SourceCodePro, monospace;
          overflow: auto;
        }
        :host([hidden]) { display: none; }
        .column {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 56px 24px 64px;
          max-width: min(760px, calc(100vw - 48px));
          margin: 0 auto;
          width: 100%;
          gap: 10px;
        }
        .head {
          display: flex;
          align-items: baseline;
          gap: 10px;
          font-size: 15px;
        }
        .head .name { font-weight: bold; }
        .head .provenance {
          font-size: 11px;
          color: color-mix(in srgb, currentColor 60%, transparent);
        }
        .head #schema-digest {
          font-size: 10px;
          color: color-mix(in srgb, currentColor 55%, transparent);
        }
        .body {
          flex: 1;
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: 6px;
          padding: 8px;
          min-height: 240px;
        }
        .status-line {
          font-size: 11px;
          min-height: 14px;
          color: var(--ui-age-attention, #e2b344);
        }
        .actions {
          display: flex;
          gap: 8px;
        }
        button {
          background: transparent;
          color: var(--ui-accent, #4aa3df);
          border: 1px solid var(--ui-accent, #4aa3df);
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 12px;
          font-family: inherit;
          text-transform: uppercase;
          min-height: var(--ui-target, 44px);
        }
        button:disabled {
          opacity: 0.45;
        }
        button.secondary {
          color: inherit;
          border-color: var(--ui-border, #333);
        }
      </style>
      <div class="column">
        <div class="head">
          <span class="name" id="schema-head">${this._name}</span>
          <span class="provenance">${this._provenance}</span>
          <span id="schema-digest"></span>
        </div>
        <div class="body"></div>
        <div class="status-line" id="schema-status"></div>
        <div class="actions">
          <button data-action="save">Save</button>
          <button class="secondary" data-action="close">Close</button>
        </div>
      </div>
    `;
    const saveButton = shadow.querySelector("[data-action='save']");
    saveButton?.addEventListener("click", () => {
      emit(this, "schema-save", { name: this._name, body: this.body });
    });
    shadow
      .querySelector("[data-action='close']")
      ?.addEventListener("click", () => {
        emit(this, "schema-close", undefined);
      });
    this.validate();
  }
}

customElements.define("noflo-schema-view", NofloSchemaView);
