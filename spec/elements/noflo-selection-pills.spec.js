import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-selection-pills.js";

/**
 * A selection manager stub with the shape SelectionPills reads: the three
 * entity sets, plus the event subscription the setter wires.
 */
function fakeSelectionManager() {
  return {
    nodes: new Set(["a", "b"]),
    iips: new Set(),
    edges: new Set(["e1"]),
    ports: new Set(["out"]),
    addEventListener() {},
    removeEventListener() {},
  };
}

describe("SelectionPills (work document #41)", () => {
  it("renders a pill per populated selection type", () => {
    const el = document.createElement("noflo-selection-pills");
    document.body.appendChild(el);
    el.selectionManager = /** @type {any} */ (fakeSelectionManager());
    el.updatePills();
    const pills = /** @type {NodeListOf<HTMLElement>} */ (
      el.shadowRoot?.querySelectorAll(".selection-pill")
    );
    assert.equal(pills.length, 3, "one pill per populated selection type");
    assert.match(pills[0].textContent ?? "", /2 nodes/);
    assert.match(pills[1].textContent ?? "", /1 edges/);
    assert.match(pills[2].textContent ?? "", /1 export/);
    el.remove();
  });

  it("the clear affordance is a real button that emits clear-selection", () => {
    const el = document.createElement("noflo-selection-pills");
    document.body.appendChild(el);
    el.selectionManager = /** @type {any} */ (fakeSelectionManager());
    el.updatePills();
    const button = /** @type {HTMLButtonElement} */ (
      el.shadowRoot?.querySelector(".selection-pill .clear-btn")
    );
    assert.ok(button, "the clear affordance renders");
    assert.equal(button.tagName, "BUTTON", "keyboard-reachable control");

    const events = [];
    el.addEventListener("clear-selection", (e) => {
      events.push(e);
    });
    button.click();
    assert.equal(events.length, 1);
    assert.equal(
      /** @type {CustomEvent} */ (events[0]).detail.type,
      "nodes",
      "the click names the selection type it clears",
    );
    el.remove();
  });
});
