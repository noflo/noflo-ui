import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-project-corner.js";

/**
 * A query surface that spans the corner's own shadow (chip content) and
 * the panel portal's shadow (panel content) — the space manager moved
 * the panels into the side containers, and the tests need to see both.
 *
 * @param {any} el
 */
function dualShadow(el) {
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

/** @returns {any} */
function makeCorner() {
  const el = /** @type {any} */ (
    document.createElement("noflo-project-corner")
  );
  document.body.appendChild(el);
  return el;
}

const docs = () => [
  {
    id: "a".repeat(32),
    title: "Implement the parser",
    scope: "active",
    edited: Date.now(),
  },
  {
    id: "b".repeat(32),
    title: "Sketch the exporter",
    scope: "proposed",
    pendingScope: "active",
    boardId: 42,
    edited: Date.now() - 1000,
  },
];

describe("FlowProjectCorner (work document #9)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("stays reachable with zero documents: the create affordance lives here", () => {
    const el = makeCorner();
    el.setWorkDocs([]);
    assert.equal(el._visible, true, "the corner shows on an empty project");
    const chip = /** @type {HTMLElement} */ (
      dualShadow(el).querySelector(".chip")
    );
    assert.match(chip.textContent ?? "", /work docs 0/);
    // The chip reads as a segment now — icon, words, and the ladder's
    // bare count that survives minification
    assert.ok(chip.querySelector(".seg .fa"), "the chip carries its icon");
    assert.match(
      chip.querySelector(".seg .count")?.textContent ?? "",
      /^0$/,
      "the count is the bare active-document number",
    );
    el.expanded = true;
    el.render();
    assert.ok(
      el.panelShadow.querySelector("[data-action='create-doc']"),
      "the create affordance is reachable on an empty project",
    );
    el.remove();
  });

  it("the panel stays closed until the chip toggles it", () => {
    const el = makeCorner();
    el.setWorkDocs(docs());
    assert.equal(
      el.panelShadow.querySelector(".panel"),
      null,
      "no accordion by default",
    );
    el.expanded = true;
    el.render();
    assert.ok(el.panelShadow.querySelector(".panel"), "the chip opens it");
    el.remove();
  });

  it("the chip carries the count, proposed separated", () => {
    const el = makeCorner();
    el.setWorkDocs(docs());
    const chip = /** @type {HTMLElement} */ (
      dualShadow(el).querySelector(".chip")
    );
    assert.match(chip.textContent ?? "", /work docs 1/);
    assert.match(chip.textContent ?? "", /\+1 proposed/);
    el.remove();
  });

  it("the expanded accordion lists documents newest first", () => {
    const el = makeCorner();
    el.setWorkDocs(docs());
    el.expanded = true;
    el.render();
    const rows = [...el.panelShadow.querySelectorAll("[data-doc]")].map(
      (/** @type {any} */ row) => row.getAttribute("data-doc"),
    );
    assert.deepEqual(rows, ["a".repeat(32), "b".repeat(32)], "newest first");
    const text = el.panelShadow.querySelector(".panel")?.textContent ?? "";
    assert.match(text, /Implement the parser/);
    assert.match(text, /Sketch the exporter/);
    // Scope badges: active and proposed are distinct
    assert.ok(dualShadow(el).querySelector(".badge.active"));
    assert.ok(dualShadow(el).querySelector(".badge.proposed"));
    el.remove();
  });

  it("pending scope requests and board numbers render as badges", () => {
    const el = makeCorner();
    el.setWorkDocs(docs());
    el.expanded = true;
    el.render();
    assert.ok(
      dualShadow(el).querySelector(".badge.pending"),
      "the unconfirmed scope request shows as pending",
    );
    assert.match(
      el.panelShadow.querySelector(".panel")?.textContent ?? "",
      /#42/,
      "the board number renders as materialization metadata",
    );
    el.remove();
  });

  it("the create affordance emits workdoc-create", () => {
    const el = makeCorner();
    el.setWorkDocs(docs());
    el.expanded = true;
    el.render();
    let creates = 0;
    el.addEventListener("workdoc-create", () => {
      creates += 1;
    });
    /** @type {HTMLElement} */ (
      el.panelShadow.querySelector("[data-action='create-doc']")
    ).click();
    assert.equal(creates, 1);
    el.remove();
  });

  it("clicking a row emits workdoc-open with the document's id", () => {
    const el = makeCorner();
    el.setWorkDocs(docs());
    el.expanded = true;
    el.render();
    /** @type {any[]} */
    const opens = [];
    el.addEventListener("workdoc-open", (/** @type {any} */ e) =>
      opens.push(e.detail),
    );
    /** @type {HTMLElement} */ (
      dualShadow(el).querySelector(`[data-doc='${"b".repeat(32)}']`)
    ).click();
    assert.deepEqual(opens, [{ docId: "b".repeat(32) }]);
    el.remove();
  });
});
