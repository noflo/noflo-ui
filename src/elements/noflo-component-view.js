/**
 * @file The component editor view (work document #62: the editors as equal
 * full-screen surfaces; work document #29's sketch→specify→implement): a
 * focused full-screen editor for one component — the signature form and,
 * once the component carries code, the collaborative code buffer bound
 * through the component code editor's binding.
 *
 * Replaces the signature + code dialogs: the component screen is a route
 * (`kind: "component"`), activation hides the canvas the way the workdoc
 * and schema views do, and the dismissal contract returns to the graph.
 * The edit model follows #29: the signature Save is the whole-write;
 * renaming through the editor forks (the fork carries the edits);
 * implement-in-code scaffolds and binds the buffer live through the
 * mirror.
 */

import { emit } from "../events.js";
import { codeEditorTheme } from "./noflo-code-editor.js";

/** The styles for the signature form, fetched once (the mesh settings'
 * pattern — the jedison-generated markup needs the shared theme). */
let formStylesCache = /** @type {string | null} */ (null);

/**
 * Loads the shared json-form stylesheet.
 *
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

export class NofloComponentView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    // Custom element constructors must not touch attributes: the shell
    // renders empty until open() — the overlay appears with the route
    this._component = "";
    /** @type {"stub" | "code" | "graph"} The implementation kind. */
    this._implementation = "stub";
    /** @type {any} The signature form element (mounted into the shadow). */
    this._form = null;
    /** @type {any} The code buffer's Y.Text, when the component has code. */
    this._ytext = null;
    /** @type {any} */
    this._cm = null;
    /** @type {any} */
    this._view = null;
    /** @type {any} */
    this._conf = null;
    /** @type {((update: Uint8Array, origin: any) => void) | null} */
    this._docUpdate = null;
    /** The language the code buffer edits in. */
    this._language = "javascript";
    /** Whether a route opened the view (the shell renders from then on). */
    this._opened = false;
  }

  connectedCallback() {
    // The shell renders only once a route opened it: the element's
    // pre-open state is an empty shadow, not a full-screen overlay
    if (this._opened) this.render();
  }

  /**
   * Opens the view for one component.
   *
   * @param {Object} options
   * @param {string} options.component The component name.
   * @param {"stub" | "code" | "graph"} options.implementation The
   *   implementation kind: stub (signature only), code (the buffer binds),
   *   graph (navigate to the subgraph).
   * @param {any} options.formSchema The built signature form schema.
   * @param {any} options.signature The plain signature record.
   * @param {any} [options.codeYtext] The component's code buffer, when
   *   the implementation is code.
   * @param {any} options.cm The CodeMirror surface.
   * @param {string} [options.codeLanguage]
   */
  async open({
    component,
    implementation,
    formSchema,
    signature,
    codeYtext = null,
    cm,
    codeLanguage = "javascript",
  }) {
    this._component = component;
    this._implementation = implementation;
    this._cm = cm;
    this._language = codeLanguage;
    this._opened = true;
    this.removeAttribute("hidden");
    await this.render();
    this._mountSignatureForm(formSchema, signature);
    if (codeYtext) {
      this._ytext = codeYtext;
      this._bindCode();
    }
  }

  /** Closes the view and tears the code editor down. */
  close() {
    this.setAttribute("hidden", "");
    this._teardownCode();
    this._ytext = null;
    if (this._form) {
      this._form.remove();
      this._form = null;
    }
  }

  /**
   * Binds the code area once the component's buffer exists (the
   * implement-in-code flow: the scaffold lands through the intent path
   * and the mirror picks it up).
   *
   * @param {any} ytext The component's code buffer.
   * @param {string} language
   */
  bindCode(ytext, language = "javascript") {
    this._implementation = "code";
    this._ytext = ytext;
    this._language = language;
    const codeArea = /** @type {any} */ (
      this.shadowRoot?.querySelector("#component-code")
    );
    if (codeArea) codeArea.hidden = false;
    this._bindCode();
  }

  /**
   * Shows inline feedback beside the actions (the duplicate-port rule's
   * surface — the editor stays open, the failure is adjacent).
   *
   * @param {string} message
   */
  feedback(message) {
    const status = /** @type {any} */ (
      this.shadowRoot?.querySelector("#component-status")
    );
    if (status) status.textContent = message;
  }

  /**
   * Mounts the signature form: the shared jedison theme injected, the
   * form element wired with the uniquePortNames constraint (work
   * document #5) — duplicates surface as the user types.
   *
   * @param {any} formSchema
   * @param {any} signature
   */
  async _mountSignatureForm(formSchema, signature) {
    const host = /** @type {any} */ (
      this.shadowRoot?.querySelector("#signature-form-host")
    );
    if (!host) return;
    const styles = await loadFormStyles();
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    host.appendChild(styleEl);
    const form = /** @type {any} */ (document.createElement("noflo-json-form"));
    form.schema = formSchema;
    form.data = signature;
    host.appendChild(form);
    this._form = form;
    // The live stream: the constraint checks run as the user types
    form.addEventListener("form-change", (/** @type {any} */ e) => {
      const duplicates = this._duplicatePortNames(e.detail?.data);
      if (duplicates.length > 0) {
        this.feedback(
          `Port names must be unique per direction: ${duplicates.join(", ")}`,
        );
        return;
      }
      this.feedback("");
    });
  }

  /**
   * The duplicate-port rule (work document #5): port names are unique per
   * direction.
   *
   * @param {any} data The form's data.
   * @returns {string[]}
   */
  _duplicatePortNames(data) {
    /** @type {string[]} */
    const duplicates = [];
    for (const direction of ["inports", "outports"]) {
      const names = (data?.[direction] ?? [])
        .map((/** @type {any} */ port) => port?.name)
        .filter(Boolean);
      duplicates.push(
        ...new Set(
          names.filter(
            (/** @type {string} */ name, /** @type {number} */ index) =>
              names.indexOf(name) !== index,
          ),
        ),
      );
    }
    return duplicates;
  }

  /**
   * Binds the code area: CodeMirror over the component's Y.Text via
   * yCollab — remote edits stream through the y-update channel, local
   * keystrokes relay as the component-code-update event.
   */
  _bindCode() {
    if (this._view || !this._cm || !this._ytext) return;
    const host = /** @type {any} */ (
      this.shadowRoot?.querySelector("#code-editor-host")
    );
    if (!host) return;
    const plugins = this._cm.yCollab(this._ytext);
    this._view = new this._cm.EditorView({
      doc: this._ytext.toString(),
      extensions: [
        // The custom theme precedes basicSetup: the first highlight
        // style in the extension list wins (the code editor's documented
        // pitfall)
        ...codeEditorTheme(this._cm),
        this._cm.basicSetup,
        this._cm.javascript(),
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
      emit(this, "component-code-update", {
        component: this._component,
        update,
      });
    };
    this._ytext.doc.on("update", this._docUpdate);
  }

  /** Unbinds the code editor. */
  _teardownCode() {
    if (this._ytext?.doc && this._docUpdate) {
      this._ytext.doc.off("update", this._docUpdate);
    }
    this._docUpdate = null;
    if (this._view) {
      this._view.destroy();
      this._view = null;
    }
  }

  /**
   * The action set: implementation-kind-dependent, per the sketch →
   * specify → implement ladder (work document #29).
   *
   * @returns {string}
   */
  actionsHtml() {
    const actions = [
      `<button class="secondary" data-action="close">Close</button>`,
    ];
    if (this._implementation !== "graph") {
      actions.push(
        `<button data-action="fork" title="Fork the component under a new name">Fork</button>`,
      );
    }
    if (this._implementation === "stub") {
      actions.push(
        `<button class="secondary" data-action="implement-code" title="Scaffold the code implementation">Implement in code</button>`,
        `<button class="secondary" data-action="implement-graph" title="Implement as a subgraph of the current graph">Implement as graph</button>`,
      );
    }
    if (this._implementation === "graph") {
      actions.push(
        `<button data-action="open-implementation" title="Open the implementing subgraph">Open implementation</button>`,
      );
    }
    actions.push(
      `<button data-action="save" kind="btn-primary">Save signature</button>`,
    );
    return actions.join("");
  }

  async render() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    const kindBadge =
      this._implementation === "graph"
        ? "subgraph"
        : this._implementation === "code"
          ? "elementary · code"
          : "stub · sketch";
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
          max-width: min(860px, calc(100vw - 48px));
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
        .head .kind {
          font-size: 11px;
          color: color-mix(in srgb, currentColor 60%, transparent);
        }
        .signature-form-host { border: 1px solid var(--ui-panel-border, rgb(58, 63, 72)); border-radius: 6px; padding: 8px; }
        .code-area { border: 1px solid var(--ui-panel-border, rgb(58, 63, 72)); border-radius: 6px; padding: 8px; min-height: 260px; }
        .code-area[hidden] { display: none; }
        .code-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--ui-accent, #4aa3df);
          margin-bottom: 4px;
        }
        #code-editor-host { min-height: 240px; }
        .status-line {
          font-size: 11px;
          min-height: 14px;
          color: var(--ui-age-attention, #e2b344);
        }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; }
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
        button.secondary {
          color: inherit;
          border-color: var(--ui-border, #333);
        }
      </style>
      <div class="column">
        <div class="head">
          <span class="name">${this._component}</span>
          <span class="kind">${kindBadge}</span>
        </div>
        <div class="signature-form-host" id="signature-form-host"></div>
        <div class="code-area" id="component-code" hidden>
          <div class="code-title">Implementation · ${this._language}</div>
          <div id="code-editor-host"></div>
        </div>
        <div class="status-line" id="component-status"></div>
        <div class="actions">${this.actionsHtml()}</div>
      </div>
    `;
    this._wireActions();
  }

  /** Wires the action buttons (re-run per render). */
  _wireActions() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    const emitAction = (/** @type {string} */ action) =>
      emit(this, "component-action", { action, component: this._component });
    for (const button of shadow.querySelectorAll("[data-action]")) {
      button.addEventListener("click", (/** @type {any} */ event) => {
        event.stopPropagation();
        const action = button.getAttribute("data-action");
        if (action === "save") {
          // The duplicate-port rule gates first: the failure is adjacent
          // (the status line), the editor stays open
          const duplicates = this._duplicatePortNames(this._form?.data);
          if (duplicates.length > 0) {
            this.feedback(
              `Port names must be unique per direction: ${duplicates.join(", ")}`,
            );
            return;
          }
        }
        emitAction(action ?? "");
      });
    }
  }
}

customElements.define("noflo-component-view", NofloComponentView);
