import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LXMFConstants } from "@reticulum/lxmf";
import {
  chunkText,
  contentFields,
  isUnknownIdentityError,
} from "../../src/node/lxmf.js";

describe("LXMF layer primitives (work document #44 M2)", () => {
  it("contentFields signals Markdown rendering", () => {
    const fields = contentFields();
    assert.equal(
      fields.get(LXMFConstants.FIELD_RENDERER),
      LXMFConstants.RENDERER_MARKDOWN,
    );
  });

  it("chunkText splits within budget and prefers paragraph boundaries", () => {
    const paragraph = "a\n\nb";
    assert.deepEqual(
      chunkText(paragraph, 10),
      [paragraph],
      "short text: one chunk",
    );
    // Boundary within reach of the first chunk: the split lands on it
    const withBoundary = `${"head ".repeat(150)}\n\n${"tail ".repeat(150)}`;
    const chunks = chunkText(withBoundary, 1000);
    assert.equal(chunks.length, 2);
    assert.ok(
      chunks.every((c) => c.length <= 1000),
      "every chunk within budget",
    );
    assert.match(chunks[0], /head\s$/, "first chunk ends at the boundary");
    assert.equal(
      chunks.join("\n\n").includes("tail"),
      true,
      "content preserved",
    );
    // No boundary in reach: a hard cut keeps the budget
    const hard = "x".repeat(2501);
    assert.deepEqual(
      chunkText(hard, 1000).map((c) => c.length),
      [1000, 1000, 501],
    );
  });

  it("isUnknownIdentityError types the router's discovery failure", () => {
    assert.equal(isUnknownIdentityError(new Error("plain")), false);
    assert.equal(isUnknownIdentityError(null), false);
  });
});
