import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-editor.js";
import "../../src/elements/noflo-node.js";

/**
 * Boots an editor with a chain of three connected nodes: A → B → C.
 *
 * @returns {any}
 */
function makeEditor() {
  const editor = /** @type {any} */ (document.createElement("noflo-editor"));
  document.body.appendChild(editor);
  const a = /** @type {any} */ (
    editor.addNode("A", "test", { x: 100, y: 100 })
  );
  const b = /** @type {any} */ (
    editor.addNode("B", "test", { x: 400, y: 100 })
  );
  const c = /** @type {any} */ (
    editor.addNode("C", "test", { x: 400, y: 400 })
  );
  // The edges ride the real port elements (the ports live in the
  // nodes' shadow roots)
  editor.addEdge(
    a.shadowRoot.querySelector(".port-out"),
    b.shadowRoot.querySelector(".port-in"),
  );
  editor.addEdge(
    b.shadowRoot.querySelector(".port-out"),
    c.shadowRoot.querySelector(".port-in"),
  );
  return { editor, a, b, c };
}

describe("the canvas keyboard focus model (guidelines §10)", () => {
  it("the viewport is the single tab stop with the live region", () => {
    const { editor } = makeEditor();
    const viewport = editor.shadowRoot.querySelector("#viewport");
    assert.equal(viewport.getAttribute("tabindex"), "0");
    assert.equal(viewport.getAttribute("role"), "application");
    assert.ok(
      editor.shadowRoot.querySelector("#canvas-live[aria-live]"),
      "the announcements ride the canvas",
    );
    editor.remove();
  });

  it("navigation follows the edges — topology, not geometry", () => {
    const { editor, a, b, c } = makeEditor();
    const viewport = editor.shadowRoot.querySelector("#viewport");
    Object.defineProperty(document, "activeElement", {
      configurable: true,
      get: () => viewport,
    });
    const keydown = (/** @type {string} */ key) =>
      viewport.dispatchEvent(
        new window.KeyboardEvent("keydown", { key, bubbles: true }),
      );
    // The cursor starts at A: ArrowRight follows A's edge to B, ArrowDown
    // follows B's edge to C (B is above C in the fixture)
    editor._setFocusedNode(a);
    keydown("ArrowRight");
    assert.equal(editor._focusedNodeName, "B", "the edge to B");
    assert.ok(
      /** @type {HTMLElement} */ (
        editor.nodeLayer.querySelector('noflo-node[name="B"]')
      ).hasAttribute("data-focused"),
      "B wears the focus ring",
    );
    keydown("ArrowDown");
    assert.equal(editor._focusedNodeName, "C", "the edge to C");
    // Escape clears the cursor
    keydown("Escape");
    assert.equal(editor._focusedNodeName, null);
    editor.remove();
  });

  it("no cursor: an arrow focuses a node and rings it", () => {
    const { editor } = makeEditor();
    const viewport = editor.shadowRoot.querySelector("#viewport");
    Object.defineProperty(document, "activeElement", {
      configurable: true,
      get: () => viewport,
    });
    viewport.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    assert.ok(editor._focusedNodeName, "a node takes the cursor");
    assert.ok(
      editor._focusedNodeElement()?.hasAttribute("data-focused"),
      "it wears the focus ring",
    );
    editor.remove();
  });

  it("the focused node announces through the live region", () => {
    const { editor } = makeEditor();
    editor._moveFocus({ x: 1, y: 0 });
    const region = /** @type {HTMLElement} */ (
      editor.shadowRoot.querySelector("#canvas-live")
    );
    assert.match(region.textContent ?? "", /Focused/);
    editor.remove();
  });

  it("Enter toggles the focused node's selection", () => {
    const { editor, a } = makeEditor();
    const viewport = editor.shadowRoot.querySelector("#viewport");
    Object.defineProperty(document, "activeElement", {
      configurable: true,
      get: () => viewport,
    });
    editor._setFocusedNode(a);
    const node = editor._focusedNodeElement();
    const before = [...editor.selectionManager.nodes];
    console.log(
      "DBG before:",
      before,
      "focused:",
      editor._focusedNodeName,
      "node name:",
      node.getAttribute("name"),
      "activeElement is viewport:",
      document.activeElement === viewport,
    );
    editor.viewport.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    console.log("DBG after:", [...editor.selectionManager.nodes]);
    assert.ok(
      editor.selectionManager.nodes.has(node.getAttribute("name")),
      "Enter selects",
    );
    editor.viewport.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    assert.ok(
      !editor.selectionManager.nodes.has(node.getAttribute("name")),
      "Enter again deselects",
    );
    editor.remove();
  });

  it("the focused node wears the offset outline ring", () => {
    const node = /** @type {any} */ (document.createElement("noflo-node"));
    document.body.appendChild(node);
    const style = /** @type {HTMLElement} */ (
      node.shadowRoot.querySelector("style")
    ).textContent;
    assert.match(
      style,
      /:host\(\[data-focused\]\) \{[^}]*var\(--ui-focus/,
      "the ring is the focus color, offset",
    );
    node.remove();
  });
});
