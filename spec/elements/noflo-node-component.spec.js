import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-node.js";

describe("FlowNode component reflection", () => {
  it("reflects the component property to an attribute", () => {
    const node = document.createElement("noflo-node");
    node.component = "sketchy";
    assert.equal(node.getAttribute("component"), "sketchy");
    assert.equal(node.component, "sketchy");
    node.component = "other";
    assert.equal(node.getAttribute("component"), "other");
  });
});
