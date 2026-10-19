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

import { yJedison } from "y-jedison";
import { REGISTRY_MAP } from "../crdt/ProjectDoc.js";
import { emit } from "../events.js";
import { codeEditorTheme } from "./noflo-code-editor.js";
import { FlowNode } from "./noflo-node.js";

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
    /** @type {any | null} The implementation-request snapshot (work
     * document #9 step D). */
    this._request = null;
    /** @type {any | null} The Glass-side library for the side view. */
    this._libraryManager = null;
    /** @type {((componentName: string) => any | null) | null} The
     * subgraph projection source. */
    this._depictionSource = null;
    /** @type {any} The signature form element (mounted into the shadow). */
    this._form = null;
    /** @type {any} The signature form's y-jedison binding, when the
     *  registry entry binds (work document #64). */
    this._signatureBinding = null;
    /** @type {any} The registry entry the binding writes to. */
    this._signatureYtype = null;
    /** @type {((update: Uint8Array, origin: any) => void) | null} The
     *  mirror update relay for the signature binding. */
    this._signatureRelay = null;
    /** @type {((event: any) => void) | null} The registry observer that
     *  rebinds after a whole-write swaps the entry. */
    this._registryObserve = null;
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
   * @param {any} [options.signatureYtype] The component's registry entry
   *   in the mirror (a Y.Map with inports/outports Y.Arrays): when given,
   *   the signature form binds to it via y-jedison — edits write
   *   granularly into the shared types and remote changes stream in,
   *   the code editor's yCollab pattern (work document #64).
   * @param {any} options.cm The CodeMirror surface.
   * @param {string} [options.codeLanguage]
   * @param {any} [options.libraryManager] The Glass-side library (work
   *   document #29's side view): the preview's FlowNode renders ports and
   *   the icon from it, updating live through its component-changed
   *   events as the signature edits stream into the registry.
   * @param {((componentName: string) => any | null) | null} [options.depictionSource]
   *   The subgraph projection source (work document #5): graph-implemented
   *   components depict their actual layout.
   * @param {any} [options.request] The implementation-request snapshot
   *   (work document #9 step D): null when nothing is linked, otherwise
   *   `{ state: "ok" | "deleted" | "broken", title, scope?, pendingScope?,
   *   boardId? }` — a plain snapshot of the pointer's resolution; the echo
   *   path refreshes it via setRequest.
   */
  async open({
    component,
    implementation,
    formSchema,
    signature,
    codeYtext = null,
    signatureYtype = null,
    cm,
    codeLanguage = "javascript",
    request = null,
    libraryManager = null,
    depictionSource = null,
  }) {
    this._component = component;
    this._implementation = implementation;
    this._cm = cm;
    this._language = codeLanguage;
    this._signatureYtype = signatureYtype;
    this._request = request;
    this._libraryManager = libraryManager;
    this._depictionSource = depictionSource;
    this._opened = true;
    this.removeAttribute("hidden");
    await this.render();
    await this._mountSignatureForm(formSchema, signature);
    if (codeYtext) {
      this._ytext = codeYtext;
      this._bindCode();
    }
  }

  /** Closes the view and tears the code editor down. */
  close() {
    this.setAttribute("hidden", "");
    this._teardownCode();
    this._teardownSignatureBinding();
    this._ytext = null;
    this._signatureYtype = null;
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
   * document #5) — duplicates surface as the user types. When the
   * registry entry binds (work document #64), the form writes
   * granularly into the shared types and remote changes stream in —
   * the local writes relay as binary updates through the origin-scoped
   * mirror listener, the code editor's yCollab pattern.
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
    // Belt for environments that do not fire connectedCallback for
    // shadow-root children (some test DOMs): the setters' rebuild only
    // runs when connected, so force the initialization when the editor
    // is still absent. Idempotent: real browsers initialize on append
    if (!form.editor) {
      form.connectedCallback();
    }
    // Belt: the editor's build may have raced the data setter in
    // environments where the element's upgrade order differs — the
    // re-set routes through the editor's own setValue, which is
    // idempotent with the binding's reconcile
    if (form.editor && form._data) {
      form.data = form._data;
    }
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
    this._bindSignature();
  }

  /**
   * Binds the signature form to the mirror's registry entry via
   * y-jedison (work document #64): the collaborative-write pattern —
   * local form changes write granularly into the shared types, and the
   * binding's transactions relay as binary updates through the mirror
   * listener, filtered by the binding's origin so everything else on
   * the shared document (code edits, cross-tab sync) is somebody
   * else's write.
   */
  _bindSignature() {
    const yType = this._signatureYtype;
    const editor = this._form?.editor;
    if (!yType || !editor) return;
    const origin = `signature:${this._component}`;
    this._signatureBinding = yJedison(editor, yType, { origin });
    this._signatureRelay = (
      /** @type {Uint8Array} */ update,
      /** @type {any} */ transactionOrigin,
    ) => {
      if (transactionOrigin !== origin) return;
      emit(this, "signature-update", { component: this._component, update });
    };
    /** @type {any} */ (yType.doc).on("update", this._signatureRelay);
    // A whole-write (the Save flow, or a peer's save) replaces the
    // registry entry with a fresh structure — the binding rebinds so
    // its writes keep landing on the shared subtree, and the saved
    // state reconciles into the editor
    const registry = /** @type {any} */ (yType.doc).getMap(REGISTRY_MAP);
    this._registryObserve = (/** @type {any} */ event) => {
      if (!event.keysChanged.has(this._component)) return;
      const fresh = registry.get(this._component);
      if (!fresh || fresh === this._signatureYtype) return;
      this._signatureYtype = fresh;
      this._teardownSignatureBinding();
      this._bindSignature();
    };
    registry.observe(this._registryObserve);
  }

  /** Unbinds the signature form's y-jedison binding and relay. */
  _teardownSignatureBinding() {
    if (this._signatureBinding) {
      this._signatureBinding.destroy();
      this._signatureBinding = null;
    }
    if (this._signatureYtype?.doc && this._signatureRelay) {
      /** @type {any} */ (this._signatureYtype.doc).off(
        "update",
        this._signatureRelay,
      );
    }
    if (this._registryObserve) {
      /** @type {any} */ (this._signatureYtype?.doc)
        ?.getMap(REGISTRY_MAP)
        .unobserve(this._registryObserve);
      this._registryObserve = null;
    }
    this._signatureRelay = null;
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
    // The request flow (work document #9 step D): an implementation
    // request IS a work document — the creation and the pointer ride the
    // intent path; the linked document's state renders in the request line
    if (this._implementation !== "graph") {
      actions.push(
        `<button class="secondary" data-action="request-implementation" title="Open a work document requesting this component's implementation">Request implementation</button>`,
      );
    }
    actions.push(
      `<button data-action="save" kind="btn-primary">Save signature</button>`,
    );
    return actions.join("");
  }

  /**
   * The implementation-request line's text (work document #9 step D):
   * the linked document's governed state, or the link's failure — a
   * deleted request (rngit-initiated deletion propagated as absence) and
   * a broken link (the id resolved onto a different document) are named,
   * never silently re-resolved.
   *
   * @returns {string}
   */
  requestText() {
    const request = this._request;
    if (!request) return "";
    if (request.state === "ok") {
      const scope = request.pendingScope
        ? `${request.scope} → ${request.pendingScope} (requested)`
        : request.scope;
      const board = request.boardId ? ` · #${request.boardId}` : "";
      return `Implementation request: ${request.title} · ${scope}${board}`;
    }
    if (request.state === "deleted") {
      return `Implementation request deleted (the linked document is gone): ${request.title}`;
    }
    return `Implementation request link broken (the document under the link is not the requested one)`;
  }

  /**
   * Refreshes the request line from a new snapshot (work document #9 step
   * D): the echo path — a full render would tear the code editor's
   * binding down, so the line patches in place.
   *
   * @param {any | null} request The new snapshot.
   */
  setRequest(request) {
    this._request = request;
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    const line = shadow.getElementById("request-line");
    if (!line) return;
    const text = this.requestText();
    line.textContent = text;
    if (text) {
      line.removeAttribute("hidden");
    } else {
      line.setAttribute("hidden", "");
    }
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
          max-width: min(1080px, calc(100vw - 48px));
          margin: 0 auto;
          width: 100%;
          gap: 10px;
        }
        /* The side view (work document #29): the node's live preview
           beside the form — the same FlowNode the canvas renders, fed by
           the same library manager, so the ladder's result is visible
           while editing. Collapses on narrow viewports (§13). */
        .pane-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }
        @media (min-width: 760px) {
          .pane-grid { grid-template-columns: minmax(0, 1fr) 232px; }
        }
        .preview-pane {
          display: none;
          position: sticky;
          top: 56px;
          padding: 12px;
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: 6px;
        }
        @media (min-width: 760px) {
          .preview-pane { display: block; }
        }
        .preview-stage {
          position: relative;
          width: 100%;
          height: 250px;
        }
        /* The node renders at its native canvas size (80px — the editor's
           default) and the wrapper scales it, so every proportion — ring
           width, bands, pill text — is pixel-identical to the graph
           editor at zoom, not re-laid-out. The wrapper centers the
           node's box; the translate's percentages resolve against the
           layout size, so the disc lands at the stage's center. */
        .preview-scale {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) scale(1.8);
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
        .request-line {
          font-size: 11px;
          color: color-mix(in srgb, currentColor 70%, transparent);
          border-left: 2px solid var(--ui-accent, #4aa3df);
          padding-left: 8px;
        }
        .request-line[hidden] { display: none; }
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
      <div class="pane-grid">
        <div class="form-column">
        <div class="request-line" id="request-line" ${this._request ? "" : "hidden"}>${this.requestText()}</div>
        <div class="signature-form-host" id="signature-form-host"></div>
        <div class="code-area" id="component-code" hidden>
          <div class="code-title">Implementation · ${this._language}</div>
          <div id="code-editor-host"></div>
        </div>
        <div class="status-line" id="component-status"></div>
        <div class="actions">${this.actionsHtml()}</div>
        </div>
        <div class="preview-pane" id="preview-pane">
          <div class="preview-stage" id="preview-stage"></div>
        </div>
      </div>
      </div>
    `;
    this._wireActions();
    this._mountPreview();
  }

  /**
   * Mounts the side view's node (work document #29): the same FlowNode
   * the canvas renders, fed by the same library manager — signature
   * edits reach it through the manager's component-changed events, so
   * the preview and the canvas always agree. Re-mounted per render (the
   * innerHTML rebuild wipes the host); a rebinding is cheap.
   */
  _mountPreview() {
    const stage = /** @type {HTMLElement | null} */ (
      this.shadowRoot?.getElementById("preview-stage")
    );
    if (!stage || !this._libraryManager) return;
    stage.innerHTML = "";
    const scaleWrap = document.createElement("div");
    scaleWrap.className = "preview-scale";
    const node = /** @type {any} */ (
      document.createElement("noflo-node")
    );
    node.libraryManager = this._libraryManager;
    node.component = this._component;
    // The canvas's native size (the editor's `metadata.size || 80`):
    // native size + wrapper scale keeps the node's internals untouched
    node.size = 80;
    node.position = { x: 0, y: 0 };
    // The canvas nodes carry a display name (work document #64's small
    // editors): the component's short name stands in — there is no node
    // id here, the preview depicts the component itself
    node.setMetadata({ name: this._component.split("/").pop() });
    if (this._depictionSource) node.depictionSource = this._depictionSource;
    scaleWrap.appendChild(node);
    stage.appendChild(scaleWrap);
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
