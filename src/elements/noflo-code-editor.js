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
        .scrim {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
        }
        .panel {
          position: fixed;
          inset: 5vh 5vw;
          display: flex;
          flex-direction: column;
          background: var(--ui-panel-bg, #16161c);
          border: 1px solid var(--ui-border, #33333d);
          border-radius: 6px;
          overflow: hidden;
        }
        header {
          display: flex;
          align-items: baseline;
          gap: 0.75em;
          padding: 0.75em 1em;
          border-bottom: 1px solid var(--ui-border, #33333d);
        }
        header .name {
          font-weight: 700;
          color: var(--ui-text, #e8e8ef);
        }
        header .lang {
          font-size: 0.85em;
          color: var(--ui-text-dim, #9a9aa8);
        }
        .editor {
          flex: 1;
          overflow: auto;
          background: var(--ui-panel-bg, #16161c);
        }
        .editor .cm-editor {
          height: 100%;
          background: transparent;
          color: var(--ui-text, #e8e8ef);
        }
        .editor .cm-editor.cm-focused {
          outline: none;
        }
        .editor .cm-gutters {
          background: transparent;
          border-right: 1px solid var(--ui-border, #33333d);
          color: var(--ui-text-dim, #9a9aa8);
        }
        .editor .cm-activeLine {
          background: color-mix(in srgb, var(--ui-accent, #4a9eff) 8%, transparent);
        }
        .editor .cm-cursor {
          border-color: var(--ui-accent, #4a9eff);
        }
        footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.5em;
          padding: 0.75em 1em;
          border-top: 1px solid var(--ui-border, #33333d);
        }
        button {
          font: inherit;
          padding: 0.4em 1.1em;
          border-radius: 4px;
          border: 1px solid var(--ui-border, #33333d);
          background: transparent;
          color: var(--ui-text, #e8e8ef);
          cursor: pointer;
        }
        button:focus-visible {
          border-color: var(--ui-accent, #4a9eff);
          outline: 2px solid var(--ui-focus, #4a9eff);
          outline-offset: 2px;
        }
        button.primary {
          background: var(--ui-accent, #4a9eff);
          border-color: var(--ui-accent, #4a9eff);
          color: var(--ui-panel-bg, #16161c);
        }
        .hint {
          margin-right: auto;
          font-size: 0.85em;
          color: var(--ui-text-dim, #9a9aa8);
          align-self: center;
        }
      </style>
      <div class="scrim"></div>
      <div class="panel" role="dialog" aria-label="Code editor">
        <header>
          <span class="name"></span>
          <span class="lang"></span>
        </header>
        <div class="editor"></div>
        <footer>
          <span class="hint">Edits sync live with every participant</span>
          <button type="button" class="done">Done</button>
        </footer>
      </div>
    `;
    this.shadowRoot
      .querySelector("button.done")
      .addEventListener("click", () => this.close());
    this.shadowRoot
      .querySelector(".scrim")
      .addEventListener("click", () => this.close());
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

    this._binding = yCollab(ytext);
    this._view = new extensions.EditorView({
      doc: ytext.toString(),
      extensions: [
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
  }

  /** Closes the editor, unbinding the collaborative binding. */
  close() {
    this.removeAttribute("open");
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
