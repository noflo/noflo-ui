import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import "./utils/register.js";

import * as Y from "../../vendor/yjs.js";
import "../../src/elements/noflo-workdoc-view.js";

/** A fake CodeMirror surface: enough for the binding lifecycle without
 * rendering a real editor (that is browser-verified, work document #56). */
function stubSurface() {
  const conf = Symbol("ySyncConfig");
  const ySyncFacet = { facet: true };
  return {
    conf,
    ySyncFacet,
    yCollab: () => [{ plugin: true }],
    extensions: {},
    basicSetup: [],
    markdown: () => [],
    javascript: () => [],
    EditorView: class {
      constructor({ doc, extensions, parent }) {
        this.doc = doc;
        this.extensions = extensions;
        this.parent = parent;
        this.destroyed = false;
      }
      state = { facet: (facet) => (facet === ySyncFacet ? conf : null) };
      destroy() {
        this.destroyed = true;
      }
    },
  };
}

/** A document record with a Y.Text body, as the mirror holds it. */
function makeDoc() {
  const doc = new Y.Doc();
  const record = doc.getMap("workdocs").set("a".repeat(32), new Y.Map());
  const content = new Y.Text("The parser needs a sketch.");
  record.set("content", content);
  return { doc, record, content };
}

/** @returns {any} */
function makeView() {
  const el = /** @type {any} */ (document.createElement("noflo-workdoc-view"));
  document.body.appendChild(el);
  return el;
}

const docState = () => ({
  id: "a".repeat(32),
  title: "Implement the parser",
  scope: "proposed",
  pendingScope: "active",
  boardId: 42,
  updates: [
    {
      id: 1,
      created: Date.now() - 1000,
      author: "c".repeat(32),
      content: "First revision",
    },
  ],
});

