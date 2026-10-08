import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import { FlowCornerElement } from "../../src/elements/corner-element.js";

/**
 * A minimal corner for state-machine tests: one segment, one accordion.
 */
class TestCorner extends FlowCornerElement {
  /**
   * @returns {string}
   */
  chipHtml() {
    return `<span class="seg"><i class="fa"></i><span class="label">value</span></span>`;
  }

  /**
   * @returns {string}
   */
  expandedHtml() {
    return this.expanded ? `<div class="panel">accordion content</div>` : "";
  }
}

customElements.define("test-corner", TestCorner);

/**
 * A corner without accordion content: never expands.
 */
class FlatCorner extends FlowCornerElement {
  constructor() {
    super();
    this.expandable = false;
  }

  /**
   * @returns {string}
   */
  chipHtml() {
    return `<span class="seg"><span class="label">flat</span></span>`;
  }
}

customElements.define("flat-corner", FlatCorner);

/**
 * @returns {TestCorner}
 */
function makeElement() {
  const el = /** @type {TestCorner} */ (document.createElement("test-corner"));
  document.body.appendChild(el);
  return el;
}

describe("FlowCornerElement states (work document #28)", () => {
  it("starts in the Normal state with the chip visible", () => {
    const el = makeElement();
    assert.equal(el.cornerState, "normal");
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(shadow.querySelector(".chip"), "the chip renders");
    assert.ok(!shadow.querySelector(".panel"), "collapsed by default");
    el.remove();
  });

  it("Hidden empties the shadow and collapses the corner", () => {
    const el = makeElement();
    el.expanded = true;
    el.setVisible(false);
    assert.equal(el.cornerState, "hidden");
    assert.ok(el.hasAttribute("hidden"));
    assert.equal(
      /** @type {ShadowRoot} */ (el.shadowRoot).innerHTML,
      "",
      "hidden renders nothing",
    );
    assert.equal(el.expanded, false, "hiding collapses the corner");
    el.setVisible(true);
    assert.equal(el.cornerState, "normal", "back to Normal");
    assert.ok(!el.hasAttribute("hidden"));
    el.remove();
  });

  it("Minified drops the segment labels, icons and counts only", () => {
    const el = makeElement();
    el.setMinified(true);
    assert.equal(el.cornerState, "minified");
    assert.ok(
      el.hasAttribute("data-minified"),
      "the state carries a host attribute for styling and tests",
    );
    const style =
      /** @type {HTMLElement} */ (
        /** @type {ShadowRoot} */ (el.shadowRoot).querySelector("style")
      ).textContent ?? "";
    assert.match(
      style,
      /:host\(\[data-minified\]\) \.seg \.label \{ display: none; \}/,
      "minified hides the labels",
    );
    el.setMinified(false);
    assert.equal(el.cornerState, "normal");
    assert.ok(!el.hasAttribute("data-minified"));
    el.remove();
  });

  it("toggles between Normal and Expanded on chip interaction", () => {
    const el = makeElement();
    const chip = /** @type {HTMLElement} */ (
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector(
        "[data-action='toggle']",
      )
    );
    chip.click();
    assert.equal(el.cornerState, "expanded");
    assert.ok(
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector(".panel"),
      "the accordions render",
    );
    const reopenedChip = /** @type {HTMLElement} */ (
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector(
        "[data-action='toggle']",
      )
    );
    reopenedChip.click();
    assert.equal(el.cornerState, "normal", "back to Normal");
    el.remove();
  });

  it("chips without accordion content never expand", () => {
    const el = /** @type {FlatCorner} */ (
      document.createElement("flat-corner")
    );
    document.body.appendChild(el);
    const chip = /** @type {HTMLElement} */ (
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector(
        "[data-action='toggle']",
      )
    );
    chip.click();
    assert.equal(el.cornerState, "normal", "stays Normal");
    assert.ok(
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector(".chip"),
      "the chip still renders",
    );
    el.remove();
  });

  it("the shared grammar carries the Ages state colors and the throb", () => {
    const el = makeElement();
    const style =
      /** @type {HTMLElement} */ (
        /** @type {ShadowRoot} */ (el.shadowRoot).querySelector("style")
      ).textContent ?? "";
    for (const age of ["calm", "activity", "attention", "offline"]) {
      assert.match(style, new RegExp(`\\.seg\\.${age}`), `${age} state color`);
    }
    assert.match(style, /\.throb/, "attention segments throb");
    assert.match(
      style,
      /@media \(max-width: 480px\)/,
      "phone layouts auto-minify through the shared media query",
    );
    el.remove();
  });
});

