import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-context-chip.js";

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
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
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
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
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
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
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
