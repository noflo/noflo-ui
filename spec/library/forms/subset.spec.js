import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildFormNode,
  DECLARED_FORMATS,
} from "../../../src/library/forms/subset.js";

/**
 * The forms-subset walker (work document #57): classifies a JSON Schema
 * per subtree into what the form draws and what falls back to the raw
 * JSON editor. The fallback is a declared outcome, not a gap.
 */
describe("forms-subset walker (work document #57)", () => {
  it("classifies the scalar widgets", () => {
    assert.equal(buildFormNode({ type: "string" }).kind, "string");
    assert.equal(buildFormNode({ type: "integer" }).kind, "integer");
    assert.equal(buildFormNode({ type: "number" }).kind, "number");
    assert.equal(buildFormNode({ type: "boolean" }).kind, "boolean");
  });

  it("enum and const are their own kinds", () => {
    const enumNode = buildFormNode({ type: "string", enum: ["a", "b"] });
    assert.equal(enumNode.kind, "enum");
    assert.deepEqual(enumNode.enum, ["a", "b"]);
    const constNode = buildFormNode({ const: 42 });
    assert.equal(constNode.kind, "const");
    assert.equal(constNode.const, 42);
  });

  it("objects carry their properties with required flags", () => {
    const node = buildFormNode({
      type: "object",
      properties: {
        name: { type: "string", title: "Name" },
        count: { type: "integer", default: 3 },
      },
      required: ["name"],
    });
    assert.equal(node.kind, "object");
    assert.equal(node.properties?.length, 2);
    assert.equal(node.properties?.[0].required, true);
    assert.equal(node.properties?.[1].required, false);
    assert.equal(node.properties?.[1].node.defaultValue, 3);
  });

  it("allOf merges property maps and unions required", () => {
    const node = buildFormNode({
      allOf: [
        {
          type: "object",
          properties: { a: { type: "string" } },
          required: ["a"],
        },
        {
          properties: { b: { type: "integer" } },
          required: ["b"],
        },
      ],
    });
    assert.equal(node.kind, "object");
    assert.deepEqual(
      node.properties?.map((property) => property.name),
      ["a", "b"],
    );
    assert.deepEqual(node.schema.required, ["a", "b"]);
  });

  it("arrays carry their items node and bounds", () => {
    const node = buildFormNode({
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 4,
    });
    assert.equal(node.kind, "array");
    assert.equal(node.items?.kind, "string");
    assert.equal(node.minItems, 1);
    assert.equal(node.maxItems, 4);
  });

  it("keywords outside the subset fall back per subtree", () => {
    for (const schema of [
      { $ref: "#/$defs/thing" },
      { oneOf: [{ type: "string" }] },
      { anyOf: [{ type: "string" }] },
      { if: { type: "string" }, then: { type: "string" } },
      { not: {} },
      { pattern: "^a" },
      { patternProperties: { "^a": {} } },
      { type: "string", contentEncoding: "base64" },
    ]) {
      const node = buildFormNode(schema);
      assert.equal(node.kind, "fallback", JSON.stringify(schema));
      assert.ok(node.fallbackReason);
    }
  });

  it("an allOf member's fallback keyword taints the composition", () => {
    const node = buildFormNode({
      allOf: [
        { type: "object", properties: { a: { type: "string" } } },
        { not: {} },
      ],
    });
    assert.equal(node.kind, "fallback");
  });

  it("the shapeless passthrough falls back — the all datatype's raw editor", () => {
    const node = buildFormNode({});
    assert.equal(node.kind, "fallback");
    assert.match(node.fallbackReason ?? "", /shapeless/);
  });

  it("annotations are ignored, not fallback triggers", () => {
    const node = buildFormNode({
      type: "string",
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $comment: "why not",
    });
    assert.equal(node.kind, "string");
  });

  it("the declared format set carries the specializations", () => {
    assert.ok(DECLARED_FORMATS.has("date"));
    assert.ok(DECLARED_FORMATS.has("color"));
    const node = buildFormNode({ type: "string", format: "color" });
    assert.equal(node.format, "color");
  });

  it("recursion falls back instead of blowing the stack", () => {
    const schema = { type: "object", properties: {} };
    schema.properties.self = schema;
    const node = buildFormNode(schema);
    assert.equal(node.kind, "object");
    // The recursion guard stops the walk: the deep levels fall back
    let current = node;
    let depth = 0;
    while (current.kind === "object") {
      current = current.properties?.[0].node;
      depth += 1;
      assert.ok(depth < 20, "the walk terminates");
    }
    assert.equal(current.kind, "fallback", "the guard catches the walk");
  });
});
