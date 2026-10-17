/**
 * @file Route identity beyond hue (work document #35, guidelines §6):
 * the wires carry the age rules (abstract mutes the hue, offline
 * collapses it) plus the contrast casing for the routes whose stroke
 * cannot hold 3:1 on its own. The node-caption terminus roundels are
 * retired: the per-line diagram carries the route's identity now.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-editor.js";
import "../../src/elements/noflo-node.js";
import { renderGraphIntoEditor } from "../../src/glass/renderGraph.js";

/**
 * A graph view with a single node carrying an outport export on route 3.
 *
 * @param {Record<string, any>} [extra] View overrides.
 * @returns {{ view: any, editor: any, elements: Map<string, any> }}
 */
function exportGraph(extra = {}) {
  const editor = document.createElement("noflo-editor");
  document.body.appendChild(editor);
  /** @type {any} */ (editor.libraryManager) = {
    getComponent: () => ({
      name: "test",
      inports: [{ name: "in" }],
      outports: [{ name: "out" }],
    }),
    addEventListener() {},
    removeEventListener() {},
  };
  const view = {
    nodes: [{ id: "C", component: "test", metadata: { x: 240, y: 80 } }],
    edges: [],
    initializers: [],
    inports: {},
    outports: {
      TestOut: { process: "C", port: "out", metadata: { route: 3 } },
    },
    groups: [],
    properties: { name: "main" },
    ...extra,
  };
  const elements = renderGraphIntoEditor(
    view,
    editor,
    (/** @type {string} */ name) =>
      /** @type {any} */ (editor.libraryManager).getComponent(name),
  );
  return { view, editor, elements };
}

describe("IIP chips answer their selection (work document #35 review)", () => {
  it("the chip matches its selection by the CRDT edge id, not the chip name", () => {
    const { editor } = exportGraph({
      initializers: [
        {
          from: { data: "42" },
          to: { node: "C", port: "in" },
          metadata: { route: 3, id: "DATA->C:in[0]" },
        },
      ],
    });
    const chip = /** @type {any} */ (
      /** @type {HTMLElement} */ (editor.nodeLayer?.querySelector("noflo-iip"))
    );
    assert.ok(chip, "the IIP chip renders");
    assert.equal(chip.id, "DATA->C:in[0]", "the chip's id is the CRDT edge id");
    const selection = /** @type {any} */ (editor).selectionManager;
    selection.select("iips", "DATA->C:in[0]", false);
    assert.equal(
      chip.hasAttribute("selected"),
      true,
      "the chip answers its selection",
    );
    selection.toggle("iips", "DATA->C:in[0]");
    assert.equal(chip.hasAttribute("selected"), false, "it clears too");
    editor.remove();
  });
});

describe("exported ports select as their own kind (work document #35 review)", () => {
  it("clicking an export wire selects the export, never an IIP", () => {
    const { editor } = exportGraph();
    const wires = /** @type {any} */ (editor).iipWires?.filter(
      (/** @type {any} */ w) => w.iip.tagName === "NOFLO-EXPORTED-PORT",
    );
    assert.ok(wires && wires.length > 0, "the export wire renders");
    const hitPath = /** @type {any} */ (wires[0].hitPath);
    hitPath.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        composed: true,
        pointerId: 1,
        button: 0,
      }),
    );
    const selection = /** @type {any} */ (editor).selectionManager;
    assert.deepEqual(
      [...selection.ports],
      ["TestOut"],
      "the export selects by its name",
    );
    assert.equal(selection.iips.size, 0, "no IIP is selected");
    assert.equal(selection.edges.size, 0, "no edge is selected");
    editor.remove();
  });
});

describe("the route hues' age rules and casing (guidelines §6)", () => {
  it("the editor's CSS carries the muting, the collapse, and the casing set", () => {
    const editor = document.createElement("noflo-editor");
    document.body.appendChild(editor);
    const style =
      /** @type {HTMLElement} */ (
        /** @type {ShadowRoot} */ (editor.shadowRoot).querySelector("style")
      ).textContent ?? "";
    // Abstract mutes the routed hue toward the canvas, bounded so the
    // 3:1 floor holds where the casing doesn't cover — the muting gates
    // on .routed so the unrouted ink never lightens past its floor
    assert.match(style, /\.state-abstract \.edge-flow\.routed \{/);
    assert.match(style, /color-mix\(/);
    // Offline collapses to grey ink regardless of route
    assert.match(
      style,
      /\.state-offline \.edge-flow \{[^}]*--edge-ink: var\(--edge-color\)/,
    );
    // The casing shows in tube for the routes that cannot hold 3:1 —
    // Overground, Circle, DLR, Victoria — and never in cyberpunk
    for (const route of [2, 3, 5, 6]) {
      assert.match(
        style,
        new RegExp(
          `:host\\(\\[data-theme="tube"\\]\\) \\.edge-casing\\.route-casing-${route}`,
        ),
        `tube routes ${route} carry the casing`,
      );
    }
    assert.ok(
      !/:host\(\[data-theme="cyberpunk"\]\) \.edge-casing/.test(style),
      "cyberpunk's palette holds 3:1 pure and muted: no casing",
    );
    editor.remove();
  });
});
