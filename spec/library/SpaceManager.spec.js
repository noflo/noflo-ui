import assert from "node:assert";
import { describe, it } from "node:test";

import { SpaceManager } from "../../src/library/SpaceManager.js";

/** A manager whose spatial records don't matter for the zone helpers. */
function makeManager() {
  return new SpaceManager(1, { x: 0, y: 0 });
}

describe("SpaceManager zone shapes (work document #35's tariff zones)", () => {
  it("zoneShape: a member's cells dilate by the padding ring", () => {
    const sm = makeManager();
    const shape = sm.zoneShape([{ x: 80, y: 80 }], [], { cell: 40, dilate: 1 });
    assert.ok(shape.cells.has("2,2"), "the member's own cells");
    assert.ok(shape.cells.has("3,3"), "an 80px box spans two cells per axis");
    assert.ok(shape.cells.has("1,1"), "the dilation ring pads the zone");
    assert.ok(!shape.cells.has("0,0"), "two cells away stays outside");
    assert.match(shape.d, /^M /, "the contour path renders");
    assert.ok(shape.labelCell, "the label cell resolves");
  });

  it("zoneShape: disconnected members connect through a corridor", () => {
    const sm = makeManager();
    // Two members with a four-cell gap between them: the rings don't meet
    const shape = sm.zoneShape(
      [
        { x: 0, y: 0 },
        { x: 400, y: 0 },
      ],
      [],
      { cell: 40, dilate: 1 },
    );
    assert.equal(
      (shape.d.match(/M /g) ?? []).length,
      1,
      "one contour — the corridor connects the members into one zone",
    );
    assert.ok(
      sm.pointInZone(shape.cells, 200, 20),
      "the corridor between the members is inside the zone",
    );
  });

  it("zoneShape: the corridor routes around a node that is not in the group", () => {
    const sm = makeManager();
    // Two members with an outsider sitting between them
    const shape = sm.zoneShape(
      [
        { x: 0, y: 0 },
        { x: 400, y: 0 },
      ],
      [{ x: 200, y: 0 }],
      { cell: 40, dilate: 1 },
    );
    // The outsider's own cells are never covered — its center's cell and
    // its box's cells stay outside the zone
    for (const i of [5, 6]) {
      assert.ok(
        !shape.cells.has(`${i},0`),
        `the outsider's cell ${i},0 is not covered`,
      );
    }
    assert.equal(
      (shape.d.match(/M /g) ?? []).length,
      1,
      "still one connected zone — the corridor routes around the outsider",
    );
  });

  it("zoneShape: the contour stays at 45° and 90°, corners round slightly", () => {
    const sm = makeManager();
    // Two diagonal members: the staircase collapses into 45° runs
    const shape = sm.zoneShape(
      [
        { x: 0, y: 0 },
        { x: 80, y: 80 },
      ],
      [],
      { cell: 40, dilate: 1 },
    );
    // Every segment stays in the grammar: horizontal, vertical, or 45° —
    // chained bevels must not compound into shallower angles. The path
    // reads as entry → corner control → exit per rounded vertex, so all
    // coordinates join the polyline
    const points = [...shape.d.matchAll(/(?:[MLQ]) (-?\d+) (-?\d+)/g)].map(
      (m) => [Number(m[1]), Number(m[2])],
    );
    assert.ok(points.length > 2, "the contour has vertices");
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1];
      const [bx, by] = points[i];
      const dx = Math.abs(ax - bx);
      const dy = Math.abs(ay - by);
      assert.ok(
        dx === 0 || dy === 0 || dx === dy,
        `segment ${i} stays at 45° or 90° (${ax},${ay} → ${bx},${by})`,
      );
    }
    // The corners round slightly: quadratics in the path
    assert.ok(shape.d.includes("Q "), "the corners round");
  });

  it("pointInZone: the center's cell decides membership", () => {
    const sm = makeManager();
    const shape = sm.zoneShape([{ x: 80, y: 80 }], [], { cell: 40, dilate: 1 });
    assert.ok(
      sm.pointInZone(shape.cells, 100, 100),
      "the member's center is in",
    );
    assert.ok(
      sm.pointInZone(shape.cells, 40, 100),
      "the ring is in — adjacent-cell drops join",
    );
    assert.ok(!sm.pointInZone(shape.cells, 0, 0), "two cells away is out");
  });
});
