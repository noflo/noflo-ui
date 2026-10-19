/**
 * @file The work-document materializer (work document #9, step C): the push
 * side of the CRDT → rngit synchronization, with the "theirs" reconciliation.
 *
 * The model (work document #9's updates #4–#15):
 *  - The CRDT is the live, collaborative surface; rngit is the governed
 *    record. Materialization pushes local state INTO the board; the board's
 *    decisions (scope, ids, signatures) flow back as reconciliations that
 *    overwrite the governed fields — "theirs", always.
 *  - The materializer signs as the acting identity (ideally the document's
 *    author; the operator of the rngit connection otherwise). Authorship on
 *    the board follows the pushing identity.
 *  - The materialized body carries the `noflo-ui-work-doc: <id>` marker
 *    line, so every client can reference the same document (update #9).
 *  - The thread is append-only on both sides: the materializer pushes local
 *    entries beyond the ordinal watermark and never touches board entries.
 *  - Author rights (the rngit manual): only the creator edits a document's
 *    body/title — an edit for a document authored by another identity is
 *    skipped and reported, never silently dropped.
 *
 * The transport seam abstracts the rngit client protocol (the link,
 * identify, msgpack request/response, and signing) — the real transport
 * wraps the engine worker's RNS instance; tests inject fakes.
 */

import * as Y from "../../vendor/yjs.js";

/**
 * @typedef {Object} MaterializerTransport
 * @property {(bytes: Uint8Array) => Promise<Uint8Array>} sign Sign with the
 *   pushing identity.
 * @property {(fields: Record<string, any>) => Promise<any>} send One
 *   `/mgmt/work` request; resolves the decoded payload, throws on a
 *   non-OK status.
 * @property {() => Promise<void>} [connect] Establishes the link when the
 *   transport manages one (the real rngit transport; fakes may omit it).
 */

/**
 * @typedef {Object} MaterializerReport
 * @property {string} docId
 * @property {"proposed" | "commented" | "edited" | "activated" | "completed" | "fetched" | "skipped"} action
 * @property {string} [detail] The narration-relevant detail (why a step
 *   was skipped, for the #34 channel).
 */

/** The marker line prefix (work document #9 update #9). */
const MARKER_PREFIX = "noflo-ui-work-doc: ";

/**
 * The materialized body: the marker line, then the author's content.
 *
 * @param {string} docId
 * @param {string} content
 * @returns {string}
 */
export function materializedBody(docId, content) {
  return `${MARKER_PREFIX}${docId}\n\n${content ?? ""}`;
}

export class WorkDocMaterializer {
  /**
   * @param {Object} options
   * @param {Y.Doc} options.doc The project document.
   * @param {MaterializerTransport} options.transport The rngit protocol
   *   surface (sign + send).
   * @param {string} options.authorIdentityHash The pushing identity —
   *   edits require it to be the document's author.
   */
  constructor({ doc, transport, authorIdentityHash }) {
    this.doc = doc;
    this.transport = transport;
    this.authorIdentityHash = authorIdentityHash;
    /** Whether the transport's link is established (the connect narration
     * fires once). */
    this.connected = false;
  }

