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

  it("shows the tab's engine role", () => {
    const el = makeElement();
    el.setRole({ leader: true });
    let shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.match(shadow.textContent ?? "", /Leader/);
    el.setRole({ leader: false, leaderId: "tab-9" });
    shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.match(shadow.textContent ?? "", /Observer/);
    const roleBadge = /** @type {HTMLElement} */ (
      shadow.querySelector(".role")
    );
    assert.match(roleBadge?.title ?? "", /tab-9/, "the leader is named");
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

  it("hides the role on phone layouts", () => {
    const el = makeElement();
    el.setLabel("a");
    el.setRole({ leader: true });
    const style = /** @type {HTMLElement} */ (
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector("style")
    ).textContent ?? "";
    assert.match(style, /@media \(max-width: 480px\)/);
    assert.match(style, /\.role \{ display: none; \}/);
    el.remove();
  });
});
