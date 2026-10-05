import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-node.js";
import { LibraryManager } from "../../src/library/LibraryManager.js";

describe("FlowNode expanded state (work document #5 update #16)", () => {
  /**
   * A node with a library: one subgraph component registered.
   *
   * @param {string} component
   * @returns {any}
   */
  function makeNode(component) {
    const node = document.createElement("noflo-node");
    const library = new LibraryManager();
    library.setComponent("sub", {
      name: "sub",
      type: "subgraph",
      inports: [],
      outports: [],
    });
    library.setComponent("stub", {
      name: "stub",
      type: "stub",
      inports: [],
      outports: [],
    });
    node.libraryManager = library;
    node.component = component;
    node.setAttribute("name", "n1");
    document.body.appendChild(node);
    return node;
  }

  it("shows the depiction inside the circle when selected", () => {
    const node = makeNode("stub");
    node.setAttribute("selected", "");
    const depiction = node.shadowRoot.querySelector(".node-depiction");
    assert.ok(depiction, "the depiction renders inside the circle");
    assert.match(
      /** @type {HTMLElement} */ (depiction).textContent ?? "",
      /Not implemented/,
      "stubs carry the placeholder depiction inside the circle",
    );
    assert.match(
      /** @type {any} */ (node.shadowRoot.querySelector(".node-status"))
        .textContent ?? "",
      /stub/,
      "the status line names the component type in the info block",
    );
    node.remove();
  });

  it("a subgraph's depiction navigates down on click", () => {
    const node = makeNode("sub");
    node.setAttribute("selected", "");
    const depiction = /** @type {HTMLElement} */ (
      node.shadowRoot.querySelector(".node-depiction")
    );
    assert.ok(
      depiction?.querySelector("svg"),
      "the subgraph depiction renders",
    );
    /** @type {any} */
    let navigated = null;
    node.addEventListener("navigate-down-attempt", (e) => {
      navigated = e.detail;
    });
    // The press and the click both land on the depiction's svg
    const svg = /** @type {HTMLElement} */ (depiction.querySelector("svg"));
    svg.dispatchEvent(
      new window.MouseEvent("pointerdown", { bubbles: true, composed: true }),
    );
    svg.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, composed: true }),
    );
    assert.ok(navigated, "the depiction emits navigate-down-attempt");
    assert.equal(navigated.node, "n1");
    node.remove();
  });

  it("pressing the depiction stops the press from reaching the editor", () => {
    const node = makeNode("sub");
    node.setAttribute("selected", "");
    const svg = /** @type {HTMLElement} */ (
      node.shadowRoot.querySelector(".node-depiction svg")
    );
    /** @type {boolean} */
    let escaped = false;
    // The editor listens in the bubble phase on its own element: the
    // swallow happens at the node's shadow root, before the event exits
    node.addEventListener("pointerdown", () => {
      escaped = true;
    });
    svg.dispatchEvent(
      new window.MouseEvent("pointerdown", { bubbles: true, composed: true }),
    );
    assert.ok(!escaped, "the depiction swallows its own press");
    node.remove();
  });

  it("ports carry their datatype tag for the detailed zoom state", () => {
    const node = makeNode("stub");
    node.setPorts([{ name: "in", type: "number" }], [{ name: "out" }]);
    const tag = /** @type {HTMLElement} */ (
      node.shadowRoot.querySelector(".port-datatype")
    );
    assert.ok(tag, "the datatype tag renders");
    assert.equal(tag.textContent, "number");
    assert.equal(
      window.getComputedStyle(tag).display,
      "none",
      "hidden until the detailed zoom state",
    );
    node.classList.add("detailed");
    assert.equal(
      window.getComputedStyle(tag).display,
      "block",
      "the detailed state shows it",
    );
    node.remove();
  });
});
