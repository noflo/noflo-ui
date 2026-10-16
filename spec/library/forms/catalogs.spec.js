import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  catalogEntry,
  validateMetadata,
} from "../../../src/library/forms/catalogs.js";

/**
 * The metadata catalogs (work document #57): the editor's metadata
 * writes validate against the shipped ui/runtime catalogs at send time —
 * Tier B, hard enforcement.
 */
describe("metadata catalogs (work document #57)", () => {
  it("resolves the shipped entries by the bare editor key", () => {
    const x = catalogEntry("ui", "x");
    assert.ok(x, "ui.x resolves");
    assert.equal(x.class, "positional");
    assert.deepEqual(x.kinds, ["node", "export", "iip"]);
    const hwm = catalogEntry("runtime", "highWaterMark");
    assert.ok(hwm, "runtime.highWaterMark resolves");
    assert.equal(hwm.class, "config");
  });

  it("validates node positions against the ui catalog", () => {
    assert.deepEqual(validateMetadata("ui", { x: 10, y: -20 }, "node"), []);
    const errors = validateMetadata("ui", { x: "left" }, "node");
    assert.ok(errors.some((e) => e.key === "x" && /number/i.test(e.message)));
  });

  it("the entity-kind filter applies: ui.route is edge-only", () => {
    // route on a node is not this catalog's business — the entry's kinds
    // exclude it, so the validation passes
    assert.deepEqual(validateMetadata("ui", { route: 3 }, "node"), []);
    // routePoints on an edge: the shape validates
    assert.deepEqual(
      validateMetadata("ui", { routePoints: [{ x: 0, y: 0 }] }, "edge"),
      [],
    );
  });

  it("keys without a declared entry pass — unowned namespaces are app-specific", () => {
    assert.deepEqual(
      validateMetadata("ui", { myApp: { anything: true } }, "node"),
      [],
    );
  });

  it("absent and null values pass: absence is not a violation", () => {
    assert.deepEqual(
      validateMetadata("ui", { x: null, y: undefined }, "node"),
      [],
    );
  });
});
