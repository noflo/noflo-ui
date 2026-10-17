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

  it("renders the line's name once, at the top", () => {
    const element = diagramFor([{ source: "a", target: "b", route: 3 }], 3);
    const names = [...element.shadowRoot.querySelectorAll(".line-name")];
    assert.equal(names.length, 1);
    assert.equal(names[0].textContent, "Central");
    element.remove();
  });

  it("draws a 45° spur for a split branch", () => {
    const element = diagramFor(
      [
        { source: "a", target: "b", route: 3 },
        { source: "a", target: "d", route: 3 },
        { source: "b", target: "c", route: 3 },
      ],
      3,
    );
    // The spur turnout is a diagonal: both coordinates change
    const spurs = [...element.shadowRoot.querySelectorAll("line.spur")];
    assert.equal(spurs.length, 1);
    const diagonal = spurs[0];
    assert.ok(
      Number(diagonal.getAttribute("x1")) !==
        Number(diagonal.getAttribute("x2")) &&
        Number(diagonal.getAttribute("y1")) !==
          Number(diagonal.getAttribute("y2")),
      "the turnout is a 45° diagonal",
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
