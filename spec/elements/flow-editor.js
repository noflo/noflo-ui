import assert from "node:assert";
import { describe, it } from "node:test";

import "./utils/register.js";

import { FlowEditor } from "../../src/elements/flow-editor.js";

describe("FlowEditor Web Component", async () => {
  it("should be a CustomElement", () => {
    assert.ok(FlowEditor.toString().includes("extends HTMLElement"));
  });
  it("should render", async () => {
    // Arrange: Create element and attach it to the mocked DOM
    const el = document.createElement("flow-editor");
    document.body.appendChild(el);

    // Teardown: Clean up DOM state
    document.body.removeChild(el);
  });
});
