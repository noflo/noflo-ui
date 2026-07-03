// @ts-nocheck
/**
 * NofloModal Web Component
 * A modal using the HTML5 <dialog> element.
 *
 * @extends HTMLElement
 */
export class NofloModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {HTMLDialogElement} */
    this._dialog = null;
  }

  connectedCallback() {
    this.render();
  }

  render() {
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
          background: white;
          padding: 2rem;
          border-radius: 8px;
          max-width: 80%;
          overflow: auto;
          position: relative;
          color: black;
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
          color: #666;
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
        }
        .btn-primary {
          background: var(--ui-accent, #007bff);
          color: white;
          border: none;
          border-radius: 4px;
        }
        .btn-secondary {
          background: #eee;
          border: 1px solid #ccc;
          border-radius: 4px;
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
              <button type="submit" value="cancel" class="btn-secondary">Cancel</button>
              <button type="submit" value="save" class="btn-primary">Save</button>
            </div>
          </div>
        </form>
      </dialog>
    `;
    this._dialog = this.shadowRoot.querySelector("dialog");
    this.shadowRoot.querySelector(".close-btn").addEventListener("click", () => this.close());
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

  async submit() {
    return new Promise((resolve) => {
      if (!this._dialog) {
        resolve(false);
        return;
      }
      this._dialog.addEventListener('close', () => {
        resolve(this._dialog.returnValue === 'save');
      }, { once: true });
    });
  }
}

customElements.define("noflo-modal", NofloModal);
