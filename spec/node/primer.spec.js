import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRIMER_FILENAME, primerFor } from "../../src/node/primer.js";

describe("the agent primer (work document #44 M2)", () => {
  it("is emitted when the folder lacks an AGENTS.md", () => {
    const text = primerFor({ exists: () => false });
    assert.ok(text && text.length > 0, "the primer text is returned");
    assert.match(text, /graphs\/\*\.graph\.json/);
    assert.match(text, /COMPONENTS\.md/);
    assert.match(text, /docs\/\*\.md/);
    assert.match(text, /information packets/i);
    assert.match(text, /addressable/i);
    assert.match(text, /re-read/i, "always re-read before editing");
    assert.match(text, /Keep edits small/i);
    assert.match(text, /Files change at any time/i);
  });

  it("is never emitted over a pre-existing AGENTS.md (the overlay rule)", () => {
    assert.equal(primerFor({ exists: () => true }), null);
  });

  it("names the project and pins the agent's scope (work document #67)", () => {
    const text = primerFor({
      exists: () => false,
      projectName: "My Flow Project",
    });
    assert.ok(text);
    assert.match(text, /"My Flow Project"/, "the project is named");
    assert.match(
      text,
      /THIS FOLDER IS THE ENTIRE PROJECT/,
      "the scope rule is explicit",
    );
    assert.match(
      text,
      /not your project/,
      "parent checkouts are explicitly out of scope",
    );
  });

  it("teaches the visual graph concepts: routes and groups (work documents #35, #29)", () => {
    const text = primerFor({ exists: () => false, projectName: "P" });
    assert.ok(text);
    // Routes: the subway-line metaphor, the materialized form, and the
    // editor-held route table
    assert.match(text, /metadata\.route/, "connection route metadata");
    assert.match(text, /subway line/i, "the visual metaphor named");
    assert.match(text, /route table/, "the names live in the editor");
    assert.match(text, /Never renumber/i, "route indices are identifiers");
    // Groups: named node clusters
    assert.match(text, /`groups`/, "groups in the graph file");
    assert.match(text, /named clusters/, "groups are named clusters");
  });
});
