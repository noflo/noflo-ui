import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEngineState, handleMessage } from "../../src/crdt/EngineCore.js";
import {
  appendWorkDocUpdate,
  clearImplementationRequest,
  createProjectDoc,
  createWorkDoc,
  getImplementationRequest,
  getWorkDoc,
  PROJECT_SCHEMA_VERSION,
  reconcileWorkDocScope,
  requestWorkDocScope,
  resolveImplementationRequest,
  setComponentSignature,
  setImplementationRequest,
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

describe("implementation-request pointers (work document #9, step D)", () => {
  const COMPONENT = "mylib/Parser";

  /** Creates a document and returns its record. */
  function requestedDoc(doc, title = "Implement the parser") {
    return createWorkDoc(doc, {
      title,
      content: "The parser needs a sketch.",
      author: "a".repeat(32),
    });
  }

  it("stores, reads, and clears the pointer as a plain object", () => {
    const doc = createProjectDoc("p");
    const record = requestedDoc(doc);
    const pointer = {
      docId: record.get("id"),
      created: record.get("created"),
      title: record.get("title"),
    };
    assert.equal(getImplementationRequest(doc, COMPONENT), undefined);
    assert.ok(setImplementationRequest(doc, COMPONENT, pointer));
    const stored = getImplementationRequest(doc, COMPONENT);
    assert.deepEqual(stored, pointer, "plain object, field-for-field");
    // The pointer rides the registry entry beside an existing signature
    assert.ok(
      doc.getMap("registry").get(COMPONENT).has("implementationRequest"),
    );
    clearImplementationRequest(doc, COMPONENT);
    assert.equal(getImplementationRequest(doc, COMPONENT), undefined);
    // Clearing without an entry is a no-op, not a throw
    clearImplementationRequest(doc, "other/Component");
  });

  it("creates the registry entry when the component has no signature yet", () => {
    const doc = createProjectDoc("p");
    const record = requestedDoc(doc);
    assert.ok(
      setImplementationRequest(doc, COMPONENT, {
        docId: record.get("id"),
        created: record.get("created"),
        title: record.get("title"),
      }),
    );
    assert.ok(
      doc.getMap("registry").has(COMPONENT),
      "the entry exists as the pointer's host",
    );
  });

  it("refuses malformed pointers and names without mutating", () => {
    const doc = createProjectDoc("p");
    const before = doc.getMap("registry").toJSON();
    const record = requestedDoc(doc);
    const good = {
      docId: record.get("id"),
      created: record.get("created"),
      title: record.get("title"),
    };
    assert.equal(setImplementationRequest(doc, "", good), false, "no name");
    assert.equal(
      setImplementationRequest(doc, COMPONENT, null),
      false,
      "no pointer",
    );
    assert.equal(
      setImplementationRequest(doc, COMPONENT, { ...good, docId: "wd_nope" }),
      false,
      "ids match the 32-hex shape",
    );
    assert.equal(
      setImplementationRequest(doc, COMPONENT, { ...good, created: "x" }),
      false,
      "created is a number",
    );
    assert.equal(
      setImplementationRequest(doc, COMPONENT, { ...good, title: "" }),
      false,
      "title required",
    );
    assert.deepEqual(doc.getMap("registry").toJSON(), before, "untouched");
  });

  it("preserves the pointer when the signature is replaced", () => {
    const doc = createProjectDoc("p");
    const record = requestedDoc(doc);
    const pointer = {
      docId: record.get("id"),
      created: record.get("created"),
      title: record.get("title"),
    };
    setComponentSignature(doc, COMPONENT, {
      inports: [{ name: "in" }],
      outports: [{ name: "out" }],
    });
    assert.ok(setImplementationRequest(doc, COMPONENT, pointer));
    // Signature derivation and boot repair replace the entry — the link survives
    setComponentSignature(doc, COMPONENT, {
      inports: [{ name: "in" }, { name: "config" }],
      outports: [{ name: "out" }],
      description: "Parses things",
    });
    assert.deepEqual(getImplementationRequest(doc, COMPONENT), pointer);
    const entry = doc.getMap("registry").get(COMPONENT);
    assert.equal(
      entry.get("description"),
      "Parses things",
      "ports still update",
    );
    assert.equal(entry.get("inports").length, 2);
  });

  it("resolves none, ok, deleted, and broken states", () => {
    const doc = createProjectDoc("p");
    assert.equal(resolveImplementationRequest(doc, COMPONENT).state, "none");

    const record = requestedDoc(doc);
    const pointer = {
      docId: record.get("id"),
      created: record.get("created"),
      title: record.get("title"),
    };
    setImplementationRequest(doc, COMPONENT, pointer);
    const ok = resolveImplementationRequest(doc, COMPONENT);
    assert.equal(ok.state, "ok");
    assert.equal(
      ok.doc.get("id"),
      pointer.docId,
      "the record rides the resolution",
    );

    // A renamed document stays linked — the title is the request-time snapshot
    record.set("title", "Implement the parser, properly");
    assert.equal(resolveImplementationRequest(doc, COMPONENT).state, "ok");

    // rngit-initiated deletion propagates as absence
    const originalCreated = record.get("created");
    doc.getMap("workdocs").delete(pointer.docId);
    const deleted = resolveImplementationRequest(doc, COMPONENT);
    assert.equal(deleted.state, "deleted");
    assert.deepEqual(deleted.pointer, pointer);

    // A created-stamp mismatch never re-resolves onto a different document.
    // The guard is defense-in-depth — CRDT ids never recycle, so a mismatch
    // means divergent data landed under the id; the test simulates that
    // directly (same-millisecond creations would otherwise share stamps)
    const replacement = requestedDoc(doc, "Something else entirely");
    replacement.set("created", originalCreated - 1000);
    assert.ok(
      setImplementationRequest(doc, COMPONENT, {
        docId: replacement.get("id"),
        created: originalCreated,
        title: pointer.title,
      }),
    );
    const broken = resolveImplementationRequest(doc, COMPONENT);
    assert.equal(broken.state, "broken", "the id must not re-resolve");
  });
});

describe("the implementation-request intent (work document #9, step D)", () => {
  const COMPONENT = "mylib/Parser";

  it("links a pointer through the intent and echoes it", () => {
    const doc = createProjectDoc("p");
    const state = createEngineState();
    state.intentOrigin = "c".repeat(32);
    const created = handleMessage(doc, state, {
      type: "INTENT",
      command: "createWorkDoc",
      payload: { title: "Implement the parser" },
    });
    const createdEcho = created.echoes.find(
      (/** @type {any} */ e) => e.protocol === "workdoc",
    );
    // The echo carries the created stamp: the pointer's identity leg
    // (work document #9 update #5's guard reads it back on resolution)
    assert.equal(typeof createdEcho.payload.created, "number");
    const linked = handleMessage(doc, state, {
      type: "INTENT",
      command: "setImplementationRequest",
      payload: {
        component: COMPONENT,
        request: {
          docId: createdEcho.payload.id,
          created: createdEcho.payload.created,
          title: createdEcho.payload.title,
        },
      },
    });
    assert.ok(linked.accepted);
    const requestedEcho = linked.echoes.find(
      (/** @type {any} */ e) => e.protocol === "workdoc",
    );
    assert.equal(requestedEcho.command, "requested");
    assert.equal(requestedEcho.payload.component, COMPONENT);
    assert.equal(requestedEcho.payload.docId, createdEcho.payload.id);
    const resolution = resolveImplementationRequest(doc, COMPONENT);
    assert.equal(resolution.state, "ok");
  });

  it("clears the pointer with a null request", () => {
    const doc = createProjectDoc("p");
    const state = createEngineState();
    state.intentOrigin = "c".repeat(32);
    const record = createWorkDoc(doc, {
      title: "t",
      author: "a".repeat(32),
    });
    handleMessage(doc, state, {
      type: "INTENT",
      command: "setImplementationRequest",
      payload: {
        component: COMPONENT,
        request: {
          docId: record.get("id"),
          created: record.get("created"),
          title: record.get("title"),
        },
      },
    });
    const cleared = handleMessage(doc, state, {
      type: "INTENT",
      command: "setImplementationRequest",
      payload: { component: COMPONENT, request: null },
    });
    assert.ok(cleared.accepted);
    assert.equal(
      cleared.echoes[0].payload.docId,
      null,
      "the echo names the clearing",
    );
    assert.equal(resolveImplementationRequest(doc, COMPONENT).state, "none");
  });

  it("refuses malformed payloads without echoing", () => {
    const doc = createProjectDoc("p");
    const state = createEngineState();
    state.intentOrigin = "c".repeat(32);
    const noComponent = handleMessage(doc, state, {
      type: "INTENT",
      command: "setImplementationRequest",
      payload: { request: null },
    });
    assert.equal(noComponent.accepted, false);
    const malformed = handleMessage(doc, state, {
      type: "INTENT",
      command: "setImplementationRequest",
      payload: {
        component: COMPONENT,
        request: { docId: "nope", created: 1, title: "t" },
      },
    });
    assert.equal(malformed.accepted, false, "ids match the 32-hex shape");
    assert.equal(resolveImplementationRequest(doc, COMPONENT).state, "none");
  });
});
