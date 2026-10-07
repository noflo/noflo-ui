import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-editor.js";
import "../../src/elements/noflo-node.js";

/**
 * A pointer event the editor's handlers accept: happy-dom has no
 * PointerEvent constructor here, so a CustomEvent carries the pointer
 * properties, and `composedPath` is overridden to resolve targets the way
 * the real composed path would.
 *
 * @param {string} type
 * @param {{ clientX: number, clientY: number, pointerId?: number, pointerType?: string }} pos
 * @param {Element[]} path
 * @returns {Event}
 */
function pointerEvent(type, pos, path = []) {
  const event = new CustomEvent(type, { bubbles: true, composed: true });
  event.pointerId = pos.pointerId ?? 1;
  event.pointerType = pos.pointerType ?? "mouse";
  event.clientX = pos.clientX;
  event.clientY = pos.clientY;
  event.button = 0;
  Object.defineProperty(event, "composedPath", {
    value: () => path,
    enumerable: true,
    configurable: true,
    writable: true,
  });
  return event;
}

/**
 * The node drag regression (work document #5): pointerdown on the
 * already-expanded node used to toggle it off immediately — the node
 * collapsed and the drag set emptied, so an expanded node could not be
 * moved. The collapse belongs to pointerup's click-commit, not to
 * pointerdown.
 */
describe("expanded node dragging (work document #5)", () => {
  it("pointerdown on the only-selected node keeps it selected and draggable", () => {
    const editor = document.createElement("noflo-editor");
    document.body.appendChild(editor);
    const node = editor.addNode("A", "test", { x: 80, y: 80 });

    // First press selects and expands the node
    editor.dispatchEvent(
      pointerEvent("pointerdown", { clientX: 100, clientY: 100 }, [
        node,
        editor,
      ]),
    );
    assert.ok(
      editor.selectionManager.nodes.has("A"),
      "the press selects the node",
    );

    // Pressing the already-expanded node keeps it selected…
    editor.dispatchEvent(
      pointerEvent("pointerdown", { clientX: 100, clientY: 100 }, [
        node,
        editor,
      ]),
    );
    assert.ok(
      editor.selectionManager.nodes.has("A"),
      "the expanded node stays selected on the next press",
    );

    // …so dragging moves it (a full-grid delta keeps snap-to-grid exact)
    const before = { ...node.position };
    window.dispatchEvent(
      pointerEvent("pointermove", { clientX: 180, clientY: 180 }),
    );
    assert.equal(
      editor.isDraggingNode,
      true,
      "the drag begins on the expanded node",
    );
    window.dispatchEvent(
      pointerEvent("pointerup", { clientX: 180, clientY: 180 }),
    );
    const after = { ...node.position };
    assert.ok(
      Math.abs(after.x - before.x - 80) < 2 &&
        Math.abs(after.y - before.y - 80) < 2,
      `the node followed the pointer (${before.x},${before.y} -> ${after.x},${after.y})`,
    );
    assert.ok(
      editor.selectionManager.nodes.has("A"),
      "a drag does not collapse the node",
    );
    editor.remove();
  });

  it("a plain click on the only-selected node still collapses it", () => {
    const editor = document.createElement("noflo-editor");
    document.body.appendChild(editor);
    const node = editor.addNode("A", "test", { x: 80, y: 80 });

    editor.dispatchEvent(
      pointerEvent("pointerdown", { clientX: 100, clientY: 100 }, [
        node,
        editor,
      ]),
    );
    assert.ok(editor.selectionManager.nodes.has("A"));
    window.dispatchEvent(
      pointerEvent("pointerup", { clientX: 100, clientY: 100 }),
    );
    assert.ok(editor.selectionManager.nodes.has("A"), "click-select keeps it");

    // Second press + release without movement: the click-commit collapses
    editor.dispatchEvent(
      pointerEvent("pointerdown", { clientX: 100, clientY: 100 }, [
        node,
        editor,
      ]),
    );
    assert.ok(
      editor.selectionManager.nodes.has("A"),
      "the press itself does not collapse",
    );
    window.dispatchEvent(
      pointerEvent("pointerup", { clientX: 100, clientY: 100 }),
    );
    assert.ok(
      !editor.selectionManager.nodes.has("A"),
      "the click commits the collapse",
    );
    editor.remove();
  });
});
