import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import * as Y from "../../vendor/yjs.js";
import "../../src/elements/noflo-code-editor.js";

/** A fake CodeMirror surface: enough for the element's binding lifecycle
 * without rendering a real editor (that is browser-verified). */
function stubSurface() {
  const origin = Symbol("yCollab-binding");
  return {
    origin,
    yCollab: (/** @type {any} */ ytext) => {
      // The real binding applies local edits with itself as the origin;
      // the stub records the buffer so tests can transact as the editor
      ytext.__bindingOrigin = origin;
      return origin;
    },
    extensions: {
      EditorView: class {
        constructor() {}
        focus() {}
        destroy() {}
      },
      basicSetup: [],
      javascript: () => [],
      markdown: () => [],
    },
  };
}

describe("code editor element (work document #29)", () => {
  it("relays local (binding-origin) edits as deltas; remote edits pass silently", () => {
    const surface = stubSurface();
    const doc = new Y.Doc();
    const ytext = doc.getText("code");
    ytext.insert(0, "const a = 1;\n");

    /** @type {any[][]} */
    const relayed = [];
    const editor = document.createElement("noflo-code-editor");
    document.body.appendChild(editor);
    editor.open({
      ytext,
      name: "fs/Count",
      language: "javascript",
      onSendDelta: (/** @type {any[]} */ delta) => relayed.push(delta),
      yCollab: surface.yCollab,
      extensions: surface.extensions,
    });
    assert.ok(editor.hasAttribute("open"), "the dialog opened");

    // A local keystroke: the binding's origin marks the transaction
    doc.transact(() => {
      ytext.insert(4, "b");
    }, surface.origin);
    assert.equal(relayed.length, 1, "the local delta was relayed");
    assert.deepEqual(relayed[0], [{ retain: 4 }, { insert: "b" }]);

    // A remote edit (echo from the engine, no origin): rendered, not relayed
    ytext.insert(0, "// remote\n");
    assert.equal(relayed.length, 1, "the remote delta was not relayed");
    assert.match(ytext.toString(), /^\/\/ remote/);

    // Deleting a range relays positionally
    doc.transact(() => {
      ytext.delete(11, 3);
    }, surface.origin);
    assert.deepEqual(relayed[1], [{ retain: 11 }, { delete: 3 }]);

    editor.close();
    assert.equal(editor.hasAttribute("open"), false);
    // After close: no further relays (the observer is detached)
    doc.transact(() => {
      ytext.insert(0, "nope");
    }, surface.origin);
    assert.equal(relayed.length, 2, "the binding unobserved on close");
  });

  it("renders in markdown language for docs buffers", () => {
    const surface = stubSurface();
    const editor = document.createElement("noflo-code-editor");
    document.body.appendChild(editor);
    const doc = new Y.Doc();
    editor.open({
      ytext: doc.getText("doc"),
      name: "AGENTS",
      language: "markdown",
      onSendDelta: () => {},
      yCollab: surface.yCollab,
      extensions: surface.extensions,
    });
    assert.equal(
      editor.shadowRoot.querySelector(".lang").textContent,
      "markdown",
    );
    editor.close();
  });
});
