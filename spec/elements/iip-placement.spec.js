import { describe, it } from "node:test";
import assert from "node:assert";
import "./utils/register.js";
import { FlowEditor } from "../../src/elements/noflo-editor.js";
import { FlowNode } from "../../src/elements/noflo-node.js";

customElements.define("noflo-editor", FlowEditor);
customElements.define("noflo-node", FlowNode);

describe("IIP Placement", async () => {
  it("should place IIP to the left of the node when associated with an inport", async () => {
    // Arrange: Create element and attach it to the mocked DOM
    const el = document.createElement("noflo-editor");
    document.body.appendChild(el);

    // Wait for the editor to be ready (it has a render method)
    // Since it's a Web Component, we might need to wait a bit for it to connect
    await new Promise((resolve) => setTimeout(resolve, 50));

    const editor = el;

    // 1. Add a node
    const nodeName = "TestNode";
    const nodeX = 500;
    const nodeY = 500;
    const nodeSize = 80;
    const node = editor.addNode(nodeName, nodeX, nodeY, [{ type: "regular" }], [{ type: "regular" }], nodeSize);

    // 2. Get an inport from the node
    // We need to wait for the node to be rendered in the shadow DOM
    await new Promise((resolve) => setTimeout(resolve, 50));
    const inport = node.shadowRoot.querySelector(".port-in");
    assert.ok(inport, "Inport should exist");
    console.log("Inport classList:", inport.classList.value);
    console.log("Inport tagName:", inport.tagName);

    // 3. Add an IIP associated with this inport
    // We use the same logic as completeWireDrag or showContextMenu
    const iipValue = "TestIIPValue";
    // The current implementation of addIIP(x, y, port) uses x,y as center.
    // We'll pass some arbitrary x,y because it should be overridden.
    const iip = editor.addIIP(100, 100, inport, iipValue);

    // 4. Assert IIP position
    // Expected center:
    // nodePos.x - size - 20 = 500 - 40 - 20 = 440
    // nodePos.y + nodeSize/2 - size/2 = 500 + 40 - 20 = 520
    // Let's check the snap to grid.
    // snapped.x = snap(440 - 20) = snap(420) = 400.
    // snapped.y = snap(520 - 20) = snap(500) = 500.
    // Wait, if snapped.x is 400, and size is 40, then center is 420.
    // If snapped.y is 500, and size is 40, then center is 520.

    const expectedCenterX = 420;
    const expectedCenterY = 520;

    // Due to snapping, let's check if it's close to what we expect.
    // The actual center of the IIP element will be position.x + size/2
    const actualCenterX = iip.position.x + iip.size / 2;
    const actualCenterY = iip.position.y + iip.size / 2;

    assert.strictEqual(actualCenterX, expectedCenterX, `Expected IIP center X to be ${expectedCenterX}, but got ${actualCenterX}`);
    assert.strictEqual(actualCenterY, expectedCenterY, `Expected IIP center Y to be ${expectedCenterY}, but got ${actualCenterY}`);

    // Teardown
    document.body.removeChild(el);
  });
});
