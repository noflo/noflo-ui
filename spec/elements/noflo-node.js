import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-node.js";

describe("FlowNode Web Component", async () => {
  it("should render", async () => {
    // Arrange: Create element and attach it to the mocked DOM
    const el = document.createElement("noflo-node");
    document.body.appendChild(el);

    // Teardown: Clean up DOM state
    document.body.removeChild(el);
  });
});
