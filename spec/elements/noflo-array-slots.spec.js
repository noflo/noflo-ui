import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-node.js";
import "../../src/elements/noflo-editor.js";
import { renderGraphIntoEditor } from "../../src/glass/renderGraph.js";

/**
 * @param {string} name
 * @param {number} index
 * @returns {HTMLElement | null}
 */
function arrayPort(shadow, name, index) {
  return shadow.querySelector(
    `.port[data-port-name="${name}"][data-port-index="${index}"]`,
  );
}

describe("addressable port slots (work document #5)", () => {
  it("renders three instances by default, growing with attachments", () => {
    const node = document.createElement("noflo-node");
    document.body.appendChild(node);
    node.setPorts(
      [{ name: "in", type: "all", addressable: true }],
      [{ name: "out" }],
    );
    const shadow = /** @type {ShadowRoot} */ (node.shadowRoot);
    assert.equal(
      shadow.querySelectorAll('.port[data-port-type="array"]').length,
      3,
      "the default fan is three instances",
    );

    // in[0]–in[2] attached: in[3] renders free
    node.setPortUsage({ in: { in: [0, 1, 2] } });
    assert.ok(arrayPort(shadow, "in", 3), "the next slot renders");
    assert.ok(!arrayPort(shadow, "in", 4));

    // Gaps don't count: only in[2] attached still grows to in[3]
    node.setPortUsage({ in: { in: [2] } });
    assert.ok(arrayPort(shadow, "in", 3));
    assert.ok(arrayPort(shadow, "in", 0), "the unattached low slots render");

    node.remove();
  });

  it("array instances identify by base name plus slot index", () => {
    const node = document.createElement("noflo-node");
    document.body.appendChild(node);
    node.setPorts(
      [{ name: "in", type: "all", addressable: true }],
      [{ name: "out" }],
    );
    const shadow = /** @type {ShadowRoot} */ (node.shadowRoot);
    const first = /** @type {HTMLElement} */ (arrayPort(shadow, "in", 0));
    assert.equal(
      first.dataset.portName,
      "in",
      "the dataset carries the base name, the canonical port-ref form",
    );
    assert.equal(first.dataset.portIndex, "0");
    const label = /** @type {HTMLElement} */ (
      shadow.querySelector(
        `.port-label[data-port-name="in"][data-port-index="${first.dataset.portIndex}"]`,
      )
    );
    assert.match(
      label?.textContent ?? "",
      /in\[0\]/,
      "the label shows the slot",
    );
    node.remove();
  });

  it("renderGraph applies usage before wiring, so wires keep live ports", () => {
    const editor = document.createElement("noflo-editor");
    document.body.appendChild(editor);
    const view = {
      nodes: [
        { id: "A", component: "test", metadata: { x: 80, y: 80 } },
        { id: "B", component: "test", metadata: { x: 400, y: 80 } },
      ],
      edges: [
        {
          from: { node: "B", port: "out" },
          to: { node: "A", port: "in", index: 1 },
        },
      ],
      initializers: [
        {
          from: { data: "42" },
          to: { node: "A", port: "in", index: 0 },
          metadata: {},
        },
      ],
      inports: {},
      outports: {},
      groups: [],
      properties: { name: "main" },
    };
    /** @type {any} */ (editor.libraryManager) = {
      getComponent: () => ({
        name: "test",
        inports: [{ name: "in", addressable: true }],
        outports: [{ name: "out" }],
      }),
      addEventListener() {},
      removeEventListener() {},
    };
    const elements = renderGraphIntoEditor(
      view,
      editor,
      (/** @type {string} */ name) =>
        /** @type {any} */ (editor.libraryManager).getComponent(name),
    );
    const nodeA = /** @type {any} */ (elements.get("A"));
    const shadow = /** @type {ShadowRoot} */ (nodeA.shadowRoot);

    // Both attached slots drove the fan: in[2] renders free
    assert.ok(
      shadow.querySelector('.port[data-port-name="in"][data-port-index="2"]'),
      "the free end slot renders",
    );
    // Every wire's port reference is a LIVE element: setPortUsage ran
    // before the wires connected, so no render pass orphans them
    for (const wire of editor.iipWires) {
      assert.ok(wire.port?.isConnected, "the wire's port element is live");
    }
    for (const edge of editor.edges) {
      assert.ok(edge.portA?.isConnected && edge.portB?.isConnected);
    }
    editor.remove();
  });
});
