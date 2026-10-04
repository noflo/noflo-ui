import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-editor.js";

describe("FlowEditor Web Component", async () => {
  it("should render", async () => {
    // Arrange: Create element and attach it to the mocked DOM
    const el = document.createElement("noflo-editor");
    document.body.appendChild(el);

    // Teardown: Clean up DOM state
    document.body.removeChild(el);
  });
});
