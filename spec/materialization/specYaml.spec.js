import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addSpecCase,
  createProjectDoc,
  ensureSpecSuite,
} from "../../src/crdt/ProjectDoc.js";
import { docToFileTree } from "../../src/materialization/fileTree.js";
import { specSuiteToYaml } from "../../src/materialization/specYaml.js";

describe("the spec suite's YAML serialization (work document #43)", () => {
  it("renders a component suite with the case's structural model", () => {
    const doc = createProjectDoc("p");
    const suite = ensureSpecSuite(doc, "spec_parse", "mylib/Parse");
    addSpecCase(suite, {
      name: "trims input",
      inputs: [{ port: "in", payload: "hello  " }],
      expects: [{ port: "out", payload: "hello" }],
    });
    addSpecCase(suite, {
      name: "greater case",
      inputs: [{ port: "in", payload: 5 }],
      expects: [{ port: "out", payload: 5, assertion: "greater" }],
    });
    const yaml = specSuiteToYaml(suite, { isGraph: false });
    assert.match(yaml, /^name: mylib\/Parse\n/);
    assert.match(yaml, /component: mylib\/Parse\n/);
    assert.match(yaml, /cases:\n/);
    assert.match(yaml, /- name: "trims input"\n/, "names with spaces quote");
    assert.match(
      yaml,
      / {4}inputs:\n {6}in: "hello {2}"\n/,
      "trailing spaces quote",
    );
    assert.match(yaml, / {4}expect:\n {6}out: hello\n/);
    assert.match(yaml, / {4}assertion:\n {6}type: greater\n/);
  });

  it("targets graphs with graph:, components with component:", () => {
    const doc = createProjectDoc("p");
    const suite = ensureSpecSuite(doc, "spec_main", "main");
    addSpecCase(suite, { name: "c", inputs: [], expects: [] });
    const yaml = specSuiteToYaml(suite, { isGraph: true });
    assert.match(yaml, /graph: main\n/);
    assert.doesNotMatch(yaml, /component:/);
  });

  it("quotes values that would read as something else in bare YAML", () => {
    const doc = createProjectDoc("p");
    const suite = ensureSpecSuite(doc, "spec_edges", "mylib/Parse");
    addSpecCase(suite, {
      name: "truthy strings stay strings",
      inputs: [{ port: "in", payload: "true" }],
      expects: [{ port: "out", payload: { nested: [1, 2] } }],
    });
    const yaml = specSuiteToYaml(suite, { isGraph: false });
    assert.match(yaml, /in: "true"\n/, "a boolean-looking string is quoted");
    assert.match(
      yaml,
      /out: \{"nested":\[1,2\]\}\n/,
      "objects ride JSON's flow style, which is valid YAML",
    );
  });

  it("materializes into the tree as specs/<id>.yaml and is deterministic", () => {
    const doc = createProjectDoc("p");
    const suite = ensureSpecSuite(doc, "spec_parse", "mylib/Parse");
    addSpecCase(suite, {
      name: "trims input",
      inputs: [{ port: "in", payload: "hello  " }],
      expects: [{ port: "out", payload: "hello" }],
    });
    const tree = docToFileTree(doc);
    assert.ok(tree["specs/spec_parse.yaml"], "the file lands");
    assert.equal(tree["specs/spec_parse.yaml"], specSuiteToYaml(suite));
    assert.equal(
      tree["specs/spec_parse.yaml"],
      docToFileTree(doc)["specs/spec_parse.yaml"],
    );
  });

  it("an empty suite materializes with an empty cases list", () => {
    const doc = createProjectDoc("p");
    const suite = ensureSpecSuite(doc, "spec_empty", "mylib/Parse");
    const yaml = specSuiteToYaml(suite, { isGraph: false });
    assert.match(yaml, /cases: \[\]/);
  });
});
