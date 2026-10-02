import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import { FlowEditor } from "../../src/elements/noflo-editor.js";
import { FlowNode } from "../../src/elements/noflo-node.js";

customElements.define("noflo-editor", FlowEditor);
customElements.define("noflo-node", FlowNode);

describe("FlowEditor subgraph gating (work document #23)", () => {
  it("treats only subgraph-typed components as openable", () => {
    const ed = /** @type {FlowEditor} */ (
      document.createElement("noflo-editor")
    );
    ed.libraryManager = /** @type {any} */ ({
      getComponent: (/** @type {string} */ name) =>
        name === "mylib/Sub" ? { type: "subgraph" } : { type: "stub" },
    });

    const subgraphNode = /** @type {FlowNode} */ (
      document.createElement("noflo-node")
    );
    subgraphNode.component = "mylib/Sub";
    assert.ok(ed.isSubgraphNode(subgraphNode), "subgraph component opens");

    const plainNode = /** @type {FlowNode} */ (
      document.createElement("noflo-node")
    );
    plainNode.component = "core/Hello";
    assert.ok(!ed.isSubgraphNode(plainNode), "elementary node does not open");
  });

  it("is conservative without a library", () => {
    const ed = /** @type {FlowEditor} */ (
      document.createElement("noflo-editor")
    );
    const node = /** @type {FlowNode} */ (document.createElement("noflo-node"));
    node.component = "mylib/Sub";
    assert.ok(!ed.isSubgraphNode(node));
  });
});

describe("FlowEditor subgraph context menu (work document #23)", () => {
  it("offers Open but not Make subgraph on subgraph nodes", () => {
    const ed = /** @type {FlowEditor} */ (
      document.createElement("noflo-editor")
    );
    ed.libraryManager = /** @type {any} */ ({
      getComponent: (/** @type {string} */ name) =>
        name === "mylib/Sub" ? { type: "subgraph" } : { type: "stub" },
    });
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
    };

    const subgraphNode = /** @type {FlowNode} */ (
      document.createElement("noflo-node")
    );
    subgraphNode.component = "mylib/Sub";
    subgraphNode.setAttribute("name", "sub");
    ed.showContextMenu(0, 0, { clickedNode: subgraphNode });
    const texts = opened[0].map((item) => item.text);
    assert.ok(texts.includes("Open"), "Open is offered");
    assert.ok(!texts.includes("Make subgraph"), "Make subgraph is not");

    opened.length = 0;
    const plainNode = /** @type {FlowNode} */ (
      document.createElement("noflo-node")
    );
    plainNode.component = "core/Hello";
    plainNode.setAttribute("name", "plain");
    ed.showContextMenu(0, 0, { clickedNode: plainNode });
    const plainTexts = opened[0].map((item) => item.text);
    assert.ok(plainTexts.includes("Make subgraph"), "elementary can convert");
    assert.ok(!plainTexts.includes("Open"), "elementary cannot open");
  });
});
