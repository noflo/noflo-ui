import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-editor.js";

describe("FlowEditor groups (work document #5 update #16)", () => {
  it("renders a padded region around the group's members", () => {
    const ed = document.createElement("noflo-editor");
    document.body.appendChild(ed);
    ed.addNode("A", "c/X", { x: 560, y: 360 });
    ed.addNode("B", "c/X", { x: 640, y: 360 });
    ed.setGroups([{ id: "g1", name: "Pipelining", nodes: ["A", "B"] }]);

    const shadow = /** @type {ShadowRoot} */ (ed.shadowRoot);
    const region = /** @type {SVGRectElement} */ (
      shadow.querySelector(".group-region")
    );
    assert.ok(region, "the region renders");
    assert.equal(region.getAttribute("data-group-id"), "g1");
    // Two members at 560/640: bounding box 560..720 plus 48 padding each
    // side, offset by the 8000 graph-coordinate origin
    assert.equal(region.getAttribute("x"), "8512");
    assert.equal(Number(region.getAttribute("width")), 256);
    const label = /** @type {SVGTextElement} */ (
      shadow.querySelector(".group-label")
    );
    assert.equal(label?.textContent, "Pipelining");
    ed.remove();
  });

  it("a drag into the group's area emits a membership update", () => {
    const ed = document.createElement("noflo-editor");
    document.body.appendChild(ed);
    ed.addNode("A", "c/X", { x: 560, y: 360 });
    ed.addNode("B", "c/X", { x: 640, y: 360 });
    ed.setGroups([{ id: "g1", name: "", nodes: ["A"] }]);

    /** @type {any} */
    let update = null;
    ed.addEventListener("update-group-attempt", (e) => {
      update = e.detail;
    });
    // B dropped onto the adjacent grid cell: its center is inside the
    // padded region (the padding must exceed half a node plus half a cell)
    ed.emitGroupMembershipChanges([
      { name: "B", position: { x: 560, y: 360 } },
    ]);
    assert.ok(update, "the membership update emits");
    assert.deepEqual(update.memberships, [
      { groupId: "g1", add: ["B"], remove: [] },
    ]);

    // A member dragged far away leaves the group
    update = null;
    ed.emitGroupMembershipChanges([
      { name: "A", position: { x: 2000, y: 2000 } },
    ]);
    assert.ok(update, "the leave emits");
    assert.deepEqual(update.memberships[0].remove, ["A"]);
    ed.remove();
  });
});

describe("FlowEditor appearing-node animations (work document #5 update #16)", () => {
  it("marks fresh nodes with the spring and shimmer classes", () => {
    const ed = document.createElement("noflo-editor");
    document.body.appendChild(ed);
    ed.addNode("A", "c/X", { x: 100, y: 100 });
    ed.addNode("B", "c/X", { x: 200, y: 100 });

    ed.animateNewNodes(["A"]);
    const shadow = /** @type {ShadowRoot} */ (ed.shadowRoot);
    const nodeA = /** @type {any} */ (shadow.querySelector("[name='A']"));
    const nodeB = /** @type {any} */ (shadow.querySelector("[name='B']"));
    assert.ok(
      nodeA.classList.contains("node-appear") &&
        nodeA.classList.contains("node-shimmer"),
      "the fresh node springs and shimmers",
    );
    assert.ok(
      !nodeB.classList.contains("node-appear"),
      "already-seen nodes stay still",
    );
    ed.remove();
  });
});
