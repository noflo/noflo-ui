import assert from "node:assert";
import { describe, it } from "node:test";

import { buildRouteLines } from "../../src/library/LineDiagram.js";

/** Shorthand for the edge inputs the walk consumes. */
function e(source, target, route = 3) {
  return { source, target, route };
}

describe("LineDiagram: the per-line strips (work document #35 update #14)", () => {
  it("orders a straight run by flow: source terminus to sink terminus", () => {
    const lines = buildRouteLines([e("a", "b"), e("b", "c")], 3);
    assert.equal(lines.length, 1, "one connected component");
    assert.deepEqual(
      lines[0].stations.map((s) => s.id),
      ["a", "b", "c"],
      "flow order top to bottom",
    );
    assert.equal(
      lines[0].stations[0].kind,
      "terminus",
      "the source is a terminus",
    );
    assert.equal(lines[0].stations[1].kind, "stop", "the middle is a stop");
    assert.equal(
      lines[0].stations[2].kind,
      "terminus",
      "the sink is a terminus",
    );
  });

  it("a split keeps the main run on the spine and spurs the rest", () => {
    // a splits into a long branch (through b, c) and a short one (d)
    const lines = buildRouteLines([e("a", "b"), e("a", "d"), e("b", "c")], 3);
    assert.equal(lines.length, 1);
    const spine = lines[0].stations;
    assert.deepEqual(
      spine.map((s) => s.id),
      ["a", "b", "c"],
      "the long branch continues the spine",
    );
    assert.equal(spine[0].kind, "split", "a is a split");
    assert.equal(spine[0].spurs.length, 1, "the short branch leaves as a spur");
    assert.deepEqual(
      spine[0].spurs[0].stations.map((s) => s.id),
      ["d"],
      "the spur's stations",
    );
  });

  it("a split's spurs keep their own sub-branches", () => {
    // a splits: the main run through d (which itself splits into e, f);
    // the b-branch spurs off with its own run to c
    const lines = buildRouteLines(
      [e("a", "b"), e("a", "d"), e("d", "e"), e("d", "f"), e("b", "c")],
      3,
    );
    const spine = lines[0].stations;
    assert.deepEqual(
      spine.map((s) => s.id),
      ["a", "d", "e"],
      "the branch reaching the most stations continues the spine",
    );
    assert.equal(spine[0].kind, "split");
    const spur = spine[0].spurs[0];
    assert.deepEqual(
      spur.stations.map((s) => s.id),
      ["b", "c"],
      "the b-branch spurs off with its own run",
    );
  });

  it("converging flows render as spurs joining into the spine", () => {
    // Two sources feed one station: the larger run takes the spine,
    // the other joins into it
    const lines = buildRouteLines([e("a", "b"), e("b", "c"), e("x", "c")], 3);
    const spine = lines[0].stations;
    assert.deepEqual(
      spine.map((s) => s.id),
      ["a", "b", "c"],
      "the main run",
    );
    const joinHost = spine[2];
    assert.equal(joinHost.spurs.length, 1, "the converging flow attaches at c");
    assert.deepEqual(
      joinHost.spurs[0].stations.map((s) => s.id),
      ["x"],
      "the feeder's station",
    );
    const feeder = joinHost.spurs[0].stations[0];
    assert.equal(feeder.kind, "join", "the feeder's flow joins into the spine");
    assert.equal(feeder.joinsAt, "c", "the connector names the joined station");
  });

  it("a chain running into a drawn station marks the join", () => {
    // a → b → c and b → d → c: the longer branch takes the spine through
    // the sink; b's direct edge into it is a bare join connector
    const lines = buildRouteLines(
      [e("a", "b"), e("b", "c"), e("b", "d"), e("d", "c")],
      3,
    );
    const spine = lines[0].stations;
    assert.deepEqual(
      spine.map((s) => s.id),
      ["a", "b", "d", "c"],
      "the spine runs to the sink through the longer branch",
    );
    assert.equal(spine[3].kind, "terminus", "the sink terminates the line");
    assert.equal(spine[1].spurs.length, 1, "b's direct edge marks a join");
    assert.equal(
      spine[1].spurs[0].stations.length,
      0,
      "no new stations on the bare join",
    );
    assert.equal(spine[1].spurs[0].joinsAt, "c", "it joins at the sink");
  });

  it("a diamond flows through: the shared sink draws once", () => {
    // a → b, a → c, b → d, c → d: two equal branches; the tie breaks by id
    const lines = buildRouteLines(
      [e("a", "b"), e("a", "c"), e("b", "d"), e("c", "d")],
      3,
    );
    const spine = lines[0].stations;
    assert.deepEqual(
      spine.map((s) => s.id),
      ["a", "b", "d"],
      "the first branch (id order) continues",
    );
    assert.equal(spine[0].spurs[0].stations[0].id, "c");
    assert.equal(
      spine[0].spurs[0].stations[0].kind,
      "join",
      "the second branch rejoins at d",
    );
    assert.equal(spine[2].kind, "terminus", "d terminates the line");
  });

  it("a closed loop walks from the smallest id and closes with a join", () => {
    const lines = buildRouteLines([e("a", "b"), e("b", "c"), e("c", "a")], 3);
    assert.equal(lines[0].cyclic, true, "no source terminus: a loop");
    const spine = lines[0].stations;
    assert.deepEqual(
      spine.map((s) => s.id),
      ["a", "b", "c"],
      "walked from the smallest id",
    );
    assert.equal(spine[2].kind, "join", "the loop closes back at the start");
    assert.equal(spine[2].joinsAt, "a");
  });

  it("isolated stragglers are their own components, largest first", () => {
    const lines = buildRouteLines(
      [e("a", "b"), e("b", "c"), e("x", "y"), e("lone1", "lone2")],
      3,
    );
    assert.equal(
      lines.length,
      3,
      "three fragments: the run and two stragglers",
    );
    assert.deepEqual(
      lines[0].stations.map((s) => s.id),
      ["a", "b", "c"],
      "the main run leads",
    );
    assert.deepEqual(
      lines[1].stations.map((s) => s.id),
      ["x", "y"],
      "a straggler strip",
    );
    assert.deepEqual(
      lines[2].stations.map((s) => s.id),
      ["lone1", "lone2"],
      "a lone edge is a minimal strip",
    );
  });

  it("interchange ticks list the station's other routes", () => {
    const edges = [
      e("a", "b", 3),
      e("b", "c", 3),
      e("b", "z", 5),
      { source: "a", target: "b", route: 1 },
    ];
    const lines = buildRouteLines(edges, 3);
    const [a, b, c] = lines[0].stations;
    assert.deepEqual(a.interchange, [1], "a serves routes 3 and 1");
    assert.deepEqual(
      b.interchange,
      [1, 5],
      "b serves routes 3, 5, and 1 — the other two tick",
    );
    assert.deepEqual(c.interchange, [], "c carries only this line");
    // The line's own edges don't leak into the ticks
    assert.ok(
      !a.interchange.includes(3),
      "the line itself is not an interchange",
    );
  });

  it("other routes are ignored: the diagram shows one line", () => {
    const lines = buildRouteLines(
      [e("a", "b", 3), e("m", "n", 7), e("b", "c", 3)],
      3,
    );
    assert.equal(lines.length, 1);
    assert.deepEqual(
      lines[0].stations.map((s) => s.id),
      ["a", "b", "c"],
    );
  });
});
