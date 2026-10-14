import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-workdoc-view.js";

/** @returns {any} */
function makeView() {
  const el = /** @type {any} */ (document.createElement("noflo-workdoc-view"));
  document.body.appendChild(el);
  return el;
}

const doc = () => ({
  id: "a".repeat(32),
  title: "Implement the parser",
  scope: "proposed",
  pendingScope: "active",
  content: "The parser needs a sketch.",
  boardId: 42,
});

describe("FlowWorkDocView (work document #9)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("opens with the title, the scope state, and the content", () => {
    const view = makeView();
    view.open(doc());
    const shadow = view.shadowRoot;
    assert.match(
      shadow.querySelector(".title").textContent,
      /Implement the parser/,
    );
    assert.match(
      shadow.querySelector(".badge").textContent,
      /proposed → active/,
    );
    assert.match(
      shadow.querySelector("textarea").value,
      /parser needs a sketch/,
    );
    assert.match(
      shadow.querySelector(".head").textContent,
      /#42/,
      "the board number",
    );
    view.remove();
  });

  it("editing debounces a flush carrying the accumulated content", async () => {
    const view = makeView();
    view.open(doc());
    const textarea = /** @type {HTMLTextAreaElement} */ (
      view.shadowRoot.querySelector("textarea")
    );
    /** @type {any[]} */
    const saves = [];
    view.addEventListener("workdoc-save", (/** @type {any} */ e) =>
      saves.push(e.detail),
    );
    textarea.value = "The parser needs a sketch. And tests.";
    textarea.dispatchEvent(new Event("input"));
    assert.equal(saves.length, 0, "the flush waits for the idle period");
    // The debounce elapses: one flush with the full buffer
    await new Promise((resolve) => setTimeout(resolve, 900));
    assert.equal(saves.length, 1);
    assert.deepEqual(saves[0], {
      docId: "a".repeat(32),
      content: "The parser needs a sketch. And tests.",
    });
    view.remove();
  });

  it("the confirmation settles the pending save when content matches", () => {
    const view = makeView();
    view.open(doc());
    const textarea = /** @type {HTMLTextAreaElement} */ (
      view.shadowRoot.querySelector("textarea")
    );
    textarea.value = "New content";
    textarea.dispatchEvent(new Event("input"));
    // The replica confirms with the content the flush carried
    view.confirmed("New content");
    assert.equal(
      view.shadowRoot.querySelector(".status").textContent.includes("Saving"),
      false,
      "the pending save settled",
    );
    view.remove();
  });

  it("an in-progress edit is not clobbered by a peer's confirmation", () => {
    const view = makeView();
    view.open(doc());
    const textarea = /** @type {HTMLTextAreaElement} */ (
      view.shadowRoot.querySelector("textarea")
    );
    textarea.value = "My in-progress edits";
    textarea.dispatchEvent(new Event("input"));
    // A peer's content arrives before the local flush
    view.confirmed("A peer's content");
    assert.equal(textarea.value, "My in-progress edits", "the buffer stands");
    view.remove();
  });

  it("close flushes and hides", () => {
    const view = makeView();
    view.open(doc());
    const textarea = /** @type {HTMLTextAreaElement} */ (
      view.shadowRoot.querySelector("textarea")
    );
    /** @type {any[]} */
    const saves = [];
    view.addEventListener("workdoc-save", (/** @type {any} */ e) =>
      saves.push(e.detail),
    );
    textarea.value = "Final words";
    textarea.dispatchEvent(new Event("input"));
    view.close();
    assert.equal(saves.length, 1, "the close flushed the pending edit");
    assert.equal(view.hidden, true);
    view.remove();
  });
});
