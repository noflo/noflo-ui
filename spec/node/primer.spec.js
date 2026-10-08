import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRIMER, PRIMER_FILENAME, primerFor } from "../../src/node/primer.js";

describe("AGENTS.md primer (work document #44 M2)", () => {
  it("is emitted when the folder lacks AGENTS.md", () => {
    const text = primerFor({ exists: () => false });
    assert.equal(text, PRIMER);
    assert.equal(PRIMER_FILENAME, "AGENTS.md");
  });

  it("never overwrites a pre-existing AGENTS.md", () => {
    assert.equal(primerFor({ exists: () => true }), null);
  });

  it("teaches the layout, FBP basics, and live-sync etiquette", () => {
    assert.match(PRIMER, /graphs\/\*\.graph\.json/);
    assert.match(PRIMER, /COMPONENTS\.md/);
    assert.match(PRIMER, /docs\/\*\.md/);
    assert.match(PRIMER, /information packets/i);
    assert.match(PRIMER, /addressable/i);
    assert.match(PRIMER, /re-read/i, "always re-read before editing");
    assert.match(PRIMER, /Keep edits small/i);
    assert.match(PRIMER, /Files change at any time/i);
  });
});
