import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-node.js";
import "../../src/elements/noflo-editor.js";

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

  it("the editor syncs usage from edges, IIPs, and exports", () => {
    const editor = document.createElement("noflo-editor");
    document.body.appendChild(editor);
    const nodeA = editor.addNode("A", "test", { x: 80, y: 80 });
    nodeA.setPorts(
      [{ name: "in", type: "all", addressable: true }],
      [{ name: "out" }],
    );
    const nodeB = editor.addNode("B", "test", { x: 400, y: 80 });
    nodeB.setPorts([{ name: "in" }], [{ name: "out" }]);

    // Edge into A's slot 1
    editor.connectNodes(nodeB, "out", nodeA, "in", undefined, undefined, 1);
    // IIP into A's slot 0
    const slot0 = /** @type {HTMLElement} */ (
      /** @type {ShadowRoot} */ (nodeA.shadowRoot).querySelector(
        '.port[data-port-name="in"][data-port-index="0"]',
      )
    );
    editor.addIIP(0, 0, slot0, "42");

    editor.syncArrayPortUsage();
    assert.deepEqual(nodeA._portUsage.in, { in: [0, 1] });
    assert.deepEqual(
      nodeB._portUsage,
      {},
      "nodes without addressable attachments are not touched",
    );
    editor.remove();
  });
});
