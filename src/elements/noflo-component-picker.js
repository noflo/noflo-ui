/**
 * @file Component picker (work document #29 update #1, typed-port guiding):
 * the candidate list shown when a node drag starts from a typed port. The
 * list narrows to compatible components (filtered by the caller) and ends
 * with a "create new component" option. Resolves the picked candidate
 * through a Promise — no intents here, the mapper drives what happens next.
 *
 * Pure view: Shadow DOM, positioned near the drop point, dismissed by an
 * outside pointerdown or Escape.
 */

const CREATE_SENTINEL = "__create-new-component__";

export class FlowComponentPicker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {((choice: string | null) => void) | null} */
    this._resolve = null;
    /** @type {() => void} */
    this._onOutsidePointerDown = () => {
      this._close(null);
    };
    /** @type {(event: Event) => void} */
    this._onAnyPointerDown = (event) => {
      // Pointer events are composed: a press inside the shadow root is
      // retargeted to the host element at the window level, so containment
      // on the host covers the picker's own buttons
      const target = /** @type {Node} */ (event.target);
      if (target === this || this.contains(target)) return;
      this._close(null);
    };
    /** @type {(event: KeyboardEvent) => void} */
    this._onKeyDown = (event) => {
      if (event.key === "Escape") this._close(null);
    };
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this._removeListeners();
  }

  _addListeners() {
    window.addEventListener("pointerdown", this._onAnyPointerDown, true);
    window.addEventListener("keydown", this._onKeyDown);
  }

  _removeListeners() {
    window.removeEventListener("pointerdown", this._onAnyPointerDown, true);
    window.removeEventListener("keydown", this._onKeyDown);
  }

  /**
   * @param {string | null} choice
   */
  _close(choice) {
    this._removeListeners();
    this.removeAttribute("open");
    const resolve = this._resolve;
    this._resolve = null;
    resolve?.(choice);
  }

  /**
   * Opens the picker near a position and resolves with the chosen component
   * name, the create sentinel, or `null` on dismissal.
   *
   * @param {{ x: number, y: number, candidates: string[], createLabel?: string }} options
   * @returns {Promise<string | null>}
   */
  open({ x, y, candidates, createLabel = "Create new component…" }) {
    if (this._resolve) this._close(null);
    return new Promise((resolve) => {
      this._resolve = resolve;
      const left = Math.max(8, Math.min(x, window.innerWidth - 200));
      const top = Math.max(
        8,
        Math.min(y, window.innerHeight - 40 * (candidates.length + 2)),
      );
      this.setAttribute("open", "");
      this.style.left = `${left}px`;
      this.style.top = `${top}px`;
      this.render(x, y, candidates, createLabel);
      this._addListeners();
    });
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {string[]} candidates
   * @param {string} createLabel
   */
  render(
    x = 0,
    y = 0,
    /** @type {string[]} */ candidates = [],
    createLabel = "Create new component…",
  ) {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          z-index: 950;
          display: none;
          font-family: SourceCodePro, monospace;
          font-size: 12px;
          color: var(--node-text, #aaa);
        }
        :host([open]) { display: block; }
        .picker {
          background: var(--ui-bg, rgb(20, 27, 35));
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: var(--ui-radius, 6px);
          min-width: 180px;
          max-height: 60vh;
          overflow: auto;
          padding: 4px;
          backdrop-filter: blur(8px);
        }
        .picker-head {
          padding: 4px 8px;
          color: var(--node-subtext, #666);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        button {
          display: block;
          width: 100%;
          text-align: left;
          background: transparent;
          color: inherit;
          border: none;
          border-radius: 4px;
          padding: 6px 8px;
          font: inherit;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        button:hover, button:focus-visible {
          background: var(--ui-accent, rgb(0, 229, 255));
          color: var(--ui-bg, rgb(20, 27, 35));
        }
        button.create {
          border-top: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          margin-top: 4px;
          color: var(--ui-accent, rgb(0, 229, 255));
        }
        button.empty {
          color: var(--node-subtext, #666);
          cursor: default;
        }
      </style>
      <div class="picker" part="picker">
        <div class="picker-head">Compatible components</div>
        ${
          candidates.length === 0
            ? `<button class="empty" disabled>No compatible components</button>`
            : candidates
                .map(
                  (name) => `<button data-component="${name}">${name}</button>`,
                )
                .join("")
        }
        <button class="create" data-create>${createLabel}</button>
      </div>
    `;
    for (const button of shadow.querySelectorAll("[data-component]")) {
      button.addEventListener("click", () => {
        this._close(button.getAttribute("data-component"));
      });
    }
    shadow.querySelector("[data-create]")?.addEventListener("click", () => {
      this._close(CREATE_SENTINEL);
    });
  }
}

/** Resolved by `open()` when the user chooses to create a new component. */
export const CREATE_NEW_COMPONENT = CREATE_SENTINEL;

customElements.define("noflo-component-picker", FlowComponentPicker);
