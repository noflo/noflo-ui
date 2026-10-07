import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import { trackInputState } from "../../src/glass/input-state.js";
import "../../src/elements/noflo-editor.js";

/**
 * Dispatches a pointerdown with the given pointer type on a target. happy-dom
 * has no PointerEvent constructor exposure here, so a plain Event carries the
 * `pointerType` property the listeners read.
 *
 * @param {EventTarget} target
 * @param {string | undefined} pointerType
 * @returns {void}
 */
function pointerDown(target, pointerType) {
  const event = new window.Event("pointerdown", { bubbles: true });
  if (pointerType !== undefined) {
    /** @type {any} */ (event).pointerType = pointerType;
  }
  target.dispatchEvent(event);
}

describe("input-state publishing (work document #41)", () => {
  it("publishes the last pointer type as data-input on the body", () => {
    trackInputState();
    pointerDown(window, "touch");
    assert.equal(document.body.getAttribute("data-input"), "touch");
    pointerDown(window, "mouse");
    assert.equal(
      document.body.getAttribute("data-input"),
      "mouse",
      "the last pointer wins — branch on the active pointer, not the device",
    );
  });

  it("events without a pointer type leave the state alone", () => {
    trackInputState();
    document.body.setAttribute("data-input", "mouse");
    pointerDown(window, undefined);
    assert.equal(
      document.body.getAttribute("data-input"),
      "mouse",
      "a pen-less mouse event does not clear the state",
    );
    document.body.removeAttribute("data-input");
  });

  it("the editor mirrors the body's pointer and animation state", () => {
    document.body.setAttribute("data-input", "touch");
    document.body.setAttribute("data-animations", "off");
    const editor = document.createElement("noflo-editor");
    document.body.appendChild(editor);
    assert.equal(
      editor.getAttribute("data-input"),
      "touch",
      ":host selectors consume the mirrored pointer state",
    );
    assert.equal(
      editor.getAttribute("data-animations"),
      "off",
      ":host selectors consume the mirrored animation state",
    );
    editor.remove();
    document.body.removeAttribute("data-input");
    document.body.removeAttribute("data-animations");
  });
});
