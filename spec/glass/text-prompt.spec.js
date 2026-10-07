import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "../elements/utils/register.js";

import "../../src/elements/noflo-modal.js";
import {
  openTextPrompt,
  wireExportRename,
} from "../../src/glass/text-prompt.js";

/**
 * The container the prompt mounts its modal into (the app shell's #app).
 *
 * @returns {HTMLElement}
 */
function appContainer() {
  let app = document.getElementById("app");
  if (!app) {
    app = document.createElement("div");
    app.id = "app";
    document.body.appendChild(app);
  }
  return app;
}

/**
 * Clicks a footer action on the prompt modal.
 *
 * @param {string} value
 * @returns {void}
 */
function clickAction(value) {
  const modal = /** @type {HTMLElement} */ (
    document.getElementById("app")?.querySelector("noflo-modal")
  );
  const button = /** @type {HTMLElement} */ (
    /** @type {ShadowRoot} */ (modal?.shadowRoot).querySelector(
      `.modal-footer button[value='${value}']`,
    )
  );
  button?.click();
}

describe("text prompt (work document #5 update #36)", () => {
  it("resolves the entered value on confirm", async () => {
    appContainer();
    const pending = openTextPrompt({
      title: "Rename outport",
      value: "out",
      confirmLabel: "Rename",
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const modal = /** @type {any} */ (
      document.getElementById("app")?.querySelector("noflo-modal")
    );
    const input = /** @type {HTMLInputElement} */ (
      modal.querySelector("input")
    );
    assert.equal(input.value, "out", "the current name prefills the input");
    input.value = "result";
    clickAction("ok");
    assert.equal(await pending, "result");
  });

  it("cancel, dismissal, and empty values resolve null", async () => {
    appContainer();
    const cancelled = openTextPrompt({ title: "t", value: "x" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    clickAction("cancel");
    assert.equal(await cancelled, null);

    const dismissed = openTextPrompt({ title: "t", value: "x" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    /** @type {any} */ (
      document.getElementById("app")?.querySelector("noflo-modal")
    ).close();
    assert.equal(await dismissed, null);

    const emptied = openTextPrompt({ title: "t", value: "  " });
    await new Promise((resolve) => setTimeout(resolve, 10));
    clickAction("ok");
    assert.equal(await emptied, null, "an empty value is not a name");
  });
});

describe("exported-port rename flow (work document #5 update #36)", () => {
  it("routes the resolved name through port-renamed", async () => {
    const editor = document.createElement("div");
    document.body.appendChild(editor);
    /** @type {any[]} */
    const renames = [];
    editor.addEventListener("port-renamed", (e) => {
      renames.push(/** @type {CustomEvent} */ (e).detail);
    });
    wireExportRename(editor);

    editor.dispatchEvent(
      new CustomEvent("export-rename-attempt", {
        detail: { name: "out", direction: "out" },
        bubbles: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    const input = /** @type {HTMLInputElement} */ (
      /** @type {HTMLElement} */ (
        document.getElementById("app")?.querySelector("noflo-modal")
      ).querySelector("input")
    );
    input.value = "result";
    clickAction("ok");
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(renames, [
      { oldName: "out", newName: "result", direction: "out" },
    ]);
    editor.remove();
  });

  it("an unchanged or cancelled name renames nothing", async () => {
    const editor = document.createElement("div");
    document.body.appendChild(editor);
    /** @type {any[]} */
    const renames = [];
    editor.addEventListener("port-renamed", (e) => {
      renames.push(/** @type {CustomEvent} */ (e).detail);
    });
    wireExportRename(editor);

    editor.dispatchEvent(
      new CustomEvent("export-rename-attempt", {
        detail: { name: "out", direction: "out" },
        bubbles: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    clickAction("cancel");
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(renames, [], "cancelling renames nothing");

    editor.dispatchEvent(
      new CustomEvent("export-rename-attempt", {
        detail: { name: "out", direction: "out" },
        bubbles: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    clickAction("ok");
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(renames, [], "confirming the same name renames nothing");
    editor.remove();
  });
});
