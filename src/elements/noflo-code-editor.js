// @ts-nocheck
/**
 * NofloCodeEditor Web Component (work document #29): a modal-hosted
 * CodeMirror editor bound to a component's collaborative code buffer.
 *
 * The binding is `yCollab` over a Y.Text of the Glass's mirror document —
 * remote edits arrive through the existing `y-update` echo channel and
 * appear live; local keystrokes flow out through `onSendDelta` as
 * `setComponentCode` delta intents (the Glass has no write authority:
 * the Worker's authoritative buffer applies the delta, and its echo
 * reconciles the mirror idempotently). There is no Save: edits stream,
 * per the live-sync etiquette.
 *
 * Visual rules (VISUAL_GUIDELINES.md): opaque theme-driven background,
 * panel border, scrim behind, focus states with offset outline, theme
 * tokens throughout — chrome only, never canvas.
 *
 * @extends HTMLElement
 */
/**
 * Builds the editor's look: a syntax palette over the theme's route
 * tokens (keywords carry the accent, strings/numbers/functions take
 * distinct route colors, comments dim), chrome via CSS variables. Both
 * themes and all ages inherit automatically.
 *
 * @param {any} cm - The vendored CodeMirror surface.
 * @returns {any[]} Extensions for the EditorView.
 */
export function codeEditorTheme(cm) {
  // Feature-tolerant: stripped surfaces (tests) degrade to chrome-only
  if (typeof cm.HighlightStyle?.define !== "function" || !cm.tags) {
    return [];
  }
  const highlight = cm.HighlightStyle.define([
    { tag: cm.tags.keyword, color: "var(--ui-accent)" },
    { tag: [cm.tags.name, cm.tags.propertyName], color: "var(--node-text)" },
    {
      tag: [
        cm.tags.function(cm.tags.variableName),
        cm.tags.function(cm.tags.propertyName),
      ],
      color: "var(--route-7)",
    },
    { tag: cm.tags.string, color: "var(--route-4)" },
    {
      tag: [cm.tags.number, cm.tags.bool, cm.tags.null],
      color: "var(--route-8)",
    },
    {
      tag: [cm.tags.comment, cm.tags.lineComment, cm.tags.blockComment],
      color: "color-mix(in srgb, var(--node-text) 45%, transparent)",
      fontStyle: "italic",
    },
    { tag: [cm.tags.typeName, cm.tags.className], color: "var(--route-2)" },
    {
      tag: [cm.tags.operator, cm.tags.punctuation, cm.tags.bracket],
      color: "color-mix(in srgb, var(--node-text) 75%, transparent)",
    },
    { tag: cm.tags.definition(cm.tags.variableName), color: "var(--route-5)" },
    { tag: cm.tags.invalid, color: "var(--route-1)" },
  ]);
  return [
    cm.EditorView.theme({
      "&": { color: "var(--node-text)", fontSize: "13px" },
      ".cm-content": { caretColor: "var(--ui-accent)" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--ui-accent)" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        {
          backgroundColor:
            "color-mix(in srgb, var(--ui-accent) 25%, transparent)",
        },
      ".cm-activeLine": {
        backgroundColor: "color-mix(in srgb, var(--ui-accent) 6%, transparent)",
      },
      ".cm-activeLineGutter": {
        backgroundColor:
          "color-mix(in srgb, var(--ui-accent) 10%, transparent)",
        color: "var(--node-text)",
      },
      ".cm-gutters": {
        backgroundColor: "transparent",
        color: "color-mix(in srgb, var(--node-text) 45%, transparent)",
        borderRight: "1px solid var(--ui-panel-border)",
      },
      ".cm-foldPlaceholder": {
        backgroundColor: "transparent",
        border: "none",
        color: "color-mix(in srgb, var(--node-text) 45%, transparent)",
      },
    }),
    cm.syntaxHighlighting(highlight),
  ];
}

