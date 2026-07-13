import assert from "node:assert";
import { describe, it } from "node:test";

import "./utils/register.js";

import { FlowEditor } from "../../src/elements/noflo-editor.js";

customElements.define("noflo-editor", FlowEditor);

describe("FlowEditor Coordinate Conversions", async () => {
  it("should convert coordinates correctly", async () => {
    const el = document.createElement("noflo-editor");
    document.body.appendChild(el);

    // Mock getBoundingClientRect for the element
    el.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      width: 500,
      height: 500,
      right: 600,
      bottom: 600,
    });

    // Mock offset and zoom
    el.offset = { x: 50, y: 50 };
    el.zoom = 2.0;
    el.updateTransform();

    // 1. Test viewportToGraph
    // viewportX = 100, viewportY = 100
    // graphX = (100 - 50) / 2 = 25
    // graphY = (100 - 50) / 2 = 25
    const graphPos1 = el.viewportToGraph(100, 100);
    assert.strictEqual(graphPos1.x, 25);
    assert.strictEqual(graphPos1.y, 25);

    // 2. Test graphToViewport
    // graphX = 25, graphY = 25
    // viewportX = 25 * 2 + 50 = 100
    // viewportY = 25 * 2 + 50 = 100
    const viewportPos1 = el.graphToViewport(25, 25);
    assert.strictEqual(viewportPos1.x, 100);
    assert.strictEqual(viewportPos1.y, 100);

    // 3. Test clientToGraph
    // clientX = 200 (so viewportX = 200 - 100 = 100)
    // clientY = 200 (so viewportY = 200 - 100 = 100)
    // graphX = (100 - 50) / 2 = 25
    // graphY = (100 - 50) / 2 = 25
    const graphPos2 = el.clientToGraph(200, 200);
    assert.strictEqual(graphPos2.x, 25);
    assert.strictEqual(graphPos2.y, 25);

    // 4. Test graphToClient
    // graphX = 25, graphY = 25
    // viewportX = 100, viewportY = 100
    // clientX = 100 + 100 = 200
    // clientY = 100 + 100 = 200
    const clientPos1 = el.graphToClient(25, 25);
    assert.strictEqual(clientPos1.x, 200);
    assert.strictEqual(clientPos1.y, 200);

    document.body.removeChild(el);
  });
});
