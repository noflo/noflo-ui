/**
 * @file Route identity beyond hue (work document #35, guidelines §6): the
 * terminus roundels render the line's name at caption scale — the
 * redundant channel hue cannot provide alone — and the wires carry the
 * age rules (abstract mutes the hue, offline collapses it) plus the
 * contrast casing for the routes whose stroke cannot hold 3:1 on its own.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-editor.js";
import "../../src/elements/noflo-node.js";
import { renderGraphIntoEditor } from "../../src/glass/renderGraph.js";

/**
 * A graph view with a three-node chain on route 3 and a custom name for
 * it — the roundel unit is the route terminus, so the chain labels its
 * ends and not its middle.
 *
 * @param {Record<string, any>} [extra] View overrides.
 * @returns {{ view: any, editor: any, elements: Map<string, any> }}
 */
function chainGraph(extra = {}) {
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
    nodes: [
      { id: "A", component: "test", metadata: { x: 80, y: 80 } },
      { id: "B", component: "test", metadata: { x: 240, y: 80 } },
      { id: "C", component: "test", metadata: { x: 400, y: 80 } },
    ],
    edges: [
      {
        from: { node: "A", port: "out" },
        to: { node: "B", port: "in" },
        metadata: { route: 3 },
      },
      {
        from: { node: "B", port: "out" },
        to: { node: "C", port: "in" },
        metadata: { route: 3 },
      },
    ],
    initializers: [],
    inports: {},
    outports: {},
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

describe("the terminus roundels (work document #35)", () => {
  it("a line's roundels land at its termini, named from the table", () => {
    const { elements } = chainGraph({
      properties: { name: "main", routes: { 3: { name: "Audio input" } } },
    });
    const roundels = (/** @type {string} */ id) =>
      /** @type {HTMLElement} */ (elements.get(id)).shadowRoot?.querySelector(
        ".route-termini",
      )?.textContent ?? "";
    assert.match(
      roundels("A"),
      /Audio input/,
      "the terminus carries the line's name",
    );
    assert.match(roundels("C"), /Audio input/, "both ends label");
    assert.equal(roundels("B"), "", "the intermediate station stays unlabeled");
  });

  it("unnamed routes read as their Tube line", () => {
    const { elements } = chainGraph();
    const roundel = /** @type {HTMLElement} */ (
      elements.get("A")
    ).shadowRoot?.querySelector(".route-roundel");
    assert.match(
      roundel?.textContent ?? "",
      /Circle/,
      "the default name is the line",
    );
    assert.match(
      roundel?.getAttribute("style") ?? "",
      /--route-3/,
      "the ring carries the route color",
    );
    assert.match(
      roundel?.getAttribute("title") ?? "",
      /route 3/,
      "the tooltip identifies the route index",
    );
  });

  it("an IIP feeding a node counts as that node's attachment", () => {
    const { elements } = chainGraph({
      edges: [
        {
          from: { node: "A", port: "out" },
          to: { node: "B", port: "in" },
          metadata: { route: 3 },
        },
      ],
      initializers: [
        {
          from: { data: "42" },
          to: { node: "C", port: "in" },
          metadata: { route: 3 },
        },
      ],
    });
    const roundels = (/** @type {string} */ id) =>
      /** @type {HTMLElement} */ (elements.get(id)).shadowRoot?.querySelector(
        ".route-termini",
      )?.textContent ?? "";
    // A→B plus an IIP→C: every node carries exactly one attachment of
    // the route, so every one is a terminus — the IIP chip is the line's
    // other end and is not a station
    assert.match(roundels("A"), /Circle/);
    assert.match(roundels("B"), /Circle/);
    assert.match(roundels("C"), /Circle/);
  });

  it("roundel text is escaped, never injected", () => {
    const { elements } = chainGraph({
      properties: {
        name: "main",
        routes: { 3: { name: "<img src=x onerror=alert(1)>" } },
      },
    });
    const roundel = /** @type {HTMLElement} */ (
      elements.get("A")
    ).shadowRoot?.querySelector(".route-roundel");
    assert.ok(!roundel?.querySelector("img"), "the name is text, not markup");
    assert.match(roundel?.textContent ?? "", /<img src=x/);
  });

  it("nodes without route termini render no roundels", () => {
    const { elements } = chainGraph({
      edges: [
        {
          from: { node: "A", port: "out" },
          to: { node: "B", port: "in" },
        },
      ],
    });
    for (const id of ["A", "B", "C"]) {
      const container = /** @type {HTMLElement} */ (
        elements.get(id)
      ).shadowRoot?.querySelector(".route-termini");
      assert.equal(
        container?.textContent ?? "",
        "",
        `${id} carries no roundel`,
      );
    }
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