  /**
   * Establishes the transport's link (idempotent): the connect narration
   * is the caller's.
   *
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.connected) return;
    if (this.transport.connect) await this.transport.connect();
    this.connected = true;
  }

  /**
   * Synchronizes one document: computes the pending operations from the
   * record's state, pushes them in order, and reconciles the responses.
   *
   * @param {string} docId
   * @returns {Promise<MaterializerReport[]>}
   */
  async syncDoc(docId) {
    /** @type {MaterializerReport[]} */
    const reports = [];
    const record = /** @type {Y.Map<any> | undefined} */ (
      this.doc.getMap("workdocs").get(docId)
    );
    if (!record) return reports;
    const plain = record.toJSON();

    // Unmaterialized document: propose it (the CRDT's documents start in
    // the proposed scope, matching rngit's propose permission)
    if (!plain.boardId) {
      const body = materializedBody(docId, plain.content ?? "");
      const signature = await this.transport.sign(
        new TextEncoder().encode(body.trim()),
      );
      const response = await this.transport.send({
        operation: "propose",
        title: plain.title,
        content: body.trim(),
        format: "markdown",
        signature,
      });
      this._reconcile(record, response);
      // The propose carries the document's current state: the thread
      // entries it included are materialized with it (the watermark
      // starts at the propose's thread length, not zero)
      record.set("boardComments", (plain.updates ?? []).length);
      // The board accepted an Ed25519-signed propose: the record mirrors
      // the provenance state (work document #9 update #13)
      record.set("signature", "present");
      reports.push({ docId, action: "proposed" });
    }

    // Thread entries beyond the watermark: append-only comments, in order.
    // The watermark reads from the record AFTER the propose branch — the
    // propose materializes the thread it carried, and the stale method-
    // entry snapshot must not double-push those entries
    const entries = plain.updates ?? [];
    const watermark = record.get("boardComments") ?? 0;
    for (let index = watermark; index < entries.length; index++) {
      const entry = entries[index];
      await this.transport.send({
        operation: "comment",
        doc_id: plain.boardId,
        scope: plain.scope,
        content: entry.content ?? "",
        format: "markdown",
      });
      record.set("boardComments", index + 1);
      reports.push({ docId, action: "commented" });
    }

    // Body/title edits: only the document's author may push them (the
    // rngit manual's author rights). Another identity's edit is skipped
    // and reported — the operator's authorship does not extend to
    // rewriting someone else's document.
    const isAuthor = (plain.authors ?? [])[0] === this.authorIdentityHash;
    const materializedTitle = plain.boardTitle ?? "";
    const titleChanged = plain.title !== materializedTitle;
    const bodyChanged = (plain.content ?? "") !== (plain.boardContent ?? "");
    if ((titleChanged || bodyChanged) && plain.boardId) {
      if (!isAuthor) {
        reports.push({
          docId,
          action: "skipped",
          detail: "edits belong to the document's author",
        });
      } else {
        const body = materializedBody(docId, plain.content ?? "");
        const signature = await this.transport.sign(
          new TextEncoder().encode(body.trim()),
        );
        await this.transport.send({
          operation: "edit",
          doc_id: plain.boardId,
          scope: plain.scope,
          content: body.trim(),
          title: plain.title,
          signature,
        });
        record.set("boardTitle", plain.title);
        record.set("boardContent", plain.content ?? "");
        record.set("signature", "present");
        reports.push({ docId, action: "edited" });
      }
    }

    // Scope requests: the rngit commands move the document; the response
    // is the state ("theirs")
    if (plain.pendingScope && plain.boardId) {
      const operation =
        plain.pendingScope === "completed"
          ? "complete"
          : plain.pendingScope === "active"
            ? "activate"
            : null;
      if (operation) {
        await this.transport.send({
          operation,
          doc_id: plain.boardId,
        });
        // The command's outcome is the requested scope: the board moved
        // the document (a refusal throws, caught upstream)
        this._reconcile(record, {
          id: plain.boardId,
          scope: plain.pendingScope,
        });
        reports.push({
          docId,
          action: operation === "complete" ? "completed" : "activated",
        });
      }
    }

    return reports;
  }

  /**
   * The "theirs" reconciliation: the board's response overwrites the
   * governed fields. The assigned number becomes the local `boardId`; the
   * scope adopts the board's; a pending request that the board confirmed
   * clears.
   *
   * @param {Y.Map<any>} record
   * @param {any} response The decoded rngit response ({ id, scope }).
   */
  _reconcile(record, response) {
    if (!response) return;
    if (response.id !== undefined) {
      record.set("boardId", response.id);
    }
    if (response.scope !== undefined) {
      record.set("scope", response.scope);
      if (record.get("pendingScope") === response.scope) {
        record.delete("pendingScope");
      }
    }
  }

