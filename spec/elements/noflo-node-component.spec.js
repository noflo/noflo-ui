import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-node.js";
import "../../src/elements/noflo-context-chip.js";

describe("FlowNode component reflection", () => {
  it("reflects the component property to an attribute", () => {
    const node = document.createElement("noflo-node");
    node.component = "sketchy";
    assert.equal(node.getAttribute("component"), "sketchy");
    assert.equal(node.component, "sketchy");
    node.component = "other";
    assert.equal(node.getAttribute("component"), "other");
  });

  it("the non-expanded port label is a single-line flex row (work document #5)", () => {
    const node = document.createElement("noflo-node");
    document.body.appendChild(node);
    const style =
      /** @type {HTMLElement} */ (
        /** @type {ShadowRoot} */ (node.shadowRoot).querySelector("style")
      ).textContent ?? "";
    assert.match(
      style,
      /\.port-label \{\s*display: flex;\s*align-items: center;\s*gap: 4px;\s*line-height: 1;/,
      "name and datatype share the label's line, optically centered on the port",
    );
    assert.match(
      style,
      /\.port-in-label \{\s*\/\* The datatype rides the outer edge[^*]*\*\/\s*flex-direction: row-reverse;/,
      "inport datatypes read on the outer edge, like the expanded pill",
    );
    assert.match(
      style,
      /:host\(\.detailed\) \.port-datatype,\s*:host\(\[selected\]\) \.port-datatype \{\s*display: block;/,
      "the datatype shows via the single combined rule",
    );
    node.remove();
  });
});

describe("Context chip chrome (work document #28)", () => {
  it("the host carries positioning only — the shared chip is the one box", () => {
    const chip = document.createElement("noflo-context-chip");
    document.body.appendChild(chip);
    // Comments stripped: the host block's own doc comment names the chrome
    // words it deliberately does not carry
    const style = /** @type {HTMLElement} */ (
      /** @type {ShadowRoot} */ (chip.shadowRoot).querySelector("style")
        .textContent ?? ""
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    const hostBlock = /:host \{[^}]+\}/.exec(style)?.[0] ?? "";
    assert.ok(hostBlock, "the host styles render");
    assert.ok(
      !/border|background|padding|backdrop-filter/.test(hostBlock),
      "no panel chrome on the host — that would draw a box inside the chip",
    );
    chip.remove();
  });
});
