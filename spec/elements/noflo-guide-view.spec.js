import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import { getFlavor } from "../../src/library/runtimeinfo/index.js";
import "../../src/elements/noflo-guide-view.js";

const FLAVOR = getFlavor("noflo");

/**
 * @returns {any}
 */
function makeElement() {
  const el = document.createElement("noflo-guide-view");
  el.setAttribute("hidden", "");
  document.body.appendChild(el);
  return el;
}

describe("the guide reader (work document #66)", () => {
  it("renders the flavor's docs grouped by category", () => {
    const el = makeElement();
    el.open({ flavor: FLAVOR, docId: "writing-components" });
    assert.equal(el.hidden, false, "the view shows");
    const text = /** @type {ShadowRoot} */ (el.shadowRoot).textContent ?? "";
    assert.match(text, /Guides/);
    assert.match(text, /NoFlo/, "the flavor labels the header");
    assert.match(text, /Authoring/, "the authoring group");
    assert.match(text, /Deployment/, "the deployment group");
    el.remove();
  });

  it("renders the selected doc's markdown", () => {
    const el = makeElement();
    el.open({ flavor: FLAVOR, docId: "writing-components" });
    const html =
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector(".article")
        ?.innerHTML ?? "";
    assert.match(html, /<h2>/, "headings render");
    assert.match(html, /<pre><code>/, "code blocks render");
    assert.match(html, /<code>/, "inline code renders");
    el.remove();
  });

  it("an unknown docId falls back to the flavor's first doc", () => {
    const el = makeElement();
    el.open({ flavor: FLAVOR, docId: "no-such-doc" });
    const active = /** @type {HTMLElement} */ (
      el.shadowRoot.querySelector(".doc-link.active")
    );
    assert.equal(active?.getAttribute("data-doc"), FLAVOR.docs[0].id);
    el.remove();
  });

  it("doc selection emits guide-open; Close emits guide-close", () => {
    const el = makeElement();
    el.open({ flavor: FLAVOR, docId: "writing-components" });
    /** @type {any[]} */
    const events = [];
    el.addEventListener("guide-open", (/** @type {any} */ e) =>
      events.push({ type: "open", docId: e.detail.docId }),
    );
    el.addEventListener("guide-close", () => events.push({ type: "close" }));
    const other = FLAVOR.docs.find((doc) => doc.id !== "writing-components");
    el.shadowRoot
      .querySelector(`[data-doc='${other.id}']`)
      .dispatchEvent(new Event("click", { bubbles: true }));
    el.shadowRoot
      .querySelector("[data-action='close']")
      .dispatchEvent(new Event("click", { bubbles: true }));
    assert.deepEqual(events, [
      { type: "open", docId: other.id },
      { type: "close" },
    ]);
    el.remove();
  });

  it("an empty flavor renders the no-guides state", () => {
    const el = makeElement();
    el.open({ flavor: { shortname: "Test", docs: [] }, docId: "" });
    assert.match(
      /** @type {ShadowRoot} */ (el.shadowRoot).textContent ?? "",
      /No guides/,
    );
    el.remove();
  });
});