  /**
   * The board → CRDT reconciliation (work document #9's "theirs" rule):
   * lists the board's documents, matches them to local records by the
   * marker line, pulls thread entries the board holds beyond the local
   * watermark, adopts the board's scope decisions, and detects deletions
   * (a document gone from the board leaves the CRDT too — its number
   * recycles, so absence is absence, not a tombstone).
   *
   * New board documents without a marker line (created rngit-side) are
   * outside this pass — importing them is a later decision.
   *
   * @returns {Promise<MaterializerReport[]>}
   */
  async reconcileFromBoard() {
    /** @type {MaterializerReport[]} */
    const reports = [];
    const workdocs = this.doc.getMap("workdocs");
    const listing = await this.transport.send({
      operation: "list",
      scope: "all",
    });
    const boardDocs = [
      ...(listing?.active ?? []),
      ...(listing?.proposed ?? []),
      ...(listing?.completed ?? []),
    ];

    // Adopt the board's state per matched document
    for (const boardDoc of boardDocs) {
      const marker = /noflo-ui-work-doc: ([0-9a-f]{32})/.exec(
        boardDoc.content ?? "",
      );
      if (!marker) continue;
      const docId = marker[1];
      const record = /** @type {Y.Map<any> | undefined} */ (
        workdocs.get(docId)
      );
      if (!record) continue;
      const plain = record.toJSON();
      // The board's listing carries the signed record: provenance mirrors
      // on reconciliation (work document #9 update #13)
      record.set("signature", "present");

      // The board's scope is the state ("theirs")
      if (boardDoc.scope && boardDoc.scope !== plain.scope) {
        record.set("scope", boardDoc.scope);
        if (record.get("pendingScope") === boardDoc.scope) {
          record.delete("pendingScope");
        }
        reports.push({
          docId,
          action: "activated",
          detail: `the board moved it to ${boardDoc.scope}`,
        });
      }

      // The board's comments beyond the local watermark: pull them into
      // the thread, attributed to their board authors
      const boardComments = boardDoc.comments ?? [];
      const localUpdates = plain.updates ?? [];
      const watermark = plain.boardComments ?? 0;
      const localMaterialized = plain.boardComments ?? 0;
      if (boardComments.length > localMaterialized) {
        const updates = record.get("updates");
        for (
          let index = localMaterialized;
          index < boardComments.length;
          index++
        ) {
          const comment = boardComments[index];
          updates.push([
            {
              id: localUpdates.length + 1,
              created: (comment.created ?? 0) * 1000,
              author: comment.author ?? "",
              content: comment.content ?? "",
            },
          ]);
        }
        record.set("boardComments", boardComments.length);
        record.set("edited", Date.now());
        reports.push({
          docId,
          action: "fetched",
          detail: `${boardComments.length - localMaterialized} update${
            boardComments.length - localMaterialized === 1 ? "" : "s"
          } from the board`,
        });
      }
    }

    // Deletions: a local record whose board document vanished disappears
    // (work document #9 update #5 — the number recycles, absence is final)
    const boardIds = new Set(
      boardDocs.map((/** @type {any} */ d) => d.meta?.author && d.id),
    );
    for (const [docId, record] of workdocs.entries()) {
      const boardId = record.toJSON().boardId;
      if (!boardId) continue;
      if (!boardDocs.some((/** @type {any} */ d) => d.id === boardId)) {
        workdocs.delete(docId);
        reports.push({
          docId,
          action: "skipped",
          detail: "the board no longer holds this document — removed locally",
        });
      }
    }
    return reports;
  }

  /**
   * Synchronizes every document in the collection.
   *
   * @returns {Promise<MaterializerReport[]>}
   */
  async syncAll() {
    const workdocs = this.doc.getMap("workdocs");
    /** @type {MaterializerReport[]} */
    const reports = [];
    for (const docId of workdocs.keys()) {
      try {
        reports.push(...(await this.syncDoc(docId)));
      } catch (error) {
        reports.push({
          docId,
          action: "skipped",
          detail:
            error instanceof Error ? error.message : String(error ?? "error"),
        });
      }
    }
    return reports;
  }
}
