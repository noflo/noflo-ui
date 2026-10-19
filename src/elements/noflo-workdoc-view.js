/**
 * @file Work document view (work document #9, #28): the document's primary
 * element — read and edit states, the title field, the body as a
 * collaborative CodeMirror surface, and the immutable update thread with
 * its always-ready composer at the bottom.
 *
 * The body binding is the component code editor's pattern: `yCollab` over
 * the mirror document's workdoc Y.Text — remote edits arrive through the
 * y-update stream and appear live; local transactions relay out as
 * `setWorkDocBody` binary-update intents (the transaction's beforeState
 * diff), so the engine's authoritative buffer integrates the SAME items
 * and its echo reconciles every mirror idempotently. The Glass has no
 * write authority; the engine applies the update through the same intent
 * dispatch as every other mutation.
 *
 * The thread is the immutable record (work document #12's rules): the
 * composer at the bottom posts entries via `updateWorkDoc` — append-only,
 * attributed, materialized one-to-one as the board's comments.
 */

import { emit } from "../events.js";
import { codeEditorTheme } from "./noflo-code-editor.js";

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
    /** The collaborative body surface: the mirror's Y.Text. */
    this._ytext = null;
    /** The vendored CodeMirror surface, injected at open. */
    this._cm = null;
    /** @type {any} */
    this._view = null;
    /** @type {((update: Uint8Array, origin: any) => void) | null} */
    this._docUpdate = null;
    /** @type {any} */
    this._conf = null;
    /** Read is the default state; editing swaps the body to the editor. */
    this._editing = false;
  }

  /**
   * Opens the document view (work document #9).
   *
   * @param {Object} options
   * @param {{ id: string, title: string, scope: string, pendingScope?: string, boardId?: number | string | null, edited?: number, updates?: any[] }} options.doc
   * @param {any} options.ytext The mirror's content Y.Text for this document.
   * @param {any} options.cm The vendored CodeMirror surface.
   * @param {boolean} [options.editing] Open directly in edit mode (fresh
   *   documents: naming is the whole prompt, the body is the point).
   */
  open({ doc, ytext, cm, editing = false }) {
    this._doc = doc;
    this._ytext = ytext;
    this._cm = cm;
    // A freshly created document lands in edit mode: naming it is the
    // whole prompt — writing the body is the point (work document #9)
    this._editing = editing;
    this.hidden = false;
    this.render();
  }

  /** Closes the view and tears the collaborative binding down. */
  close() {
    this._teardown();
    this._doc = null;
    this._ytext = null;
    this._cm = null;
    this.hidden = true;
    this.render();
  }

  /** Swaps between the read and edit states; render owns the binding. */
  toggleEdit() {
    this._editing = !this._editing;
    if (!this._editing) this._teardownEditor();
    this.render();
  }

  /**
   * Binds the collaborative editor to the mirror's Y.Text (work document
   * #29's binding, per the code editor's documented pitfalls).
   */
  _bindEditor() {
    if (this._view) return;
    if (!this._cm || !this._ytext) return;
    const host = /** @type {any} */ (this.shadowRoot).querySelector(".body");
    if (!host) return;
    const plugins = this._cm.yCollab(this._ytext);
    this._view = new this._cm.EditorView({
      doc: this._ytext.toString(),
      extensions: [
        ...codeEditorTheme(this._cm),
        this._cm.basicSetup,
        this._cm.markdown(),
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
      emit(this, "workdoc-body-update", {
        docId: this._doc.id,
        update,
      });
    };
    this._ytext.doc.on("update", this._docUpdate);
  }

  /** Unbinds the collaborative editor. */
  _teardownEditor() {
    if (this._ytext?.doc && this._docUpdate) {
      this._ytext.doc.off("update", this._docUpdate);
    }
    this._docUpdate = null;
    this._view?.destroy();
    this._view = null;
    this._conf = null;
  }

  /**
   * Refreshes the open view's metadata from the replica (work document
   * #9): the thread, title, scope state, and board number — targeted
   * updates, never touching the collaborative editor mid-typing.
   *
   * @param {{ title?: string, scope?: string, pendingScope?: string, boardId?: number | string | null, signature?: string, updates?: any[] }} next
   */
  refresh(next) {
    if (!this._doc) return;
    this._doc.title = next?.title ?? this._doc.title;
    this._doc.scope = next?.scope ?? this._doc.scope;
    this._doc.pendingScope = next?.pendingScope;
    this._doc.boardId = next?.boardId ?? null;
    this._doc.signature = next?.signature;
    this._doc.updates = next?.updates ?? this._doc.updates;
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    if (!shadow.innerHTML) return;
    // Targeted: the thread block and the head's badges
    const thread = /** @type {HTMLElement} */ (shadow.querySelector(".thread"));
    if (thread) {
      const updates = this._doc.updates ?? [];
      const list = updates
        .map(
          (/** @type {any} */ update) => `<div class="update">
              <span class="update-meta">#${update.id} · ${escapeHtml(
                String(update.author ?? "").slice(0, 8),
              )} · ${new Date(update.created ?? 0).toLocaleString()}</span>
              <div class="update-content">${this._linkify(update.content ?? "")}</div>
            </div>`,
        )
        .join("");
      thread.innerHTML = `<div class="thread-head">Updates — append-only, materialized as the board's comments</div>${list}`;
    }
    const head = /** @type {HTMLElement} */ (shadow.querySelector(".head"));
    if (head) {
      const scopeLabel = this._doc.pendingScope
        ? `${this._doc.scope} → ${this._doc.pendingScope} (requested)`
        : this._doc.scope;
      const badge = head.querySelector(".badge");
      if (badge) {
        badge.className = `badge ${escapeHtml(this._doc.scope)}`;
        badge.textContent = scopeLabel;
      }
      const board = head.querySelector(".doc-board");
      if (this._doc.boardId && !board) {
        const id = head.querySelector(".doc-id");
        id?.insertAdjacentHTML(
          "afterend",
          `<span class="doc-board" title="Materialized on the board">#${escapeHtml(String(this._doc.boardId))}</span>`,
        );
      }
      // The scope-request affordance and the provenance badge track the
      // replica's governance state (work document #9 updates #10, #13)
      const request = /** @type {HTMLElement | null} */ (
        head.querySelector("[data-action='request-scope']")
      );
      if (request) {
        request.hidden = !this._canRequestScope(this._doc);
      }
      const sig = head.querySelector(".doc-sig");
      if (sig) {
        sig.textContent = this._signatureLabel(this._doc);
        sig.className = `doc-sig ${this._doc.signature === "present" ? "signed" : ""}`;
      }
    }
  }

  /**
   * Renders content text with the traceability links (work document #9
   * §5): `[[node:<id>]]` and `[[component:<name>]]` references become
   * links — the click emits `workdoc-link` and the Glass routes (the
   * component screen; the graph screen centered on the node). The text is
   * escaped first; the pattern match runs on escaped text, so entity
   * references can never smuggle markup into the anchor.
   *
   * @param {string} text Raw content text.
   * @returns {string} HTML.
   */
  _linkify(text) {
    const escaped = escapeHtml(text ?? "");
    return escaped.replace(
      /\[\[(node|component):([^\]]+)\]\]/g,
      (_match, kind, id) =>
        `<a class="doc-link" data-kind="${kind}" data-id="${id}">${kind}:${id}</a>`,
    );
  }

  /**
   * The scope-request affordance's visibility (work document #9 update
   * #10): a proposed document with no pending request can request
   * activation — the intent records the request, the board decides it.
   *
   * @param {{ scope?: string, pendingScope?: string }} doc
   * @returns {boolean}
   */
  _canRequestScope(doc) {
    return doc.scope === "proposed" && !doc.pendingScope;
  }

  /**
   * The provenance badge's text (work document #9 update #13): the
   * board holds a signed copy ("board-signed") or the document is local
   * state only ("local only") — the app never signs; signing happens
   * where the author's identity lives, at materialization.
   *
   * @param {{ signature?: string }} doc
   * @returns {string}
   */
  _signatureLabel(doc) {
    return doc.signature === "present" ? "board-signed" : "local only";
  }

  /** Tears everything down (close). */
  _teardown() {
    this._teardownEditor();
  }

  /** The mirror confirmed body edits: nothing to do — the yCollab
   * binding renders the replica's state live. */

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
    const updates = doc.updates ?? [];
    const thread = updates
      .map(
        (/** @type {any} */ update) => `<div class="update">
            <span class="update-meta">#${update.id} · ${escapeHtml(
              String(update.author ?? "").slice(0, 8),
            )} · ${new Date(update.created ?? 0).toLocaleString()}</span>
            <div class="update-content">${this._linkify(update.content ?? "")}</div>
          </div>`,
      )
      .join("");
    shadow.innerHTML = `
      <style>
        :host {
          /* The full screen (work document #62): the workdoc editor is a
             top-level surface, equal to the graph editor. The corners are
             app chrome above it; the content reserves the chip strips'
             footprint and may flow under an expanded accordion —
             dismissed in one interaction, per #62 update #1 */
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
        .column {
          flex: 1;
          display: flex;
          flex-direction: column;
          /* Chip-strip clearance: the context chip above, the two bottom
             corner chips below (work document #62 update #2) */
          padding: 56px 24px 64px;
          max-width: min(760px, calc(100vw - 48px));
          margin: 0 auto;
          width: 100%;
          gap: 10px;
        }
        .head {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
        }
        .head input.title {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: inherit;
          font: inherit;
          font-size: 14px;
          padding: 2px 4px;
          border-radius: var(--ui-radius, 6px);
        }
        .head input.title:focus {
          outline: 1px solid var(--ui-accent, rgb(90, 200, 250));
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
        .doc-id { font-size: 10px; opacity: 0.6; }
        .doc-sig {
          font-size: 10px;
          flex-shrink: 0;
          padding: 1px 6px;
          border-radius: 3px;
          background: color-mix(in srgb, var(--ui-muted, #889) 20%, transparent);
          color: var(--ui-muted, #889);
        }
        .doc-sig.signed {
          background: color-mix(in srgb, var(--ui-age-calm, #7ee3a0) 20%, transparent);
          color: var(--ui-age-calm, #7ee3a0);
        }
        .doc-link {
          color: var(--ui-accent, rgb(90, 200, 250));
          text-decoration: underline;
          cursor: pointer;
        }
        .body {
          flex: 1;
          overflow: auto;
          padding: 14px;
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .body .cm-editor { height: 100%; background: transparent; }
        .body .cm-editor.cm-focused { outline: none; }
        .thread {
          border-top: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          max-height: 40%;
          overflow: auto;
          padding: 8px 14px;
        }
        .thread .thread-head {
          font-size: 10px;
          opacity: 0.6;
          margin-bottom: 6px;
        }
        .update {
          padding: 4px 0;
          border-bottom: 1px solid color-mix(in srgb, var(--ui-panel-border, rgb(58, 63, 72)) 40%, transparent);
        }
        .update-meta { font-size: 10px; opacity: 0.6; }
        .update-content { font-size: 12px; white-space: pre-wrap; }
        .composer {
          display: flex;
          gap: 8px;
          padding: 8px 14px;
          border-top: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          align-items: flex-end;
        }
        .composer textarea {
          flex: 1;
          resize: none;
          height: 44px;
          background: transparent;
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: var(--ui-radius, 6px);
          color: inherit;
          font: inherit;
          font-size: 12px;
          padding: 6px 8px;
          outline: none;
        }
        .composer textarea:focus { outline: 1px solid var(--ui-accent, rgb(90, 200, 250)); }
      </style>
      <div class="column">
      <div class="head">
        <input class="title" value="${escapeHtml(doc.title)}" aria-label="Document title">
        <span class="doc-id" title="Stable work document id">${escapeHtml(doc.id.slice(0, 8))}</span>
        ${doc.boardId ? `<span class="doc-board" title="Materialized on the board">#${escapeHtml(String(doc.boardId))}</span>` : ""}
        <span class="badge ${escapeHtml(doc.scope)}">${escapeHtml(scopeLabel)}</span>
        <span class="doc-sig ${doc.signature === "present" ? "signed" : ""}" title="${doc.signature === "present" ? "The board holds an Ed25519-signed copy" : "Not yet materialized — unsigned local state"}">${this._signatureLabel(doc)}</span>
        <button class="secondary" data-action="request-scope" title="Request the board activate this document" ${this._canRequestScope(doc) ? "" : "hidden"}>Request activation</button>
        <button class="secondary" data-action="toggle-edit" title="${this._editing ? "Stop editing" : "Edit body"}">${this._editing ? "Read" : "Edit"}</button>
      </div>
      <div class="body"></div>
      <div class="thread">
        <div class="thread-head">Updates — append-only, materialized as the board's comments</div>
        ${thread || `<div class="update-meta">No updates yet.</div>`}
      </div>
      <div class="composer">
        <textarea class="composer-input" placeholder="Post an update… (immutable once posted)"></textarea>
        <button data-action="post">Post update</button>
      </div>
      </div>
    `;
    // The body: read state renders the mirror's text with the
    // traceability links (work document #9 §5); edit state binds the
    // collaborative editor (the binding targets the .body host)
    if (this._editing && !this._view) {
      this._bindEditor();
    } else if (!this._editing) {
      const body = /** @type {HTMLElement} */ (shadow.querySelector(".body"));
      if (body && this._ytext) {
        body.innerHTML = this._linkify(this._ytext.toString());
      }
    }
    const titleInput = /** @type {HTMLInputElement} */ (
      shadow.querySelector("input.title")
    );
    // A fresh, untitled document opened in edit mode: the title is the
    // first thing to replace
    if (
      this._editing &&
      this._doc.title === "Untitled" &&
      document.activeElement === null
    ) {
      titleInput.focus();
      titleInput.select();
    }
    titleInput.addEventListener("change", () => {
      const title = titleInput.value.trim();
      if (title && title !== doc.title) {
        emit(this, "workdoc-title", { docId: doc.id, title });
      }
    });
    titleInput.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
      if (e.key === "Enter") titleInput.blur();
    });
    shadow
      .querySelector("[data-action='toggle-edit']")
      ?.addEventListener("click", () => this.toggleEdit());
    shadow
      .querySelector("[data-action='request-scope']")
      ?.addEventListener("click", () => {
        emit(this, "workdoc-scope", { docId: doc.id, scope: "active" });
      });
    // The traceability links (work document #9 §5): one delegated
    // listener — thread entries and the read-state body re-render freely
    shadow.addEventListener("click", (/** @type {any} */ event) => {
      const link = event.target?.closest?.(".doc-link");
      if (!link) return;
      emit(this, "workdoc-link", {
        kind: link.getAttribute("data-kind"),
        id: link.getAttribute("data-id"),
      });
    });

    const composerInput = /** @type {HTMLTextAreaElement} */ (
      shadow.querySelector(".composer-input")
    );
    const post = () => {
      const content = composerInput.value;
      if (!content.trim()) return;
      emit(this, "workdoc-post", { docId: doc.id, content });
      composerInput.value = "";
    };
    shadow
      .querySelector("[data-action='post']")
      ?.addEventListener("click", post);

    composerInput.addEventListener(
      "keydown",
      (/** @type {KeyboardEvent} */ e) => {
        // Ctrl/Cmd+Enter posts; plain Enter inserts a newline
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          post();
        }
      },
    );
  }
}

customElements.define("noflo-workdoc-view", FlowWorkDocView);
