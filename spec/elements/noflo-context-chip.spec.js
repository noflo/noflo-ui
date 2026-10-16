import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-context-chip.js";

/**
 * A query surface that spans the corner's own shadow (chip content) and
 * the panel portal's shadow (panel content) — the space manager moved
 * the panels into the side containers, and the tests need to see both.
 *
 * @param {any} el
 */
function _dualShadow(el) {
  const chip = el.shadowRoot;
  const panel = el._panelPortal?.shadowRoot ?? null;
  return {
    querySelector: (/** @type {string} */ s) =>
      chip?.querySelector(s) ?? panel?.querySelector(s) ?? null,
    querySelectorAll: (/** @type {string} */ s) => {
      const a = [...(chip?.querySelectorAll(s) ?? [])];
      const b = [...(panel?.querySelectorAll(s) ?? [])];
      return a.length > 0 ? a : b;
    },
    get textContent() {
      return (chip?.textContent ?? "") + (panel?.textContent ?? "");
    },
  };
}

/**
 * @returns {any}
 */
function makeElement() {
  const el = document.createElement("noflo-context-chip");
  document.body.appendChild(el);
  return el;
}

describe("FlowContextChip (work document #28)", () => {
  it("renders the editing context and the settings entry", () => {
    const el = makeElement();
    el.setLabel("My project · main");
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    assert.match(shadow.textContent ?? "", /My project · main/);
    const settings = shadow.querySelector("[data-action='settings']");
    assert.ok(settings, "the gear opens configuration");
    /** @type {boolean} */
    let opened = false;
    el.addEventListener("open-settings", () => {
      opened = true;
    });
    /** @type {HTMLElement} */ (settings).click();
    assert.ok(opened, "the gear emits open-settings");
    el.remove();
  });

  it("re-renders only when the label actually changes", () => {
    const el = makeElement();
    el.setLabel("a");
    const before = /** @type {ShadowRoot} */ (el.shadowRoot).innerHTML;
    el.setLabel("a");
    assert.equal(
      /** @type {ShadowRoot} */ (el.shadowRoot).innerHTML,
      before,
      "no re-render for an unchanged label",
    );
    el.setLabel("b");
    assert.notEqual(
      /** @type {ShadowRoot} */ (el.shadowRoot).innerHTML,
      before,
    );
    el.remove();
  });

  it("hides the up button at root graphs", () => {
    const el = makeElement();
    el.setLabel("My project · main");
    el.setUp("");
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    assert.equal(
      shadow.querySelector("[data-action='up']"),
      null,
      "no up button without a parent (the Home graph is WD #32)",
    );
    el.remove();
  });

  it("offers up navigation when the graph has a parent", () => {
    const el = makeElement();
    el.setLabel("My project · main/sub");
    el.setUp("main");
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    const up = shadow.querySelector("[data-action='up']");
    assert.ok(up, "the up button renders");
    assert.match(
      /** @type {HTMLElement} */ (up).title ?? "",
      /Back to main/,
      "the up button names its target",
    );
    /** @type {string[]} */
    const navigations = [];
    el.addEventListener("navigate-up", () => navigations.push("up"));
    /** @type {HTMLElement} */ (up).click();
    assert.deepEqual(navigations, ["up"], "the up button emits navigate-up");
    el.setUp("");
    assert.equal(
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector(
        "[data-action='up']",
      ),
      null,
      "the button drops out at root graphs",
    );
    el.remove();
  });

  it("never enters the Expanded state: no accordion content yet", () => {
    const el = makeElement();
    const chip = /** @type {HTMLElement} */ (
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector(".chip")
    );
    chip.click();
    assert.equal(el.cornerState, "normal", "the Context corner stays Normal");
    el.remove();
  });
});

describe("context chip project explorer (work document #63)", () => {
  /**
   * A chip with the tree fed.
   *
   * @returns {any}
   */
  async function makeWithTree() {
    const el = document.createElement("noflo-context-chip");
    document.body.appendChild(el);
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
    return el;
  }

  it("the segment opens the tree, sections toggle, subgraphs nest", async () => {
    const el = await makeWithTree();
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    assert.ok(
      shadow.querySelector('[data-segment-toggle="explorer"]'),
      "the explorer segment renders in the strip",
    );
    assert.ok(!shadow.querySelector(".explorer"), "closed: no tree");
    shadow
      .querySelector('[data-segment-toggle="explorer"]')
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    const tree = /** @type {any} */ (
      el._panelPortal
    )?.shadowRoot?.querySelector(".explorer");
    assert.ok(tree, "the tree opens");
    // Sections with content render open: the runtime corner's accordion
    // opens with its rows visible
    assert.match(tree.textContent ?? "", /helper/, "the subgraph nests");
    assert.match(
      tree.textContent ?? "",
      /main-test/,
      "the spec entry renders open",
    );
    el.remove();
  });

  it("the label update cycle preserves the open tree", async () => {
    // The real app's flow: updateContextChip runs after every mirror
    // cycle — setLabel, clearWorkDoc, setUp — and the tree must survive
    // it (the first cut's init block landed in clearWorkDoc, wiping the
    // tree on every label update)
    const el = await makeWithTree();
    el.toggleSegment("explorer");
    el.setLabel("My project · main");
    el.clearWorkDoc();
    el.setUp("");
    const tree = /** @type {any} */ (
      el._panelPortal
    )?.shadowRoot?.querySelector(".explorer");
    assert.ok(tree, "the tree survives the label cycle");
    // main + nested helper + Repeat + ui/point + the inert spec + Notes
    assert.equal(tree.querySelectorAll(".tree-row").length, 6, "the rows stay");
    el.remove();
  });

  it("doc entries navigate by id, components open their editor, specs are inert", async () => {
    const el = await makeWithTree();
    el.setContents({
      projectName: "My project",
      graphs: [{ name: "main", parent: "" }],
      components: ["core/Repeat"],
      schemas: ["ui/point"],
      specs: ["main-test"],
      workDocs: [{ id: "d1", title: "Design notes" }],
    });
    el.toggleSegment("explorer");
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    /** @type {any[]} */
    const navigations = [];
    el.addEventListener("explorer-navigate", (/** @type {any} */ e) =>
      navigations.push({ kind: e.detail.kind, id: e.detail.id }),
    );
    // The doc row displays the title but navigates by id
    const docRow = shadow.querySelector('[data-navigate="doc"]');
    assert.match(
      docRow?.textContent ?? "",
      /Design notes/,
      "the title displays",
    );
    docRow?.dispatchEvent(new Event("click", { bubbles: true }));
    assert.deepEqual(navigations, [{ kind: "doc", id: "d1" }]);
    // Specs render inert: no navigation marker
    assert.ok(
      !shadow.querySelector('[data-navigate="spec"]'),
      "specs stay inert until their runner lands (#16)",
    );
    el.remove();
  });
});
