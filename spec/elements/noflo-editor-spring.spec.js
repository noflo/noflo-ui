import assert from "node:assert";
import { describe, it } from "node:test";

import "./utils/register.js";

import { FlowEditor } from "../../src/elements/noflo-editor.js";
import { FlowNode } from "../../src/elements/noflo-node.js";

customElements.define("noflo-editor", FlowEditor);
customElements.define("noflo-node", FlowNode);

/**
 * @param {FlowEditor} el
 * @returns {FlowNode}
 */
function makeSelectedNode(el) {
  const node = /** @type {FlowNode} */ (
    document.createElement("noflo-node")
  );
  node.size = 80;
  node.position = { x: 0, y: 0 };
  el.nodeLayer.appendChild(node);
  el.selectedNodes.add(node);
  return node;
}

describe("FlowEditor spring jump", () => {
  it("applies a spring CSS transition when a node jumps to a legal spot", () => {
    const el = /** @type {FlowEditor} */ (
      document.createElement("noflo-editor")
    );
    document.body.appendChild(el);

    const node = makeSelectedNode(el);

    el._startSpringJump([{ node, x: 120, y: 80 }]);

    // The spring should be active and a springy transition applied...
    assert.strictEqual(el.isSpringing, true);
    assert.ok(
      node.style.transition.includes("cubic-bezier"),
      `expected a cubic-bezier transition, got: ${node.style.transition}`,
    );
    // ...and the node should already be at its target logical position.
    assert.strictEqual(node.position.x, 120);
    assert.strictEqual(node.position.y, 80);

    el._endSpring();
    document.body.removeChild(el);
  });

  it("removes the transition as soon as the spring completes", () => {
    const el = /** @type {FlowEditor} */ (
      document.createElement("noflo-editor")
    );
    document.body.appendChild(el);

    const node = makeSelectedNode(el);

    el._startSpringJump([{ node, x: 200, y: 200 }]);
    assert.ok(node.style.transition.includes("cubic-bezier"));

    el._endSpring();

    // The transition is removed so subsequent movement is instant again.
    assert.strictEqual(el.isSpringing, false);
    assert.strictEqual(node.style.transition, "");
    assert.strictEqual(el.springRefreshFrame, null);

    document.body.removeChild(el);
  });

  it("skips the animation when reduced motion is requested", () => {
    const el = /** @type {FlowEditor} */ (
      document.createElement("noflo-editor")
    );
    document.body.appendChild(el);

    const node = makeSelectedNode(el);

    const originalMatchMedia = window.matchMedia;
    /** @type {any} */
    window.matchMedia = () => ({ matches: true });
    try {
      el._startSpringJump([{ node, x: 50, y: 50 }]);
    } finally {
      window.matchMedia = originalMatchMedia;
    }

    // No spring, no transition, but the node still jumps to the target.
    assert.strictEqual(el.isSpringing, false);
    assert.strictEqual(node.style.transition, "");
    assert.strictEqual(node.position.x, 50);
    assert.strictEqual(node.position.y, 50);

    document.body.removeChild(el);
  });
});
