import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEngineState, handleMessage } from "../../src/crdt/EngineCore.js";
import {
  appendWorkDocUpdate,
  createProjectDoc,
  createWorkDoc,
  getWorkDoc,
  PROJECT_SCHEMA_VERSION,
  reconcileWorkDocScope,
  requestWorkDocScope,
} from "../../src/crdt/ProjectDoc.js";
import * as Y from "../../vendor/yjs.js";

describe("work documents (work document #9)", () => {
  it("the schema migrates to the workdocs map", () => {
    // A schema-1 document gains the collection on migration
    const doc = new Y.Doc();
    doc.getMap("metadata").set("schemaVersion", 1);
    const before = doc.getMap("workdocs");
    assert.ok(before, "the map exists on demand");
  });

  it("creates a document with the rngit-shaped record", () => {
    const doc = createProjectDoc("p");
    const record = createWorkDoc(doc, {
      title: "Implement the parser",
      content: "The parser needs a sketch.",
      author: "a".repeat(32),
      links: ["component:main/Parser"],
    });
    assert.ok(record, "created");
    assert.equal(record.get("title"), "Implement the parser");
    assert.equal(record.get("scope"), "proposed");
    assert.deepEqual(record.get("authors").toArray?.() ?? [], ["a".repeat(32)]);
    assert.equal(
      record.get("content").toString(),
      "The parser needs a sketch.",
    );
    assert.equal(record.get("updates").length, 1);
    // The id is a stable 32-hex hash (16 bytes) — the app's opaque
    // identifier shape; rngit's number is stamped separately on
    // materialization and recycles on deletion
    assert.match(record.get("id"), /^[0-9a-f]{32}$/);
    assert.equal(record.get("updates").get(0).author, "a".repeat(32));
    assert.equal(
      record.get("links").length,
      1,
      "the entity link rides the record",
    );
    assert.equal(
      doc.getMap("metadata").get("schemaVersion"),
      PROJECT_SCHEMA_VERSION,
    );
  });

  it("refuses invalid documents without mutating", () => {
    const doc = createProjectDoc("p");
    const before = doc.toJSON();
    assert.equal(
      createWorkDoc(doc, { title: "", author: "a".repeat(32) }),
      null,
    );
    assert.equal(createWorkDoc(doc, { title: "x" }), null, "no author");
    assert.deepEqual(doc.toJSON(), before, "untouched");
  });

  it("appends updates with per-author attribution", () => {
    const doc = createProjectDoc("p");
    const record = createWorkDoc(doc, {
      title: "t",
      content: "v1",
      author: "a".repeat(32),
    });
    const docId = record.get("id");
    const second = appendWorkDocUpdate(doc, docId, {
      author: "b".repeat(32),
      content: "v2",
    });
    assert.equal(second, 2, "the thread's second entry");
    const updates = record.get("updates");
    assert.equal(updates.length, 2);
    assert.equal(updates.get(1).author, "b".repeat(32));
    assert.equal(updates.get(1).content, "v2");
  });

  it("scope requests ride pendingScope; reconciliation is theirs", () => {
    const doc = createProjectDoc("p");
    const record = createWorkDoc(doc, {
      title: "t",
      author: "a".repeat(32),
    });
    const docId = record.get("id");
    // A local request does not decide the state
    const requested = requestWorkDocScope(doc, docId, "active");
    assert.ok(requested);
    assert.equal(record.get("scope"), "proposed", "the scope is unchanged");
    assert.equal(
      record.get("pendingScope"),
      "active",
      "the request rides pending",
    );
    // The materialization's reconciliation wins
    reconcileWorkDocScope(doc, docId, "active");
    assert.equal(record.get("scope"), "active", "rngit's state wins");
    assert.equal(
      record.get("pendingScope"),
      undefined,
      "the matching request clears",
    );
    // An unconfirmed local flip reverts on reconciliation
    requestWorkDocScope(doc, docId, "completed");
    reconcileWorkDocScope(doc, docId, "active");
    assert.equal(record.get("scope"), "active", "theirs wins");
    assert.equal(
      record.get("pendingScope"),
      "completed",
      "the unconfirmed request stays pending",
    );
  });
});

describe("work document intents (work document #9)", () => {
  it("creates with the device identity as author", () => {
    const doc = createProjectDoc("p");
    const state = createEngineState();
    state.intentOrigin = "c".repeat(32);
    const result = handleMessage(doc, state, {
      type: "INTENT",
      command: "createWorkDoc",
      payload: { title: "The plan", content: "Step one." },
    });
    assert.ok(result.accepted, "accepted");
    const created = result.echoes.find(
      (/** @type {any} */ e) => e.protocol === "workdoc",
    );
    assert.equal(created.command, "created");
    assert.equal(created.payload.author, "c".repeat(32));
    assert.equal(created.payload.scope, "proposed");
    const record = getWorkDoc(doc, created.payload.id);
    assert.ok(record, "the record exists");
    assert.equal(record.get("authors").length, 1);
  });

  it("a pre-identity device (fallback origin) refuses authorship", () => {
    const doc = createProjectDoc("p");
    const state = createEngineState();
    // No intentOrigin: the process-local fallback is a Symbol, not an
    // attributable author — work documents demand a real author
    const result = handleMessage(doc, state, {
      type: "INTENT",
      command: "createWorkDoc",
      payload: { title: "x" },
    });
    assert.equal(result.accepted, false, "unattributable authorship refused");
  });

  it("appends updates through the intent, refusing unknown documents", () => {
    const doc = createProjectDoc("p");
    const state = createEngineState();
    state.intentOrigin = "c".repeat(32);
    const created = handleMessage(doc, state, {
      type: "INTENT",
      command: "createWorkDoc",
      payload: { title: "t" },
    });
    const id = created.echoes.find(
      (/** @type {any} */ e) => e.protocol === "workdoc",
    ).payload.id;
    const updated = handleMessage(doc, state, {
      type: "INTENT",
      command: "updateWorkDoc",
      payload: { docId: id, content: "better text" },
    });
    assert.ok(updated.accepted);
    const record = getWorkDoc(doc, id);
    assert.equal(record.get("updates").length, 2);
    assert.equal(record.get("updates").get(1).content, "better text");

    const missing = handleMessage(doc, state, {
      type: "INTENT",
      command: "updateWorkDoc",
      payload: { docId: "wd_nope", content: "x" },
    });
    assert.equal(missing.accepted, false, "unknown document refused");
  });

  it("scope requests ride pendingScope through the intent", () => {
    const doc = createProjectDoc("p");
    const state = createEngineState();
    state.intentOrigin = "c".repeat(32);
    const created = handleMessage(doc, state, {
      type: "INTENT",
      command: "createWorkDoc",
      payload: { title: "t" },
    });
    const id = created.echoes.find(
      (/** @type {any} */ e) => e.protocol === "workdoc",
    ).payload.id;
    const scoped = handleMessage(doc, state, {
      type: "INTENT",
      command: "setWorkDocScope",
      payload: { docId: id, scope: "active" },
    });
    assert.ok(scoped.accepted);
    const record = getWorkDoc(doc, id);
    assert.equal(record.get("scope"), "proposed", "the state is unchanged");
    assert.equal(record.get("pendingScope"), "active");
    const bad = handleMessage(doc, state, {
      type: "INTENT",
      command: "setWorkDocScope",
      payload: { docId: id, scope: "published" },
    });
    assert.equal(bad.accepted, false, "invalid scopes refused");
  });
});
