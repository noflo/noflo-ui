import assert from "node:assert";
import { describe, it } from "node:test";

import "./utils/register.js";

import { FlowEditor } from "../../src/elements/noflo-editor.js";
import { FlowNode } from "../../src/elements/noflo-node.js";

customElements.define("noflo-editor", FlowEditor);
customElements.define("noflo-node", FlowNode);

describe("FlowEditor Edge Selection", async () => {
  it("should select an edge when clicked", async () => {
    const el = document.createElement("noflo-editor");
    document.body.appendChild(el);

    // Create nodes and connect them
    const nodeA = el.addNode("A", 0, 0);
    const nodeB = el.addNode("B", 100, 0);
    el.connectNodes(nodeA, "out0", nodeB, "in0");

    const edge = el.edges[0];
    assert.ok(edge, "Edge should be created");

    // Prepare to capture the selection-changed event
    let selectionChangedEvent = null;
    el.addEventListener("selection-changed", (e) => {
      selectionChangedEvent = e;
    });

    // Try to use PointerEvent if available, otherwise fallback to CustomEvent
    let event;
    if (typeof PointerEvent !== "undefined") {
      event = new PointerEvent("pointerdown", {
        pointerId: 1,
        clientX: 50,
        clientY: 50,
        bubbles: true,
        composed: true,
      });
    } else {
      event = new CustomEvent("pointerdown", {
        bubbles: true,
        composed: true,
      });
      event.pointerId = 1;
      event.clientX = 50;
      event.clientY = 50;
    }

    Object.defineProperty(event, "composedPath", {
      value: () => [edge.hitPath, el],
      enumerable: true,
      configurable: true,
      writable: true,
    });

    // Dispatch the event
    edge.hitPath.dispatchEvent(event);

    // Now check if edge is selected
    assert.ok(el.selectedEdges.has(edge), "Edge should be selected");
    assert.ok(
      edge.visualPath.hasAttribute("selected"),
      "Visual path should have 'selected' attribute",
    );

    // Check selection-changed event
    assert.ok(
      selectionChangedEvent,
      "selection-changed event should have been emitted",
    );
    assert.strictEqual(
      selectionChangedEvent.detail.edges[0],
      edge,
      "Selected edge should be in event detail",
    );

    document.body.removeChild(el);
  });
});
