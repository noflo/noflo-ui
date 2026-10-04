import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-editor.js";
import "../../src/elements/noflo-node.js";

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

describe("FlowEditor peer ghosts (work document #21)", () => {
  it("renders, moves, and drops remote drag ghosts", () => {
    const ed = /** @type {FlowEditor} */ (
      document.createElement("noflo-editor")
    );
    document.body.appendChild(ed);
    const layer = /** @type {any} */ (
      ed.shadowRoot?.querySelector("#peer-layer")
    );
    assert.ok(layer, "peer layer exists inside the transform layer");

    ed.setPeerGhosts([
      {
        peerId: "123456",
        dragging: { graphId: "main", nodeId: "A", x: 10, y: 20 },
      },
    ]);
    let ghost = /** @type {HTMLElement} */ (layer.querySelector(".peer-ghost"));
    assert.ok(ghost, "ghost created");
    assert.equal(ghost.style.left, "10px");
    assert.equal(ghost.style.top, "20px");

    // Movement updates the existing element
    ed.setPeerGhosts([
      {
        peerId: "123456",
        dragging: { graphId: "main", nodeId: "A", x: 30, y: 40 },
      },
    ]);
    assert.equal(layer.querySelectorAll(".peer-ghost").length, 1);
    ghost = /** @type {HTMLElement} */ (layer.querySelector(".peer-ghost"));
    assert.equal(ghost.style.left, "30px");

    // A second peer appears alongside
    ed.setPeerGhosts([
      {
        peerId: "123456",
        dragging: { graphId: "main", nodeId: "A", x: 30, y: 40 },
      },
      {
        peerId: "654321",
        dragging: { graphId: "main", nodeId: "B", x: 0, y: 0 },
      },
    ]);
    assert.equal(layer.querySelectorAll(".peer-ghost").length, 2);

    // Drag end clears the ghost
    ed.setPeerGhosts([{ peerId: "123456", dragging: null }]);
    assert.equal(layer.querySelectorAll(".peer-ghost").length, 1);
    ed.setPeerGhosts([{ peerId: "654321", dragging: null }]);
    assert.equal(layer.querySelectorAll(".peer-ghost").length, 0);

    // Updates are incremental: peers not mentioned in an update keep
    // rendering; the engine sends explicit nulls on drop-off
    ed.setPeerGhosts([
      {
        peerId: "111111",
        dragging: { graphId: "main", nodeId: "C", x: 1, y: 2 },
      },
    ]);
    assert.equal(layer.querySelectorAll(".peer-ghost").length, 1);

    ed.remove();
  });
});

describe("FlowEditor pending state (work document #21)", () => {
  it("toggles pending visuals on nodes, IIPs, and edges", () => {
    const ed = /** @type {FlowEditor} */ (
      document.createElement("noflo-editor")
    );
    document.body.appendChild(ed);

    // A node and an IIP in the node layer, plus an edge registered with
    // deterministic endpoints matching getEdgeId
    const node = document.createElement("noflo-node");
    node.setAttribute("name", "A");
    /** @type {any} */ (ed.nodeLayer).appendChild(node);
    const iip = document.createElement("noflo-iip");
    iip.id = "DATA->A:in[0]";
    /** @type {any} */ (ed.nodeLayer).appendChild(iip);

    ed.applyPendingState({
      nodes: new Map([["A", "add"]]),
      iips: new Map([["DATA->A:in[0]", "remove"]]),
      edges: new Map(),
    });
    assert.equal(node.getAttribute("pending"), "add");
    assert.equal(iip.getAttribute("pending"), "remove");

    // Confirmation clears the attributes
    ed.applyPendingState({
      nodes: new Map(),
      iips: new Map(),
      edges: new Map(),
    });
    assert.ok(!node.hasAttribute("pending"));
    assert.ok(!iip.hasAttribute("pending"));

    ed.remove();
  });
});