describe("FlowWorkDocView (work document #9)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("opens in the read state: title, scope state, thread, composer", () => {
    const view = makeView();
    const { record, content } = makeDoc();
    view.open({ doc: docState(), ytext: content, cm: stubSurface() });
    const shadow = view.shadowRoot;
    assert.equal(
      shadow.querySelector("input.title").value,
      "Implement the parser",
    );
    assert.match(
      shadow.querySelector(".badge").textContent,
      /proposed → active/,
    );
    assert.match(
      shadow.querySelector(".body").textContent,
      /parser needs a sketch/,
      "read state renders the mirror's text",
    );
    assert.match(
      shadow.querySelector(".thread").textContent,
      /First revision/,
      "the thread lists entries",
    );
    assert.ok(
      shadow.querySelector(".composer textarea"),
      "the composer is always ready",
    );
    assert.equal(view._editing, false, "read is the default");
    view.remove();
  });

  it("the edit toggle binds the collaborative editor; read unbinds", () => {
    const view = makeView();
    const { record, content } = makeDoc();
    view.open({ doc: docState(), ytext: content, cm: stubSurface() });
    view.toggleEdit();
    assert.ok(view._view, "the editor is bound");
    assert.ok(view._conf, "the relay origin resolves from the facet");
    view.toggleEdit();
    assert.equal(view._view, null, "read unbinds");
    view.remove();
  });

  it("a local edit relays the binary diff as workdoc-body-update", () => {
    const view = makeView();
    const { record, content } = makeDoc();
    view.open({ doc: docState(), ytext: content, cm: stubSurface() });
    view.toggleEdit();
    /** @type {any[]} */
    const relays = [];
    view.addEventListener("workdoc-body-update", (/** @type {any} */ e) =>
      relays.push(e.detail),
    );
    // Simulate a local transaction: the yCollab origin applies a change,
    // the doc emits the update — the relay fires with the binary diff
    const conf = view._conf;
    content.doc.transact(() => {
      content.insert(5, " plus tests");
    }, conf);
    assert.equal(relays.length, 1, "the local transaction relays");
    assert.ok(relays[0].update instanceof Uint8Array);
    assert.equal(relays[0].docId, "a".repeat(32));
    // A remote transaction does not relay
    content.doc.transact(() => {
      content.insert(0, "peer: ");
    }, "remote-peer");
    assert.equal(relays.length, 1, "remote edits do not relay");
    view.remove();
  });

  it("the composer posts an immutable thread entry", () => {
    const view = makeView();
    const { record, content } = makeDoc();
    view.open({ doc: docState(), ytext: content, cm: stubSurface() });
    /** @type {any[]} */
    const posts = [];
    view.addEventListener("workdoc-post", (/** @type {any} */ e) =>
      posts.push(e.detail),
    );
    const composer = /** @type {HTMLTextAreaElement} */ (
      view.shadowRoot.querySelector(".composer textarea")
    );
    composer.value = "Added the test plan.";
    view.shadowRoot.querySelector("[data-action='post']").click();
    assert.deepEqual(posts, [
      { docId: "a".repeat(32), content: "Added the test plan." },
    ]);
    assert.equal(composer.value, "", "the composer clears after posting");
    view.remove();
  });

  it("an empty composer does not post", () => {
    const view = makeView();
    const { record, content } = makeDoc();
    view.open({ doc: docState(), ytext: content, cm: stubSurface() });
    /** @type {any[]} */
    const posts = [];
    view.addEventListener("workdoc-post", (/** @type {any} */ e) =>
      posts.push(e.detail),
    );
    view.shadowRoot.querySelector("[data-action='post']").click();
    assert.equal(posts.length, 0);
    view.remove();
  });

  it("the title field renames on change", () => {
    const view = makeView();
    const { record, content } = makeDoc();
    view.open({ doc: docState(), ytext: content, cm: stubSurface() });
    /** @type {any[]} */
    const titles = [];
    view.addEventListener("workdoc-title", (/** @type {any} */ e) =>
      titles.push(e.detail),
    );
    const input = /** @type {HTMLInputElement} */ (
      view.shadowRoot.querySelector("input.title")
    );
    input.value = "Parser implementation plan";
    input.dispatchEvent(new Event("change"));
    assert.deepEqual(titles, [
      { docId: "a".repeat(32), title: "Parser implementation plan" },
    ]);
    // Reverting to the current title: no change, no emit
    input.value = "Implement the parser";
    input.dispatchEvent(new Event("change"));
    assert.equal(titles.length, 1);
    assert.equal(titles.length, 1);
    view.remove();
  });

  it("the edit toggle keeps the dialog open (the top layer re-establishes)", () => {
    const view = makeView();
    const { record, content } = makeDoc();
    view.open({ doc: docState(), ytext: content, cm: stubSurface() });
    // The dialog API exists in happy-dom? The element falls back to host
    // visibility when it does not — assert the invariant: after the edit
    // toggle the panel is still presented
    const visibleBefore =
      view.hidden === false || view.shadowRoot.querySelector("dialog")?.open;
    view.toggleEdit();
    const visibleAfter =
      view.hidden === false || view.shadowRoot.querySelector("dialog")?.open;
    assert.ok(visibleBefore, "open presents the panel");
    assert.ok(visibleAfter, "the edit toggle never closes it");
    view.toggleEdit();
    view.remove();
  });

  it("refresh updates the thread and scope state without touching the editor", () => {
    const view = makeView();
    const { record, content } = makeDoc();
    view.open({ doc: docState(), ytext: content, cm: stubSurface() });
    view.toggleEdit();
    const before = view._view;
    view.refresh({
      title: "Renamed",
      scope: "active",
      updates: [
        { id: 1, created: 1, author: "c".repeat(32), content: "First" },
        { id: 2, created: 2, author: "d".repeat(32), content: "Second" },
      ],
    });
    assert.equal(view._view, before, "the editor binding survives");
    const thread = view.shadowRoot.querySelector(".thread").textContent;
    assert.match(thread, /Second/);
    const badge = view.shadowRoot.querySelector(".badge");
    assert.match(badge.textContent, /active/, "the scope state refreshed");
    assert.equal(
      badge.className.includes("pending"),
      false,
      "the pending request cleared",
    );
    view.remove();
  });
});

