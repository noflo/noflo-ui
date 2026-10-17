import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-lines-corner.js";

/**
 * A lines corner wired to a fixed graph: a route-3 run a→b→c with a
 * straggler x→y, a route-1 edge at b, and a route-5 edge a→z.
 *
 * @param {Record<string, any>} overrides
 * @returns {any} The corner.
 */
function cornerFor(overrides = {}) {
  const edges = overrides.edges ?? [
    { source: "a", target: "b", route: 3 },
    { source: "b", target: "c", route: 3 },
    { source: "x", target: "y", route: 3 },
    { source: "b", target: "z", route: 5 },
    { source: "a", target: "b", route: 1 },
  ];
  const corner = /** @type {any} */ (
    document.createElement("noflo-lines-corner")
  );
  corner.setProvider(() => ({
    edges,
    labelFor: (/** @type {string} */ id) => id,
    routeTable: { 3: { name: "Woolwich" } },
  }));
  corner.editor = overrides.editor ?? document.createElement("div");
  document.body.appendChild(corner);
  return corner;
}

/** The panel renders into the side container's portal, not the chip. */
function panelOf(corner) {
  return corner._panelPortal?.shadowRoot ?? corner.shadowRoot;
}

describe("FlowLinesCorner: the per-line diagrams (work document #35 update #14)", () => {
  it("a routed edge selection opens the line's diagram", () => {
    const corner = cornerFor();
    corner.setSelection({ route: 3, station: null });
    assert.equal(corner.hasAttribute("hidden"), false, "the corner discloses");
    assert.equal(corner.expanded, true, "the accordion opens on selection");
    const diagram = panelOf(corner).querySelector(
      ".diagram-host noflo-line-diagram",
    );
    assert.ok(diagram, "the diagram hosts");
    assert.equal(/** @type {any} */ (diagram).routeIndex, 3);
    // The main run leads; the straggler follows in the same element
    assert.equal(/** @type {any} */ (diagram).lines.length, 2);
    // The header names the line from the route table
    const head = panelOf(corner).querySelector(".head-label");
    assert.equal(/** @type {HTMLElement} */ (head).textContent, "Woolwich");
    corner.remove();
  });

  it("a station selection with several lines lists them; picking shows one", () => {
    const corner = cornerFor();
    corner.setSelection({ route: null, station: "b" });
    assert.equal(corner.hasAttribute("hidden"), false);
    const rows = [...panelOf(corner).querySelectorAll("[data-pick]")];
    assert.deepEqual(
      rows.map((/** @type {any} */ r) => r.getAttribute("data-pick")),
      ["1", "3", "5"],
      "b's lines, ordered by route index — every line serving the station",
    );
    corner.pickLine(5);
    const diagram = panelOf(corner).querySelector(
      ".diagram-host noflo-line-diagram",
    );
    assert.equal(
      /** @type {any} */ (diagram).routeIndex,
      5,
      "the picked line renders",
    );
    corner.remove();
  });

  it("a station selection with one line renders its diagram directly", () => {
    const corner = cornerFor();
    corner.setSelection({ route: null, station: "x" });
    const diagram = panelOf(corner).querySelector(
      ".diagram-host noflo-line-diagram",
    );
    assert.ok(diagram, "the single line renders directly");
    assert.equal(/** @type {any} */ (diagram).routeIndex, 3);
    corner.remove();
  });

  it("rename re-emits the route-name attempt on the editor", () => {
    const corner = cornerFor();
    const editor = document.createElement("div");
    /** @type {any[]} */
    const attempts = [];
    editor.addEventListener("route-name-attempt", (/** @type {any} */ e) => {
      attempts.push(e.detail);
    });
    corner.editor = editor;
    corner.setSelection({ route: 3, station: null });
    const button = panelOf(corner).querySelector("[data-rename]");
    /** @type {HTMLElement} */ (button).click();
    assert.deepEqual(
      attempts,
      [{ route: 3 }],
      "the existing naming flow takes over",
    );
    corner.remove();
  });

  it("the canvas selection highlights in the diagram, and a station on the shown line keeps it", () => {
    const corner = cornerFor();
    const editor = document.createElement("div");
    /** @type {any} */ (editor).selectionManager = {
      nodes: new Set(["b"]),
      edges: new Set(["a:out[0]->b:in[0]"]),
      iips: new Set(),
      ports: new Set(),
    };
    corner.editor = editor;
    corner.setSelection({ route: 3, station: null });
    const diagram = /** @type {any} */ (
      panelOf(corner).querySelector(".diagram-host noflo-line-diagram")
    );
    assert.ok(
      diagram.highlightStations.has("b"),
      "the selected station highlights",
    );
    assert.ok(
      diagram.highlightEdges.has("a:out[0]->b:in[0]"),
      "the selected wire highlights",
    );
    // Clicking that station inside the strip: the selection becomes the
    // node, and the panel keeps the line instead of flipping to a list
    corner.setSelection({ route: null, station: "b" });
    assert.equal(corner._route, 3, "the line stays shown");
    const diagram2 = /** @type {any} */ (
      panelOf(corner).querySelector(".diagram-host noflo-line-diagram")
    );
    assert.ok(diagram2, "the diagram is still the strip, not the list");
    corner.remove();
  });

  it("the strip's clicks apply the canvas's click semantics", () => {
    // A stub with the real selection vocabulary: the sets plus the
    // mutators the canvas's own handlers use
    const sm = {
      nodes: new Set(),
      edges: new Set(),
      iips: new Set(),
      ports: new Set(),
      toggle(type, id) {
        if (this[type].has(id)) this[type].delete(id);
        else this[type].add(id);
      },
      select(type, id) {
        this[type].clear();
        this[type].add(id);
      },
    };
    const corner = cornerFor();
    corner.editor = /** @type {any} */ ({ selectionManager: sm });
    corner.setSelection({ route: 3, station: null });

    // A plain click on a station selects it within its type
    corner.activate({ type: "nodes", id: "b" }, false);
    assert.deepEqual([...sm.nodes], ["b"], "the plain click selects");
    // A plain click on ANOTHER station replaces within the type
    corner.activate({ type: "nodes", id: "c" }, false);
    assert.deepEqual([...sm.nodes], ["c"], "the plain click replaces in-type");
    // A plain click on the type's only-selected item deselects — the
    // canvas's pointerdown-then-commit behavior
    corner.activate({ type: "nodes", id: "c" }, false);
    assert.deepEqual(
      [...sm.nodes],
      [],
      "the plain click deselects the only one",
    );
    // A modified click toggles — multi-select within the type
    corner.activate({ type: "nodes", id: "b" }, false);
    corner.activate({ type: "nodes", id: "c" }, true);
    assert.deepEqual(
      [...sm.nodes].sort(),
      ["b", "c"],
      "the modified click toggles",
    );
    // Cross-type accumulation: an edge click keeps the nodes
    corner.activate({ type: "edges", id: "a:out[0]->b:in[0]" }, false);
    assert.deepEqual([...sm.edges], ["a:out[0]->b:in[0]"], "the edge selects");
    assert.deepEqual(
      [...sm.nodes].sort(),
      ["b", "c"],
      "the nodes keep their selection",
    );
    // Boundary stations map to their own types
    corner.activate({ type: "iips", id: "DATA->a:in[0]" }, false);
    assert.deepEqual(
      [...sm.iips],
      ["DATA->a:in[0]"],
      "the IIP selects by its edge id",
    );
    corner.remove();
  });

  it("an empty selection hides the corner", () => {
    const corner = cornerFor();
    corner.setSelection({ route: 3, station: null });
    corner.setSelection({ route: null, station: null });
    assert.equal(corner.hasAttribute("hidden"), true, "the corner hides");
    assert.equal(corner.expanded, false, "the accordion collapses");
    corner.remove();
  });

  it("an unrouted selection fakes no line", () => {
    const corner = cornerFor();
    corner.setSelection({ route: null, station: null });
    assert.equal(corner.hasAttribute("hidden"), true);
    corner.remove();
  });
});
