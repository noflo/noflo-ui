/**
 * @file Project corner (work documents #9, #28, bottom-left): the
 * project's work-document surface — the count chip, the expanded
 * document accordion, and the scope vocabulary. Read client first: the
 * corner lists what the CRDT holds; opening a document is a primary
 * element the app routes to (work document #9's document view).
 *
 * The corner follows #28's grammar via the shared base: Hidden when the
 * project holds no documents, Normal (the count line), Minified
 * (compact viewports), Expanded (the accordion).
 */

import { cornerStyles, FlowCornerElement } from "./corner-element.js";

/** @param {unknown} value @returns {string} */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

import { emit } from "../events.js";

const SCOPES = {
  proposed: { label: "proposed", cls: "proposed" },
  active: { label: "active", cls: "active" },
  completed: { label: "completed", cls: "completed" },
};

export class FlowProjectCorner extends FlowCornerElement {
  constructor() {
    super();
    /** @type {Array<any>} */
    this._docs = [];
    /** Corners hide when there is nothing to show (work document #28). */
    this._visible = false;
    this.chipTitle = "Project work documents";
  }

  /**
   * Refreshes in place with the project's work documents (work document
   * #9): newest edit first, the proposed scope carrying its own
   * indicator (agents may only propose — the distinction is visible).
   *
   * @param {Array<{ id: string, title: string, scope: string, pendingScope?: string, boardId?: number | string | null, edited: number }>} docs
   */
  setWorkDocs(docs) {
    /** The document currently open (work document #9): the accordion
     * highlights it while its view is active. */
    this._activeDocId = /** @type {string | null} */ (null);
    this._docs = (docs ?? []).slice().sort((a, b) => b.edited - a.edited);
    // Visible whenever a project is open — the creation affordance lives
    // here, so an empty project must still reach it (the Hidden state's
    // "no documents" rule predates the create affordance; amending)
    this._visible = true;
    this.render();
  }

  styles() {
    return `
        :host {
          position: fixed;
          bottom: 12px;
          left: 12px;
          z-index: 900;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          max-width: min(360px, calc(100vw - 24px));
          font-family: SourceCodePro, monospace;
          color: var(--node-text);
        }
        .doc-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 6px;
          cursor: pointer;
          border-radius: var(--ui-radius, 6px);
        }
        .doc-row:hover,
        .doc-row.active-doc {
          background: color-mix(in srgb, var(--ui-accent, rgb(90, 200, 250)) 12%, transparent);
        }
        .doc-row.active-doc .doc-title {
          color: var(--ui-accent, rgb(90, 200, 250));
        }
        .doc-title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .doc-board {
          font-size: 10px;
          opacity: 0.7;
        }
        .doc-edited {
          font-size: 10px;
          opacity: 0.6;
        }
        .badge {
          padding: 1px 6px;
          border-radius: 3px;
          font-size: 10px;
          flex-shrink: 0;
        }
        .badge.proposed {
          background: color-mix(in srgb, var(--ui-age-activity, #7ec8e3) 25%, transparent);
          color: var(--ui-age-activity, #7ec8e3);
        }
        .badge.active {
          background: color-mix(in srgb, var(--ui-age-calm, #7ee3a0) 25%, transparent);
          color: var(--ui-age-calm, #7ee3a0);
        }
        .badge.completed {
          background: color-mix(in srgb, var(--ui-muted, #889) 25%, transparent);
          color: var(--ui-muted, #889);
        }
        .badge.pending {
          outline: 1px dashed var(--ui-age-attention, #e3a17e);
        }
        .empty {
          opacity: 0.6;
          font-size: 11px;
        }
    `;
  }

  /**
   * The chip: the project's document count — active and proposed
   * separately, since the scopes mean different governance.
   *
   * @returns {string}
   */
  chipHtml() {
    const active = this._docs.filter((doc) => doc.scope === "active").length;
    const proposed = this._docs.filter(
      (doc) => doc.scope === "proposed",
    ).length;
    const parts = [`work docs ${active}`];
    if (proposed > 0) parts.push(`+${proposed} proposed`);
    return `<span class="context-label">${parts.join(" · ")}</span>`;
  }

  /**
   * Marks the document whose view is open (work document #9): the
   * accordion highlights it while the document screen is active.
   *
   * @param {string | null} docId
   */
  setActiveDoc(docId) {
    this._activeDocId = docId;
    this.render();
  }

  /**
   * The expanded accordion: the document list, newest first, each row
   * opening the document view (a primary element per #28).
   *
   * @returns {string}
   */
  expandedHtml() {
    // The base renders expandedHtml() unconditionally: the guard is the
    // subclass's job (the sync panel's pattern — the accordion is closed
    // unless the chip toggled it)
    if (!this.expanded) return "";
    if (this._docs.length === 0) {
      return `<div class="panel">
        <div class="empty">No work documents yet.</div>
        <button class="secondary" data-action="create-doc">New document</button>
      </div>`;
    }
    const rows = this._docs
      .map((doc) => {
        const scope =
          /** @type {Record<string, { label: string, cls: string }>} */ (
            SCOPES
          )[doc.scope] ?? { label: doc.scope, cls: "active" };
        const pending = doc.pendingScope
          ? `<span class="badge pending">→ ${escapeHtml(doc.pendingScope)}</span>`
          : "";
        const board = doc.boardId
          ? `<span class="doc-board">#${escapeHtml(String(doc.boardId))}</span>`
          : "";
        const edited = new Date(doc.edited).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
        const active = doc.id === this._activeDocId ? " active-doc" : "";
        return `<div class="doc-row${active}" data-doc="${escapeHtml(doc.id)}" title="Open document">
            <span class="doc-title">${escapeHtml(doc.title)}</span>
            ${board}
            <span class="doc-edited">${escapeHtml(edited)}</span>
            <span class="badge ${scope.cls}">${scope.label}</span>
            ${pending}
          </div>`;
      })
      .join("");
    return `<div class="panel">
        <div class="panel-head">
          <span>Work documents</span>
          <button class="secondary" data-action="collapse" title="Collapse">▾</button>
        </div>
        ${rows}
        <button class="secondary" data-action="create-doc">New document</button>
      </div>`;
  }

  wireEvents() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    shadow
      .querySelector("[data-action='create-doc']")
      ?.addEventListener("click", (/** @type {any} */ event) => {
        event.stopPropagation();
        emit(this, "workdoc-create", undefined);
      });
    for (const row of shadow.querySelectorAll("[data-doc]")) {
      row.addEventListener("click", (/** @type {any} */ event) => {
        event.stopPropagation();
        emit(this, "workdoc-open", {
          docId: /** @type {string} */ (row.getAttribute("data-doc")),
        });
      });
    }
  }
}

customElements.define("noflo-project-corner", FlowProjectCorner);