describe("FlowCornerElement viewport-driven minify (work document #28)", () => {
  /**
   * @param {number} width
   */
  async function setViewport(width) {
    window.happyDOM.setViewport({ width });
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  it("auto-minifies when the viewport shrinks, restores when it grows", async () => {
    await setViewport(1024);
    const el = makeElement();
    assert.equal(el.cornerState, "normal", "desktop starts Normal");
    await setViewport(400);
    assert.equal(
      el.cornerState,
      "minified",
      "the resize listener minifies the corner",
    );
    assert.ok(
      el.hasAttribute("data-minified"),
      "the attribute carries the state to the CSS",
    );
    await setViewport(1024);
    assert.equal(el.cornerState, "normal", "growing restores Normal");
    assert.ok(!el.hasAttribute("data-minified"));
    el.remove();
    await setViewport(1024);
  });

  it("an explicit setting overrides the viewport, and can be released", async () => {
    await setViewport(1024);
    const el = makeElement();
    el.setMinified(true);
    await setViewport(400);
    assert.equal(el.cornerState, "minified");
    await setViewport(1024);
    assert.equal(
      el.cornerState,
      "minified",
      "explicit minify survives growing",
    );
    el.setMinified(false);
    assert.equal(
      el.cornerState,
      "normal",
      "explicit un-minify beats the compact viewport",
    );
    await setViewport(400);
    assert.equal(
      el.cornerState,
      "normal",
      "the explicit setting still wins on a compact viewport",
    );
    el.setMinified(null);
    assert.equal(
      el.cornerState,
      "minified",
      "releasing the explicit setting returns to viewport-driven",
    );
    el.remove();
    await setViewport(1024);
  });

  it("starts minified when connected on an already-compact viewport", async () => {
    await setViewport(400);
    const el = makeElement();
    assert.equal(
      el.cornerState,
      "minified",
      "the initial resize check applies",
    );
    el.remove();
    await setViewport(1024);
  });
});

describe("FlowCornerElement accessibility (work document #41)", () => {
  it("the chip is keyboard-operable: focusable, toggles on Enter and Space", () => {
    const el = makeElement();
    const chip = /** @type {HTMLElement} */ (
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector(
        "[data-action='toggle']",
      )
    );
    assert.equal(chip.getAttribute("role"), "button");
    assert.equal(chip.getAttribute("tabindex"), "0");
    for (const key of ["Enter", " "]) {
      // Each toggle re-renders, so re-query the chip every iteration
      const currentChip = /** @type {HTMLElement} */ (
        /** @type {ShadowRoot} */ (el.shadowRoot).querySelector(
          "[data-action='toggle']",
        )
      );
      currentChip.dispatchEvent(
        new window.KeyboardEvent("keydown", { key, bubbles: true }),
      );
      assert.equal(
        el.cornerState,
        key === "Enter" ? "expanded" : "normal",
        `${key === "Enter" ? "Enter" : "Space"} toggles the corner`,
      );
    }
    el.remove();
  });

  it("non-expandable chips carry no button role or tab stop", () => {
    const el = /** @type {FlatCorner} */ (
      document.createElement("flat-corner")
    );
    document.body.appendChild(el);
    const chip = /** @type {HTMLElement} */ (
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector(
        "[data-action='toggle']",
      )
    );
    assert.equal(chip.getAttribute("role"), null);
    assert.equal(chip.getAttribute("tabindex"), null);
    el.remove();
  });

  it("the throb is gated behind the motion settings", () => {
    const el = makeElement();
    const style =
      /** @type {HTMLElement} */ (
        /** @type {ShadowRoot} */ (el.shadowRoot).querySelector("style")
      ).textContent ?? "";
    assert.match(
      style,
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.throb \{ animation: none; \}/,
      "reduced motion stops the throb",
    );
    assert.match(
      style,
      /:host\(\[data-animations="off"\]\) \.throb \{ animation: none; \}/,
      "the data-animations hook stops the throb",
    );
    el.remove();
  });

  it("mirrors the body's data-animations state onto the host", () => {
    document.body.setAttribute("data-animations", "off");
    const el = makeElement();
    assert.equal(
      el.getAttribute("data-animations"),
      "off",
      "the host attribute feeds :host([data-animations]) selectors",
    );
    document.body.removeAttribute("data-animations");
    el.render();
    assert.ok(
      !el.hasAttribute("data-animations"),
      "re-rendering re-mirrors the cleared state",
    );
    el.remove();
  });
});
