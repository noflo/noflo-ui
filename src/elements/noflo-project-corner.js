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

import icons from "../../vendor/fontawesome-icons.js";
import { FlowCornerElement } from "./corner-element.js";

/** The Font Awesome glyph for a named icon in the vendor map.
 * @param {string} name
 * @returns {string}
 */
function icon(name) {
  return `<i class="fa" aria-hidden="true">${/** @type {any} */ (icons())[name] ?? ""}</i>`;
}

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
import { NofloCollaboratorsPanel } from "./noflo-collaborators-panel.js";

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
    /** The project's schemas (work document #57 update #1). */
    /** @type {Array<{ name: string, provenance: string }>} */
    this._schemas = [];
    /** @type {Array<{ identityHash: string, name?: string, presence?: string, role?: string, self?: boolean }>} The Collaborators roster (work document #61). */
    this._collaborators = [];
    /** @type {NofloCollaboratorsPanel | null} The Collaborators panel
     * (work document #61). */
    this._collaboratorsPanel = null;
    /** Corners hide when there is nothing to show (work document #28). */
    this._visible = false;
    this.chipTitle = "Project work documents";
    this.panelSide = "left";
  }

  /**
   * Refreshes in place with the project's work documents (work document
   * #9): newest edit first, the proposed scope carrying its own
   * indicator (agents may only propose — the distinction is visible).
   *
   * @param {Array<{ id: string, title: string, scope: string, pendingScope?: string, boardId?: number | string | null, edited: number }>} docs
   */
  /**
   * Refreshes in place with the project's schemas (work document #57
   * update #1): the rows the Schemas accordion lists, with their
   * provenance.
   *
   * @param {Array<{ name: string, provenance: string }>} schemas
   */
  setSchemas(schemas) {
    this._schemas = /** @type {Array<{ name: string, provenance: string }>} */ (
      schemas ?? []
    );
    this.render();
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
        .row {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .row input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: var(--ui-radius, 6px);
          color: inherit;
          font: inherit;
          font-size: 11px;
          padding: 4px 6px;
          outline: none;
        }
        .row input:focus {
          outline: 1px solid var(--ui-accent, rgb(90, 200, 250));
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
    // The degradation ladder's count: the active documents' number is
    // what the chip summarizes — it survives minification when the
    // words drop
    const peopleCount = this._collaborators.filter(
      (c) => !c.self,
    ).length;
    const peopleSeg =
      peopleCount > 0
        ? `<span class="seg" title="Project collaborators">${icon("user-group")}<span class="label">${peopleCount} collaborator${peopleCount === 1 ? "" : "s"}</span><span class="count">${peopleCount}</span></span>`
        : "";
    return `<span class="seg" title="The project's work documents">${icon("file-lines")}<span class="label">${parts.join(" · ")}</span><span class="count">${active}</span></span>${peopleSeg}`;
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
   * Sets the project's rngit remote (work document #60's project scope):
   * rendered in the materialization row.
   *
   * @param {string} url
   */
  /**
   * Sets the Collaborators panel's roster (work document #61): the
   * avatars, presence, and the pending contacts.
   *
   * @param {Array<{ identityHash: string, name?: string, presence?: string, role?: string, self?: boolean }>} collaborators
   */
  setCollaborators(collaborators) {
    this._collaborators = collaborators;
    const panel = this._collaboratorsPanel;
    if (panel) panel.setCollaborators(collaborators);
    this.render();
  }

  /**
   * Appends a chat response to a collaborator's thread (work document #61).
   *
   * @param {{ identityHash?: string, text: string, role: string }} payload
   */
  addChatResponse(payload) {
    const identityHash = payload.identityHash ?? "";
    if (!identityHash) return;
    const panel = this._collaboratorsPanel;
    if (panel) {
      panel.addThreadMessage(identityHash, {
        text: payload.text,
        role: payload.role,
      });
    }
  }

  setRngitRemote(/** @type {string} */ url) {
    this._rngitRemote = url ?? "";
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
        <div class="row">
          <input id="rngit-remote" placeholder="rns://<hash>/<group>/<repo>" value="${escapeHtml(
            this._rngitRemote ?? "",
          )}">
          <button data-action="save-remote">Set rngit remote</button>
        </div>
        <div class="hint">The rngit repository the work documents materialize to. Project state: every peer sees it.</div>
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

        <details><summary>Schemas</summary>
          ${
            this._schemas.length > 0
              ? this._schemas
                  .map(
                    (schema) => `
          <div class="doc-row">
            <span class="grow">${escapeHtml(schema.name)}</span>
            <span class="badge ${schema.provenance === "authored" ? "active" : "pending"}">${escapeHtml(schema.provenance)}</span>
            <button class="secondary" data-schema-open="${escapeHtml(schema.name)}">Open</button>
          </div>`,
                  )
                  .join("")
              : '<div class="hint">No project schemas yet.</div>'
          }
          <button class="secondary" data-action="create-schema">New schema</button>
          <div class="hint">JSON Schema 2020-12 artifacts the project's ports and metadata declare against. Referenced by signatures; saved as project state.</div>
        </details>      </div>`;
  }

  wireEvents() {
    for (const shadow of this._eventRoots()) {
      shadow
        .querySelector("[data-action='create-doc']")
        ?.addEventListener("click", (/** @type {any} */ event) => {
          event.stopPropagation();
          emit(this, "workdoc-create", undefined);
        });
      shadow
        .querySelector("[data-action='create-schema']")
        ?.addEventListener("click", (/** @type {any} */ event) => {
          event.stopPropagation();
          emit(this, "schema-create", undefined);
        });
      for (const button of shadow.querySelectorAll("[data-schema-open]")) {
        button.addEventListener("click", (/** @type {any} */ event) => {
          event.stopPropagation();
          emit(this, "schema-open", {
            name: String(button.getAttribute("data-schema-open") ?? ""),
          });
        });
      }
      shadow
        .querySelector("[data-action='save-remote']")
        ?.addEventListener("click", (/** @type {any} */ event) => {
          event.stopPropagation();
          const input = /** @type {HTMLInputElement} */ (
            shadow.querySelector("#rngit-remote")
          );
          emit(this, "workdoc-repo", { url: input.value.trim() });
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
}

customElements.define("noflo-project-corner", FlowProjectCorner);
