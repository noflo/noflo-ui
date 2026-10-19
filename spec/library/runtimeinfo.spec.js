import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getFlavor,
  identifierFrom,
  resolveFlavorId,
  templateContext,
} from "../../src/library/runtimeinfo/index.js";
import { codeScaffold } from "../../src/library/scaffold.js";

const SIGNATURE = {
  description: "Parses the input",
  icon: "filter",
  inports: [
    { name: "in", type: "string" },
    { name: "opt", type: "all", addressable: true },
  ],
  outports: [{ name: "out", type: "string" }],
};

describe("the runtime flavor registry (work document #66)", () => {
  it("resolves flavors and collapses legacy platform types", () => {
    assert.equal(getFlavor("noflo").id, "noflo");
    assert.equal(getFlavor("noflo-nodejs").id, "noflo", "the legacy alias");
    assert.equal(getFlavor("noflo-browser").id, "noflo");
    const unknown = getFlavor("somefbp");
    assert.equal(unknown.id, "somefbp", "unknown families fall back");
    assert.ok(unknown.languages, "the generic descriptor stays usable");
  });

  it("the identifier is the class-name form languages with nominal types need", () => {
    assert.equal(identifierFrom("Parse"), "Parse");
    assert.equal(identifierFrom("my-widget"), "MyWidget");
    assert.equal(identifierFrom("split_array v2"), "SplitArrayV2");
    assert.equal(identifierFrom(""), "Component");
  });

  it("the template context carries the name in its forms and the signature as-is", () => {
    const context = templateContext(getFlavor("noflo"), SIGNATURE, "mylib/Parse");
    assert.equal(context.name, "mylib/Parse");
    assert.equal(context.namespace, "mylib");
    assert.equal(context.shortName, "Parse");
    assert.equal(context.identifier, "Parse");
    assert.equal(context.description, "Parses the input");
    // The signature passes through untouched: the registry's own fields
    // (addressable, schema references) ride along for templates that need them
    assert.equal(context.inports[1].addressable, true);
  });

  it("the scaffold renders the working signature-only stub", () => {
    const scaffold = codeScaffold("mylib/Parse", { signature: SIGNATURE });
    assert.ok(scaffold, "the noflo flavor carries the javascript template");
    assert.match(scaffold.code, /import \{ Component \} from "@noflo\/noflo"/);
    assert.match(scaffold.code, /"Parses the input"/);
    assert.match(scaffold.code, /"filter"/, "the icon carries");
    assert.match(scaffold.code, /in: \{[^}]*datatype: "string"/s);
    assert.match(
      scaffold.code,
      /opt: \{[^}]*datatype: "all"/s,
      "the registry's port shape renders",
    );
    assert.match(
      scaffold.code,
      /for \(const port of \["in","opt"\]\)/,
      "the stub consumes every declared inport",
    );
    assert.match(scaffold.code, /output\.done\(\)/);
    assert.equal(scaffold.language, "javascript");
  });

  it("an unknown runtime flavor has no template to render", () => {
    assert.equal(
      codeScaffold("mylib/Parse", { runtime: "somefbp", signature: SIGNATURE }),
      null,
    );
  });
});
