import assert from "node:assert";
import { describe, it } from "node:test";

import "./utils/register.js";

import { FlowEditor } from "../../src/elements/noflo-editor.js";
import { FlowNode } from "../../src/elements/noflo-node.js";

customElements.define("noflo-editor", FlowEditor);
customElements.define("noflo-node", FlowNode);

describe("FlowEditor Events", async () => {
  it("should emit wire-connection-attempt when a wire is completed", async () => {
    const el = document.createElement("noflo-editor");
    document.body.appendChild(el);

    const eventPromise = new Promise((resolve) => {
      el.addEventListener("wire-connection-attempt", (e) => {
        resolve(e);
      });
    });

    const portA = document.createElement("div");
    portA.classList.add("port", "port-out");
    portA.dataset.portName = "out";

    const portB = document.createElement("div");
    portB.classList.add("port", "port-in");
    portB.dataset.portName = "in";

    // Set up the mock state
    el.dragPort = portA;
    el.activeWire = el.edgesGroup.ownerDocument.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    el.edgesGroup.appendChild(el.activeWire);

    // Mock how it finds ports.
    const originalQuerySelectorAll = el.shadowRoot.querySelectorAll;
    el.shadowRoot.querySelectorAll = (selector) => {
      if (selector === "noflo-node") {
        return [
          {
            shadowRoot: {
              querySelectorAll: () => [portB],
            },
          },
        ];
      }
      return originalQuerySelectorAll.call(el.shadowRoot, selector);
    };

    // Mock getBoundingClientRect for portB
    portB.getBoundingClientRect = () => ({
      left: 90,
      top: 90,
      width: 20,
      height: 20,
      right: 110,
      bottom: 110,
    });

    const mockEvent = {
      clientX: 100,
      clientY: 100,
    };

    el.completeWireDrag(mockEvent);
    const event = await eventPromise;
    assert.strictEqual(event.type, "wire-connection-attempt");
    assert.strictEqual(event.detail.portA, portA);
    assert.strictEqual(event.detail.portB, portB);

    document.body.removeChild(el);
  });

  it("should emit node-creation-attempt when a wire is completed on a ghost node", async () => {
    const el = document.createElement("noflo-editor");
    document.body.appendChild(el);

    const eventPromise = new Promise((resolve) => {
      el.addEventListener("node-creation-attempt", (e) => {
        resolve(e);
      });
    });

    // Mock the ghost node
    const ghostNode = document.createElement("div");
    ghostNode.className = "ghost-node";
    el.nodeLayer.appendChild(ghostNode);
    el.ghostNode = ghostNode;

    el.dragPort = document.createElement("div");
    el.dragPort.classList.add("port", "port-out");
    el.activeWire = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    el.edgesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    el.shadowRoot.appendChild(el.edgesGroup);
    el.edgesGroup.appendChild(el.activeWire);

    const mockEvent = {
      clientX: 100,
      clientY: 100,
    };

    // Mock offset and zoom to control snapped position
    el.offset = { x: 0, y: 0 };
    el.zoom = 1;

    el.completeWireDrag(mockEvent);

    const event = await eventPromise;
    assert.strictEqual(event.type, "node-creation-attempt");
    // snapped position for (100-40, 100-40) = (60, 60) with H=40 is (80, 80)
    assert.strictEqual(event.detail.x, 80);
    assert.strictEqual(event.detail.y, 80);
    assert.strictEqual(event.detail.startPort, el.dragPort);

    document.body.removeChild(el);
  });
});
