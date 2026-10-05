import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-modal.js";

/**
 * @returns {any}
 */
function makeModal() {
  const el = document.createElement("noflo-modal");
  document.body.appendChild(el);
  return el;
}

describe("NofloModal actions (work document #29)", () => {
  it("renders the default footer: Cancel and Save", () => {
    const el = makeModal();
    const buttons = /** @type {ShadowRoot} */ (el.shadowRoot).querySelectorAll(
      ".modal-footer button",
    );
    assert.equal(buttons.length, 2);
    assert.equal(buttons[0].getAttribute("value"), "cancel");
    assert.equal(buttons[1].getAttribute("value"), "save");
    el.remove();
  });

  it("setActions replaces the footer with the primary actions", () => {
    const el = makeModal();
    el.setActions([
      { value: "cancel", label: "Cancel", kind: "btn-secondary" },
      { value: "fork", label: "Fork", kind: "btn-action" },
      {
        value: "implement-graph",
        label: "Implement as graph",
        kind: "btn-action",
      },
      { value: "save", label: "Save", kind: "btn-primary" },
    ]);
    const buttons = /** @type {ShadowRoot} */ (el.shadowRoot).querySelectorAll(
      ".modal-footer button",
    );
    assert.equal(buttons.length, 4, "every action renders");
    assert.equal(
      buttons[2].getAttribute("value"),
      "implement-graph",
      "the implement action is offered",
    );
    assert.match(buttons[2].textContent ?? "", /Implement as graph/);
    el.remove();
  });

  it("submit resolves with the clicked action's value", async () => {
    const el = makeModal();
    el.setActions([
      { value: "cancel", label: "Cancel", kind: "btn-secondary" },
      {
        value: "implement-code",
        label: "Implement in code",
        kind: "btn-action",
      },
    ]);
    el.open("Component: sketchy");
    const pending = el.submit();
    /** @type {ShadowRoot} */ (el.shadowRoot)
      .querySelector(".modal-footer button[value='implement-code']")
      .click();
    assert.equal(await pending, "implement-code");
    el.remove();
  });

  it("submit resolves false when the dialog is dismissed", async () => {
    const el = makeModal();
    el.open("Component: sketchy");
    const pending = el.submit();
    el.close();
    assert.equal(await pending, false, "dismissal is not an action");
    el.remove();
  });
});
