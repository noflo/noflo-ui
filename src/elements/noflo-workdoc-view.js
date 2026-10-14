/**
 * @file Work document view (work document #9, #28): the document's primary
 * element — a full screen with the title, the scope state (including the
 * pending request vocabulary), and the content as an editable Markdown
 * surface.
 *
 * Editing rides the intent path (the Glass has no write authority, SPEC
 * Appendix A): local edits are optimistic, and a debounced flush sends the
 * accumulated content as an `updateWorkDoc` intent — the engine appends
 * the update thread entry, the replica confirms, and materialization
 * carries it to the board. Concurrent peer edits stream in through the
 * mirror's Y.Text on the next flush cycle (the v1 window is the session;
 * character-level live merging is the yCollab refinement).
 */

import { emit } from "../events.js";

/** The idle period after the last keystroke before the flush fires. */
const SAVE_DEBOUNCE_MS = 800;

/** @param {unknown} value @returns {string} */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export class FlowWorkDocView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {any} */
    this._doc = null;
    /** The local working buffer: optimistic edits between flushes. */
    this._buffer = "";
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._saveTimer = null;
    /** Whether the flush is in flight (the replica has not confirmed). */
    this._pendingSave = false;
  }

  /**
   * Opens the document view with a work document's state (work document
   * #9): the projection from the mirror.
   *
   * @param {{ id: string, title: string, scope: string, pendingScope?: string, content: string, boardId?: number | string | null, edited?: number }} doc
   */
  open(doc) {
    this._doc = doc;
    this._buffer = doc.content ?? "";
    this._pendingSave = false;
    this.hidden = false;
    this.render();
  }

  /** Closes the view, flushing any pending edit first. */
  close() {
    this.flush();
    this._doc = null;
    this.hidden = true;
    this.render();
  }

  /** Sends the accumulated buffer as the document's latest content. */
  flush() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    if (!this._doc) return;
    if (this._buffer === (this._doc.content ?? "")) {
      this._pendingSave = false;
      this.render();
      return;
    }
    this._pendingSave = true;
    emit(this, "workdoc-save", {
      docId: this._doc.id,
      content: this._buffer,
    });
    this.render();
  }

  /**
   * The mirror confirmed the flush: the authoritative content arrived.
   *
   * @param {string} content
   */
  confirmed(content) {
    if (!this._doc) return;
    this._doc.content = content;
    if (this._pendingSave && this._buffer === content) {
      this._pendingSave = false;
    }
    this.render();
  }

  render() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    if (!this._doc) {
      shadow.innerHTML = "";
      return;
    }
    const doc = this._doc;
    const scopeLabel = doc.pendingScope
      ? `${doc.scope} → ${doc.pendingScope} (requested)`
      : doc.scope;
    shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          inset: 0;
          z-index: 800;
          display: flex;
          flex-direction: column;
          background: var(--ui-bg, rgb(20, 27, 35));
          color: var(--node-text);
          font-family: SourceCodePro, monospace;
        }
        .head {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
        }
        .head .title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .badge {
          padding: 1px 6px;
          border-radius: 3px;
          font-size: 10px;
          flex-shrink: 0;
        }
        .badge.proposed { background: color-mix(in srgb, var(--ui-age-activity, #7ec8e3) 25%, transparent); color: var(--ui-age-activity, #7ec8e3); }
        .badge.active { background: color-mix(in srgb, var(--ui-age-calm, #7ee3a0) 25%, transparent); color: var(--ui-age-calm, #7ee3a0); }
        .badge.completed { background: color-mix(in srgb, var(--ui-muted, #889) 25%, transparent); color: var(--ui-muted, #889); }
        .badge.pending { outline: 1px dashed var(--ui-age-attention, #e3a17e); }
        textarea {
          flex: 1;
          resize: none;
          border: none;
          outline: none;
          padding: 14px;
          background: transparent;
          color: inherit;
          font: inherit;
          font-size: 13px;
          line-height: 1.5;
          tab-size: 2;
        }
        .status {
          padding: 6px 14px;
          font-size: 10px;
          opacity: 0.65;
          border-top: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
        }
      </style>
      <div class="head">
        <button class="secondary" data-action="back" title="Back">◀</button>
        <span class="title">${escapeHtml(doc.title)}</span>
        <span class="doc-id" title="Stable work document id">${escapeHtml(doc.id.slice(0, 8))}</span>
        ${doc.boardId ? `<span class="doc-board" title="Materialized on the board">#${escapeHtml(String(doc.boardId))}</span>` : ""}
        <span class="badge ${escapeHtml(doc.scope)}">${escapeHtml(scopeLabel)}</span>
      </div>
      <textarea spellcheck="false" placeholder="Write the document…">${escapeHtml(this._buffer)}</textarea>
      <div class="status" aria-live="polite">${
        this._pendingSave
          ? "Saving…"
          : "Editing — changes save automatically. Content materializes to the project's rngit repository, where scope and signatures are governed."
      }</div>
    `;
    const textarea = /** @type {HTMLTextAreaElement} */ (
      shadow.querySelector("textarea")
    );
    textarea.addEventListener("input", () => {
      this._buffer = textarea.value;
      if (this._saveTimer) clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
      const status = /** @type {HTMLElement} */ (
        shadow.querySelector(".status")
      );
      if (status) status.textContent = "Editing — unsaved changes…";
    });
    textarea.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
      // Tab inserts two spaces instead of leaving the editing surface
      if (e.key === "Tab") {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.setRangeText("  ", start, end, "end");
        this._buffer = textarea.value;
        textarea.dispatchEvent(new Event("input", { bubbles: false }));
      }
    });
    shadow
      .querySelector("[data-action='back']")
      ?.addEventListener("click", () => {
        emit(this, "workdoc-close", { docId: this._doc.id });
      });
  }
}

customElements.define("noflo-workdoc-view", FlowWorkDocView);
