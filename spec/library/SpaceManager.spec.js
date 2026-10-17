import assert from "node:assert";
import { describe, it } from "node:test";

import { SpaceManager } from "../../src/library/SpaceManager.js";

/** A manager whose spatial records don't matter for the zone helpers. */
function makeManager() {
  return new SpaceManager(1, { x: 0, y: 0 });
}

describe("SpaceManager zone shapes (work document #35's tariff zones)", () => {
  it("zoneCells: a member occupies its own cells dilated by the padding ring", () => {
    const sm = makeManager();
    // A node at graph (80, 80): 80px box → cells (2,2) and (3,3)
    const cells = sm.zoneCells([{ x: 80, y: 80 }], { cell: 40, dilate: 1 });
    assert.ok(cells.has("2,2"), "the member's own cells");
    assert.ok(cells.has("3,3"), "an 80px box spans two cells per axis");
    assert.ok(cells.has("1,1"), "the dilation ring pads the zone");
    assert.ok(cells.has("4,4"), "the ring reaches one cell past the box");
    assert.ok(!cells.has("0,0"), "two cells away stays outside");
  });

  it("zoneCells: the union flows around a gap — a non-member's cells stay empty", () => {
    const sm = makeManager();
    // Two members with a two-cell gap between them
    const cells = sm.zoneCells(
      [
        { x: 0, y: 0 },
        { x: 240, y: 0 },
      ],
      { cell: 40, dilate: 1 },
    );
    // Member A spans cells 0-1 (+ring 0-2), B spans 6-7 (+ring 5-8)
    assert.ok(cells.has("1,0") && cells.has("6,0"), "the members' cells");
    assert.ok(!cells.has("4,0"), "the gap between them stays outside the zone");
    assert.ok(cells.has("2,0"), "A's ring reaches one cell into the gap");
    assert.ok(cells.has("5,0"), "B's ring reaches one cell into the gap");
  });

  it("pointInZone: the center's cell decides membership", () => {
    const sm = makeManager();
    const cells = sm.zoneCells([{ x: 80, y: 80 }], { cell: 40, dilate: 1 });
    assert.ok(sm.pointInZone(cells, 100, 100), "the member's center is in");
    assert.ok(
      sm.pointInZone(cells, 40, 100),
      "the ring is in — adjacent-cell drops join",
    );
    assert.ok(!sm.pointInZone(cells, 0, 0), "two cells away is out");
  });

  it("zoneOutline: a single member traces a closed rectangle", () => {
    const sm = makeManager();
    const cells = sm.zoneCells([{ x: 0, y: 0 }], { cell: 40, dilate: 0 });
    const d = sm.zoneOutline(cells, 40);
    assert.match(d, /^M 0 0 /, "the outline starts at the zone's corner");
    assert.match(d, /Z$/, "the contour closes");
    assert.equal(
      (d.match(/M /g) ?? []).length,
      1,
      "one contour for one solid block",
    );
  });

  it("zoneOutline: an L-shape traces the notch, not the bounding box", () => {
    const sm = makeManager();
    // Cells (0,0), (1,0), (0,1) — an L: the bounding box would cover
    // (1,1), the outline must route around the notch
    const cells = new Set(["0,0", "1,0", "0,1"]);
    const d = sm.zoneOutline(cells, 40);
    // The notch's inner corner (80,40) appears as a contour vertex
    assert.match(d, /80 40/, "the outline routes around the notch");
    assert.equal(
      (d.match(/M /g) ?? []).length,
      1,
      "one contour — the notch does not split the shape",
    );
  });

  it("zoneOutline: disconnected clusters produce one contour each", () => {
    const sm = makeManager();
    const cells = new Set(["0,0", "5,5"]);
    const d = sm.zoneOutline(cells, 40);
    assert.equal(
      (d.match(/M /g) ?? []).length,
      2,
      "two contours, evenodd-ready",
    );
  });
});
