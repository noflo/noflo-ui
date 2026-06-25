import assert from "node:assert";
import { describe, it } from "node:test";

import "./utils/register.js";

import { FlowNode } from "../../src/elements/flow-node.js";

describe("FlowNode Web Component", async () => {
  it("should be a CustomElement", () => {
    assert.ok(FlowNode.toString().includes("extends HTMLElement"));
  });
  it("should render", async () => {
    // Arrange: Create element and attach it to the mocked DOM
    const el = document.createElement("flow-node");
    document.body.appendChild(el);

    // Teardown: Clean up DOM state
    document.body.removeChild(el);
  });
});