describe("the workdoc view's governance surfaces (work document #9 updates #10, #13, §5)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("the scope-request affordance tracks the document's state", () => {
    const view = makeView();
    const { content } = makeDoc();
    // Proposed, no pending request: the affordance shows
    view.open({
      doc: { ...docState(), pendingScope: undefined },
      ytext: content,
      cm: stubSurface(),
    });
    const request = view.shadowRoot.querySelector(
      "[data-action='request-scope']",
    );
    assert.ok(request, "the affordance renders");
    assert.ok(!request.hidden, "visible for proposed without a request");

    // A pending request: hidden — the intent recorded it, the board decides
    view.refresh({ ...docState(), signature: undefined });
    assert.ok(
      view.shadowRoot.querySelector("[data-action='request-scope']").hidden,
      "hidden while a request is pending",
    );
    view.remove();
  });

  it("requesting activation emits workdoc-scope for the intent path", () => {
    const view = makeView();
    const { content } = makeDoc();
    view.open({
      doc: { ...docState(), pendingScope: undefined },
      ytext: content,
      cm: stubSurface(),
    });
    const events = /** @type {any[]} */ ([]);
    view.addEventListener("workdoc-scope", (/** @type {any} */ e) => {
      events.push(e.detail);
    });
    /** @type {any} */
    (view.shadowRoot.querySelector("[data-action='request-scope']")).click();
    assert.equal(events.length, 1);
    assert.equal(events[0].docId, docState().id);
    assert.equal(events[0].scope, "active");
    view.remove();
  });

  it("the provenance badge names board-signed and local-only states", () => {
    const view = makeView();
    const { content } = makeDoc();
    view.open({
      doc: { ...docState(), signature: "present" },
      ytext: content,
      cm: stubSurface(),
    });
    assert.match(
      view.shadowRoot.querySelector(".doc-sig").textContent,
      /board-signed/,
    );
    view.refresh({ ...docState(), signature: undefined });
    assert.match(
      view.shadowRoot.querySelector(".doc-sig").textContent,
      /local only/,
    );
    view.remove();
  });

  it("traceability links render in the thread and the read body, and clicks emit workdoc-link", () => {
    const view = makeView();
    const { content } = makeDoc();
    content.delete(0, content.length);
    content.insert(0, "See [[node:parser1]] and [[component:mylib/Parse]] <script>");
    view.open({
      doc: {
        ...docState(),
        pendingScope: undefined,
        updates: [
          {
            id: 1,
            created: Date.now(),
            author: "c".repeat(32),
            content: "Moved the wire per [[component:mylib/Parse]].",
          },
        ],
      },
      ytext: content,
      cm: stubSurface(),
    });
    const shadow = view.shadowRoot;
    const links = [...shadow.querySelectorAll(".doc-link")];
    assert.ok(links.length >= 3, "body and thread both linkify");
    const escaped = [...shadow.querySelectorAll(".body .doc-link")];
    assert.equal(
      escaped.filter((/** @type {any} */ l) => l.dataset.kind === "node").length,
      1,
      "the node link renders",
    );
    assert.equal(
      shadow.querySelector(".body script"),
      null,
      "markup stays escaped — no script element",
    );

    const events = /** @type {any[]} */ ([]);
    view.addEventListener("workdoc-link", (/** @type {any} */ e) => {
      events.push(e.detail);
    });
    /** @type {any} */
    (shadow.querySelector('.thread .doc-link[data-kind="component"]')).click();
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, "component");
    assert.equal(events[0].id, "mylib/Parse");
    view.remove();
  });
});
