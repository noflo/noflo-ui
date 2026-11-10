import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-node.js";

/**
 * A node with the given outport count, connected and rendered.
 *
 * @param {number} outports
 * @returns {any}
 */
function makeNode(outports) {
  const node = /** @type {any} */ (document.createElement("noflo-node"));
  document.body.appendChild(node);
  node.setPorts(
    [{ type: "regular" }],
    Array.from({ length: outports }, () => ({ type: "regular" })),
  );
  return node;
}

/**
 * The outport dots' vertical span in px (the fan's readout).
 *
 * @param {any} node
 * @returns {number}
 */
function outportSpan(node) {
  const ys = [...node.portsContainer.querySelectorAll(".port-out")]
    .map((/** @type {HTMLElement} */ port) => Number.parseFloat(port.style.top))
    .sort((a, b) => a - b);
  return ys[ys.length - 1] - ys[0];
}

describe("the port fan (guidelines §9)", () => {
  it("a sparse side keeps the quarter arc", () => {
    const node = makeNode(2);
    const span = outportSpan(node);
    // Two ports on the quarter arc: ~56px, not the hemisphere's ~80px
    assert.ok(span < 70, `two ports stay on the quarter arc (${span})`);
    node.remove();
  });

  it("four same-side ports fan across the full hemisphere", () => {
    const node = makeNode(4);
    const span = outportSpan(node);
    // The hemisphere's extremes sit at the vertical diameter: ~80px
    assert.ok(span > 70, `four ports fan across the full hemisphere (${span})`);
    node.remove();
  });

  it("fanned labels never overlap (the offset labels)", () => {
    const node = makeNode(5);
    const tops = [...node.portsContainer.querySelectorAll(".port-out-label")]
      .map((/** @type {HTMLElement} */ label) =>
        Number.parseFloat(label.style.top),
      )
      .sort((a, b) => a - b);
    for (let i = 1; i < tops.length; i++) {
      assert.ok(
        tops[i] - tops[i - 1] >= 12,
        `no two fanned labels overlap (${tops[i - 1]} → ${tops[i]})`,
      );
    }
    node.remove();
  });
});
