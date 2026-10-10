import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import * as Y from "../../vendor/yjs.js";
import "../../src/elements/noflo-code-editor.js";

/** A fake CodeMirror surface: enough for the element's binding lifecycle
 * without rendering a real editor (that is browser-verified). */
function stubSurface() {
  // The real shape: yCollab returns PLUGINS, and the local-edit
  // transaction origin is the YSyncConfig conf, retrievable from the
  // view's facet (the bug the stub must not mask again)
  const conf = Symbol("ySyncConfig");
  const ySyncFacet = { facet: true };
  return {
    conf,
    yCollab: () => [{ plugin: true }],
    extensions: {
      ySyncFacet,
      EditorView: class {
        constructor() {
          this.state = {
            facet: (/** @type {any} */ facet) =>
              facet === ySyncFacet ? conf : null,
          };
        }
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
      onSendUpdate: (/** @type {Uint8Array} */ update) => relayed.push(update),
      yCollab: surface.yCollab,
      extensions: surface.extensions,
    });
    assert.ok(editor.hasAttribute("open"), "the dialog opened");

    // A local keystroke: the binding's origin marks the transaction
    doc.transact(() => {
      ytext.insert(4, "b");
    }, surface.conf);
    assert.equal(relayed.length, 1, "the local update was relayed");
    assert.ok(relayed[0] instanceof Uint8Array, "a binary Yjs update");

    // A remote edit (echo from the engine, no origin): rendered, not relayed
    ytext.insert(0, "// remote\n");
    assert.equal(relayed.length, 1, "the remote delta was not relayed");
    assert.match(ytext.toString(), /^\/\/ remote/);

    // Deleting a range relays its own binary update
    doc.transact(() => {
      ytext.delete(11, 3);
    }, surface.conf);
    assert.ok(
      relayed[1] instanceof Uint8Array,
      "the delete relayed as an update",
    );

    editor.close();
    assert.equal(editor.hasAttribute("open"), false);
    // After close: no further relays (the observer is detached)
    doc.transact(() => {
      ytext.insert(0, "nope");
    }, surface.conf);
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
      onSendUpdate: () => {},
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
