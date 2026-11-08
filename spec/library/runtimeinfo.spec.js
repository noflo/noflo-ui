import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  flavorDoc,
  flavorDocs,
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
    const context = templateContext(
      getFlavor("noflo"),
      SIGNATURE,
      "mylib/Parse",
    );
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

  it("the flavor carries bundled authoring and deployment docs", () => {
    const docs = flavorDocs("noflo");
    assert.ok(docs.length >= 2, "authoring and deployment are both present");
    assert.ok(
      docs.some(
        (doc) =>
          doc.category === "authoring" && doc.id && doc.title && doc.markdown,
      ),
      "the authoring doc is complete",
    );
    assert.ok(
      docs.some((doc) => doc.category === "deployment"),
      "the deployment doc is present",
    );
    // Ids are the stable keys the routes and the materialized file names use
    for (const doc of docs) {
      assert.match(doc.id, /^[a-z0-9-]+$/, "file-safe ids");
    }
  });

  it("flavorDoc resolves by id; a miss is null, never an error", () => {
    assert.equal(
      flavorDoc("noflo", "writing-components")?.category,
      "authoring",
    );
    assert.equal(
      flavorDoc("noflo", "getting-a-runtime")?.category,
      "deployment",
    );
    assert.equal(flavorDoc("noflo", "no-such-doc"), null);
    assert.equal(flavorDoc("noflo", ""), null);
  });

  it("flavors without docs carry an empty list", () => {
    assert.deepEqual(flavorDocs("somefbp"), []);
  });

  it("the MicroFlo flavor is the second family — the consumers need no change", () => {
    // The legacy alias collapses like noflo's (work document #66's keying)
    assert.equal(getFlavor("microflo").id, "microflo");
    assert.equal(getFlavor("microflo-arduino").id, "microflo");
    const microflo = getFlavor("microflo");
    assert.equal(microflo.preferredLanguage, "cpp");
    assert.equal(
      microflo.materialization.manifest,
      null,
      "directory scan, no manifest",
    );
    assert.equal(microflo.materialization.componentCodeExt, "hpp");
    assert.ok(
      flavorDocs("microflo").some((doc) => doc.category === "authoring"),
    );
    assert.ok(
      flavorDocs("microflo").some((doc) => doc.category === "deployment"),
    );
  });

  it("the MicroFlo template renders the declarec form with the right base", () => {
    const scaffold = codeScaffold("mcu/Parse", {
      runtime: "microflo",
      signature: {
        description: "Turns a byte into a boolean",
        inports: [{ name: "in", type: "byte" }],
        outports: [{ name: "out", type: "boolean" }],
      },
    });
    assert.ok(scaffold, "the microflo flavor carries the cpp template");
    assert.equal(scaffold.language, "cpp");
    assert.match(scaffold.code, /\/\* microflo_component yaml/);
    assert.match(scaffold.code, /name: Parse/);
    assert.match(
      scaffold.code,
      /type: byte/,
      "the signature's datatype renders as-is",
    );
    assert.match(scaffold.code, /class Parse : public SingleOutputComponent/);
    assert.match(scaffold.code, /process\(Packet in, MicroFlo::PortId port\)/);
    assert.match(scaffold.code, /in\.isData\(\)/);
    // The class-name form is the identifier (C++ is nominally typed)
    assert.ok(
      !scaffold.code.includes("mcu/"),
      "the namespace stays out of the class name",
    );
  });

  it("the MicroFlo template handles the zero and multi-outport bases", () => {
    const none = codeScaffold("mcu/Sink", {
      runtime: "microflo",
      signature: {
        description: "Drops",
        inports: [{ name: "in", type: "all" }],
        outports: [],
      },
    });
    assert.match(none.code, /Sink\(\) : Component\(0, 0\)/);
    const two = codeScaffold("mcu/Split", {
      runtime: "microflo",
      signature: {
        description: "Splits",
        inports: [{ name: "in", type: "all" }],
        outports: [
          { name: "a", type: "all" },
          { name: "b", type: "all" },
        ],
      },
    });
    assert.match(two.code, /Split\(\) : Component\(connections, 2\)/);
    assert.match(two.code, /Connection connections\[2\];/);
    // The connections field lives inside the class body
    const brace = two.code.indexOf("};");
    assert.ok(
      two.code.indexOf("private:") < brace,
      "the field closes inside the class",
    );
  });
});

describe("the language registry (work document #66)", () => {
  it("maps the language ids to their CodeMirror dialects", async () => {
    const { codeMirrorExtension } = await import(
      "../../src/library/languages.js"
    );
    const cm = {
      javascript: (options) => ({ javascript: options ?? true }),
      markdown: () => ({ markdown: true }),
    };
    assert.deepEqual(codeMirrorExtension(cm, "javascript"), {
      javascript: true,
    });
    assert.deepEqual(
      codeMirrorExtension(cm, "typescript"),
      {
        javascript: { typescript: true },
      },
      "the TypeScript dialect rides the vendored lang-javascript",
    );
    assert.deepEqual(codeMirrorExtension(cm, "markdown"), { markdown: true });
    assert.equal(
      codeMirrorExtension(cm, "cpp"),
      null,
      "unvendored languages stay plain",
    );
  });

  it("the flavor's language entries carry the materialization extensions", async () => {
    const { fileExtensionFor } = await import("../../src/library/languages.js");
    const noflo = getFlavor("noflo");
    assert.equal(fileExtensionFor(noflo, "javascript"), "js");
    assert.equal(fileExtensionFor(noflo, "typescript"), "ts");
    assert.equal(
      fileExtensionFor(noflo, "unknown"),
      "js",
      "the preferred language's extension is the fallback",
    );
  });

  it("the scaffold renders the flavor's TypeScript template", () => {
    const scaffold = codeScaffold("mylib/Parse", {
      signature: SIGNATURE,
      language: "typescript",
    });
    assert.ok(scaffold, "the noflo flavor carries a typescript template");
    assert.equal(scaffold.language, "typescript");
  });
});
