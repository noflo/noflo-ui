import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-project-explorer.js";

/**
 * The project explorer (work document #63): the Context corner's
 * navigation tree — the project's graphs with their subgraph hierarchy,
 * components, schemas, specs, and work documents, every entry navigating
 * through the router's kind-addressed screens.
 */

/**
 * @returns {any}
 */
function makeExplorer() {
  const el = document.createElement("noflo-project-explorer");
  document.body.appendChild(el);
  return el;
}

describe("project explorer (work document #63)", () => {
  it("the tree lists the project's contents by family", () => {
    const el = makeExplorer();
    el.setContents({
      projectName: "My project",
      graphs: [
        { name: "main", parent: "" },
        { name: "main/helper", parent: "main" },
      ],
      components: ["core/Repeat"],
      schemas: ["ui/point"],
      specs: ["main-test"],
      workDocs: [{ id: "d1", title: "Design notes" }],
    });
    el.expanded = true;
    el.render();
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.match(shadow.textContent ?? "", /My project/);
    assert.match(shadow.textContent ?? "", /Graphs/);
    assert.match(shadow.textContent ?? "", /Components/);
    assert.match(shadow.textContent ?? "", /Schemas/);
    assert.match(shadow.textContent ?? "", /Specs/);
    assert.match(shadow.textContent ?? "", /Work documents/);
    el.remove();
  });

  it("sections toggle open: entries render nested for subgraphs", async () => {
    const el = makeExplorer();
    el.setContents({
      projectName: "My project",
      graphs: [
        { name: "main", parent: "" },
        { name: "main/helper", parent: "main" },
      ],
      components: [],
      schemas: [],
      specs: [],
      workDocs: [],
    });
    el.expanded = true;
    el.render();
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    // Sections start collapsed: navigation, not a dashboard
    assert.ok(!shadow.querySelector(".section.open"), "sections start closed");
    const graphsHead = shadow.querySelector('[data-section="graphs"]');
    graphsHead?.dispatchEvent(new Event("click", { bubbles: true }));
    const openSection = shadow.querySelector(".section.open .rows");
    assert.ok(openSection, "the toggled section opens");
    assert.match(openSection.textContent ?? "", /main/);
    assert.match(openSection.textContent ?? "", /helper/, "the subgraph nests");
    el.remove();
  });

  it("entries navigate and the corner collapses — the dismissal contract", async () => {
    const el = makeExplorer();
    el.setContents({
      projectName: "My project",
      graphs: [{ name: "main", parent: "" }],
      components: ["core/Repeat"],
      schemas: ["ui/point"],
      specs: [],
      workDocs: [{ id: "d1", title: "Design notes" }],
    });
    el.expanded = true;
    el.render();
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    /** @type {any[]} */
    const navigations = [];
    el.addEventListener("explorer-navigate", (/** @type {any} */ e) =>
      navigations.push({ kind: e.detail.kind, id: e.detail.id }),
    );
    const schemasHead = shadow.querySelector('[data-section="schemas"]');
    schemasHead?.dispatchEvent(new Event("click", { bubbles: true }));
    shadow
      .querySelector('[data-navigate="schema"][data-name="ui/point"]')
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    assert.deepEqual(navigations, [{ kind: "schema", id: "ui/point" }]);
    assert.equal(el.expanded, false, "the corner collapses after navigation");
    el.remove();
  });

  it("the active screen highlights in the tree", () => {
    const el = makeExplorer();
    el.setContents({
      projectName: "My project",
      graphs: [{ name: "main", parent: "" }],
      components: ["core/Repeat"],
      schemas: [],
      specs: [],
      workDocs: [],
    });
    el.setActive({ kind: "component", id: "core/Repeat" });
    el.expanded = true;
    el.render();
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const activeRow = shadow.querySelector(".tree-entry.active");
    assert.ok(activeRow, "the active entry highlights");
    assert.match(activeRow.textContent ?? "", /core\/Repeat/);
    el.remove();
  });
});
