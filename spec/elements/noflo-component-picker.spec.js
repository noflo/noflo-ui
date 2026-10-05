import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import {
  CREATE_NEW_COMPONENT,
  FlowComponentPicker,
} from "../../src/elements/noflo-component-picker.js";
import { compatibleComponents } from "../../src/glass/intentMapping.js";

describe("FlowComponentPicker (work document #29 update #1)", () => {
  it("resolves with the chosen candidate", async () => {
    const picker = /** @type {FlowComponentPicker} */ (
      document.createElement("noflo-component-picker")
    );
    document.body.appendChild(picker);
    const pending = picker.open({
      x: 10,
      y: 10,
      candidates: ["core/A", "core/B"],
    });
    const shadow = /** @type {ShadowRoot} */ (picker.shadowRoot);
    assert.equal(shadow.querySelectorAll("[data-component]").length, 2);
    assert.match(
      /** @type {HTMLElement} */ (shadow.querySelector(".picker-head"))
        .textContent ?? "",
      /[Cc]ompatible/i,
    );
    /** @type {HTMLElement} */ (
      shadow.querySelector("[data-component='core/B']")
    ).click();
    assert.equal(await pending, "core/B");
    picker.remove();
  });

  it("ends the list with the create-new option", async () => {
    const picker = /** @type {FlowComponentPicker} */ (
      document.createElement("noflo-component-picker")
    );
    document.body.appendChild(picker);
    const pending = picker.open({ x: 10, y: 10, candidates: ["core/A"] });
    /** @type {ShadowRoot} */ (picker.shadowRoot)
      .querySelector("[data-create]")
      ?.click();
    assert.equal(await pending, CREATE_NEW_COMPONENT);
    picker.remove();
  });

  it("resolves null on Escape and hides the picker", async () => {
    const picker = /** @type {FlowComponentPicker} */ (
      document.createElement("noflo-component-picker")
    );
    document.body.appendChild(picker);
    const pending = picker.open({ x: 10, y: 10, candidates: [] });
    assert.ok(picker.hasAttribute("open"), "the picker shows");
    const event = /** @type {any} */ (new window.Event("keydown"));
    event.key = "Escape";
    window.dispatchEvent(event);
    assert.equal(await pending, null);
    assert.ok(!picker.hasAttribute("open"), "dismissed");
    picker.remove();
  });

  it("renders the empty state when nothing is compatible", () => {
    const picker = /** @type {FlowComponentPicker} */ (
      document.createElement("noflo-component-picker")
    );
    document.body.appendChild(picker);
    picker.open({ x: 10, y: 10, candidates: [] });
    const shadow = /** @type {ShadowRoot} */ (picker.shadowRoot);
    assert.ok(shadow.querySelector("button.empty"), "the empty state shows");
    assert.ok(shadow.querySelector("[data-create]"), "create stays available");
    picker.remove();
  });
});

describe("compatibleComponents (work document #29 update #1)", () => {
  const library = {
    getComponent: (/** @type {string} */ name) =>
      ({
        A: {
          inports: [{ name: "in", type: "number" }],
          outports: [{ name: "out", type: "all" }],
        },
        B: {
          inports: [{ name: "in", type: "string" }],
          outports: [{ name: "out", type: "string" }],
        },
        C: { inports: [{ name: "in", type: "all" }], outports: [] },
      })[name?.split("/")[1] ?? name],
    listComponents: () => ["A", "B", "C"],
  };

  /**
   * @param {string} direction
   * @param {string} type
   * @returns {any}
   */
  function port(direction, type) {
    return {
      classList: { contains: (c) => c === direction },
      dataset: { portType: type },
    };
  }

  it("narrowing to inports when dragging from an outport", () => {
    const names = compatibleComponents(library, port("port-out", "number"));
    assert.deepEqual(names, ["A", "C"], "number inports and all inports fit");
  });

  it("narrowing to outports when dragging from an inport", () => {
    const names = compatibleComponents(library, port("port-in", "string"));
    assert.deepEqual(names, ["A", "B"], "string outports and all outports fit");
  });

  it("everything fits an all-typed dragged port", () => {
    const names = compatibleComponents(library, port("port-out", "all"));
    assert.deepEqual(names, ["A", "B", "C"]);
  });
});
