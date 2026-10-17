import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-editor.js";

describe("FlowEditor groups (work document #5 update #16)", () => {
  it("renders the zone as the union of its members' cells", () => {
    const ed = document.createElement("noflo-editor");
    document.body.appendChild(ed);
    ed.addNode("A", "c/X", { x: 560, y: 360 });
    ed.addNode("B", "c/X", { x: 640, y: 360 });
    ed.setGroups([{ id: "g1", name: "Pipelining", nodes: ["A", "B"] }]);

    const shadow = /** @type {ShadowRoot} */ (ed.shadowRoot);
    const region = /** @type {SVGPathElement} */ (
      shadow.querySelector(".group-region")
    );
    assert.ok(region, "the region renders");
    assert.equal(region.getAttribute("data-group-id"), "g1");
    assert.ok(
      region.getAttribute("d")?.startsWith("M "),
      "the zone is a traced contour, not a bounding rectangle",
    );
    // The zone's cells cover both members plus the dilation ring: the
    // member centers land inside, the ring around them too
    const cells = ed.zoneShapeFor({
      id: "g1",
      name: "Pipelining",
      nodes: ["A", "B"],
    })?.cells;
    assert.ok(cells, "the zone cells compute");
    assert.ok(
      ed.spaceManager.pointInZone(cells, 600, 400),
      "member A's center is in the zone",
    );
    assert.ok(
      ed.spaceManager.pointInZone(cells, 700, 400),
      "member B's center is in the zone",
    );
    const label = /** @type {SVGTextElement} */ (
      shadow.querySelector(".group-label")
    );
    assert.equal(label?.textContent, "Pipelining");
    ed.remove();
  });

  it("the zone flows around a node that is not in the group", () => {
    const ed = document.createElement("noflo-editor");
    document.body.appendChild(ed);
    // Two members with a two-cell gap; an outsider sits between them —
    // the old bounding rectangle would cover it
    ed.addNode("A", "c/X", { x: 0, y: 0 });
    ed.addNode("OUT", "c/X", { x: 200, y: 0 });
    ed.addNode("B", "c/X", { x: 480, y: 0 });
    ed.setGroups([{ id: "g1", name: "Pipelining", nodes: ["A", "B"] }]);

    const cells = ed.zoneShapeFor({
      id: "g1",
      name: "Pipelining",
      nodes: ["A", "B"],
    })?.cells;
    assert.ok(cells, "the zone cells compute");
    // The outsider's center (240, 40): the members' dilation rings reach
    // one cell (40px) into the gap, but the outsider's own cell stays
    // outside the zone
    assert.ok(
      !ed.spaceManager.pointInZone(cells, 240, 40),
      "the non-member's center is not in the zone",
    );
    // And a drop at the outsider's position does not join the group —
    // the membership test reads the same cells the zone renders
    /** @type {any} */
    let update = null;
    ed.addEventListener("update-group-attempt", (e) => {
      update = e.detail;
    });
    ed.emitGroupMembershipChanges([
      { name: "OUT", position: { x: 200, y: 0 } },
    ]);
    assert.ok(!update, "dropping on the outsider does not join the group");
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

  it("nested zones read as tariff zones: outer paints first, depth steps down", () => {
    const ed = document.createElement("noflo-editor");
    document.body.appendChild(ed);
    ed.addNode("A", "c/X", { x: 560, y: 360 });
    ed.addNode("B", "c/X", { x: 640, y: 360 });
    ed.addNode("C", "c/X", { x: 900, y: 360 });
    // Creation order is inner-first: the paint order must not follow it
    ed.setGroups([
      { id: "g-inner", name: "Stage", nodes: ["A", "B"] },
      { id: "g-outer", name: "Pipeline", nodes: ["A", "B", "C"] },
    ]);

    const shadow = /** @type {ShadowRoot} */ (ed.shadowRoot);
    const layer = shadow.querySelector("#groups-group");
    const regions = [...layer.querySelectorAll(".group-region")];
    assert.equal(regions.length, 2);
    const outer = regions.find(
      (r) => r.getAttribute("data-group-id") === "g-outer",
    );
    const inner = regions.find(
      (r) => r.getAttribute("data-group-id") === "g-inner",
    );
    assert.ok(outer && inner);
    assert.ok(
      regions.indexOf(outer) < regions.indexOf(inner),
      "the outermost zone paints first, the nested zone reads inside it",
    );
    assert.ok(
      inner.classList.contains("depth-1"),
      "the contained zone steps its border down",
    );
    assert.ok(
      !outer.classList.contains("depth-1"),
      "the containing zone keeps the full weight",
    );
    ed.remove();
  });

  it("the zone styling follows the theme's fare-zone grammar", () => {
    const ed = document.createElement("noflo-editor");
    document.body.appendChild(ed);
    const style =
      /** @type {HTMLElement} */ (
        /** @type {ShadowRoot} */ (ed.shadowRoot).querySelector("style")
      ).textContent ?? "";
    // Cyberpunk: a panel-tone fill at the decor ceiling (8%) with a soft
    // glow
    assert.match(style, /\.group-region \{[^}]*8%, transparent/);
    assert.match(style, /\.group-region \{[^}]*drop-shadow/);
    // Tube: the fare-zone grammar — solid light-grey areas with no
    // border, the way zones 2+ read on the Underground map
    assert.match(
      style,
      /:host\(\[data-theme="tube"\]\) \.group-region \{[^}]*var\(--group-zone-fill/,
    );
    assert.match(
      style,
      /:host\(\[data-theme="tube"\]\) \.group-region \{[^}]*stroke: none/,
    );
    // Zone labels render in the theme's panel typography
    assert.match(style, /\.group-label \{[^}]*SourceCodePro/);
    assert.match(
      style,
      /:host\(\[data-theme="tube"\]\) \.group-label \{[^}]*sans-serif/,
    );
    ed.remove();
  });

  describe("the group affordances (work document #35 review)", () => {
    /** An editor with two nodes and a captured radial menu. */
    function menuEditor() {
      const ed = document.createElement("noflo-editor");
      document.body.appendChild(ed);
      ed.addNode("A", "c/X", { x: 560, y: 360 });
      ed.addNode("B", "c/X", { x: 900, y: 360 });
      /** @type {any[][]} */
      const opened = [];
      /** @type {any} */ (ed).radialMenu = {
        open: (
          /** @type {number} */ _x,
          /** @type {number} */ _y,
          /** @type {any[]} */ items,
        ) => {
          opened.push(items);
        },
        close() {},
      };
      return { ed, opened };
    }

    it("the Group item's label carries its scope: selection vs single node", () => {
      const { ed, opened } = menuEditor();
      const nodeA = ed.nodeLayer.querySelector('noflo-node[name="A"]');
      const nodeB = ed.nodeLayer.querySelector('noflo-node[name="B"]');

      // Right-clicking an unselected node groups just that node — and
      // the label says so
      ed.showContextMenu(0, 0, { clickedNode: nodeB });
      let texts = opened[0].map((item) => item.text);
      assert.ok(
        texts.includes("Group node"),
        "an unselected click groups only itself, and says so",
      );

      // Multi-select, then right-click a selected node: the label names
      // the scope
      ed.selectionManager.select("nodes", "A", true);
      ed.selectionManager.select("nodes", "B", true);
      ed.showContextMenu(0, 0, { clickedNode: nodeA });
      texts = opened[1].map((item) => item.text);
      assert.ok(
        texts.includes("Group selection (2)"),
        "the multi-selection groups as one, and says so",
      );
      ed.remove();
    });

    it("the canvas menu groups the selection without right-clicking a member", () => {
      const { ed, opened } = menuEditor();
      ed.selectionManager.select("nodes", "A", true);
      ed.selectionManager.select("nodes", "B", true);
      ed.showContextMenu(0, 0, {});
      const texts = opened[0].map((item) => item.text);
      assert.ok(
        texts.includes("Group selection (2)"),
        "the canvas menu offers grouping for an active selection",
      );
      ed.remove();
    });

    it("the group menu carries Rename beside Ungroup", () => {
      const { ed, opened } = menuEditor();
      ed.setGroups([{ id: "g1", name: "Pipelining", nodes: ["A"] }]);
      const region = /** @type {SVGRectElement} */ (
        ed.shadowRoot.querySelector(".group-region")
      );
      ed.showContextMenu(0, 0, { clickedGroup: region });
      const texts = opened[0].map((item) => item.text);
      assert.ok(texts.includes("Rename"), "the zone's name is editable");
      assert.ok(texts.includes("Ungroup"));
      // The rename attempt carries the group's id
      /** @type {any[]} */
      const attempts = [];
      ed.addEventListener("group-rename-attempt", (e) => {
        attempts.push(/** @type {any} */ (e).detail);
      });
      opened[0].find((item) => item.text === "Rename").onClick();
      assert.deepEqual(attempts, [{ groupId: "g1" }]);
      ed.remove();
    });
  });
});
