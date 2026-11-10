import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-node.js";

describe("the node renders the ages (guidelines §6)", () => {
  it("the crashed age fractures the ring", () => {
    document.body.setAttribute("data-age", "crashed");
    const node = document.createElement("noflo-node");
    document.body.appendChild(node);
    assert.ok(
      node.classList.contains("state-crashed"),
      "the age rides the host as the state class",
    );
    const style = /** @type {HTMLElement} */ (
      node.shadowRoot?.querySelector("style")
    )?.textContent;
    assert.match(
      style,
      /:host\(\.state-crashed\) \.node-circle::after \{[^}]*conic-gradient/,
      "the fracture renders as a conic ring",
    );
    assert.match(
      style,
      /border-color: transparent/,
      "the solid ring yields to the fractured one",
    );
    // The age returns: the host class follows the body
    document.body.setAttribute("data-age", "abstract");
    node._mirrorAge();
    assert.ok(
      !node.classList.contains("state-crashed") &&
        node.classList.contains("state-abstract"),
      "the host class follows the body's age",
    );
    document.body.setAttribute("data-age", "abstract");
    node.remove();
  });
});
