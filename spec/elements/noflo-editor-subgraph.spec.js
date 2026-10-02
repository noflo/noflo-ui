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