export class NofloCodeEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {any} The CodeMirror view (vendored surface). */
    this._view = null;
    /** @type {any} The bound Y.Text. */
    this._ytext = null;
    /** @type {any} The yCollab binding (its origin marks local edits). */
    this._binding = null;
    /** @type {(delta: any[]) => void} */
    this._onSendDelta = () => {};
    /** @type {any} The Y.Text observer for the local-delta relay. */
    this._observer = null;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.destroy();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
        }
        :host([open]) {
          display: block;
        }
        dialog {
          /* Explicit centered geometry: WebKit's modal-dialog UA sheet
             anchors top and sizes fit-content, which collapses the panel
             into a top strip (VISUAL_GUIDELINES: modals are opaque,
             theme-driven, bordered) */
          position: fixed;
          top: 50%;
          left: 50%;
          /* Kill the modal UA sheet's inset:0 + margin:auto — with our
             top/left they over-constrain the box into the bottom half and
             push the top off-screen on short viewports */
          right: auto;
          bottom: auto;
          margin: 0;
          translate: -50% -50%;
          width: min(1100px, 92vw);
          height: min(720px, 86vh);
          padding: 0;
          border: 1px solid var(--ui-panel-border);
          border-radius: 6px;
          background: var(--ui-bg);
          color: var(--node-text);
          font-family: SourceCodePro, monospace;
        }
        dialog::backdrop {
          /* The one sanctioned raw color: a full-screen scrim is light
             management, not themed chrome (VISUAL_GUIDELINES) */
          background: rgba(0, 0, 0, 0.5);
        }
        .panel {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        header {
          display: flex;
          align-items: baseline;
          gap: 0.75em;
          padding: 0.6em 1em;
          border-bottom: 1px solid var(--ui-panel-border);
        }
        header .name {
          font-weight: 700;
          color: var(--node-text);
        }
        header .lang {
          font-size: 0.85em;
          color: color-mix(in srgb, var(--node-text) 55%, transparent);
        }
        .editor {
          flex: 1;
          overflow: auto;
          background: var(--ui-bg);
        }
        .editor .cm-editor {
          height: 100%;
          background: transparent;
        }
        .editor .cm-editor.cm-focused {
          outline: none;
        }
        .editor .cm-gutters {
          background: transparent;
          border-right: 1px solid var(--ui-panel-border);
          color: color-mix(in srgb, var(--node-text) 45%, transparent);
        }
        .editor .cm-activeLine {
          background: color-mix(in srgb, var(--ui-accent) 8%, transparent);
        }
        .editor .cm-activeLineGutter {
          background: color-mix(in srgb, var(--ui-accent) 12%, transparent);
        }
        .editor .cm-cursor,
        .editor .cm-dropCursor {
          border-color: var(--ui-accent);
        }
        .editor ::selection {
          background: color-mix(in srgb, var(--ui-accent) 30%, transparent);
        }
        footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.5em;
          padding: 0.6em 1em;
          border-top: 1px solid var(--ui-panel-border);
        }
        button {
          font: inherit;
          padding: 0.4em 1.1em;
          border-radius: 4px;
          border: 1px solid var(--ui-panel-border);
          background: transparent;
          color: var(--node-text);
          cursor: pointer;
        }
        button:focus-visible {
          border-color: var(--ui-accent);
          outline: 2px solid var(--ui-focus);
          outline-offset: 2px;
        }
      </style>
      <dialog>
        <div class="panel" aria-label="Code editor">
          <header>
            <span class="name"></span>
            <span class="lang"></span>
          </header>
          <div class="editor"></div>
          <footer>
            <button type="button" class="done">Done</button>
          </footer>
        </div>
      </dialog>
    `;
    this.shadowRoot
      .querySelector("button.done")
      .addEventListener("click", () => this.close());
    // Test-environment parsers may not create <dialog> from innerHTML;
    // real browsers do, and its close event covers Esc dismissal
    const dialog = /** @type {HTMLDialogElement | null} */ (
      this.shadowRoot.querySelector("dialog")
    );
    dialog?.addEventListener("close", () => {
      // Esc key / user-agent dismissal also tears down
      this.removeAttribute("open");
      this.teardown();
    });
  }

  /**
   * Opens the editor for one component's code buffer.
   *
   * @param {object} options
   * @param {any} options.ytext - The component's Y.Text code buffer (from
   *   the mirror document — the read replica the collaborative binding
   *   renders and extends).
   * @param {string} options.name - Component name (header display).
   * @param {string} [options.language] - `javascript` (default) or
   *   `markdown` (the docs buffers ride the same editor).
   * @param {(delta: any[]) => void} options.onSendDelta - Relays one
   *   local edit as a `setComponentCode` delta intent.
   * @param {any} options.yCollab - The vendored binding factory.
   * @param {any} options.extensions - CodeMirror extensions (language
   *   support, setup) from the vendored surface.
   */
  open({
    ytext,
    name,
    language = "javascript",
    onSendDelta,
    yCollab,
    extensions,
  }) {
    this._ytext = ytext;
    this._onSendDelta = onSendDelta;
    this.shadowRoot.querySelector(".name").textContent = name;
    this.shadowRoot.querySelector(".lang").textContent = language;
    this.setAttribute("open", "");
    const dialog = /** @type {HTMLDialogElement} */ (
      this.shadowRoot.querySelector("dialog")
    );
    // showModal puts the panel in the top layer — above canvas layers
    // and the #app backdrop-filter's containing block. Test environments
    // without the dialog API fall back to the attribute-driven display
    if (dialog && typeof dialog.showModal === "function") {
      dialog.showModal();
    }

    this._binding = yCollab(ytext);
    console.log("[code-editor] mounting CodeMirror");
    this._view = new extensions.EditorView({
      doc: ytext.toString(),
      extensions: [
        // The custom theme precedes basicSetup: the first highlight
        // style in the extension list wins, and basicSetup ships a
        // default highlighter that would otherwise mask ours
        ...codeEditorTheme(extensions),
        extensions.basicSetup,
        language === "markdown"
          ? extensions.markdown()
          : extensions.javascript(),
        this._binding,
      ],
      parent: this.shadowRoot.querySelector(".editor"),
    });

    // The local-delta relay: yCollab applies local edits with the binding
    // as the transaction origin; remote edits arrive via the y-update
    // echo with a different (null) origin — only locals are relayed
    this._observer = (/** @type {any} */ event) => {
      if (event.transaction.origin !== this._binding) return;
      const delta = event.delta;
      if (delta && delta.length > 0) this._onSendDelta(delta);
    };
    ytext.observe(this._observer);
    this._view.focus();
    console.log("[code-editor] mounted ok");
  }

  /** Closes the editor and runs the teardown. */
  close() {
    const dialog = /** @type {HTMLDialogElement | null} */ (
      this.shadowRoot.querySelector("dialog")
    );
    if (dialog && dialog.open) {
      dialog.close(); // the close event also tears down
      return;
    }
    this.removeAttribute("open");
    this.teardown();
  }

  /** Unbinds the collaborative binding. */
  teardown() {
    if (this._ytext && this._observer) {
      this._ytext.unobserve(this._observer);
    }
    this._observer = null;
    if (this._view) {
      this._view.destroy();
    }
    this._view = null;
    this._binding = null;
    this._ytext = null;
  }

  destroy() {
    this.close();
  }
}

customElements.define("noflo-code-editor", NofloCodeEditor);
