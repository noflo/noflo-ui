// @ts-nocheck
/**
 * NofloModal Web Component
 * A modal using the HTML5 <dialog> element.
 *
 * Actions are configurable (work document #29): `setActions` replaces the
 * footer buttons, and `submit()` resolves with the chosen action's value
 * (or `false` when the dialog is dismissed) — the signature editor uses
 * this for its big primary actions alongside Save.
 *
 * @extends HTMLElement
 */
export class NofloModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {HTMLDialogElement} */
    this._dialog = null;
    /** @type {Array<{ value: string, label: string, kind?: string }>} */
    this._actions = [
      { value: "cancel", label: "Cancel", kind: "btn-secondary" },
      { value: "save", label: "Save", kind: "btn-primary" },
    ];
  }

  connectedCallback() {
    this.render();
  }

  /**
   * Replaces the footer actions. Call before `open()`: the footer renders
   * once per render pass.
   *
   * @param {Array<{ value: string, label: string, kind?: string }>} actions
   */
  setActions(actions) {
    this._actions = actions.length > 0 ? actions : this._actions;
    if (this._dialog) this.render();
  }

  render() {
    const actions = this._actions
      .map(
        (action) =>
          `<button type="submit" value="${action.value}" class="${
            action.kind || "btn-primary"
          }">${action.label}</button>`,
      )
      .join("");
    this.shadowRoot.innerHTML = `
      <style>
        dialog {
          padding: 0;
          border: none;
          background: transparent;
          max-width: none;
          max-height: none;
        }
        dialog::backdrop {
          background: rgba(0,0,0,0.5);
        }
        .modal-content {
          max-height: 80vh;
          overflow: auto;
          background: var(--ui-bg, white);
          padding: 2rem;
          border-radius: 8px;
          max-width: 80%;
          position: relative;
          color: var(--node-text, black);
          border: 1px solid var(--ui-panel-border, #ccc);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .modal-title {
          font-size: 1.5rem;
          font-weight: bold;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--node-subtext, #666);
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
        }
        button {
          padding: 0.5rem 1rem;
          cursor: pointer;
          box-sizing: border-box;
          min-height: var(--ui-target, 44px);
          min-width: var(--ui-target, 44px);
        }
        button:focus-visible {
          outline: 2px solid var(--ui-focus, rgb(68, 138, 255));
          outline-offset: 2px;
        }
        .btn-primary {
          background: var(--ui-accent, #007bff);
          color: var(--ui-bg, white);
          border: none;
          border-radius: 4px;
        }
        .btn-secondary {
          background: transparent;
          color: inherit;
          border: 1px solid var(--ui-panel-border, #ccc);
          border-radius: 4px;
        }
        .btn-action {
          background: color-mix(in srgb, var(--ui-accent, #007bff) 18%, var(--ui-bg, white));
          border: 1px solid color-mix(in srgb, var(--ui-accent, #007bff) 55%, transparent);
          color: inherit;
          border-radius: 4px;
          font-weight: bold;
        }
      </style>
      <dialog>
        <form method="dialog">
          <div class="modal-content">
            <div class="modal-header">
              <div class="modal-title"></div>
              <button type="button" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
              <slot></slot>
            </div>
            <div class="modal-footer">
              ${actions}
            </div>
          </div>
        </form>
      </dialog>
    `;
    this._dialog = this.shadowRoot.querySelector("dialog");
    this.shadowRoot
      .querySelector(".close-btn")
      .addEventListener("click", () => this.close());
  }

  open(title) {
    if (!this._dialog) return;
    this.shadowRoot.querySelector(".modal-title").textContent = title;
    this._dialog.showModal();
  }

  close() {
    if (this._dialog) {
      this._dialog.close();
    }
  }

  /**
   * Resolves with the clicked action's value, or `false` when the dialog is
   * dismissed without choosing (Escape, backdrop, close button).
   *
   * @returns {Promise<string | false>}
   */
  async submit() {
    return new Promise((resolve) => {
      if (!this._dialog) {
        resolve(false);
        return;
      }
      this._dialog.addEventListener(
        "close",
        () => {
          resolve(
            this._dialog.returnValue === "" ? false : this._dialog.returnValue,
          );
        },
        { once: true },
      );
    });
  }
}

customElements.define("noflo-modal", NofloModal);
