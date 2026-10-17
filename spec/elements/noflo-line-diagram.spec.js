import assert from "node:assert";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-line-diagram.js";
import { buildRouteLines } from "../../src/library/LineDiagram.js";

/**
 * A diagram element rendered from a plain edge list.
 *
 * @param {Array<{ source: string, target: string, route: number | null | undefined }>} edges
 * @param {number} routeIndex
 * @returns {any} The element.
 */
function diagramFor(edges, routeIndex) {
  const element = /** @type {any} */ (
    document.createElement("noflo-line-diagram")
  );
  element.routeIndex = routeIndex;
  element.routeName = "Central";
  element.labelFor = (/** @type {string} */ id) => `label:${id}`;
  element.lines = buildRouteLines(edges, routeIndex);
  document.body.appendChild(element);
  return element;
}

/** The labels rendered in the diagram's shadow. */
function labelsOf(element) {
  return [...element.shadowRoot.querySelectorAll("text.label")].map(
    (/** @type {SVGTextElement} */ t) => t.textContent,
  );
}

describe("noflo-line-diagram: the strip (work document #35 update #14)", () => {
  it("renders the spine's stations top-to-bottom with labels", () => {
    const element = diagramFor(
      [
        { source: "a", target: "b", route: 3 },
        { source: "b", target: "c", route: 3 },
      ],
      3,
    );
    assert.deepEqual(labelsOf(element), ["label:a", "label:b", "label:c"]);
    // The rail connects the stations: two segments for three stations
    const rails = element.shadowRoot.querySelectorAll("line.rail");
    assert.equal(rails.length, 2);
    // Termini ring, the middle stop is a dot
    assert.equal(
      element.shadowRoot.querySelectorAll(".terminus-ring").length,
      2,
    );
    assert.equal(element.shadowRoot.querySelectorAll(".tick").length, 1);
    element.remove();
  });

  it("the chart does not repeat the line's name — the accordion header carries it", () => {
    const element = diagramFor([{ source: "a", target: "b", route: 3 }], 3);
    assert.equal(element.shadowRoot.querySelectorAll(".line-name").length, 0);
    element.remove();
  });

  it("the four station kinds read distinctly, in the canvas's grammar", () => {
    // a→b with an IIP into a, an export out of b, and another line at a:
    // the IIP renders the chip's rounded rectangle, the export its
    // socket ring (smaller than a station), the interchange an enlarged
    // disc, and the plain node a disc
    const element = diagramFor(
      [
        { source: "a", target: "b", route: 3, id: "e1" },
        { source: "DATA->a:in[0]", target: "a", route: 3, id: "e-iip" },
        { source: "b", target: "export:TestOut", route: 3, id: "e-exp" },
        { source: "a", target: "z", route: 5 },
      ],
      3,
    );
    assert.equal(
      element.shadowRoot.querySelectorAll(".mark-iip").length,
      1,
      "the IIP's lozenge",
    );
    assert.equal(
      element.shadowRoot.querySelectorAll(".mark-export").length,
      1,
      "the export's square",
    );
    assert.equal(
      element.shadowRoot.querySelectorAll(".mark-interchange").length,
      1,
      "a's interchange disc",
    );
    assert.ok(
      element.shadowRoot.querySelector('[data-station-id="b"] .tick'),
      "the plain node's disc",
    );
    element.remove();
  });

  it("the canvas selection highlights in the strip", () => {
    const element = diagramFor(
      [
        { source: "a", target: "b", route: 3, id: "e1" },
        { source: "b", target: "c", route: 3, id: "e2" },
      ],
      3,
    );
    element.highlightStations = new Set(["b"]);
    element.highlightEdges = new Set(["e2"]);
    element.render();
    const hit = element.shadowRoot.querySelector('[data-station-id="b"]');
    assert.ok(
      hit.classList.contains("selected"),
      "the selected station's mark fills",
    );
    const rail = element.shadowRoot.querySelector(
      'line.rail[data-edge-id="e2"]',
    );
    assert.ok(
      rail.classList.contains("selected"),
      "the selected rail thickens",
    );
    const other = element.shadowRoot.querySelector('[data-station-id="a"]');
    assert.ok(
      !other.classList.contains("selected"),
      "the unselected station stays plain",
    );
    element.remove();
  });

  it("the selection scales the mark and thickens the boundary wire", () => {
    // The provider gives the boundary edge the IIP's own id — the
    // segment carrying it is the boundary wire
    const element = diagramFor(
      [
        {
          source: "DATA->a:in[0]",
          target: "a",
          route: 3,
          id: "DATA->a:in[0]",
        },
      ],
      3,
    );
    element.highlightStations = new Set(["DATA->a:in[0]"]);
    element.highlightEdges = new Set(["DATA->a:in[0]"]);
    element.render();
    const style = element.shadowRoot.querySelector("style").textContent;
    // The selected mark scales — bigger node shape, no dashed ring
    assert.match(
      style,
      /\.hit\.selected circle,[^}]*transform: scale\(1\.35\)/,
    );
    assert.match(style, /transform-box: fill-box/);
    assert.ok(!style.includes("select-ring"), "no dashed ring");
    // The boundary wire's segment thickens: the corner feeds the IIP's
    // id into the edge highlights, and the segment carries it
    const rail = element.shadowRoot.querySelector(
      'line.rail[data-edge-id="DATA->a:in[0]"]',
    );
    assert.ok(rail, "the boundary segment carries the IIP's id");
    assert.ok(
      rail.classList.contains("selected"),
      "the selected boundary wire thickens",
    );
    element.remove();
  });

  it("draws a 45° spur for a split branch", () => {
    const element = diagramFor(
      [
        { source: "a", target: "b", route: 3, id: "e1" },
        { source: "a", target: "d", route: 3, id: "e2" },
        { source: "b", target: "c", route: 3, id: "e3" },
      ],
      3,
    );
    // The turnout's first leg is a 45° diagonal: both coordinates move
    // the same distance
    const spurs = [...element.shadowRoot.querySelectorAll("path.spur")];
    assert.equal(spurs.length, 1);
    const points = [
      ...spurs[0].getAttribute("d").matchAll(/(-?[\d.]+) (-?[\d.]+)/g),
    ].map((m) => [Number(m[1]), Number(m[2])]);
    const dx = points[1][0] - points[0][0];
    const dy = points[1][1] - points[0][1];
    assert.ok(dx > 0 && dx === dy, `the turnout opens at 45° (${dx}, ${dy})`);
    // The turnout selects the branch's incoming wire — and thickens
    // with the selection like the rails do
    const turnoutEdge = spurs[0].getAttribute("data-edge-id");
    assert.ok(turnoutEdge.length > 0, "the turnout carries the branch's edge");
    element.highlightEdges = new Set([turnoutEdge]);
    element.render();
    const selectedSpur = element.shadowRoot.querySelector("path.spur");
    assert.ok(
      selectedSpur.classList.contains("selected"),
      "the selected turnout thickens",
    );
    // The spur's station label renders too
    assert.ok(
      labelsOf(element).includes("label:d"),
      "the spur's station draws",
    );
    element.remove();
  });

  it("marks interchange stations with the other lines' color bars", () => {
    const element = diagramFor(
      [
        { source: "a", target: "b", route: 3 },
        { source: "b", target: "c", route: 3 },
        { source: "b", target: "z", route: 5 },
      ],
      3,
    );
    const ticks = [...element.shadowRoot.querySelectorAll("line.interchange")];
    assert.equal(ticks.length, 1, "b's other line ticks");
    assert.ok(
      ticks[0].getAttribute("style").includes("var(--route-5)"),
      "the tick carries the other line's color",
    );
    element.remove();
  });

  it("draws the break marker between the run and its stragglers", () => {
    const element = diagramFor(
      [
        { source: "a", target: "b", route: 3 },
        { source: "x", target: "y", route: 3 },
      ],
      3,
    );
    const breaks = element.shadowRoot.querySelectorAll(".break-stroke");
    assert.equal(breaks.length, 2, "the gap-and-slash break marker");
    assert.deepEqual(labelsOf(element), [
      "label:a",
      "label:b",
      "label:x",
      "label:y",
    ]);
    element.remove();
  });

  it("renders an empty state when no line is in play", () => {
    const element = /** @type {any} */ (
      document.createElement("noflo-line-diagram")
    );
    document.body.appendChild(element);
    assert.ok(element.shadowRoot.querySelector(".empty"));
    element.remove();
  });

  it("long station names ellipsize with the full name in the title", () => {
    const element = diagramFor([{ source: "a", target: "b", route: 3 }], 3);
    element.labelFor = (id) =>
      id === "a" ? "a-very-long-node-name-that-goes-on-and-on" : id;
    element.lines = buildRouteLines(
      [{ source: "a", target: "b", route: 3 }],
      3,
    );
    element.render();
    const labels = [...element.shadowRoot.querySelectorAll("text.label")];
    const long = labels.find((t) => t.textContent.includes("…"));
    assert.ok(long, "the long label ellipsizes");
    assert.ok(long.textContent.length <= 25, "the label truncates");
    // The full name rides the title (hover affordance)
    const hit = /** @type {any} */ (
      element.shadowRoot.querySelector('[data-station-id="a"]')
    );
    assert.equal(
      hit.querySelector("title").textContent,
      "a-very-long-node-name-that-goes-on-and-on",
    );
    element.remove();
  });

  it("stations and rail segments are interactive: click emits the selection events", () => {
    const element = diagramFor(
      [
        { source: "a", target: "b", route: 3, id: "e1" },
        { source: "b", target: "c", route: 3, id: "e2" },
      ],
      3,
    );
    /** @type {any[]} */
    const stations = [];
    /** @type {any[]} */
    const edges = [];
    element.addEventListener("station-click", (/** @type {any} */ e) =>
      stations.push(e.detail.id),
    );
    element.addEventListener("edge-click", (/** @type {any} */ e) =>
      edges.push(e.detail.edgeId),
    );
    // Click the rail segment: it carries the edge that flows in
    const rail = element.shadowRoot.querySelector("line.rail[data-edge-id]");
    rail.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true }),
    );
    // Click a station's hit group
    const hit = element.shadowRoot.querySelector('[data-station-id="b"]');
    hit.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true }),
    );
    assert.deepEqual(
      edges,
      ["e1"],
      "the first rail segment carries the a→b edge",
    );
    assert.deepEqual(stations, ["b"]);
    element.remove();
  });

  it("the environment age rides the host and the ink rules follow the wires' rules", () => {
    const element = diagramFor([{ source: "a", target: "b", route: 3 }], 3);
    // The host mirrors the body's data-age as the state class
    document.body.setAttribute("data-age", "abstract");
    element._mirrorAge();
    assert.ok(
      element.classList.contains("state-abstract"),
      "the abstract age rides the host",
    );
    const style = element.shadowRoot.querySelector("style").textContent;
    // The age rules act on the ink the strip draws with, exactly as on
    // the wires: abstract mutes bounded at 70%, offline collapses to
    // grey, crashed reads in the error semantic, golden keeps full
    assert.match(style, /:host\(\.state-abstract\) \{[^}]*color-mix/);
    assert.match(style, /:host\(\.state-offline\) \{[^}]*--ui-age-offline/);
    assert.match(style, /:host\(\.state-crashed\) \{[^}]*--ui-age-crashed/);
    assert.match(style, /--edge-ink: var\(--edge-route\);/);
    // The strokes consume the ink indirection, not the route variable
    assert.match(style, /\.rail \{[^}]*var\(--edge-ink\)/);
    // The age returns
    document.body.setAttribute("data-age", "golden");
    element._mirrorAge();
    assert.ok(
      element.classList.contains("state-golden"),
      "the golden age rides the host",
    );
    element.remove();
  });

  it("the rail carries the line's route color variable", () => {
    const element = diagramFor([{ source: "a", target: "b", route: 6 }], 6);
    assert.ok(
      element.shadowRoot
        .querySelector("style")
        .textContent.includes("--edge-route: var(--route-6)"),
    );
    element.remove();
  });
});
