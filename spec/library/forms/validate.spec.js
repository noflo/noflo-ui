import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validate } from "../../../src/library/forms/validate.js";

/**
 * The forms-subset validator (work document #57): validation for the
 * declared vocabulary, errors as JSON Pointer paths so the form places
 * each one beside the control it describes. The full Tier B validator
 * swaps in through the element's seam when it lands; this module keeps
 * the form functional without the dependency.
 */
describe("forms-subset validator (work document #57)", () => {
  const schema = {
    type: "object",
    properties: {
      name: { type: "string" },
      count: { type: "integer", minimum: 1, maximum: 10 },
      tags: { type: "array", items: { type: "string" }, minItems: 1 },
      role: { type: "string", enum: ["observer", "editor"] },
      kind: { const: "standard" },
      started: { type: "string", format: "date" },
    },
    required: ["name"],
    additionalProperties: false,
  };

  it("accepts a valid document", () => {
    assert.deepEqual(
      validate(
        {
          name: "main",
          count: 3,
          tags: ["a"],
          role: "editor",
          kind: "standard",
          started: "2026-10-16",
        },
        schema,
      ),
      [],
    );
  });

  it("errors carry JSON Pointer paths", () => {
    const errors = validate({ name: 4 }, schema);
    assert.ok(
      errors.some(
        (e) => e.path === "#/name" && /expected string/.test(e.message),
      ),
    );
  });

  it("missing required properties error at their own path", () => {
    const errors = validate({}, schema);
    assert.ok(
      errors.some((e) => e.path === "#/name" && /required/.test(e.message)),
    );
  });

  it("bounds, enums, consts, and formats check", () => {
    const errors = validate(
      {
        name: "x",
        count: 11,
        tags: [],
        role: "admin",
        kind: "other",
        started: "not-a-date",
      },
      schema,
    );
    const messages = errors.map((e) => `${e.path}: ${e.message}`);
    assert.ok(messages.some((m) => m.includes("#/count") && /≤ 10/.test(m)));
    assert.ok(
      messages.some((m) => m.includes("#/tags") && /at least 1/.test(m)),
    );
    assert.ok(
      messages.some(
        (m) => m.includes("#/role") && /"observer", "editor"/.test(m),
      ),
    );
    assert.ok(
      messages.some((m) => m.includes("#/kind") && /"standard"/.test(m)),
    );
    assert.ok(
      messages.some((m) => m.includes("#/started") && /valid date/.test(m)),
    );
  });

  it("a closed schema rejects additional properties", () => {
    const errors = validate({ name: "x", surprise: true }, schema);
    assert.ok(
      errors.some(
        (e) => e.path === "#/surprise" && /not allowed/.test(e.message),
      ),
    );
  });

  it("allOf validates against every member", () => {
    const composed = {
      allOf: [
        { type: "object", properties: { a: { type: "integer" } } },
        { type: "object", required: ["b"] },
      ],
    };
    const errors = validate({ a: "not a number" }, composed);
    assert.ok(errors.some((e) => e.path === "#/a"));
    assert.ok(
      errors.some((e) => e.path === "#/b" && /required/.test(e.message)),
    );
  });

  it("null, present, and absent are distinct", () => {
    const objectSchema = {
      type: "object",
      properties: { note: { type: "string" } },
    };
    assert.deepEqual(
      validate({}, objectSchema).length,
      0,
      "an absent optional property is valid",
    );
    assert.equal(
      validate({ note: null }, objectSchema).length,
      1,
      "an explicit null is not a string",
    );
  });
});
