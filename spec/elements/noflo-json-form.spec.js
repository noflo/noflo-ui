import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import { ComponentSignature } from "../../src/library/schema.js";
import "../../src/elements/noflo-json-form.js";

/**
 * Waits until the jedison editor reports readiness (the form-change
 * listener attaches then).
 *
 * @param {HTMLElement} form
 * @returns {Promise<void>}
 */
async function ready(form) {
  for (let i = 0; i < 50; i++) {
    if (/** @type {any} */ (form).editor) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("the form editor never initialized");
}

describe("JSON form live validation (work document #5)", () => {
  it("flags duplicate port names as they are set, not only on save", async () => {
    const form = document.createElement("noflo-json-form");
    document.body.appendChild(form);
    /** @type {any[]} */
    const changes = [];
    form.addEventListener("form-change", (e) => {
      changes.push(/** @type {CustomEvent} */ (e).detail);
    });

    form.schema = ComponentSignature;
    form.data = {
      name: "sketchy",
      icon: "gear",
      description: "",
      inports: [{ name: "in" }],
      outports: [{ name: "out" }],
    };
    await ready(form);

    // Setting the duplicate after readiness flags it in the live change
    // stream — as the user types, not only on save
    /** @type {any} */ (form).data = {
      name: "sketchy",
      icon: "gear",
      description: "",
      inports: [{ name: "in" }, { name: "in" }],
      outports: [{ name: "out" }],
    };
    await new Promise((resolve) => setTimeout(resolve, 10));
    const flagged = changes[changes.length - 1];
    assert.ok(
      flagged && !flagged.isValid,
      "the duplicate flags in the live change stream",
    );
    assert.ok(
      (flagged?.errors ?? []).some(
        (/** @type {any} */ error) => error.constraint === "uniquePortNames",
      ),
      "the error names the uniquePortNames constraint",
    );
    assert.match(
      (flagged?.errors ?? []).find(
        (/** @type {any} */ error) => error.constraint === "uniquePortNames",
      )?.messages?.[0] ?? "",
      /unique per direction/,
    );

    // Fixing the duplicate clears the error on the next change
    /** @type {any} */ (form).data = {
      name: "sketchy",
      icon: "gear",
      description: "",
      inports: [{ name: "in" }, { name: "in2" }],
      outports: [{ name: "out" }],
    };
    await new Promise((resolve) => setTimeout(resolve, 10));
    const cleared = changes[changes.length - 1];
    assert.ok(cleared.isValid, "a unique set validates");
    assert.ok(
      !(cleared.errors ?? []).some(
        (/** @type {any} */ error) => error.constraint === "uniquePortNames",
      ),
    );
    form.remove();
  });

  it("the same name across directions is fine", async () => {
    const form = document.createElement("noflo-json-form");
    document.body.appendChild(form);
    /** @type {any[]} */
    const changes = [];
    form.addEventListener("form-change", (e) => {
      changes.push(/** @type {CustomEvent} */ (e).detail);
    });
    form.schema = ComponentSignature;
    form.data = {
      name: "sketchy",
      icon: "gear",
      description: "",
      inports: [{ name: "in" }],
      outports: [{ name: "in" }],
    };
    await ready(form);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const last = changes[changes.length - 1];
    assert.ok(last.isValid, 'one "in" inport and one "in" outport coexist');
    form.remove();
  });
});
