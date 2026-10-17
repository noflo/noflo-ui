import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ROUTE_LINE_NAMES, routeName } from "../../src/library/routes.js";

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
});
