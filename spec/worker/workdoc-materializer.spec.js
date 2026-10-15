import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendWorkDocUpdate,
  createProjectDoc,
  createWorkDoc,
  getWorkDoc,
  requestWorkDocScope,
} from "../../src/crdt/ProjectDoc.js";
import {
  materializedBody,
  WorkDocMaterializer,
} from "../../src/worker/WorkDocMaterializer.js";
import * as Y from "../../vendor/yjs.js";

const AUTHOR = "a".repeat(32);
const OTHER = "b".repeat(32);

/**
 * A fake rngit transport: records requests, signs with a fake key, and
 * answers like the server does (create/propose assign the next number).
 */
function fakeTransport() {
  /** @type {any[]} */
  const requests = [];
  let nextId = 7;
  return {
    requests,
    /** @type {any[]} */
    errors: [],
    sign: async (/** @type {Uint8Array} */ bytes) =>
      new Uint8Array([1, 2, 3, bytes.length & 0xff]),
    send: async (/** @type {any} */ fields) => {
      requests.push(fields);
      switch (fields.operation) {
        case "propose":
        case "create":
          return {
            id: nextId++,
            scope: fields.operation === "propose" ? "proposed" : "active",
          };
        case "comment":
          return { id: fields.doc_id };
        case "activate":
        case "complete":
          return {
            id: fields.doc_id,
            scope: fields.operation === "activate" ? "active" : "completed",
          };
        default:
          return null;
      }
    },
  };
}

/** A session: project doc + materializer over the fake transport. */
function session(author = AUTHOR) {
  const doc = createProjectDoc("p");
  const transport = fakeTransport();
  const materializer = new WorkDocMaterializer({
    doc,
    transport,
    authorIdentityHash: author,
  });
  return { doc, transport, materializer };
}

function createRecord(doc, { author = AUTHOR, title = "The plan" } = {}) {
  const record = createWorkDoc(doc, { title, author, content: "First draft." });
  return /** @type {Y.Map<any>} */ (record);
}

describe("work document materializer (work document #9, step C)", () => {
  it("proposes an unmaterialized document with the marker line and signature", async () => {
    const { doc, transport, materializer } = session();
    const record = createRecord(doc);
    const reports = await materializer.syncDoc(record.get("id"));
    assert.equal(transport.requests.length, 1);
    const request = transport.requests[0];
    assert.equal(request.operation, "propose");
    assert.equal(request.title, "The plan");
    // The marker line carries the CRDT id so every client can reference
    // the same document (work document #9 update #9)
    assert.match(
      request.content,
      new RegExp(`^noflo-ui-work-doc: ${record.get("id")}`),
    );
    assert.match(request.content, /First draft\./);
    assert.ok(request.signature, "signed");
    // Reconciliation: the board's number and scope adopt
    assert.equal(record.get("boardId"), 7);
    assert.equal(record.get("scope"), "proposed");
    assert.deepEqual(reports, [
      { docId: record.get("id"), action: "proposed" },
    ]);
  });

  it("pushes thread entries beyond the watermark as comments", async () => {
    const { doc, transport, materializer } = session();
    const record = createRecord(doc);
    const docId = record.get("id");
    await materializer.syncDoc(docId);
    // Two local entries after the first materialization
    appendWorkDocUpdate(doc, docId, {
      author: AUTHOR,
      content: "Revision two.",
    });
    appendWorkDocUpdate(doc, docId, {
      author: AUTHOR,
      content: "Revision three.",
    });
    transport.requests.length = 0;
    const reports = await materializer.syncDoc(docId);
    const comments = transport.requests.filter(
      (/** @type {any} */ r) => r.operation === "comment",
    );
    assert.equal(comments.length, 2, "both pending entries push");
    assert.deepEqual(comments[0].content, "Revision two.");
    assert.equal(comments[1].content, "Revision three.");
    assert.equal(
      record.get("boardComments"),
      3,
      "the watermark advances to the thread length",
    );
    assert.equal(reports.filter((r) => r.action === "commented").length, 2);
    // Nothing pending: a re-sync pushes nothing
    transport.requests.length = 0;
    await materializer.syncDoc(docId);
    assert.equal(transport.requests.length, 0, "no duplicate pushes");
  });

  it("scope requests ride the rngit commands; the response is the state", async () => {
    const { doc, transport, materializer } = session();
    const record = createRecord(doc);
    const docId = record.get("id");
    await materializer.syncDoc(docId);
    requestWorkDocScope(doc, docId, "active");
    transport.requests.length = 0;
    const reports = await materializer.syncDoc(docId);
    const activation = transport.requests.find(
      (/** @type {any} */ r) => r.operation === "activate",
    );
    assert.ok(activation, "the activate command pushes");
    assert.equal(activation.doc_id, 7);
    assert.equal(record.get("scope"), "active", "the response is the state");
    assert.equal(record.get("pendingScope"), undefined, "the request cleared");
    assert.ok(reports.some((r) => r.action === "activated"));
  });

  it("the author's edits push; another identity's edits skip with a report", async () => {
    const { doc, transport, materializer } = session(AUTHOR);
    const record = createRecord(doc);
    const docId = record.get("id");
    await materializer.syncDoc(docId);
    // The author edits body and title
    const content = record.get("content");
    content.delete(0, content.length);
    content.insert(0, "Rewritten body.");
    record.set("title", "The real plan");
    transport.requests.length = 0;
    let reports = await materializer.syncDoc(docId);
    const edit = transport.requests.find(
      (/** @type {any} */ r) => r.operation === "edit",
    );
    assert.ok(edit, "the author's edit pushes");
    assert.equal(edit.title, "The real plan");
    assert.match(edit.content, /Rewritten body/);
    assert.equal(record.get("boardTitle"), "The real plan");
    assert.ok(reports.some((r) => r.action === "edited"));

    // Another identity's edit is skipped and reported, not pushed
    record.set("authors", [OTHER]);
    record.set("title", "Someone else's title");
    transport.requests.length = 0;
    reports = await materializer.syncDoc(docId);
    assert.equal(
      transport.requests.some((/** @type {any} */ r) => r.operation === "edit"),
      false,
      "another identity's edit never pushes",
    );
    assert.ok(
      reports.some(
        (r) => r.action === "skipped" && /author/.test(r.detail ?? ""),
      ),
    );
  });

  it("a transport failure reports without throwing out of syncAll", async () => {
    const doc = createProjectDoc("p");
    const transport = fakeTransport();
    transport.send = async () => {
      throw new Error("Not allowed");
    };
    const materializer = new WorkDocMaterializer({
      doc,
      transport,
      authorIdentityHash: AUTHOR,
    });
    createRecord(doc);
    const reports = await materializer.syncAll();
    assert.ok(
      reports.some(
        (r) => r.action === "skipped" && /Not allowed/.test(r.detail ?? ""),
      ),
      "the failure surfaces as a report",
    );
  });

  it("the materialized body carries the marker line (update #9)", () => {
    assert.equal(
      materializedBody("a".repeat(32), "Hello."),
      `noflo-ui-work-doc: ${"a".repeat(32)}\n\nHello.`,
    );
  });
});
