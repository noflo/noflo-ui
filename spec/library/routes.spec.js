import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ROUTE_LINE_NAMES,
  routeName,
  routeTermini,
} from "../../src/library/routes.js";

describe("the route vocabulary (work document #35, guidelines §6)", () => {
  it("the default names are the Tube line names, index-aligned", () => {
    assert.equal(ROUTE_LINE_NAMES.length, 10);
    assert.equal(ROUTE_LINE_NAMES[0], "Northern");
    assert.equal(ROUTE_LINE_NAMES[3], "Circle");
    assert.equal(ROUTE_LINE_NAMES[6], "Victoria");
    assert.equal(ROUTE_LINE_NAMES[9], "Metropolitan");
  });

  it("routeName falls back to the line default, the graph's table wins", () => {
    assert.equal(
      routeName(3, undefined),
      "Circle",
      "unnamed routes read as their line",
    );
    assert.equal(
      routeName(3, { 3: { name: "Audio input" } }),
      "Audio input",
      "the graph's route table is the custom channel",
    );
    assert.equal(
      routeName(5, { 3: { name: "Audio input" } }),
      "DLR",
      "other routes keep their defaults",
    );
    assert.equal(
      routeName(3, { 3: { name: "" } }),
      "Circle",
      "an empty custom name is no name at all",
    );
  });

  it("routeTermini: a chain labels its ends, not its middle", () => {
    // A→B→C on one route: the roundels land at A and C
    const termini = routeTermini([
      { route: 3, nodeId: "A" },
      { route: 3, nodeId: "B" },
      { route: 3, nodeId: "B" },
      { route: 3, nodeId: "C" },
    ]);
    const ends = termini.get(3);
    assert.ok(ends);
    assert.ok(ends.has("A") && ends.has("C"), "the line's termini");
    assert.ok(!ends.has("B"), "the intermediate station is not a terminus");
  });

  it("routeTermini: branches make the junction interior", () => {
    // A→B, A→C: A carries two attachments, so B and C are the ends
    const termini = routeTermini([
      { route: 1, nodeId: "A" },
      { route: 1, nodeId: "A" },
      { route: 1, nodeId: "B" },
      { route: 1, nodeId: "C" },
    ]);
    const ends = termini.get(1);
    assert.ok(ends);
    assert.ok(!ends.has("A"), "the junction is not a terminus");
    assert.ok(ends.has("B") && ends.has("C"));
  });

  it("routeTermini: IIP and export wires count their station end only", () => {
    // An IIP feeds node B on route 2: the IIP chip is the line's other
    // end and is not a station, so B is the terminus
    const termini = routeTermini([{ route: 2, nodeId: "B" }]);
    assert.ok(termini.get(2)?.has("B"));
  });

  it("routeTermini keeps routes independent", () => {
    const termini = routeTermini([
      { route: 0, nodeId: "A" },
      { route: 1, nodeId: "A" },
      { route: 1, nodeId: "A" },
      { route: 1, nodeId: "B" },
    ]);
    assert.ok(
      termini.get(0)?.has("A"),
      "route 0's single attachment is a terminus",
    );
    assert.ok(!termini.get(1)?.has("A"), "route 1 sees both attachments");
    assert.ok(termini.get(1)?.has("B"));
  });
});
